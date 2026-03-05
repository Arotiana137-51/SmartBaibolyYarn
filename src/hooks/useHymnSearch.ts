import { useCallback, useState } from 'react';
import { hymnsDatabaseService } from '../services/database/DatabaseService';

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

  const searchHymns = useCallback(async (query: string): Promise<HymnSearchResult[]> => {
    if (!query.trim()) {
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      await hymnsDatabaseService.initDatabase();
      
      // Use FTS to search across hymn verses
      const searchQuery = `
        SELECT DISTINCT
          h.id,
          h.number,
          h.category,
          h.title,
          h.authors,
          hv.text as matched_verse,
          hv.verse_number
        FROM hymns h
        JOIN hymn_verses hv ON h.id = hv.hymn_id
        WHERE hv.text MATCH ?
        ORDER BY h.number, hv.verse_number
      `;

      const results = await hymnsDatabaseService.executeQuery(searchQuery, [query]);
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
