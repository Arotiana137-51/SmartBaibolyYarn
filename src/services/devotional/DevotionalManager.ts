/**
 * DevotionalManager — fetches the daily devotional via ContentSource,
 * validates it, and caches the latest day's payload to AsyncStorage so
 * the reader stays fully offline after the first successful fetch.
 *
 * Why a manager (not just a hook):
 *   - Multiple call sites (reveal banner, dedicated screen) need the same
 *     answer. Centralising the fetch+cache avoids racing AsyncStorage and
 *     hitting GitHub Pages twice on a cold start.
 *   - Cache + validation policy lives in one file, independent of any UI
 *     state. The hook is a thin subscriber.
 *
 * Contract:
 *   - Never throws. Failures collapse to "no devotional today" and the
 *     reveal banner stays hidden (matches the agreed UX).
 *   - Cache-first: a previously fetched devotional is returned immediately
 *     even when offline. The network call upgrades the cache when a newer
 *     entry is published; it never blocks readers.
 *   - Throttled per local date so a hot-relaunch doesn't hammer the CDN.
 *     Pull-to-refresh can call `refresh()` to bypass the throttle.
 *
 * Transport: delegated to ContentSource (see ContentSourceFactory). Today
 * that's GitHubPagesSource; a future migration is one flip.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import {ContentSourceError, type ContentSource} from '../content/ContentSource';
import {getContentSource} from '../content/ContentSourceFactory';
import {isDevotional, type Devotional} from '../../devotional/schema';

const CACHE_KEY = '@devotional_manager_cache_v1';
const LAST_CHECK_KEY = '@devotional_manager_last_check_day';

type CacheEntry = {
  // The local date the entry was fetched for ("YYYY-MM-DD"). Used to
  // decide whether the cached devotional is still "today's".
  fetchedForDate: string;
  devotional: Devotional;
};

// Index shape served at `<base>/devotionals/index.json`. Kept narrow on
// purpose — `available` lets us window-back if today is missing, `latest`
// is the fast path. Anything else is ignored.
type DevotionalIndex = {
  latest: string;
  available: string[];
};

const isDevotionalIndex = (v: unknown): v is DevotionalIndex => {
  if (typeof v !== 'object' || v === null) return false;
  const i = v as Record<string, unknown>;
  if (typeof i.latest !== 'string' || i.latest.length === 0) return false;
  if (!Array.isArray(i.available)) return false;
  return i.available.every(d => typeof d === 'string' && d.length > 0);
};

const localDateKey = (d: Date = new Date()): string => {
  // ISO YYYY-MM-DD in the device's local time. Devotionals are "for today"
  // from the user's perspective, not UTC's.
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

async function readCache(): Promise<CacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return null;
    const entry = parsed as Record<string, unknown>;
    if (typeof entry.fetchedForDate !== 'string') return null;
    if (!isDevotional(entry.devotional)) return null;
    return {
      fetchedForDate: entry.fetchedForDate,
      devotional: entry.devotional,
    };
  } catch {
    return null;
  }
}

async function writeCache(entry: CacheEntry): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // best-effort
  }
}

async function alreadyCheckedToday(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(LAST_CHECK_KEY);
    return raw === localDateKey();
  } catch {
    return false;
  }
}

async function markCheckedToday(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_CHECK_KEY, localDateKey());
  } catch {
    // best-effort
  }
}

async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch {
    return false;
  }
}

/**
 * Decide which date to fetch given today's local date and the channel index.
 *   - If today is in `available`, fetch today.
 *   - Otherwise fall back to `latest` (most recent published entry).
 *
 * Rationale: a publishing gap (maintainer skipped a day, timezone skew at
 * midnight) shouldn't leave the user with nothing. They'd rather see
 * yesterday's devotional than an empty banner.
 */
function pickTargetDate(today: string, index: DevotionalIndex): string {
  if (index.available.includes(today)) return today;
  return index.latest;
}

async function fetchAndValidate(
  source: ContentSource,
  today: string,
): Promise<Devotional | null> {
  try {
    const indexRaw = await source.fetchIndex('devotional');
    if (!isDevotionalIndex(indexRaw)) {
      return null;
    }
    const targetDate = pickTargetDate(today, indexRaw);
    const entryRaw = await source.fetchEntry('devotional', targetDate);
    if (!isDevotional(entryRaw)) {
      return null;
    }
    return entryRaw;
  } catch (err) {
    if (err instanceof ContentSourceError) {
      // 404 / network blip — expected, not fatal. Stay quiet.
      return null;
    }
    return null;
  }
}

// Resolve the source lazily inside each call rather than at module-load
// time. Keeps unit tests deterministic when they swap the source via
// `__setContentSourceForTests` between cases.
const source = (): ContentSource => getContentSource();

export const devotionalManager = {
  /**
   * Returns the cached devotional if one exists and was fetched for today;
   * null otherwise. Pure read, no network. Cheap enough to call on every
   * render or focus event.
   */
  async getCachedForToday(): Promise<Devotional | null> {
    const cache = await readCache();
    if (!cache) return null;
    if (cache.fetchedForDate !== localDateKey()) return null;
    return cache.devotional;
  },

  /**
   * Returns whatever's in the cache, even if it was fetched on a previous
   * day. Used as a graceful fallback when the network call hasn't returned
   * yet — better than a flash of empty state.
   */
  async getCachedAny(): Promise<Devotional | null> {
    const cache = await readCache();
    return cache?.devotional ?? null;
  },

  /**
   * Idempotent per-day refresh. Safe to call on every app foreground —
   * the throttle ensures we only hit the CDN once per local date.
   * Returns the validated devotional if one was fetched, null otherwise
   * (offline, throttled, no entry published, validation failed).
   *
   * Never throws.
   */
  async checkAndUpdate(): Promise<Devotional | null> {
    try {
      if (await alreadyCheckedToday()) {
        // Still return what's cached — caller may have just mounted and
        // want the value back.
        return await this.getCachedForToday();
      }
      if (!(await isOnline())) {
        return await this.getCachedForToday();
      }

      const today = localDateKey();
      const fetched = await fetchAndValidate(source(), today);
      if (!fetched) {
        // Don't mark "checked" on failure — we want to retry on next launch.
        return await this.getCachedForToday();
      }

      await writeCache({fetchedForDate: today, devotional: fetched});
      await markCheckedToday();
      return fetched;
    } catch (error) {
      console.warn('[DevotionalManager] checkAndUpdate failed:', error);
      return null;
    }
  },

  /**
   * Force a fetch, bypassing the daily throttle. Use for pull-to-refresh.
   * Still respects offline state and validation. Never throws.
   */
  async refresh(): Promise<Devotional | null> {
    try {
      if (!(await isOnline())) {
        return await this.getCachedForToday();
      }
      const today = localDateKey();
      const fetched = await fetchAndValidate(source(), today);
      if (!fetched) {
        return await this.getCachedForToday();
      }
      await writeCache({fetchedForDate: today, devotional: fetched});
      await markCheckedToday();
      return fetched;
    } catch (error) {
      console.warn('[DevotionalManager] refresh failed:', error);
      return null;
    }
  },
};
