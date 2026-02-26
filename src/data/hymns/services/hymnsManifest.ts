// src/data/hymns/services/hymnsManifest.ts

// Direct synchronous imports
import ffpmData from '../01_fihirana_ffpm.json';
import fanampinyData from '../02_fihirana_fanampiny.json';
import antemaData from '../03_antema.json';

export type HymnNumber = string | number;

export interface HymnData {
  laharana: string;
  sokajy?: string;
  lohateny: string;
  mpanoratra: string[];
  hira: Array<{
    andininy: number;
    tononkira: string;
    fiverenany: boolean;
  }>;
}

// Define hymn collections
type HymnCollection = {
  [key: string]: HymnData;
};

// Collections by type
const collections = {
  FFPM: ffpmData as HymnCollection,
  FANAMPINY: fanampinyData as HymnCollection,
  ANTEMA: antemaData as HymnCollection
} as const;

export type HymnBookId = keyof typeof collections;

// In-memory cache for quick lookups
const hymnCache = new Map<string, HymnData>();

// Initialize cache
Object.entries(collections).forEach(([bookId, collection]) => {
  Object.entries(collection).forEach(([hymnKey, hymn]) => {
    const cacheKey = `${bookId}:${hymnKey}`;
    hymnCache.set(cacheKey, hymn);
  });
});

/**
 * Get a hymn by book and number
 */
export function getHymn(book: HymnBookId, hymnNumber: HymnNumber): HymnData | undefined {
  const hymnKey = typeof hymnNumber === 'number' ? `hymn_${hymnNumber}` : hymnNumber;
  return collections[book][hymnKey] || hymnCache.get(`${book}:${hymnKey}`);
}

/**
 * Get all hymns from a specific book
 */
export function getHymns(book: HymnBookId): HymnData[] {
  return Object.values(collections[book]);
}

/**
 * Search hymns across all books
 */
export function searchHymns(query: string): Array<{ book: HymnBookId; hymn: HymnData }> {
  const results: Array<{ book: HymnBookId; hymn: HymnData }> = [];
  const searchTerm = query.toLowerCase();

  (Object.entries(collections) as [HymnBookId, HymnCollection][]).forEach(([bookId, collection]) => {
    Object.entries(collection).forEach(([hymnKey, hymn]) => {
      if (
        hymn.lohateny.toLowerCase().includes(searchTerm) ||
        hymn.hira.some(verse => verse.tononkira.toLowerCase().includes(searchTerm))
      ) {
        results.push({ book: bookId, hymn });
      }
    });
  });

  return results;
}

/**
 * Get all hymn books
 */
export function getHymnBooks(): Array<{ id: HymnBookId; name: string; count: number }> {
  return [
    { id: 'FFPM', name: 'Fihirana FJKM', count: Object.keys(collections.FFPM).length },
    { id: 'FANAMPINY', name: 'Fihirana Fanampiny', count: Object.keys(collections.FANAMPINY).length },
    { id: 'ANTEMA', name: 'Antema', count: Object.keys(collections.ANTEMA).length }
  ];
}