import {useEffect, useState} from 'react';
import type {Devotional} from '../devotional/schema';

export type DevotionalStatus = 'idle' | 'loading' | 'success' | 'error';

type State = {
  data: Devotional | null;
  status: DevotionalStatus;
};

// Stub for the not-yet-shipped DevotionalManager. Phase 3 of
// docs/backend-strategy.md replaces this with a fetch against
// docs/devotionals/index.json on GitHub Pages, validated through
// `isDevotional` from src/devotional/schema.ts before being stored.
// Returning idle/null today means the reveal banner stays hidden — matches
// the agreed UX: "no devotional fetched → no banner".
export const useDailyDevotional = (): State => {
  const [state] = useState<State>({data: null, status: 'idle'});

  useEffect(() => {
    // No-op. Real implementation will populate state here.
  }, []);

  return state;
};

export type {Devotional} from '../devotional/schema';
