export type CultBibleEntry = {
  id: string;
  type: 'bible';
  bookId: number;
  bookName: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  label: string;
};

export type CultHymnEntry = {
  id: string;
  type: 'hymn';
  hymnId: string;
  category: string;
  hymnNumber: number;
  title: string;
  label: string;
};

export type CultEntry = CultBibleEntry | CultHymnEntry;

export const isCultBibleEntry = (e: CultEntry): e is CultBibleEntry =>
  e.type === 'bible';

export const isCultHymnEntry = (e: CultEntry): e is CultHymnEntry =>
  e.type === 'hymn';

export const generateCultEntryId = (): string =>
  `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const buildBibleLabel = (
  bookName: string,
  chapter: number,
  verseStart: number,
  verseEnd: number,
): string =>
  verseStart === verseEnd
    ? `${bookName} ${chapter}:${verseStart}`
    : `${bookName} ${chapter}:${verseStart}-${verseEnd}`;

export const buildHymnLabel = (
  category: string,
  hymnNumber: number,
  title: string,
): string => `${category} ${hymnNumber} — ${title}`;
