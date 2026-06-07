import {useCallback, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {bibleDatabaseService} from '../services/database/DatabaseService';
import {useJesusName} from '../contexts/JesusNameContext';
import {
  buildChapterDisplay,
  chapterMarksKey,
  type ChapterMark,
} from '../utils/chapterMarks';
import type {BibleVerse} from './useBibleData';

/**
 * Lists every verse note the user has authored, across the whole Bible.
 *
 * Notes are stored per chapter under `chapterMarks:${bookId}:${chapter}` as a
 * ChapterMark[] (see useChapterMarks / chapterMarks.ts). A note's {start,end}
 * are character offsets into the chapter's cleaned text, NOT a verse number, so
 * to present a note like a favorite (book + chapter:verse + verse text) we have
 * to rebuild each chapter's verseSpans via buildChapterDisplay and find the span
 * containing the note's start offset.
 */

export interface NoteEntry {
  id: string; // the underlying ChapterMark id
  bookId: number;
  bookName: string;
  chapter: number;
  verseNumber: number;
  noteText: string;
  verseText: string;
  createdAt: string;
}

const CHAPTER_MARKS_KEY_RE = /^chapterMarks:(\d+):(\d+)$/;

const isNoteMark = (m: unknown): m is ChapterMark => {
  if (typeof m !== 'object' || m === null) return false;
  const c = m as Record<string, unknown>;
  return (
    typeof c.id === 'string' &&
    typeof c.start === 'number' &&
    typeof c.end === 'number' &&
    c.style === 'note' &&
    typeof c.note === 'string' &&
    c.note.trim().length > 0
  );
};

type BookRow = {id: number; name: string};

export const useAllNotes = () => {
  const {transformText} = useJesusName();
  const [entries, setEntries] = useState<NoteEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      await bibleDatabaseService.initDatabase();

      const keys: readonly string[] = await AsyncStorage.getAllKeys();
      const noteKeys = keys.filter(k => k.startsWith('chapterMarks:'));
      if (noteKeys.length === 0) {
        setEntries([]);
        return;
      }

      const pairs = await AsyncStorage.multiGet(noteKeys);

      // Group note marks by (bookId, chapter).
      const byChapter = new Map<
        string,
        {bookId: number; chapter: number; marks: ChapterMark[]}
      >();
      for (const [key, value] of pairs) {
        const match = CHAPTER_MARKS_KEY_RE.exec(key);
        if (!match || !value) continue;
        const bookId = Number(match[1]);
        const chapter = Number(match[2]);
        let parsed: unknown;
        try {
          parsed = JSON.parse(value);
        } catch {
          continue;
        }
        if (!Array.isArray(parsed)) continue;
        const notes = parsed.filter(isNoteMark);
        if (notes.length === 0) continue;
        byChapter.set(key, {bookId, chapter, marks: notes});
      }

      if (byChapter.size === 0) {
        setEntries([]);
        return;
      }

      // Book id -> name (one query).
      const bookRows = await bibleDatabaseService.executeQuery<BookRow>(
        'SELECT id, name FROM Books',
      );
      const bookNames = new Map<number, string>();
      for (const b of bookRows.rows) {
        bookNames.set(b.id, b.name);
      }

      const result: NoteEntry[] = [];
      for (const {bookId, chapter, marks} of byChapter.values()) {
        const verseRows = await bibleDatabaseService.executeQuery<BibleVerse>(
          'SELECT id, book_id, chapter, verse_number, text, title FROM Verses WHERE book_id = ? AND chapter = ? ORDER BY verse_number',
          [bookId, chapter],
        );
        const verses = verseRows.rows;
        if (verses.length === 0) continue;

        const {verseSpans} = buildChapterDisplay(verses, transformText);
        const bookName = bookNames.get(bookId) ?? '';

        for (const mark of marks) {
          // The verse whose span contains the note's start offset; fall back to
          // the last span if the offset drifted past the end (e.g. transformText
          // variant changed after the note was created).
          const span =
            verseSpans.find(s => mark.start >= s.start && mark.start < s.end) ??
            verseSpans[verseSpans.length - 1];
          if (!span) continue;
          const verse = verses.find(v => v.verse_number === span.verseNumber);
          result.push({
            id: mark.id,
            bookId,
            bookName,
            chapter,
            verseNumber: span.verseNumber,
            noteText: mark.note ?? '',
            verseText: verse?.text ?? '',
            createdAt: mark.createdAt,
          });
        }
      }

      // Bible order: book, then chapter, then verse.
      result.sort(
        (a, b) =>
          a.bookId - b.bookId ||
          a.chapter - b.chapter ||
          a.verseNumber - b.verseNumber,
      );

      setEntries(result);
    } catch (error) {
      console.error('Error loading notes:', error);
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [transformText]);

  const removeNote = useCallback(async (entry: NoteEntry) => {
    try {
      const key = chapterMarksKey(entry.bookId, entry.chapter);
      const raw = await AsyncStorage.getItem(key);
      const arr: ChapterMark[] = raw ? (JSON.parse(raw) as ChapterMark[]) : [];
      const next = arr.filter(m => m.id !== entry.id);
      if (next.length === 0) {
        await AsyncStorage.removeItem(key);
      } else {
        await AsyncStorage.setItem(key, JSON.stringify(next));
      }
      setEntries(prev => prev.filter(e => e.id !== entry.id));
    } catch (error) {
      console.error('Error removing note:', error);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {entries, isLoading, removeNote, reload: load};
};
