import { useCallback, useState } from 'react';
import { hymnsDatabaseService } from '../services/database/DatabaseService';
import {t} from '../i18n/strings';

export type HymnSearchOptions = {
  matchWholeWord?: boolean;
};

const JESUS_VARIANTS = ['jesosy', 'jesoa'];

const looksLikeJesusPrefix = (token: string) => {
  if (!token) return false;
  const t = token.toLowerCase();
  if (JESUS_VARIANTS.some(v => v.startsWith(t) || t.startsWith(v))) return true;
  return t.startsWith('jeso') || t === 'jes' || t === 'je';
};

const containsJesusNameVariant = (query: string) => {
  const q = query.toLowerCase();
  if (JESUS_VARIANTS.some(v => q.includes(v))) return true;
  return q.split(/\s+/).filter(Boolean).some(looksLikeJesusPrefix);
};

const normalizeForFtsQuery = (value: string) => {
  const raw = (value ?? '').toString();
  if (!raw) return '';

  // Lowercase + NFD strip diacritics + drop punctuation/quotes (so MATCH parser is safe)
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const makeFtsPrefixQuery = (normalized: string) => {
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return '';

  const baseTokens = tokens.map(tok => `${tok}*`).join(' AND ');
  const branches = new Set<string>([baseTokens]);

  // Robustness: if there are multiple tokens and any are short (≤2 chars),
  // the user may have inserted a stray space mid-word. Try a collapsed variant.
  const collapsed = tokens.join('');
  if (tokens.length > 1 && tokens.some(t => t.length <= 2)) {
    branches.add(`${collapsed}*`);
  }

  // Jesus-name expansion: cover Jesoa/Jesosy variants whenever the query
  // contains a "jeso"-like prefix, even partial ("jeso o", "jes").
  if (containsJesusNameVariant(normalized)) {
    for (const variant of JESUS_VARIANTS) {
      const replaced = tokens
        .map(tok => (looksLikeJesusPrefix(tok) ? `${variant}*` : `${tok}*`))
        .join(' AND ');
      branches.add(replaced);
      branches.add(`${variant}*`);
    }
  }

  const list = Array.from(branches).filter(Boolean);
  return list.length === 1 ? list[0] : list.map(s => `(${s})`).join(' OR ');
};

export interface HymnSearchResult {
  id: string;
  number: number;
  category: string;
  title: string;
  authors: string;
  matchedVerse?: string;
  verseNumber?: number;
}

export const useHymnSearch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchHymns = useCallback(async (query: string, options?: HymnSearchOptions): Promise<HymnSearchResult[]> => {
    if (!query.trim()) {
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      await hymnsDatabaseService.initDatabase();

      const matchWholeWord = options?.matchWholeWord === true;

      const normalizedQuery = normalizeForFtsQuery(query);
      if (!normalizedQuery) {
        return [];
      }

      // Substring: prefix query per token; Whole word: quoted phrase.
      const ftsParam = matchWholeWord ? `"${normalizedQuery}"` : makeFtsPrefixQuery(normalizedQuery);
      
      // HymnVersesFts is contentless: hymn_id/verse_number live on HymnVerses
      // and must be read through the rowid join, not selected from f.*.
      const ftsSearchQuery = `
        SELECT DISTINCT
          h.id,
          h.number,
          h.category,
          h.title,
          h.authors,
          v.text as matched_verse,
          v.verse_number
        FROM HymnVersesFts f
        JOIN HymnVerses v ON v.rowid = f.rowid
        JOIN Hymns h ON h.id = v.hymn_id
        WHERE HymnVersesFts MATCH ?

        UNION ALL

        SELECT DISTINCT
          h.id,
          h.number,
          h.category,
          h.title,
          h.authors,
          NULL as matched_verse,
          NULL as verse_number
        FROM HymnsFts hf
        JOIN Hymns h ON h.id = hf.hymn_id
        WHERE HymnsFts MATCH ?

        ORDER BY number, verse_number
        LIMIT 200
      `;

      const likeSearchQuery = `
        SELECT DISTINCT
          h.id,
          h.number,
          h.category,
          h.title,
          h.authors,
          v.text as matched_verse,
          v.verse_number
        FROM Hymns h
        JOIN HymnVerses v ON h.id = v.hymn_id
        WHERE lower(v.text) LIKE lower(?)
           OR lower(h.title) LIKE lower(?)
           OR lower(h.authors) LIKE lower(?)
        ORDER BY h.number, v.verse_number
        LIMIT 200
      `;

      let results: { rows: any[] };
      try {
        results = await hymnsDatabaseService.executeQuerySilent(ftsSearchQuery, [ftsParam, ftsParam]);
      } catch (e: any) {
        const message = typeof e?.message === 'string' ? e.message : '';
        if (message.toLowerCase().includes('no such module: fts5')) {
          const likeParam = `%${query}%`;
          results = await hymnsDatabaseService.executeQuery(likeSearchQuery, [likeParam, likeParam, likeParam]);
        } else {
          throw e;
        }
      }
      const searchResults: HymnSearchResult[] = [];

      for (const row of results.rows as any[]) {
        searchResults.push({
          id: row.id,
          number: row.number,
          category: row.category || '',
          title: row.title,
          authors: row.authors || '',
          matchedVerse: row.matched_verse,
          verseNumber: row.verse_number,
        });
      }

      return searchResults;
    } catch (err) {
      setError(t('errors.hymnSearch'));
      console.error('Hymn search error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    searchHymns,
    isLoading,
    error,
  };
};
