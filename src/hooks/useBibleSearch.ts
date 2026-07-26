import { useCallback, useState } from 'react';
import { bibleDatabaseService } from '../services/database/DatabaseService';
import {t} from '../i18n/strings';
import {
  normalizeForFtsQuery,
  makeFtsPrefixQuery,
  execWithLikeFallback,
} from '../utils/searchNormalize';
import {
  expandJesusToken,
  containsJesusNameVariant,
  makeJesusNameLikeParams,
} from '../utils/searchSynonyms';

export type BibleSearchOptions = {
  matchWholeWord?: boolean;
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

// LIKE-fallback params: expand the Jesus-name variants when the query mentions
// it, otherwise a single %query% param.
const likeParamsFor = (query: string, normalizedQuery: string): string[] =>
  containsJesusNameVariant(normalizedQuery)
    ? makeJesusNameLikeParams(query)
    : [`%${query}%`];

const likeWhereFor = (params: string[], column = 'v.text'): string =>
  params.length === 1
    ? `${column} LIKE ?`
    : `(${params.map(() => `${column} LIKE ?`).join(' OR ')})`;

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
      const ftsParam = matchWholeWord
        ? `"${normalizedQuery}"`
        : makeFtsPrefixQuery(normalizedQuery, expandJesusToken);

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

      const likeParams = likeParamsFor(query, normalizedQuery);
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
        WHERE ${likeWhereFor(likeParams)}
        ORDER BY v.book_id, v.chapter, v.verse_number
      `;

      const candidates = await execWithLikeFallback(
        bibleDatabaseService,
        {sql: ftsCandidatesQuery, params: [ftsParam]},
        {sql: likeCandidatesQuery, params: likeParams},
      );

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
      const ftsParam = matchWholeWord
        ? `"${normalizedQuery}"`
        : makeFtsPrefixQuery(normalizedQuery, expandJesusToken);

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

      const likeParams = likeParamsFor(query, normalizedQuery);
      const likeQuery = `
        SELECT
          v.book_id,
          b.name as book_name,
          v.chapter,
          v.verse_number,
          v.text
        FROM Verses v
        JOIN Books b ON v.book_id = b.id
        WHERE v.book_id = ? AND ${likeWhereFor(likeParams)}
        ORDER BY v.chapter, v.verse_number
      `;

      const results = await execWithLikeFallback(
        bibleDatabaseService,
        {sql: ftsQuery, params: [ftsParam, bookId]},
        {sql: likeQuery, params: [bookId, ...likeParams]},
      );

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
