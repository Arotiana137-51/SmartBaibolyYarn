import { useCallback, useState } from 'react';
import { hymnsDatabaseService } from '../services/database/DatabaseService';

export type HymnSearchOptions = {
  matchWholeWord?: boolean;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const makeWholeWordRegex = (query: string) => {
  const escaped = escapeRegExp(query.trim());
  return new RegExp(`(^|[^A-Za-z0-9])${escaped}([^A-Za-z0-9]|$)`, 'i');
};

const makeFtsPrefixQuery = (query: string) => {
  const tokens = query
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  // token* AND token2* ...
  return tokens.map(t => `${t}*`).join(' AND ');
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

      // Substring: prefix query per token; Whole word: quoted query.
      const ftsParam = matchWholeWord ? `"${query}"` : makeFtsPrefixQuery(query);
      
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
        JOIN Hymns h ON h.id = f.hymn_id
        WHERE HymnVersesFts MATCH ?
        ORDER BY h.number, v.verse_number
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
        results = await hymnsDatabaseService.executeQuerySilent(ftsSearchQuery, [ftsParam]);
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

      const regex = matchWholeWord ? makeWholeWordRegex(query) : null;

      for (const row of results.rows as any[]) {
        if (regex) {
          const verse = String(row.matched_verse ?? '');
          const title = String(row.title ?? '');
          const authors = String(row.authors ?? '');

          if (!regex.test(verse) && !regex.test(title) && !regex.test(authors)) {
            continue;
          }
        }
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
      setError('Erreur lors de la recherche des hymnes');
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
