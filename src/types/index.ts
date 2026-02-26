// src/types/index.ts
export interface BibleBook {
  id: number;
  name: string;
  testament: 'old' | 'new';
  chapters: number;
}

export interface BibleVerse {
  id: number;
  book_id: number;
  chapter: number;
  verse_number: number;
  text: string;
}

export interface Hymn {
  id: number;
  number: number;
  category?: string;
  title?: string;
  authors?: string[];
}

export interface HymnVerse {
  id: number;
  hymn_id: number;
  verse_number: number;
  text: string;
  is_chorus: boolean;
}
