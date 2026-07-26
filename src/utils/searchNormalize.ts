// General-purpose search normalization for Bible + Hymn FTS queries.
//
// Index-time pipeline (scripts/utils/buildDb.js#normalizeForFtsContent) and
// query-time pipeline MUST produce the same string for identical input —
// that's the contract that lets `*_plain` columns match user queries even
// when the user types rough variants (different case, missing diacritics,
// stray apostrophes/commas, extra spaces, words in any order).
//
// No dataset-specific magic lives here. If a particular word needs aliasing,
// add it to a data file, not this module.

// lowercase → NFD strip combining marks → punctuation/quotes/symbols become
// spaces → collapse whitespace. Never use `\w` here — it drops non-ASCII
// letters (the Malagasy `ô` etc.) and silently breaks diacritic-insensitive
// matching.
export const normalizeForFtsQuery = (value: unknown): string => {
  const raw = (value ?? '').toString();
  if (!raw) return '';
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// A token expander lets callers add dataset-specific synonyms WITHOUT this
// generic module knowing about them. Given one normalized token, it returns the
// alternative base words to also try (the builder appends `*` and substitutes
// the token IN PLACE), or null when the token has no synonyms. See
// src/utils/searchSynonyms.ts for the Malagasy Jesus-name expander.
export type TokenExpander = (token: string) => string[] | null;

// Build the FTS5 MATCH expression for a normalized query. Each token becomes
// a prefix (`tok*`) joined with AND, so:
//   - word order doesn't matter
//   - partial words still match (e.g. "loharanon" matches "loharanonaina")
//   - punctuation/diacritics are already gone from the normalized form
//
// Extra OR branch: when a multi-token query contains a very short token
// (≤2 chars), also try the collapsed variant (handles a stray space that
// the user inserted mid-word).
//
// Optional `expandToken`: when a token has synonyms, we add ONE extra branch
// per synonym with that token swapped in place (keeping the other tokens'
// AND constraints). We never emit a synonym as a standalone whole-corpus
// branch — `(jesosy*)` alone matches hundreds of rows and buries the real hit.
export const makeFtsPrefixQuery = (
  normalized: string,
  expandToken?: TokenExpander,
): string => {
  const rawTokens = normalized.split(/\s+/).filter(Boolean);
  const meaningful = rawTokens
    // Single-character tokens (e.g. "o") are extremely common and make FTS
    // return huge candidate sets, which can cause relevant results to be
    // excluded by LIMIT.
    .filter(t => t.length > 1);

  // If the user typed ONLY a single-character query (e.g. "o"), we must not
  // drop it — otherwise diacritic-insensitive single-letter searches ("o" → "ô")
  // would never match anything.
  const tokens = meaningful.length > 0 ? meaningful : rawTokens.slice(0, 1);
  if (tokens.length === 0) return '';

  const baseTokens = tokens.map(tok => `${tok}*`).join(' AND ');
  const branches = new Set<string>([baseTokens]);

  const collapsed = tokens.join('');
  if (tokens.length > 1 && tokens.some(t => t.length <= 2)) {
    branches.add(`${collapsed}*`);
  }

  // Synonym branches: for each token that has synonyms, emit a variant of the
  // FULL query with just that token replaced. Tokens keep their AND join, so a
  // 3-word query stays a 3-word query — only the synonym token changes.
  if (expandToken) {
    tokens.forEach((tok, idx) => {
      const synonyms = expandToken(tok);
      if (!synonyms || synonyms.length === 0) return;
      for (const synonym of synonyms) {
        const replaced = tokens
          .map((t, i) => (i === idx ? `${synonym}*` : `${t}*`))
          .join(' AND ');
        branches.add(replaced);
      }
    });
  }

  const list = Array.from(branches).filter(Boolean);
  return list.length === 1 ? list[0] : list.map(s => `(${s})`).join(' OR ');
};

// Run an FTS5 query, falling back to a LIKE query when the fts5 module or the
// virtual table is missing (older SQLite / DB not yet extracted). Both hooks
// share this: the try/catch shape and the "no such module/table" sniff were
// copy-pasted per call site before. Non-fts5 errors re-throw.
type QueryRunner = {
  executeQuerySilent: (sql: string, params: any[]) => Promise<{rows: any[]}>;
  executeQuery: (sql: string, params: any[]) => Promise<{rows: any[]}>;
};
export const execWithLikeFallback = async (
  service: QueryRunner,
  fts: {sql: string; params: any[]},
  like: {sql: string; params: any[]},
): Promise<{rows: any[]}> => {
  try {
    return await service.executeQuerySilent(fts.sql, fts.params);
  } catch (e: any) {
    const message = (typeof e?.message === 'string' ? e.message : '').toLowerCase();
    if (message.includes('no such module: fts5') || message.includes('no such table')) {
      return service.executeQuery(like.sql, like.params);
    }
    throw e;
  }
};
