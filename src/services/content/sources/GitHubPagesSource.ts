import {
  type ContentChannel,
  type ContentSource,
  ContentSourceError,
} from '../ContentSource';

const FETCH_TIMEOUT_MS = 15_000;

const CHANNEL_PATH: Record<ContentChannel, string> = {
  devotional: 'devotionals',
  program: 'programs',
};

const withTimeout = async <T>(
  promise: (signal: AbortSignal) => Promise<T>,
): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await promise(controller.signal);
  } finally {
    clearTimeout(timer);
  }
};

export class GitHubPagesSource implements ContentSource {
  constructor(private readonly baseUrl: string) {
    if (!/^https:\/\//.test(baseUrl)) {
      throw new Error(
        `GitHubPagesSource: baseUrl must be https. Got: ${baseUrl}`,
      );
    }
  }

  async fetchIndex(channel: ContentChannel): Promise<unknown> {
    const url = `${this.baseUrl}/${CHANNEL_PATH[channel]}/index.json`;
    return this.getJson(url, channel, null);
  }

  async fetchEntry(
    channel: ContentChannel,
    id: string,
  ): Promise<unknown> {
    const safeId = encodeURIComponent(id);
    const url = `${this.baseUrl}/${CHANNEL_PATH[channel]}/${safeId}.json`;
    return this.getJson(url, channel, id);
  }

  private async getJson(
    url: string,
    channel: ContentChannel,
    id: string | null,
  ): Promise<unknown> {
    try {
      return await withTimeout(async signal => {
        const res = await fetch(url, {
          signal,
          headers: {Accept: 'application/json'},
        });
        if (!res.ok) {
          throw new ContentSourceError(
            `HTTP ${res.status} for ${url}`,
            channel,
            id,
          );
        }
        return (await res.json()) as unknown;
      });
    } catch (err) {
      if (err instanceof ContentSourceError) throw err;
      throw new ContentSourceError(
        `fetch failed for ${url}: ${(err as Error)?.message ?? 'unknown'}`,
        channel,
        id,
        err,
      );
    }
  }
}
