import {useCallback, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {chapterMarksKey, type ChapterMark} from '../utils/chapterMarks';

const isMark = (m: any): m is ChapterMark =>
  m &&
  typeof m.id === 'string' &&
  typeof m.start === 'number' &&
  typeof m.end === 'number' &&
  typeof m.style === 'string' &&
  m.end > m.start &&
  (m.note === undefined || typeof m.note === 'string');

export const useChapterMarks = (bookId: number | null, chapter: number | null) => {
  const [marks, setMarks] = useState<ChapterMark[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (bookId == null || chapter == null) {
      setMarks([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const key = chapterMarksKey(bookId, chapter);
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const validMarks = Array.isArray(parsed) ? parsed.filter(isMark) : [];
        setMarks(validMarks);
      } else {
        setMarks([]);
      }
    } catch (error) {
      console.error('Error loading chapter marks:', error);
      setMarks([]);
    } finally {
      setIsLoading(false);
    }
  }, [bookId, chapter]);

  useEffect(() => {
    reload();
  }, [reload]);

  const persist = useCallback(
    async (next: ChapterMark[]) => {
      if (bookId == null || chapter == null) return;
      try {
        const key = chapterMarksKey(bookId, chapter);
        if (next.length === 0) {
          await AsyncStorage.removeItem(key);
        } else {
          await AsyncStorage.setItem(key, JSON.stringify(next));
        }
      } catch (error) {
        console.error('Error saving chapter marks:', error);
      }
    },
    [bookId, chapter],
  );

  const setAllMarks = useCallback(
    async (next: ChapterMark[]) => {
      setMarks(next);
      await persist(next);
    },
    [persist],
  );

  const addMark = useCallback(
    async (mark: ChapterMark) => {
      const next = [...marks, mark];
      setMarks(next);
      await persist(next);
    },
    [marks, persist],
  );

  const removeMark = useCallback(
    async (id: string) => {
      const next = marks.filter(m => m.id !== id);
      setMarks(next);
      await persist(next);
    },
    [marks, persist],
  );

  const clearChapter = useCallback(async () => {
    setMarks([]);
    await persist([]);
  }, [persist]);

  return {
    marks,
    isLoading,
    addMark,
    removeMark,
    clearChapter,
    setAllMarks,
    reload,
  };
};
