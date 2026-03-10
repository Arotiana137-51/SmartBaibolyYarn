import AsyncStorage from '@react-native-async-storage/async-storage';
import { ISSUE_REPORT_API_KEY } from '../../constants/reporting';

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

  const hasValidApiKey =
    !!ISSUE_REPORT_API_KEY &&
    !ISSUE_REPORT_API_KEY.includes('PUT_A_RANDOM_SECRET_KEY_HERE');

  // Apps Script WebApp doPost(e) does not reliably expose custom request headers.
  // So we send the API key in the JSON body (and also as a query param fallback).
  const urlWithKey = (() => {
    if (!hasValidApiKey) return endpointUrl;

    // Some deployments can behave differently if we accidentally call `/exec/` instead of `/exec`.
    // Normalize to avoid a trailing slash.
    const normalizedEndpointUrl = endpointUrl.replace(/\/exec\/?$/, '/exec');

    try {
      const url = new URL(normalizedEndpointUrl);
      if (url.searchParams.has('key')) {
        return url.toString();
      }

      // Prefer manual append (stable, doesn't introduce `/exec/`)
      const sep = normalizedEndpointUrl.includes('?') ? '&' : '?';
      return `${normalizedEndpointUrl}${sep}key=${encodeURIComponent(ISSUE_REPORT_API_KEY)}`;
    } catch {
      // If URL parsing fails for any reason, fall back to original URL.
      const sep = normalizedEndpointUrl.includes('?') ? '&' : '?';
      return `${normalizedEndpointUrl}${sep}key=${encodeURIComponent(ISSUE_REPORT_API_KEY)}`;
    }
  })();

  if (__DEV__) {
    console.log(
      '[issue-report] flushIssueReports: sending',
      JSON.stringify(
        {
          queueLength: queue.length,
          urlWithKey,
          hasValidApiKey,
        },
        null,
        2
      )
    );
  }

  const res = await fetch(urlWithKey, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(hasValidApiKey
        ? { 'X-API-KEY': ISSUE_REPORT_API_KEY }
        : null),
    },
    body: JSON.stringify({
      ...(hasValidApiKey ? { apiKey: ISSUE_REPORT_API_KEY } : null),
      reports: queue,
    }),
  });

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
