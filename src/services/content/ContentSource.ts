/**
 * ContentSource — the transport abstraction for read-only OTA content.
 *
 * Why this exists (Dependency Inversion):
 *   - Today every channel (devotionals, programs) lives on GitHub Pages.
 *     Tomorrow we may outgrow Pages' fair-use ceiling (~1M installs) or
 *     want a different CDN for cost / latency / control. When that day
 *     comes, the migration should be: write a new adapter, flip a config
 *     constant, ship. NOT: edit every manager.
 *   - Managers (DevotionalManager, ProgramManager, ...) depend on this
 *     interface, never on URLs.
 *
 * Three contractual rules every adapter MUST follow:
 *   1. Pure transport. Return parsed JSON (`unknown`) and let the caller
 *      validate. Do NOT coerce, normalize, or pre-validate — that would
 *      let a relaxed adapter sneak malformed content past the validator.
 *   2. No caching. AsyncStorage caching lives in the manager so it's
 *      identical across backends.
 *   3. No retry policy. Network handling (NetInfo gating, debouncing,
 *      timeout, error swallowing) lives in the manager. The adapter
 *      makes one HTTP call and either returns a parsed body or throws.
 */

export type ContentChannel = 'devotional' | 'program';

export interface ContentSource {
  /**
   * Fetch the channel's index JSON. Shape is channel-specific; the caller
   * runs the appropriate validator before trusting it.
   */
  fetchIndex(channel: ContentChannel): Promise<unknown>;

  /**
   * Fetch one entry from the channel. `id` is channel-specific:
   *   - devotional: ISO date (YYYY-MM-DD)
   *   - program: url-safe slug (e.g. "paska-2026")
   */
  fetchEntry(channel: ContentChannel, id: string): Promise<unknown>;
}

/**
 * Thrown by any adapter when the response is unreachable, non-2xx, or
 * not valid JSON. Managers catch this and decide whether to surface
 * 'error' state or stay on cached content.
 */
export class ContentSourceError extends Error {
  public readonly channel: ContentChannel;
  public readonly id: string | null;
  public readonly cause?: unknown;

  constructor(
    message: string,
    channel: ContentChannel,
    id: string | null,
    cause?: unknown,
  ) {
    super(message);
    this.name = 'ContentSourceError';
    this.channel = channel;
    this.id = id;
    this.cause = cause;
  }
}
