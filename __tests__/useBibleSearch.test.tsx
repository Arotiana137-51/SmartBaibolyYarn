import React from 'react';
import {act, create} from 'react-test-renderer';
import {useBibleSearch, BibleSearchResult} from '../src/hooks/useBibleSearch';

jest.mock('../src/services/database/DatabaseService', () => ({
  bibleDatabaseService: {
    initDatabase: jest.fn(async () => undefined),
    executeQuerySilent: jest.fn(async (sql: string) => {
      if (sql.includes('COUNT(*)')) {
        // Real match count is far above the capped detail-row limit.
        return {rows: [{book_id: 1, cnt: 500}]};
      }
      const rows = Array.from({length: 300}, (_, i) => ({
        book_id: 1,
        book_name: 'Genesisy',
        testament: 'old',
        chapter: 1,
        verse_number: i + 1,
        text: `verse ${i}`,
        score: -i,
      }));
      return {rows};
    }),
    executeQuery: jest.fn(async () => ({rows: []})),
  },
}));

type Search = (query: string) => Promise<BibleSearchResult[]>;

const Harness = ({onReady}: {onReady: (search: Search) => void}) => {
  const {searchBible} = useBibleSearch();
  onReady(searchBible);
  return null;
};

describe('useBibleSearch', () => {
  it('reports the exact match count even when detail rows are capped', async () => {
    let search: Search = async () => [];
    act(() => {
      create(<Harness onReady={fn => { search = fn; }} />);
    });

    let results: BibleSearchResult[] = [];
    await act(async () => {
      results = await search('fitiavana');
    });

    expect(results).toHaveLength(1);
    expect(results[0].verseCount).toBe(500);
  });
});
