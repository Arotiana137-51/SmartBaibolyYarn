// src/services/navigation/BibleNavigationService.ts
import { BibleBook } from '../../hooks/useBibleData';
import { BaseNavigationService } from './NavigationService';

export interface BibleNavigationState {
  currentBook: { id: number; name: string } | null;
  currentChapter: number;
}

export class BibleNavigationService extends BaseNavigationService<BibleNavigationState, BibleBook[]> {
  constructor(initialState: BibleNavigationState = {
    currentBook: null,
    currentChapter: 1,
  }) {
    super(initialState);
  }

  // Select a specific book and chapter
  selectBookChapter(bookId: number, bookName: string, chapter: number) {
    this.state = {
      currentBook: { id: bookId, name: bookName },
      currentChapter: chapter,
    };
    this.notify();
  }

  // Navigate to previous chapter
  navigatePrevious(books: BibleBook[]): boolean {
    if (!this.state.currentBook || this.state.currentChapter <= 1) {
      return false;
    }

    this.state.currentChapter--;
    this.notify();
    return true;
  }

  // Navigate to next chapter
  navigateNext(books: BibleBook[]): boolean {
    if (!this.state.currentBook) {
      return false;
    }

    const currentBook = books.find(b => b.id === this.state.currentBook?.id);
    if (!currentBook || this.state.currentChapter >= currentBook.chapters) {
      return false;
    }

    this.state.currentChapter++;
    this.notify();
    return true;
  }

  // Get default book
  getDefaultBook(books: BibleBook[]): BibleBook | null {
    const salamo = books.find(b => b.name === 'Salamo');
    return salamo ?? books[0] ?? null;
  }

  // Get display title
  getDisplayTitle(): string {
    if (!this.state.currentBook) return '';
    return `${this.state.currentBook.name} ${this.state.currentChapter}`.trim();
  }

  // Check if navigation is possible
  canNavigatePrevious(books: BibleBook[]): boolean {
    return this.state.currentChapter > 1;
  }

  canNavigateNext(books: BibleBook[]): boolean {
    if (!this.state.currentBook) return false;
    
    const currentBook = books.find(b => b.id === this.state.currentBook?.id);
    return currentBook ? this.state.currentChapter < currentBook.chapters : false;
  }
}
