import { useCallback, useState } from 'react';
import { useBibleSearch, BibleSearchResult } from './useBibleSearch';
import { useHymnSearch, HymnSearchResult } from './useHymnSearch';

export type GlobalSearchResults = {
  bible: BibleSearchResult[];
  hymns: HymnSearchResult[];
};

// Centralized search: fans out to the existing Bible + Hymn FTS engines in
// parallel and returns both result sets. This is a composition layer only — the
// two hooks own all the query-building, ranking and fallback logic. The screen
// decides section order (mode-aware) from the returned sets.
export const useGlobalSearch = () => {
  const { searchBible } = useBibleSearch();
  const { searchHymns } = useHymnSearch();
  const [isLoading, setIsLoading] = useState(false);

  const search = useCallback(
    async (
      query: string,
      options?: { matchWholeWord?: boolean },
    ): Promise<GlobalSearchResults> => {
      if (!query.trim()) {
        return { bible: [], hymns: [] };
      }
      setIsLoading(true);
      try {
        const [bible, hymns] = await Promise.all([
          searchBible(query, options),
          searchHymns(query, options),
        ]);
        return { bible, hymns };
      } finally {
        setIsLoading(false);
      }
    },
    [searchBible, searchHymns],
  );

  return { search, isLoading };
};
