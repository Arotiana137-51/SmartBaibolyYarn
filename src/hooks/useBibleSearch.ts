import { useCallback, useState } from 'react';
import { bibleDatabaseService } from '../services/database/DatabaseService';

export type BibleSearchOptions = {
  matchWholeWord?: boolean;
};

const containsJesusNameVariant = (query: string) => {
  const q = query.toLowerCase();
  return q.includes('jesosy') || q.includes('jesoa');
};

 const makeJesusNameLikeParams = (query: string) => {
   const safe = query;
   const qLower = safe.toLowerCase();
   const variants = [safe];

   if (qLower.includes('jesosy')) {
     variants.push(safe.replace(/jesosy/gi, 'Jesoa'));
   }

   if (qLower.includes('jesoa')) {
     variants.push(safe.replace(/jesoa/gi, 'Jesosy'));
   }

   const unique = Array.from(new Set(variants));
   return unique.map(v => `%${v}%`);
 };

 const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

 const makeWholeWordRegex = (query: string) => {
   const escaped = escapeRegExp(query.trim());
   // RN JS engines don't reliably support Unicode property escapes everywhere.
   // This is a pragmatic boundary: non-alphanumeric acts as word boundary.
   return new RegExp(`(^|[^A-Za-z0-9])${escaped}([^A-Za-z0-9]|$)`, 'i');
 };

 const makeWholeWordRegexForJesusName = () => {
   const a = escapeRegExp('Jesosy');
   const b = escapeRegExp('Jesoa');
   return new RegExp(`(^|[^A-Za-z0-9])(${a}|${b})([^A-Za-z0-9]|$)`, 'i');
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
      const shouldExpandJesus = containsJesusNameVariant(query);
      const expandedLikeParams = shouldExpandJesus ? makeJesusNameLikeParams(query) : [`%${query}%`];
      const likeWhere = expandedLikeParams.length === 1
        ? 'v.text LIKE ?'
        : `(${expandedLikeParams.map(() => 'v.text LIKE ?').join(' OR ')})`;

      if (!matchWholeWord) {
        // Substring search (current behavior): SQL does the counting/grouping.
        const searchQuery = `
          SELECT 
            b.id as book_id,
            b.name as book_name,
            b.testament as testament,
            COUNT(v.id) as verse_count,
            (
              SELECT v2.chapter
              FROM verses v2
              WHERE v2.book_id = b.id AND (${expandedLikeParams.map(() => 'v2.text LIKE ?').join(' OR ')})
              ORDER BY v2.chapter, v2.verse_number
              LIMIT 1
            ) as matched_chapter,
            (
              SELECT v2.verse_number
              FROM verses v2
              WHERE v2.book_id = b.id AND (${expandedLikeParams.map(() => 'v2.text LIKE ?').join(' OR ')})
              ORDER BY v2.chapter, v2.verse_number
              LIMIT 1
            ) as matched_verse_number,
            (
              SELECT v2.text
              FROM verses v2
              WHERE v2.book_id = b.id AND (${expandedLikeParams.map(() => 'v2.text LIKE ?').join(' OR ')})
              ORDER BY v2.chapter, v2.verse_number
              LIMIT 1
            ) as matched_text
          FROM Books b
          JOIN Verses v ON b.id = v.book_id
          WHERE ${likeWhere}
          GROUP BY b.id, b.name, b.testament
          ORDER BY b.id ASC
        `;

        const subParams = [...expandedLikeParams];
        const results = await bibleDatabaseService.executeQuery(searchQuery, [
          ...subParams,
          ...subParams,
          ...subParams,
          ...expandedLikeParams,
        ]);

        const searchResults: BibleSearchResult[] = [];
        for (const row of results.rows as any[]) {
          const bookId = row.book_id as number;
          searchResults.push({
            bookId,
            bookName: row.book_name,
            testament: getTestamentFromBookId(bookId),
            verseCount: row.verse_count,
            matchedChapter: row.matched_chapter,
            matchedVerseNumber: row.matched_verse_number,
            matchedText: row.matched_text,
          });
        }
        return searchResults.sort((a, b) => a.bookId - b.bookId);
      }

      // Whole word search: fetch candidate verses using LIKE then filter in JS.
      // This avoids relying on SQLite REGEXP support.
      const regex =
        containsJesusNameVariant(query) && ['jesosy', 'jesoa'].includes(query.trim().toLowerCase())
          ? makeWholeWordRegexForJesusName()
          : makeWholeWordRegex(query);
      const candidatesQuery = `
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

      const candidates = await bibleDatabaseService.executeQuery(candidatesQuery, [...expandedLikeParams]);

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
        if (!regex.test(text)) {
          continue;
        }

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
      setError('Erreur lors de la recherche biblique');
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
      const shouldExpandJesus = containsJesusNameVariant(query);
      const expandedLikeParams = shouldExpandJesus ? makeJesusNameLikeParams(query) : [`%${query}%`];
      const likeWhere = expandedLikeParams.length === 1
        ? 'v.text LIKE ?'
        : `(${expandedLikeParams.map(() => 'v.text LIKE ?').join(' OR ')})`;

      const searchQuery = `
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

      const results = await bibleDatabaseService.executeQuery(searchQuery, [bookId, ...expandedLikeParams]);
      const verseResults: BibleVerseResult[] = [];

      const regex = matchWholeWord
        ? (containsJesusNameVariant(query) && ['jesosy', 'jesoa'].includes(query.trim().toLowerCase())
            ? makeWholeWordRegexForJesusName()
            : makeWholeWordRegex(query))
        : null;

      for (const row of results.rows as any[]) {
        const text = String(row.text ?? '');
        if (regex && !regex.test(text)) {
          continue;
        }
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
      setError('Erreur lors de la recherche des versets');
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
