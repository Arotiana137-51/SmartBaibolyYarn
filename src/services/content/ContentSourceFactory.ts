import {type ContentSource} from './ContentSource';
import {GitHubPagesSource} from './sources/GitHubPagesSource';

/**
 * Switch this constant to migrate every channel onto a new backend.
 *
 * To add a new backend:
 *   1. Implement `ContentSource` in src/services/content/sources/.
 *   2. Add a branch to `buildContentSource` below.
 *   3. Flip CONTENT_BACKEND. No other file changes.
 *
 * Managers (DevotionalManager, ProgramManager) never reference URLs or
 * adapter classes directly — they depend on the ContentSource interface
 * via this factory.
 */
type ContentBackend = 'github-pages';

const CONTENT_BACKEND: ContentBackend = 'github-pages';

const GITHUB_PAGES_BASE_URL = 'https://arotiana137-51.github.io/e-Baiboly';

let cached: ContentSource | null = null;

export const getContentSource = (): ContentSource => {
  if (cached) return cached;
  cached = build();
  return cached;
};

const build = (): ContentSource => {
  switch (CONTENT_BACKEND) {
    case 'github-pages':
      return new GitHubPagesSource(GITHUB_PAGES_BASE_URL);
    default: {
      const exhaustive: never = CONTENT_BACKEND;
      throw new Error(`Unknown CONTENT_BACKEND: ${exhaustive}`);
    }
  }
};

// Test-only: replace the cached source. Real code paths use getContentSource.
export const __setContentSourceForTests = (source: ContentSource | null): void => {
  cached = source;
};
