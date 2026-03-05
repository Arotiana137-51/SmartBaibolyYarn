import { useCallback, useState } from 'react';
import { bibleDatabaseService } from '../services/database/DatabaseService';

export interface BibleSearchResult {
  bookId: number;
  bookName: string;
  verseCount: number;
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

  const searchBible = useCallback(async (query: string): Promise<BibleSearchResult[]> => {
    if (!query.trim()) {
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      await bibleDatabaseService.initDatabase();
      
      // Search across all books and group results by book
      const searchQuery = `
        SELECT 
          b.id as book_id,
          b.name as book_name,
          COUNT(v.id) as verse_count
        FROM books b
        JOIN verses v ON b.id = v.book_id
        WHERE v.text LIKE ?
        GROUP BY b.id, b.name
        ORDER BY verse_count DESC, b.name ASC
      `;

      const results = await bibleDatabaseService.executeQuery(searchQuery, [`%${query}%`]);
      const searchResults: BibleSearchResult[] = [];

      for (const row of results.rows as any[]) {
        searchResults.push({
          bookId: row.book_id,
          bookName: row.book_name,
          verseCount: row.verse_count,
        });
      }

      return searchResults;
    } catch (err) {
      setError('Erreur lors de la recherche biblique');
      console.error('Bible search error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getVersesForBook = useCallback(async (bookId: number, query: string): Promise<BibleVerseResult[]> => {
    if (!query.trim()) {
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      await bibleDatabaseService.initDatabase();
      
      const searchQuery = `
        SELECT 
          v.book_id,
          b.name as book_name,
          v.chapter,
          v.verse_number,
          v.text
        FROM verses v
        JOIN books b ON v.book_id = b.id
        WHERE v.book_id = ? AND v.text LIKE ?
        ORDER BY v.chapter, v.verse_number
      `;

      const results = await bibleDatabaseService.executeQuery(searchQuery, [bookId, `%${query}%`]);
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
