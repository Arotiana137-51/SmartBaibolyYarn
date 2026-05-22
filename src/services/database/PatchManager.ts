/**
 * OTA patch channel for the Bible and Hymns databases.
 *
 * Why: cellular data is expensive for our Madagascar users. A typo fix
 * shouldn't cost them a full APK update — it should cost a few hundred
 * bytes. This module pulls tiny static JSON patch files from GitHub Pages
 * on app launch and applies them to the writable SQLite copy.
 *
 * Boot contract: this module MUST NEVER block app readiness. Every call
 * site wraps `checkAndApply()` in try/catch and treats failure as silent.
 * Offline users, throttled users, broken DNS — all fine. The app just
 * keeps using whatever content is already on disk.
 *
 * Trigger: called once per app launch from DatabaseContext, debounced to
 * once per 5 minutes (so hot-relaunches during development don't pile up
 * requests). NetInfo gates the network call so offline users spend zero
 * bytes.
 *
 * Hosting: see PATCH_BASE_URL below. Files live in /docs/patches/ of the
 * public repo, served via GitHub Pages — no backend, no auth, no cost.
 * If we ever migrate (Cloudflare Pages, custom domain), it's one line.
 */

import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  bibleDatabaseService,
  hymnsDatabaseService,
} from './DatabaseService';
import {
  isValidPatchIndex,
  parsePatchFile,
  type PatchIndex,
  type PatchTarget,
} from './patchSchema';

// Public-read GitHub Pages off the Arotiana137-51/e-Baiboly repo. Pages
// must be enabled in repo settings → Pages → "Build from /docs on main".
const PATCH_BASE_URL =
  'https://arotiana137-51.github.io/e-Baiboly/patches';

// Skip the network call if we've checked successfully in the last 5 min.
const CHECK_THROTTLE_MS = 5 * 60 * 1000;

// AbortController budget per HTTP request — matches issueReportQueue.ts.
const FETCH_TIMEOUT_MS = 15_000;

const LAST_CHECK_STORAGE_KEY = '@patch_manager_last_check';

type Target = {
  name: PatchTarget;
  service: typeof bibleDatabaseService;
};

const TARGETS: Target[] = [
  {name: 'bible', service: bibleDatabaseService},
  {name: 'hymns', service: hymnsDatabaseService},
];

/**
 * One-shot fetch with timeout. Returns `null` on any failure — the caller
 * decides whether to log or move on. We don't throw because patch failures
 * are expected (offline, 404 for a not-yet-published patch, etc.).
 */
async function fetchJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {Accept: 'application/json'},
      signal: controller.signal,
    });
    if (!res.ok) {
      return null;
    }
    const ct = res.headers.get('content-type') ?? '';
    // GitHub Pages serves .json with content-type: application/json. Anything
    // else likely means we hit a 404 HTML page through a redirect.
    if (!ct.includes('application/json') && !ct.includes('text/plain')) {
      return null;
    }
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
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

async function shouldThrottle(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(LAST_CHECK_STORAGE_KEY);
    if (!raw) return false;
    const last = Number.parseInt(raw, 10);
    if (!Number.isFinite(last)) return false;
    return Date.now() - last < CHECK_THROTTLE_MS;
  } catch {
    return false;
  }
}

async function markChecked(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_CHECK_STORAGE_KEY, String(Date.now()));
  } catch {
    // best-effort
  }
}

/**
 * For a single target, fetch the index, compute pending patches, and apply
 * them in order. Stops at the first failure (per user decision: resilient
 * over all-or-nothing) — the next launch retries from where we stopped.
 *
 * Returns the number of patches successfully applied (for logging only).
 */
async function syncTarget(target: Target): Promise<number> {
  const indexUrl = `${PATCH_BASE_URL}/${target.name}/index.json`;
  const index = await fetchJson<unknown>(indexUrl);
  if (!index || !isValidPatchIndex(index)) {
    return 0;
  }

  const onDisk = await target.service.getOnDiskUserVersion();
  if (onDisk >= index.latest) {
    // Nothing to do; happy path most of the time.
    return 0;
  }

  if (onDisk < index.minBaseline) {
    // Device too far behind for the incremental chain to make sense.
    // The next APK release ships a re-extract that will catch them up
    // through the bundled DB version-stamp check in initDatabase.
    console.log(
      `[PatchManager:${target.name}] on-disk=${onDisk} < minBaseline=${index.minBaseline}; awaiting APK refresh`
    );
    return 0;
  }

  const pending = (index as PatchIndex).patches
    .filter(v => v > onDisk)
    .sort((a, b) => a - b);

  let applied = 0;
  for (const version of pending) {
    const patchUrl = `${PATCH_BASE_URL}/${target.name}/${version}.json`;
    const raw = await fetchJson<unknown>(patchUrl);
    const parsed = parsePatchFile(raw, target.name, version);
    if (!parsed) {
      console.warn(
        `[PatchManager:${target.name}] patch ${version} missing or invalid; stopping chain`
      );
      break;
    }

    try {
      if (parsed.appliesTo === 'bible') {
        await bibleDatabaseService.applyBiblePatch(parsed);
      } else {
        await hymnsDatabaseService.applyHymnsPatch(parsed);
      }
      applied += 1;
      console.log(
        `[PatchManager:${target.name}] applied patch ${version}`
      );
    } catch (error) {
      console.warn(
        `[PatchManager:${target.name}] patch ${version} apply failed; stopping chain:`,
        error
      );
      break;
    }
  }

  return applied;
}

export const patchManager = {
  /**
   * Entry point — call once after DatabaseService.initDatabase() has
   * resolved for both Bible and Hymns. Idempotent (throttled), safe to
   * call multiple times, and guaranteed not to throw: catches every
   * error internally so the caller can `await` without try/catch and
   * still trust the app will boot.
   */
  async checkAndApply(): Promise<void> {
    try {
      if (await shouldThrottle()) {
        return;
      }
      if (!(await isOnline())) {
        return;
      }

      let total = 0;
      for (const target of TARGETS) {
        total += await syncTarget(target);
      }

      if (total > 0) {
        console.log(`[PatchManager] applied ${total} patch(es) this launch`);
      }
      await markChecked();
    } catch (error) {
      // Boot contract: never propagate. Log and move on.
      console.warn('[PatchManager] checkAndApply failed:', error);
    }
  },
};
