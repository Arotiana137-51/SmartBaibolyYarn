import React from 'react';
import {act, create} from 'react-test-renderer';
import {useBibleSearch, BibleSearchResult} from '../src/hooks/useBibleSearch';

// One book with a large pile of matches plus one with only a handful — the
// exact shape that used to break. While the candidate query was capped at a
// flat row limit, the high-volume book could eat every slot before the
// smaller one got a single row, so whole books (wisdom books, prophets, the
// entire New Testament for a common word) silently vanished from the results
// even though they matched. The cap is gone: every matching row comes back
// and per-book counts are accumulated while grouping.
jest.mock('../src/services/database/DatabaseService', () => ({
  bibleDatabaseService: {
    initDatabase: jest.fn(async () => undefined),
    executeQuerySilent: jest.fn(async () => {
      const many = Array.from({length: 500}, (_, i) => ({
        book_id: 1,
        book_name: 'Genesisy',
        testament: 'old',
        chapter: 1,
        verse_number: i + 1,
        text: `verse ${i}`,
        score: -i,
      }));
      const few = Array.from({length: 3}, (_, i) => ({
        book_id: 19,
        book_name: 'Salamo',
        testament: 'old',
        chapter: 48,
        verse_number: i + 1,
        text: `salamo ${i}`,
        // Better (lower) bm25 than anything in the big book, so this one
        // should also rank first, not merely survive.
        score: -1000,
      }));
      return {rows: [...many, ...few]};
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

const runSearch = async () => {
  let search: Search = async () => [];
  act(() => {
    create(<Harness onReady={fn => { search = fn; }} />);
  });

  let results: BibleSearchResult[] = [];
  await act(async () => {
    results = await search('fitiavana');
  });
  return results;
};

describe('useBibleSearch', () => {
  it('keeps every matching book, including ones with only a few matches', async () => {
    const results = await runSearch();

    expect(results).toHaveLength(2);
    expect(results.map(r => r.bookId).sort((a, b) => a - b)).toEqual([1, 19]);
  });

  it('counts every matching verse per book rather than a truncated subset', async () => {
    const results = await runSearch();

    const genesis = results.find(r => r.bookId === 1);
    const salamo = results.find(r => r.bookId === 19);
    expect(genesis?.verseCount).toBe(500);
    expect(salamo?.verseCount).toBe(3);
  });

  it('ranks books by their best-scoring verse, not by how many they have', async () => {
    const results = await runSearch();

    // Salamo has 3 matches to Genesisy's 500, but a better bm25 score, so it
    // leads — relevance first, not volume.
    expect(results[0].bookId).toBe(19);
    expect(results[0].matchedChapter).toBe(48);
  });
});
