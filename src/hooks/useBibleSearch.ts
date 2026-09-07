import { useCallback, useState } from 'react';
import { bibleDatabaseService } from '../services/database/DatabaseService';
import {t} from '../i18n/strings';
import {
  normalizeForFtsQuery,
  makeFtsPrefixQuery,
  execWithLikeFallback,
  generateTrigrams,
  makeTrigramMatchQuery,
  trigramOverlapScore,
  TRIGRAM_MIN_OVERLAP,
} from '../utils/searchNormalize';
import {
  expandJesusToken,
  containsJesusNameVariant,
  makeJesusNameLikeParams,
} from '../utils/searchSynonyms';

type BibleCandidateRow = {
  book_id: number;
  book_name: string;
  testament: 'old' | 'new' | null;
  chapter: number;
  verse_number: number;
  text: string;
  score: number;
};

// Typo/merged-word fallback: only reached when the strict query above finds
// NOTHING. Ranks candidates by actual trigram overlap with the query (not raw
// bm25 — see trigramOverlapScore's doc comment) and discards weak matches.
// `extraWhere`/`extraParams` let getVersesForBook scope this to one book.
const fetchTrigramFallback = async (
  normalizedQuery: string,
  extraWhere = '',
  extraParams: any[] = [],
): Promise<BibleCandidateRow[]> => {
  const trigrams = generateTrigrams(normalizedQuery);
  if (trigrams.length === 0) return [];
  const trigramExpr = makeTrigramMatchQuery(trigrams);

  try {
    const { rows } = await bibleDatabaseService.executeQuerySilent<{
      book_id: number;
      book_name: string;
      testament: 'old' | 'new' | null;
      chapter: number;
      verse_number: number;
      text: string;
    }>(
      `
        SELECT v.book_id, b.name as book_name, b.testament as testament,
               v.chapter, v.verse_number, v.text
        FROM VersesTrigram t
        JOIN Verses v ON v.id = t.rowid
        JOIN Books b ON b.id = v.book_id
        WHERE VersesTrigram MATCH ? ${extraWhere}
        ORDER BY bm25(VersesTrigram) ASC
      `,
      [trigramExpr, ...extraParams],
    );

    return rows
      .map(row => ({
        ...row,
        score: -trigramOverlapScore(trigrams, normalizeForFtsQuery(row.text)),
      }))
      .filter(row => -row.score >= TRIGRAM_MIN_OVERLAP);
  } catch (e) {
    // No trigram table (DB not yet rebuilt, or fts5 unavailable) — the caller
    // already has the strict tier's (empty) result; degrade quietly.
    console.warn('Trigram fallback unavailable:', (e as any)?.message ?? e);
    return [];
  }
};

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
          v.text,
          bm25(VersesFts) as score
        FROM VersesFts f
        JOIN Verses v ON v.id = f.rowid
        JOIN Books b ON b.id = v.book_id
        WHERE VersesFts MATCH ?
        ORDER BY score ASC
      `;

      const likeParams = likeParamsFor(query, normalizedQuery);
      const likeCandidatesQuery = `
        SELECT
          v.book_id,
          b.name as book_name,
          b.testament as testament,
          v.chapter,
          v.verse_number,
          v.text,
          0 as score
        FROM Verses v
        JOIN Books b ON v.book_id = b.id
        WHERE ${likeWhereFor(likeParams)}
        ORDER BY v.book_id, v.chapter, v.verse_number
      `;

      let candidateRows = (
        await execWithLikeFallback(
          bibleDatabaseService,
          {sql: ftsCandidatesQuery, params: [ftsParam]},
          {sql: likeCandidatesQuery, params: likeParams},
        )
      ).rows as BibleCandidateRow[];

      // Strict search found nothing: fall back to trigram fuzzy matching so a
      // typo or a merged Malagasy elision (e.g. "aminny" for "amin'ny") still
      // surfaces the real verse instead of an empty result screen.
      if (candidateRows.length === 0 && !matchWholeWord && normalizedQuery.length >= 3) {
        candidateRows = await fetchTrigramFallback(normalizedQuery);
      }

      // Group by book, keeping the BEST-scoring verse per book (lower bm25 /
      // more negative fuzzy score = more relevant) as the card's snippet, and
      // ranking books themselves by their best verse — same relevance-first
      // principle useHymnSearch already applies.
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
          score: number;
        }
      >();

      for (const row of candidateRows) {
        const bookId = row.book_id;
        const score = typeof row.score === 'number' ? row.score : 0;
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
            score,
          });
        } else {
          existing.verseCount += 1;
          if (score < existing.score) {
            existing.matchedChapter = row.chapter;
            existing.matchedVerseNumber = row.verse_number;
            existing.matchedText = row.text;
            existing.score = score;
          }
        }
      }

      const ranked = Array.from(byBook.values()).sort((a, b) => a.score - b.score);
      const results: BibleSearchResult[] = ranked.map(r => ({
        bookId: r.bookId,
        bookName: r.bookName,
        testament: r.testament,
        verseCount: r.verseCount,
        matchedChapter: r.matchedChapter,
        matchedVerseNumber: r.matchedVerseNumber,
        matchedText: r.matchedText,
      }));
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
        WHERE VersesFts MATCH ? AND v.book_id = ?
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

      let rows = (
        await execWithLikeFallback(
          bibleDatabaseService,
          {sql: ftsQuery, params: [ftsParam, bookId]},
          {sql: likeQuery, params: [bookId, ...likeParams]},
        )
      ).rows as any[];

      // Same fuzzy fallback as searchBible, scoped to this book — otherwise a
      // book that only appeared in the results because of the OUTER fuzzy
      // match would look empty once the user drills into it.
      if (rows.length === 0 && !matchWholeWord && normalizedQuery.length >= 3) {
        const fuzzy = await fetchTrigramFallback(normalizedQuery, 'AND v.book_id = ?', [bookId]);
        rows = [...fuzzy].sort((a, b) => a.chapter - b.chapter || a.verse_number - b.verse_number);
      }

      const verseResults: BibleVerseResult[] = [];
      for (const row of rows) {
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
