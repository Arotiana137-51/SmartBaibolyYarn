// src/services/navigation/HymnNavigationService.ts
import { Hymn } from '../../hooks/useHymnsData';
import { BaseNavigationService } from './NavigationService';

export interface HymnNavigationState {
  currentHymnId: string | null;
  currentHymnNumber: number | null;
  currentHymnCategory: string | null;
}

export class HymnNavigationService extends BaseNavigationService<HymnNavigationState, Hymn[]> {
  constructor(initialState: HymnNavigationState = {
    currentHymnId: null,
    currentHymnNumber: null,
    currentHymnCategory: null,
  }) {
    super(initialState);
  }

  // Select a specific hymn
  selectHymn(hymnId: string, category: string, number: number) {
    this.state = {
      currentHymnId: hymnId,
      currentHymnNumber: number,
      currentHymnCategory: category,
    };
    this.notify();
  }

  // Navigate to previous hymn in same category
  navigatePrevious(hymns: Hymn[]): boolean {
    if (!this.state.currentHymnNumber || !this.state.currentHymnCategory) {
      return false;
    }

    const prevHymn = hymns.find(
      h => h.category === this.state.currentHymnCategory && 
           h.number === this.state.currentHymnNumber - 1
    );

    if (prevHymn) {
      this.selectHymn(prevHymn.id, prevHymn.category || '', prevHymn.number);
      return true;
    }

    return false;
  }

  // Navigate to next hymn in same category
  navigateNext(hymns: Hymn[]): boolean {
    if (!this.state.currentHymnNumber || !this.state.currentHymnCategory) {
      return false;
    }

    const nextHymn = hymns.find(
      h => h.category === this.state.currentHymnCategory && 
           h.number === this.state.currentHymnNumber + 1
    );

    if (nextHymn) {
      this.selectHymn(nextHymn.id, nextHymn.category || '', nextHymn.number);
      return true;
    }

    return false;
  }

  // Get default hymn for a category
  getDefaultHymn(hymns: Hymn[], preferredCategory: string = 'ffpm'): Hymn | null {
    // Try to find ffpm_1 first
    const ffpm1 = hymns.find(h => h.id === 'ffpm_1' || (h.category === 'ffpm' && h.number === 1));
    
    // Fall back to first hymn in preferred category
    const firstInCategory = hymns
      .filter(h => h.category === preferredCategory)
      .sort((a, b) => a.number - b.number)[0];

    return ffpm1 ?? firstInCategory ?? hymns[0] ?? null;
  }

  // Get display title
  getDisplayTitle(): string {
    if (!this.state.currentHymnNumber) return '';
    
    const categoryText = this.state.currentHymnCategory 
      ? ` (${this.state.currentHymnCategory.toUpperCase()})` 
      : '';
    
    return `Fihirana ${this.state.currentHymnNumber}${categoryText}`;
  }

  // Check if navigation is possible
  canNavigatePrevious(hymns: Hymn[]): boolean {
    if (!this.state.currentHymnNumber || !this.state.currentHymnCategory) {
      return false;
    }
    return this.state.currentHymnNumber > 1;
  }

  canNavigateNext(hymns: Hymn[]): boolean {
    if (!this.state.currentHymnNumber || !this.state.currentHymnCategory) {
      return false;
    }
    
    const maxInCategory = Math.max(
      ...hymns.filter(h => h.category === this.state.currentHymnCategory)
             .map(h => h.number)
    );
    
    return this.state.currentHymnNumber < maxInCategory;
  }
}
