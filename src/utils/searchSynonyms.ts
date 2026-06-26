// Dataset-specific search synonyms for the Malagasy corpus. Kept OUT of
// searchNormalize.ts on purpose — that module is generic and must stay free of
// dataset magic. Anything that aliases a particular word lives here.
//
// IMPORTANT: this is QUERY-SIDE ONLY. It never modifies stored data. It only
// widens what a typed query counts as a match, for the lifetime of that one
// search — like a case-insensitive lookup. The DB text is read untouched.
//
// Today the only alias is the name of Jesus: the Bible and hymn datasets spell
// it "Jesosy" (older orthography) and "Jesoa" (newer), never the bare "Jeso".
// A user typing either form — or just "jeso" — must find both. We expand the
// matching token IN PLACE within the query; we deliberately do NOT add a
// standalone whole-corpus branch like `(jesosy*)`, because on its own that
// pulls hundreds of unrelated rows and drowns the real match (it turned a
// 6-row query into 604). See docs/search-phase1-plan.md.

export const JESUS_VARIANTS = ['jesosy', 'jesoa'];

// True when a single token looks like the user is reaching for the name of
// Jesus — a canonical variant, a prefix of one ("jes"), or the bare "jeso".
export const looksLikeJesusPrefix = (token: string): boolean => {
  if (!token) return false;
  const t = token.toLowerCase();
  if (JESUS_VARIANTS.some(v => v.startsWith(t) || t.startsWith(v))) return true;
  return t.startsWith('jeso') || t === 'jes' || t === 'je';
};

// True when an (already-normalized) query mentions the name of Jesus in any
// form, so callers know whether to bother expanding.
export const containsJesusNameVariant = (query: string): boolean => {
  const q = (query ?? '').toLowerCase();
  if (JESUS_VARIANTS.some(v => q.includes(v))) return true;
  return q.split(/\s+/).filter(Boolean).some(looksLikeJesusPrefix);
};

// Token expander for makeFtsPrefixQuery: given one normalized token, return the
// canonical base words it should also be tried as, or null if the token isn't a
// Jesus-name trigger. The builder appends `*` and substitutes in place.
export const expandJesusToken = (token: string): string[] | null => {
  return looksLikeJesusPrefix(token) ? [...JESUS_VARIANTS] : null;
};

// LIKE-fallback variants (used when the fts5 module is unavailable). Operates on
// the RAW query so the surrounding text/spacing is preserved; returns a list of
// `%…%` params. Mirrors the FTS in-place expansion: swap a present variant for
// the other, and if any "jeso"-like prefix appears, also try both canonical
// forms so a bare "jeso" still matches.
export const makeJesusNameLikeParams = (rawQuery: string): string[] => {
  const safe = rawQuery ?? '';
  const variants = new Set<string>([safe]);
  const qLower = safe.toLowerCase();

  if (qLower.includes('jesosy')) variants.add(safe.replace(/jesosy/gi, 'Jesoa'));
  if (qLower.includes('jesoa')) variants.add(safe.replace(/jesoa/gi, 'Jesosy'));

  if (/jeso/i.test(safe.replace(/\s+/g, ''))) {
    variants.add('Jesosy');
    variants.add('Jesoa');
  }

  return Array.from(variants).map(v => `%${v}%`);
};
