import AsyncStorage from '@react-native-async-storage/async-storage';

export type IssueReportType = 'bible' | 'hymn' | 'crash';

export type IssueReport = {
  id: string;
  createdAt: string;
  type: IssueReportType;
  reference: string;
  text: string;
  comment: string;
};

const STORAGE_KEY = 'issueReportsQueueV1';

const readQueue = async (): Promise<IssueReport[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeQueue = async (queue: IssueReport[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
};

export const enqueueIssueReport = async (report: IssueReport) => {
  const queue = await readQueue();
  queue.push(report);
  await writeQueue(queue);
};

export const peekIssueReportsQueue = async () => {
  return readQueue();
};

// Outcome of POSTing one batch of reports.
//   - 'sent':      accepted + acknowledged; remove from queue.
//   - 'permanent': the server refused this batch and always will (4xx with a
//                  validation verdict, e.g. invalid_report / report_too_large).
//                  Retrying the identical bytes can never succeed, so keep
//                  retrying is pointless — these must be dropped, not requeued.
//   - 'transient': anything that might succeed later (network error, timeout,
//                  429 rate-limit, 5xx, auth HTML page, missing ack). Keep the
//                  queue and try again next flush.
type BatchOutcome = 'sent' | 'permanent' | 'transient';

const POST_TIMEOUT_MS = 15000;

// Send exactly the given reports as one batch and classify the result. Never
// throws — a transient failure is a return value, not an exception, so a single
// bad report can't abort the whole flush.
const postBatch = async (
  targetUrl: string,
  reports: IssueReport[]
): Promise<BatchOutcome> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), POST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reports }),
      signal: controller.signal,
    });
  } catch {
    // Network error / abort / timeout — retry later.
    return 'transient';
  } finally {
    clearTimeout(timeoutId);
  }

  const contentType = res.headers.get('content-type') ?? '';
  const rawBody = await res.text();

  if (__DEV__) {
    console.log(
      '[issue-report] postBatch: response',
      JSON.stringify(
        {
          batchSize: reports.length,
          status: res.status,
          ok: res.ok,
          contentType,
          bodySnippet: rawBody.slice(0, 400),
        },
        null,
        2
      )
    );
  }

  // Apps Script sometimes returns a 200 HTML page (auth/permissions) instead of
  // JSON. That's a server-side misconfiguration we expect to be fixed, not a
  // bad report — keep the queue and retry.
  const looksLikeHtml =
    contentType.toLowerCase().includes('text/html') ||
    /<\s*!doctype\s+html|<\s*html\b/i.test(rawBody);
  if (looksLikeHtml) {
    return 'transient';
  }

  let parsed: any = null;
  try {
    parsed = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    parsed = null;
  }

  if (res.ok) {
    // Require a JSON acknowledgement so we don't drop reports the sheet never
    // actually stored. No ack → treat as transient and retry.
    const acknowledged =
      parsed &&
      (parsed.ok === true ||
        parsed.success === true ||
        parsed.status === 'ok' ||
        parsed.result === 'ok');
    return acknowledged ? 'sent' : 'transient';
  }

  // 4xx (except 429) is the server telling us this payload is structurally
  // unacceptable — invalid_report, report_too_large, missing_reports, etc.
  // Re-sending the same bytes will always fail, so this is permanent. 408/429
  // are the retryable exceptions; everything 5xx is transient.
  if (res.status >= 400 && res.status < 500 && res.status !== 429 && res.status !== 408) {
    return 'permanent';
  }

  return 'transient';
};

export const flushIssueReports = async (endpointUrl: string) => {
  const queue = await readQueue();
  if (queue.length === 0) {
    if (__DEV__) {
      console.log('[issue-report] flushIssueReports: queue is empty');
    }
    return { sent: 0, dropped: 0 };
  }

  if (__DEV__) {
    console.log(
      '[issue-report] flushIssueReports: sending',
      JSON.stringify({ queueLength: queue.length, targetUrl: endpointUrl }, null, 2)
    );
  }

  const outcome = await postBatch(endpointUrl, queue);

  // Whole batch accepted — clear it and we're done.
  if (outcome === 'sent') {
    await writeQueue([]);
    return { sent: queue.length, dropped: 0 };
  }

  // Transient failure — keep the entire queue untouched and retry next flush.
  // Surface it so the caller's existing catch logs it (and so a single flush
  // doesn't silently look successful).
  if (outcome === 'transient') {
    throw new Error('Issue report flush failed transiently; queue kept for retry.');
  }

  // Permanent rejection of the *batch*. The culprit is at least one poison-pill
  // report, but the batch is all-or-nothing on the server, so a single bad
  // report would otherwise block every good one forever. Isolate: re-send each
  // report on its own. Keep the ones that send or fail transiently; drop only
  // the reports the server permanently refuses. A lone batch of 1 short-circuits
  // straight to the drop, so we never loop.
  if (queue.length === 1) {
    if (__DEV__) {
      console.warn(
        '[issue-report] dropping 1 permanently-rejected report:',
        queue[0]?.id
      );
    }
    await writeQueue([]);
    return { sent: 0, dropped: 1 };
  }

  let sent = 0;
  let dropped = 0;
  const keep: IssueReport[] = [];
  for (const report of queue) {
    const single = await postBatch(endpointUrl, [report]);
    if (single === 'sent') {
      sent += 1;
    } else if (single === 'permanent') {
      dropped += 1;
      if (__DEV__) {
        console.warn(
          '[issue-report] dropping permanently-rejected report:',
          report.id
        );
      }
    } else {
      // Transient on the individual retry — keep it for next time.
      keep.push(report);
    }
  }

  await writeQueue(keep);
  return { sent, dropped };
};
