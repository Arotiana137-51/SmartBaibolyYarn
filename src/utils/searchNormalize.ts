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

// Build the FTS5 MATCH expression for a normalized query. Each token becomes
// a prefix (`tok*`) joined with AND, so:
//   - word order doesn't matter
//   - partial words still match (e.g. "loharanon" matches "loharanonaina")
//   - punctuation/diacritics are already gone from the normalized form
//
// Extra OR branch: when a multi-token query contains a very short token
// (≤2 chars), also try the collapsed variant (handles a stray space that
// the user inserted mid-word).
export const makeFtsPrefixQuery = (normalized: string): string => {
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

  const list = Array.from(branches).filter(Boolean);
  return list.length === 1 ? list[0] : list.map(s => `(${s})`).join(' OR ');
};

// Loose-match check used for ranking (not for filtering). True when every
// token in the (already-normalized) query appears as a substring of the
// (already-normalized) target.
export const allTokensPresent = (
  normalizedQuery: string,
  normalizedTarget: string,
): boolean => {
  if (!normalizedQuery || !normalizedTarget) return false;
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every(tok => normalizedTarget.includes(tok));
};

// Generate trigrams from a normalized string. Word boundaries are preserved
// by padding each token with `_` on both sides before slicing — so "jeso"
// yields "_je", "jes", "eso", "so_". `_` is used (instead of a literal
// space) so each trigram is a SINGLE FTS token: SQLite's default tokenizer
// would otherwise split " je" into "je", losing the boundary signal.
//
// The trigram set is the basis for typo-tolerant fuzzy matching: index the
// trigrams of every searchable text as space-separated tokens, then a query
// that shares enough trigrams (Jaccard similarity ≥ FUZZY_MIN_SIMILARITY)
// with that text is a fuzzy hit. This catches single missing/extra/
// transposed letters (e.g. "mptia" vs "mpitia") that the prefix index can't.
export const generateTrigrams = (normalized: string): string[] => {
  if (!normalized) return [];
  const out: string[] = [];
  for (const token of normalized.split(/\s+/).filter(Boolean)) {
    const padded = `_${token}_`;
    for (let i = 0; i + 3 <= padded.length; i++) {
      out.push(padded.slice(i, i + 3));
    }
  }
  return out;
};

// Pack trigrams into a space-separated string suitable for indexing in an
// FTS5 column with the default tokenizer. Index-time and query-time MUST
// produce trigrams identically — that's the contract.
export const trigramsAsIndexString = (normalized: string): string => {
  return generateTrigrams(normalized).join(' ');
};

// Build the FTS5 MATCH expression that asks the trigram index for any text
// containing AT LEAST ONE of the query's trigrams. We rank candidates in JS
// by Jaccard similarity (see `trigramSimilarity`) — the OR-of-trigrams MATCH
// is just the cheap candidate filter.
export const makeTrigramMatchQuery = (normalized: string): string => {
  const grams = Array.from(new Set(generateTrigrams(normalized)));
  if (grams.length === 0) return '';
  return grams.join(' OR ');
};

// Jaccard similarity between two trigram sets, in [0, 1]. Used as the rank
// score for fuzzy candidates.
export const trigramSimilarity = (
  queryNormalized: string,
  targetNormalized: string,
): number => {
  const a = new Set(generateTrigrams(queryNormalized));
  const b = new Set(generateTrigrams(targetNormalized));
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const g of a) if (b.has(g)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
};
