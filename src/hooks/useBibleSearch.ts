import { useCallback, useState } from 'react';
import { bibleDatabaseService } from '../services/database/DatabaseService';
import {t} from '../i18n/strings';

export type BibleSearchOptions = {
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

const makeJesusNameLikeParams = (query: string) => {
  const safe = query;
  const variants = new Set<string>([safe]);
  const qLower = safe.toLowerCase();

  if (qLower.includes('jesosy')) {
    variants.add(safe.replace(/jesosy/gi, 'Jesoa'));
  }
  if (qLower.includes('jesoa')) {
    variants.add(safe.replace(/jesoa/gi, 'Jesosy'));
  }

  // If the query contains a "jeso"-like prefix anywhere (e.g. "jeso o"),
  // collapse spaces and add the canonical variants so LIKE still finds them.
  const collapsed = safe.replace(/\s+/g, '');
  if (/jeso/i.test(collapsed)) {
    variants.add('Jesosy');
    variants.add('Jesoa');
  }

  return Array.from(variants).map(v => `%${v}%`);
};

const normalizeForFtsQuery = (value: string) => {
  const raw = (value ?? '').toString();
  if (!raw) return '';

  // 1) Lowercase
  // 2) Split diacritics (NFD) then drop combining marks
  // 3) Replace punctuation/symbols with spaces (also strips quotes which would break MATCH)
  // 4) Collapse whitespace
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
  const expand = containsJesusNameVariant(normalized);
  if (expand) {
    // Replace any token that looks like a Jesus prefix with each canonical variant.
    for (const variant of JESUS_VARIANTS) {
      const replaced = tokens
        .map(tok => (looksLikeJesusPrefix(tok) ? `${variant}*` : `${tok}*`))
        .join(' AND ');
      branches.add(replaced);
      // Also try with all spaces collapsed (handles "jeso o" → "jesoo" → variant).
      branches.add(`${variant}*`);
    }
  }

  const list = Array.from(branches).filter(Boolean);
  return list.length === 1 ? list[0] : list.map(s => `(${s})`).join(' OR ');
};

export interface BibleSearchResult {
  bookId: number;
  bookName: string;
  testament?: 'old' | 'new' | null;
  verseCount: number;
  matchedChapter?: number;
  matchedVerseNumber?: number;
  matchedText?: string;
}

export interface BibleVerseResult {
  bookId: number;
  bookName: string;
  chapter: number;
  verseNumber: number;
  text: string;
}

export const useBibleSearch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTestamentFromBookId = (bookId: number): 'old' | 'new' => (bookId <= 39 ? 'old' : 'new');

  const searchBible = useCallback(async (query: string, options?: BibleSearchOptions): Promise<BibleSearchResult[]> => {
    if (!query.trim()) {
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      await bibleDatabaseService.initDatabase();

      const matchWholeWord = options?.matchWholeWord === true;
      const normalizedQuery = normalizeForFtsQuery(query);
      if (!normalizedQuery) {
        return [];
      }
      const ftsParam = matchWholeWord ? `"${normalizedQuery}"` : makeFtsPrefixQuery(normalizedQuery);

      const ftsCandidatesQuery = `
        SELECT
          v.book_id,
          b.name as book_name,
          b.testament as testament,
          v.chapter,
          v.verse_number,
          v.text
        FROM VersesFts f
        JOIN Verses v ON v.id = f.rowid
        JOIN Books b ON b.id = v.book_id
        WHERE f MATCH ?
        ORDER BY v.book_id, v.chapter, v.verse_number
      `;

      const shouldExpandJesus = containsJesusNameVariant(normalizedQuery);
      const expandedLikeParams = shouldExpandJesus ? makeJesusNameLikeParams(query) : [`%${query}%`];
      const likeWhere = expandedLikeParams.length === 1
        ? 'v.text LIKE ?'
        : `(${expandedLikeParams.map(() => 'v.text LIKE ?').join(' OR ')})`;

      const likeCandidatesQuery = `
        SELECT
          v.book_id,
          b.name as book_name,
          b.testament as testament,
          v.chapter,
          v.verse_number,
          v.text
        FROM Verses v
        JOIN Books b ON v.book_id = b.id
        WHERE ${likeWhere}
        ORDER BY v.book_id, v.chapter, v.verse_number
      `;

      let candidates: { rows: any[] };
      try {
        candidates = await bibleDatabaseService.executeQuerySilent(ftsCandidatesQuery, [ftsParam]);
      } catch (e: any) {
        const message = typeof e?.message === 'string' ? e.message : '';
        if (message.toLowerCase().includes('no such module: fts5') || message.toLowerCase().includes('no such table')) {
          candidates = await bibleDatabaseService.executeQuery(likeCandidatesQuery, [...expandedLikeParams]);
        } else {
          throw e;
        }
      }

      const byBook = new Map<
        number,
        {
          bookId: number;
          bookName: string;
          testament: 'old' | 'new' | null;
          verseCount: number;
          matchedChapter?: number;
          matchedVerseNumber?: number;
          matchedText?: string;
        }
      >();

      for (const row of candidates.rows as any[]) {
        const text = String(row.text ?? '');

        const bookId = row.book_id as number;
        const existing = byBook.get(bookId);
        if (!existing) {
          byBook.set(bookId, {
            bookId,
            bookName: row.book_name,
            testament: getTestamentFromBookId(bookId),
            verseCount: 1,
            matchedChapter: row.chapter,
            matchedVerseNumber: row.verse_number,
            matchedText: row.text,
          });
        } else {
          existing.verseCount += 1;
        }
      }

      const results: BibleSearchResult[] = Array.from(byBook.values());
      results.sort((a, b) => a.bookId - b.bookId);
      return results;
    } catch (err) {
      setError(t('errors.bibleSearch'));
      console.error('Bible search error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getVersesForBook = useCallback(async (bookId: number, query: string, options?: BibleSearchOptions): Promise<BibleVerseResult[]> => {
    if (!query.trim()) {
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      await bibleDatabaseService.initDatabase();

      const matchWholeWord = options?.matchWholeWord === true;
      const normalizedQuery = normalizeForFtsQuery(query);
      if (!normalizedQuery) {
        return [];
      }
      const ftsParam = matchWholeWord ? `"${normalizedQuery}"` : makeFtsPrefixQuery(normalizedQuery);

      const ftsQuery = `
        SELECT
          v.book_id,
          b.name as book_name,
          v.chapter,
          v.verse_number,
          v.text
        FROM VersesFts f
        JOIN Verses v ON v.id = f.rowid
        JOIN Books b ON b.id = v.book_id
        WHERE f MATCH ? AND v.book_id = ?
        ORDER BY v.chapter, v.verse_number
      `;

      const shouldExpandJesus = containsJesusNameVariant(normalizedQuery);
      const expandedLikeParams = shouldExpandJesus ? makeJesusNameLikeParams(query) : [`%${query}%`];
      const likeWhere = expandedLikeParams.length === 1
        ? 'v.text LIKE ?'
        : `(${expandedLikeParams.map(() => 'v.text LIKE ?').join(' OR ')})`;

      const likeQuery = `
        SELECT
          v.book_id,
          b.name as book_name,
          v.chapter,
          v.verse_number,
          v.text
        FROM Verses v
        JOIN Books b ON v.book_id = b.id
        WHERE v.book_id = ? AND ${likeWhere}
        ORDER BY v.chapter, v.verse_number
      `;

      let results: { rows: any[] };
      try {
        results = await bibleDatabaseService.executeQuerySilent(ftsQuery, [ftsParam, bookId]);
      } catch (e: any) {
        const message = typeof e?.message === 'string' ? e.message : '';
        if (message.toLowerCase().includes('no such module: fts5') || message.toLowerCase().includes('no such table')) {
          results = await bibleDatabaseService.executeQuery(likeQuery, [bookId, ...expandedLikeParams]);
        } else {
          throw e;
        }
      }

      const verseResults: BibleVerseResult[] = [];
      for (const row of results.rows as any[]) {
        verseResults.push({
          bookId: row.book_id,
          bookName: row.book_name,
          chapter: row.chapter,
          verseNumber: row.verse_number,
          text: row.text,
        });
      }

      return verseResults;
    } catch (err) {
      setError(t('errors.verseSearch'));
      console.error('Bible verses search error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    searchBible,
    getVersesForBook,
    isLoading,
    error,
  };
};
