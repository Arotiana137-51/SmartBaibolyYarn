import AsyncStorage from '@react-native-async-storage/async-storage';

export type IssueReportType = 'bible' | 'hymn';

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

export const flushIssueReports = async (endpointUrl: string) => {
  const queue = await readQueue();
  if (queue.length === 0) {
    if (__DEV__) {
      console.log('[issue-report] flushIssueReports: queue is empty');
    }
    return { sent: 0 };
  }

  const targetUrl = endpointUrl;

  if (__DEV__) {
    console.log(
      '[issue-report] flushIssueReports: sending',
      JSON.stringify(
        {
          queueLength: queue.length,
          targetUrl,
        },
        null,
        2
      )
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let res: Response;
  try {
    res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reports: queue,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const contentType = res.headers.get('content-type') ?? '';
  const rawBody = await res.text();

  if (__DEV__) {
    console.log(
      '[issue-report] flushIssueReports: response',
      JSON.stringify(
        {
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

  // Apps Script sometimes returns a 200 HTML page (auth/permissions) which would
  // incorrectly be treated as a success if we only check res.ok.
  const looksLikeHtml =
    contentType.toLowerCase().includes('text/html') || /<\s*!doctype\s+html|<\s*html\b/i.test(rawBody);
  if (looksLikeHtml) {
    throw new Error(
      `Issue report endpoint returned HTML (likely permissions/auth). status=${res.status}`
    );
  }

  let parsed: any = null;
  try {
    parsed = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const suffix = rawBody ? ` body=${rawBody.slice(0, 300)}` : '';
    throw new Error(`Failed to send reports: ${res.status}.${suffix}`);
  }

  // Require a JSON acknowledgement to avoid clearing the queue when Apps Script
  // didn't actually append to the sheet.
  const acknowledged =
    parsed &&
    (parsed.ok === true ||
      parsed.success === true ||
      parsed.status === 'ok' ||
      parsed.result === 'ok');
  if (!acknowledged) {
    const suffix = rawBody ? ` body=${rawBody.slice(0, 300)}` : '';
    throw new Error(`Issue report endpoint did not acknowledge success.${suffix}`);
  }

  await writeQueue([]);
  return { sent: queue.length };
};
