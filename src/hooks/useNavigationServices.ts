// src/hooks/useNavigationServices.ts
import { useEffect, useState } from 'react';
import { BibleBook, useBibleData } from './useBibleData';
import { useHymnsData } from './useHymnsData';
import { BibleNavigationService, BibleNavigationState } from '../services/navigation/BibleNavigationService';
import { HymnNavigationService, HymnNavigationState } from '../services/navigation/HymnNavigationService';

export function useNavigationServices() {
  const { books, loadVerses, isLoading: bibleLoading } = useBibleData();
  const { hymns, loadHymnVerses, isLoading: hymnsLoading } = useHymnsData();

  // Initialize navigation services
  const [bibleNavService] = useState(() => new BibleNavigationService());
  const [hymnNavService] = useState(() => new HymnNavigationService());

  // Subscribe to navigation state changes
  const [bibleState, setBibleState] = useState<BibleNavigationState>(bibleNavService.getState());
  const [hymnState, setHymnState] = useState<HymnNavigationState>(hymnNavService.getState());

  useEffect(() => {
    const unsubscribeBible = bibleNavService.subscribe(setBibleState);
    const unsubscribeHymn = hymnNavService.subscribe(setHymnState);

    return () => {
      unsubscribeBible();
      unsubscribeHymn();
    };
  }, [bibleNavService, hymnNavService]);

  // Initialize default selections when data is available
  useEffect(() => {
    if (books.length > 0 && !bibleState.currentBook) {
      const defaultBook = bibleNavService.getDefaultBook(books);
      if (defaultBook) {
        bibleNavService.selectBookChapter(defaultBook.id, defaultBook.name, 119);
      }
    }
  }, [books, bibleState.currentBook, bibleNavService]);

  useEffect(() => {
    if (hymns.length > 0 && !hymnState.currentHymnId) {
      const defaultHymn = hymnNavService.getDefaultHymn(hymns);
      if (defaultHymn) {
        hymnNavService.selectHymn(
          defaultHymn.id, 
          defaultHymn.category || '', 
          defaultHymn.number
        );
      }
    }
  }, [hymns, hymnState.currentHymnId, hymnNavService]);

  // Load data when navigation state changes
  useEffect(() => {
    if (bibleState.currentBook) {
      loadVerses(bibleState.currentBook.id, bibleState.currentChapter);
    }
  }, [bibleState, loadVerses]);

  useEffect(() => {
    if (hymnState.currentHymnId) {
      loadHymnVerses(hymnState.currentHymnId);
    }
  }, [hymnState, loadHymnVerses]);

  return {
    // Bible navigation
    bibleState,
    bibleNavService,
    bibleLoading,
    
    // Hymn navigation
    hymnState,
    hymnNavService,
    hymnsLoading,
    
    // Raw data
    books,
    hymns,
  };
}
