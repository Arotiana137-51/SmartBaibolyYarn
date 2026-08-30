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

// Run an FTS5 query, falling back to a LIKE query on ANY failure (missing
// fts5 module, missing table, a malformed MATCH expression, a query-builder
// bug — anything). We used to only fall back for specific error strings
// ('no such module: fts5' / 'no such table'), which meant a differently-worded
// SQL error (e.g. referencing a JOIN alias instead of the FTS5 table's real
// name in a MATCH clause) silently re-threw, was swallowed by the caller's
// try/catch, and returned zero results with no visible error — exactly what
// happened to Bible search. LIKE is a strict, always-available superset
// fallback (slower, less precise, but correct), so degrading to it on any FTS
// failure is strictly safer than re-throwing.
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
    console.warn('FTS query failed, falling back to LIKE:', e?.message ?? e);
    return service.executeQuery(like.sql, like.params);
  }
};

// ---------------------------------------------------------------------------
// Trigram fuzzy fallback — typo/merged-word tolerance on top of the strict
// prefix search above.
//
// The strict AND-of-prefixes query above requires every token to appear as a
// prefix of some indexed token; it has no tolerance for a misspelled letter,
// a missing/extra letter, or a Malagasy elision typed as one merged word
// (e.g. "aminny" for "amin'ny", which the index stores as two separate
// tokens "amin" and "ny"). When the strict query finds NOTHING, a query
// against a `tokenize='trigram'` FTS5 table over the same normalized content
// can still recover the right rows: it indexes every overlapping 3-character
// window of the text (spaces included), so a partial character-level overlap
// is enough to find a candidate regardless of where word boundaries fall.
//
// This is a fallback tier only — triggered by the caller when the strict tier
// returns zero rows — because trigram ranking is inherently noisier than
// exact/prefix matching.

// Every overlapping 3-char window of an already-normalized string. Strings
// shorter than 3 chars can't form a trigram; use the whole string as its own
// single "trigram" so short queries still produce a queryable term.
export const generateTrigrams = (normalized: string): string[] => {
  const s = normalized;
  if (s.length < 3) return s ? [s] : [];
  const out = new Set<string>();
  for (let i = 0; i <= s.length - 3; i++) {
    out.add(s.slice(i, i + 3));
  }
  return Array.from(out);
};

// Build the FTS5 MATCH expression for a trigram-tokenized table: each
// trigram double-quoted (trigrams routinely contain a space, which would
// otherwise be parsed as a token separator) and OR'd together, so a row
// matches if it shares ANY trigram with the query — bm25() then ranks rows
// that share MORE (and rarer) trigrams higher.
export const makeTrigramMatchQuery = (trigrams: string[]): string =>
  trigrams.map(tg => `"${tg.replace(/"/g, '""')}"`).join(' OR ');

// Post-query precision filter: bm25 over a trigram table favors short
// documents that happen to share a few rare trigrams (classic bm25 length
// normalization), which can rank a coincidental match above the real one. Re-score
// each SQL-returned candidate by the actual fraction of the query's trigrams
// it contains, and drop anything below `minOverlap` — cheap in JS because the
// candidate set is already small (post-LIMIT).
export const trigramOverlapScore = (
  queryTrigrams: string[],
  candidateNormalizedText: string,
): number => {
  if (queryTrigrams.length === 0) return 0;
  const candidateSet = new Set(generateTrigrams(candidateNormalizedText));
  let hits = 0;
  for (const tg of queryTrigrams) {
    if (candidateSet.has(tg)) hits += 1;
  }
  return hits / queryTrigrams.length;
};

export const TRIGRAM_MIN_OVERLAP = 0.5;
