import {useCallback, useEffect, useRef, useState} from 'react';

import {devotionalManager} from '../services/devotional/DevotionalManager';
import type {Devotional} from '../devotional/schema';

export type DevotionalStatus = 'idle' | 'loading' | 'success' | 'error';

type State = {
  data: Devotional | null;
  status: DevotionalStatus;
};

type Hook = State & {
  /**
   * Pull-to-refresh entry point — bypasses the daily throttle, hits the
   * network, and updates state. Never throws.
   */
  refresh: () => Promise<void>;
};

/**
 * Subscriber for the daily devotional.
 *
 *   1. On mount: read whatever the manager has cached for today — this is
 *      synchronous-feeling and lets the reveal banner appear without a
 *      network round-trip on warm starts.
 *   2. Kick off `checkAndUpdate()` in the background. The manager handles
 *      throttling, offline detection, validation, and cache writes. We
 *      just adopt whatever it returns.
 *
 * Status semantics:
 *   - `idle`     — never attempted (very first render)
 *   - `loading`  — attempt in flight, no cached entry to show meanwhile
 *   - `success`  — `data` is a valid Devotional (cache hit or fresh)
 *   - `error`    — last attempt produced nothing AND nothing was cached
 */
export const useDailyDevotional = (): Hook => {
  const [state, setState] = useState<State>({data: null, status: 'idle'});
  // Guard against setting state after unmount — devotional fetch races a
  // navigation away from the reader on slow networks.
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const apply = useCallback((data: Devotional | null) => {
    if (!mountedRef.current) return;
    setState({
      data,
      status: data ? 'success' : 'error',
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Cache-first: show the last-known devotional immediately if there is
      // one. The cache is persistent across days — publication cadence is
      // irregular, so the most recent entry stays on display until the
      // network produces something newer.
      const cached = await devotionalManager.getCachedAny();
      if (cancelled) return;
      if (cached) {
        setState({data: cached, status: 'success'});
      } else {
        setState({data: null, status: 'loading'});
      }

      const fresh = await devotionalManager.checkAndUpdate();
      if (cancelled) return;
      if (fresh) {
        // Newer entry landed — adopt it.
        apply(fresh);
      } else if (!cached) {
        // No cache and the network produced nothing — surface the error
        // state so the screen can show "no devotional yet".
        apply(null);
      }
      // Otherwise: cache hit and nothing newer published — keep showing
      // the cached entry, no state change needed.
    })();

    return () => {
      cancelled = true;
    };
  }, [apply]);

  const refresh = useCallback(async () => {
    setState(s => ({...s, status: s.data ? 'success' : 'loading'}));
    const fresh = await devotionalManager.refresh();
    if (fresh) {
      apply(fresh);
      return;
    }
    // No newer entry. If we already had something, keep showing it —
    // a refresh that finds nothing new should not flip the screen to an
    // error state.
    setState(s => ({...s, status: s.data ? 'success' : 'error'}));
  }, [apply]);

  return {...state, refresh};
};

export type {Devotional} from '../devotional/schema';
