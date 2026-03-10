export interface Env {
  ENVIRONMENT: string;
  RATE_LIMITER: DurableObjectNamespace;
  APPS_SCRIPT_WEBAPP_URL: string;
  APPS_SCRIPT_API_KEY?: string;
}

type IssueReportType = 'bible' | 'hymn';

type IssueReport = {
  id: string;
  createdAt: string;
  type: IssueReportType;
  reference: string;
  text: string;
  comment: string;
};

type IncomingBody = {
  reports: IssueReport[];
};

const json = (data: unknown, init: ResponseInit = {}) => {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(data), { ...init, headers });
};

const withCors = (res: Response) => {
  const headers = new Headers(res.headers);
  headers.set('access-control-allow-origin', '*');
  headers.set('access-control-allow-methods', 'POST, OPTIONS');
  headers.set('access-control-allow-headers', 'content-type');
  return new Response(res.body, { ...res, headers });
};

const badRequest = (message: string) => withCors(json({ ok: false, error: message }, { status: 400 }));

const getClientIp = (req: Request) => {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '0.0.0.0'
  );
};

const isNonEmptyString = (v: unknown) => typeof v === 'string' && v.trim().length > 0;

const validateReport = (r: any): r is IssueReport => {
  if (!r || typeof r !== 'object') return false;
  if (!isNonEmptyString(r.id)) return false;
  if (!isNonEmptyString(r.createdAt)) return false;
  if (r.type !== 'bible' && r.type !== 'hymn') return false;
  if (!isNonEmptyString(r.reference)) return false;
  if (!isNonEmptyString(r.text)) return false;
  if (!isNonEmptyString(r.comment)) return false;
  return true;
};

export class RateLimiter {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/check' || request.method !== 'POST') {
      return json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    const now = Date.now();
    const windowMs = 10 * 60 * 1000; // 10 minutes
    const maxRequests = 20;

    const key = 'timestamps';
    const existing = (await this.state.storage.get<number[]>(key)) || [];
    const filtered = existing.filter((t) => now - t < windowMs);

    if (filtered.length >= maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - filtered[0])) / 1000));
      return json(
        { ok: false, error: 'rate_limited', retryAfterSec },
        {
          status: 429,
          headers: {
            'retry-after': String(retryAfterSec),
          },
        }
      );
    }

    filtered.push(now);
    await this.state.storage.put(key, filtered);
    return json({ ok: true });
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }));
    }

    if (url.pathname !== '/report') {
      return withCors(json({ ok: false, error: 'not_found' }, { status: 404 }));
    }

    if (request.method !== 'POST') {
      return withCors(json({ ok: false, error: 'method_not_allowed' }, { status: 405 }));
    }

    if (!isNonEmptyString(env.APPS_SCRIPT_WEBAPP_URL)) {
      return withCors(json({ ok: false, error: 'server_not_configured' }, { status: 500 }));
    }

    const clientIp = getClientIp(request);
    const limiterId = env.RATE_LIMITER.idFromName(clientIp);
    const limiter = env.RATE_LIMITER.get(limiterId);

    const limitRes = await limiter.fetch('https://limiter/check', { method: 'POST' });
    if (!limitRes.ok) {
      const body = await limitRes.text();
      return withCors(new Response(body, { status: limitRes.status, headers: limitRes.headers }));
    }

    let body: IncomingBody;
    try {
      body = (await request.json()) as IncomingBody;
    } catch {
      return badRequest('invalid_json');
    }

    const reports = (body as any)?.reports;
    if (!Array.isArray(reports)) {
      return badRequest('missing_reports');
    }

    if (reports.length === 0) {
      return badRequest('empty_reports');
    }

    if (reports.length > 200) {
      return badRequest('too_many_reports');
    }

    for (const r of reports) {
      if (!validateReport(r)) {
        return badRequest('invalid_report');
      }
      if (r.comment.length > 2000 || r.text.length > 4000 || r.reference.length > 200) {
        return badRequest('report_too_large');
      }
    }

    const forwardUrl = (() => {
      try {
        const u = new URL(env.APPS_SCRIPT_WEBAPP_URL);
        if (env.APPS_SCRIPT_API_KEY && !u.searchParams.has('key')) {
          u.searchParams.set('key', env.APPS_SCRIPT_API_KEY);
        }
        return u.toString();
      } catch {
        // Fallback: if the URL is not parseable, just append key if present.
        if (env.APPS_SCRIPT_API_KEY) {
          const sep = env.APPS_SCRIPT_WEBAPP_URL.includes('?') ? '&' : '?';
          return `${env.APPS_SCRIPT_WEBAPP_URL}${sep}key=${encodeURIComponent(env.APPS_SCRIPT_API_KEY)}`;
        }
        return env.APPS_SCRIPT_WEBAPP_URL;
      }
    })();

    const forwardRes = await fetch(forwardUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        ...(env.APPS_SCRIPT_API_KEY ? { apiKey: env.APPS_SCRIPT_API_KEY } : null),
        reports,
      }),
    });

    const contentType = forwardRes.headers.get('content-type') ?? '';
    const raw = await forwardRes.text();

    const looksLikeHtml =
      contentType.toLowerCase().includes('text/html') || /<\s*!doctype\s+html|<\s*html\b/i.test(raw);
    if (!forwardRes.ok || looksLikeHtml) {
      return withCors(
        json(
          {
            ok: false,
            error: 'forward_failed',
            status: forwardRes.status,
            bodySnippet: raw.slice(0, 300),
          },
          { status: 502 }
        )
      );
    }

    let parsed: any = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    const acknowledged =
      parsed &&
      (parsed.ok === true || parsed.success === true || parsed.status === 'ok' || parsed.result === 'ok');

    if (!acknowledged) {
      return withCors(json({ ok: false, error: 'no_ack', bodySnippet: raw.slice(0, 300) }, { status: 502 }));
    }

    return withCors(json({ ok: true }));
  },
};
