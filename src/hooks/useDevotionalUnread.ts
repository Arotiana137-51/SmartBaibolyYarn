import {useCallback, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Tracks whether the user has already "seen" a given devotional date.
 *
 * The devotional itself IS the notification: there is no separate
 * notification list. A devotional whose date hasn't been seen yet drives
 * the glow at the top of the reader; the banner showing on screen marks
 * it seen (`markSeen`) and the glow stops.
 *
 * State lives in AsyncStorage under `@devotional_last_seen_date` so the
 * unread signal survives app restarts — i.e. each time you push a new
 * `docs/devotionals/<YYYY-MM-DD>.json` and the device fetches it, the user
 * gets exactly one "new" cue, regardless of how often they relaunch.
 *
 *   currentDate === null               → hasUnread === false (nothing to show)
 *   lastSeen === null                   → hasUnread === true  (first launch w/ content)
 *   lastSeen !== currentDate            → hasUnread === true  (newer content)
 *   lastSeen === currentDate            → hasUnread === false (already seen)
 *
 * `markSeen` writes the current date and flips `hasUnread` to false.
 * Calling it again with the same date is a no-op.
 */

const STORAGE_KEY = '@devotional_last_seen_date';

type Hook = {
  hasUnread: boolean;
  markSeen: () => void;
};

export const useDevotionalUnread = (currentDate: string | null): Hook => {
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Read the persisted "last seen" date once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        setLastSeen(raw);
      } catch {
        // Treat read failure as "never seen anything" — worst case the
        // user sees one extra glow until they open the banner.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const markSeen = useCallback(() => {
    if (!currentDate) return;
    if (currentDate === lastSeen) return;
    setLastSeen(currentDate);
    // Fire-and-forget — persistence failure is non-fatal (next render will
    // still treat it as seen for this session because state is updated
    // synchronously above).
    AsyncStorage.setItem(STORAGE_KEY, currentDate).catch(() => {});
  }, [currentDate, lastSeen]);

  // Avoid flashing "unread" before the AsyncStorage read settles — return
  // false until ready so the glow doesn't pulse for a frame on every cold
  // start.
  const hasUnread =
    ready && currentDate != null && currentDate !== lastSeen;

  return {hasUnread, markSeen};
};
