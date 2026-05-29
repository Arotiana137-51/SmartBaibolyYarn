import {useCallback, useState} from 'react';

// Returns RefreshControl props for the reader FlatLists. Pulling down at
// the top of the list fires the supplied callback — typically opening the
// inline DevotionalOverlay above the reader.
//
// Why RefreshControl rather than scroll-offset detection: on Android, FlatList
// doesn't overscroll into negative contentOffset.y the way iOS does, so the
// `onScroll`-with-threshold trick never fires there. RefreshControl is the
// idiomatic pull-down on both platforms and works without custom gestures.
//
// `refreshing` is toggled briefly so the platform spinner appears as the
// overlay transition starts, then resets after the slide-in has taken over.
export const useDevotionalPullTrigger = (onTrigger: () => void) => {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    onTrigger();
    // Reset the spinner state shortly after the overlay's slide-in has
    // started. Without this, the spinner sticks if the overlay dismisses
    // before this hook re-runs.
    setTimeout(() => setRefreshing(false), 600);
  }, [onTrigger]);

  return {refreshing, onRefresh};
};
