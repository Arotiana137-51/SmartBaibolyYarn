// src/services/navigation/NavigationService.ts
import { AppMode } from '../../screens/MainScreen';

export abstract class BaseNavigationService<TState, TData> {
  protected state: TState;
  protected listeners: ((state: TState) => void)[] = [];

  constructor(initialState: TState) {
    this.state = initialState;
  }

  // Subscribe to state changes
  subscribe(listener: (state: TState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners
  protected notify() {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  // Get current state
  getState(): TState {
    return { ...this.state };
  }

  // Abstract methods to be implemented by concrete services
  abstract getDisplayTitle(): string;
  abstract canNavigatePrevious(data: TData): boolean;
  abstract canNavigateNext(data: TData): boolean;
  abstract navigatePrevious(data: TData): boolean;
  abstract navigateNext(data: TData): boolean;
}

export interface NavigationManager {
  getCurrentTitle(): string;
  canGoPrevious(): boolean;
  canGoNext(): boolean;
  goPrevious(): boolean;
  goNext(): boolean;
  getMode(): AppMode;
}

export class CompositeNavigationManager implements NavigationManager {
  constructor(
    private bibleService: BaseNavigationService<any, any>,
    private hymnService: BaseNavigationService<any, any>,
    private currentMode: AppMode,
    private bibleData: any,
    private hymnData: any
  ) {}

  getCurrentTitle(): string {
    return this.currentMode === 'bible' 
      ? this.bibleService.getDisplayTitle()
      : this.hymnService.getDisplayTitle();
  }

  canGoPrevious(): boolean {
    return this.currentMode === 'bible'
      ? this.bibleService.canNavigatePrevious(this.bibleData)
      : this.hymnService.canNavigatePrevious(this.hymnData);
  }

  canGoNext(): boolean {
    return this.currentMode === 'bible'
      ? this.bibleService.canNavigateNext(this.bibleData)
      : this.hymnService.canNavigateNext(this.hymnData);
  }

  goPrevious(): boolean {
    return this.currentMode === 'bible'
      ? this.bibleService.navigatePrevious(this.bibleData)
      : this.hymnService.navigatePrevious(this.hymnData);
  }

  goNext(): boolean {
    return this.currentMode === 'bible'
      ? this.bibleService.navigateNext(this.bibleData)
      : this.hymnService.navigateNext(this.hymnData);
  }

  getMode(): AppMode {
    return this.currentMode;
  }

  setMode(mode: AppMode) {
    this.currentMode = mode;
  }
}
