import React, {useCallback, useEffect, useRef} from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import DevotionalView from './DevotionalView';
import DevotionalLoadingBar from './DevotionalLoadingBar';
import {useDailyDevotional} from '../../hooks/useDailyDevotional';
import {useInAppNotifications} from '../../contexts/InAppNotificationContext';
import {useTheme} from '../../contexts/ThemeContext';

const ENTER_MS = 320;
const EXIT_MS = 260;
// How far past the end of the devotional content the user must keep
// pulling to dismiss. Mirrors the iOS-style "release-past-threshold" feel:
// small accidental overscrolls don't close, but a deliberate continued
// scroll-down does.
const DISMISS_OVERSCROLL = 70;

type Props = {
  open: boolean;
  // Vertical offset (px) at which the overlay starts. Typically the bottom
  // of TopBar + Glow so the overlay lives between them and the reader.
  topOffset: number;
  onDismiss: () => void;
};

// Full-screen-below-TopBar sheet that hosts today's devotional. Slides down
// from above on open, slides back up on dismiss. Dismiss is gesture-driven:
// once the user has scrolled past the end of the content AND continues to
// drag, the overlay slides away.
export const DevotionalOverlay: React.FC<Props> = ({
  open,
  topOffset,
  onDismiss,
}) => {
  const {height: screenHeight} = useWindowDimensions();
  const {data} = useDailyDevotional();
  const {unreadCount, markAllSeen} = useInAppNotifications();
  const {theme} = useTheme();
  // -screenHeight = off-screen above; 0 = settled at topOffset
  const translateY = useSharedValue(-screenHeight);
  // Track whether we're already dismissing so a fast finger doesn't double-fire.
  const dismissingRef = useRef(false);
  // The user must have actually scrolled within the overlay before we'll
  // honor a dismiss-by-overscroll. Otherwise an initial flick of the finger
  // (which can register as a tiny content-offset jitter at mount) would
  // close it instantly.
  const hasScrolledRef = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    translateY.value = withTiming(
      -screenHeight,
      {duration: EXIT_MS, easing: Easing.in(Easing.cubic)},
      finished => {
        if (finished) runOnJS(onDismiss)();
      },
    );
  }, [translateY, screenHeight, onDismiss]);

  useEffect(() => {
    if (open) {
      dismissingRef.current = false;
      hasScrolledRef.current = false;
      translateY.value = withTiming(0, {
        duration: ENTER_MS,
        easing: Easing.out(Easing.cubic),
      });
      // Clear the glow as soon as the overlay starts entering — visually
      // pairs with the slide-down rather than waiting for the user to dismiss.
      if (unreadCount > 0) markAllSeen();
    } else {
      // Reset to off-screen above so the next open animates in cleanly.
      translateY.value = -screenHeight;
      dismissingRef.current = false;
      hasScrolledRef.current = false;
    }
  }, [open, translateY, screenHeight, unreadCount, markAllSeen]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{translateY: translateY.value}],
  }));

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const {contentOffset, contentSize, layoutMeasurement} = e.nativeEvent;
      // Mark the moment the user has done a non-trivial scroll within the
      // content. Anything past ~24px counts — below that, it's just
      // bounce-back noise.
      if (contentOffset.y > 24) {
        hasScrolledRef.current = true;
      }
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      // Negative distance means the user has dragged past the end of the
      // content (only possible on iOS bounce or via the RefreshControl-less
      // overscroll path on Android). Fire dismiss when they've pulled past
      // the threshold AND we know they engaged with the content.
      if (
        hasScrolledRef.current &&
        distanceFromBottom < -DISMISS_OVERSCROLL
      ) {
        dismiss();
      }
    },
    [dismiss],
  );

  const handleScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      // Android handoff: Android doesn't expose iOS-style bounce overscroll,
      // so once the user releases the drag at the very end of the content,
      // treat that as the dismiss signal.
      if (!hasScrolledRef.current) return;
      const {contentOffset, contentSize, layoutMeasurement} = e.nativeEvent;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      // distanceFromBottom <= 1 means "scrolled to the literal bottom" with
      // a 1px slop for sub-pixel rounding. Combined with the user having
      // already scrolled past 24px, this is the deliberate end-of-content
      // dismiss gesture.
      if (distanceFromBottom <= 1) {
        dismiss();
      }
    },
    [dismiss],
  );

  if (!open && !data) return null;

  return (
    <Animated.View
      pointerEvents={open ? 'auto' : 'none'}
      style={[
        styles.overlay,
        {top: topOffset, backgroundColor: theme.colors.backgroundPrimary},
        animatedStyle,
      ]}>
      <View
        style={[
          styles.header,
          {backgroundColor: theme.colors.navBackground},
        ]}>
        {/* No title — the X is the only chrome. */}
        <View style={styles.headerSpacer} />
        <Pressable
          onPress={dismiss}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Hidio"
          style={styles.closeButton}>
          <Text style={styles.closeIcon}>×</Text>
        </Pressable>
      </View>
      {data ? (
        <DevotionalView
          devotional={data}
          // We deliberately do NOT pass onRefresh — the in-overlay pull
          // gesture is reserved for the open/dismiss interaction. A second
          // pull-to-refresh inside an overlay that itself was opened by a
          // pull would be confusing.
          onScroll={handleScroll}
          onScrollEndDrag={handleScrollEndDrag}
          scrollEventThrottle={16}
        />
      ) : (
        <DevotionalLoadingBar />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
  },
  headerSpacer: {
    flex: 1,
  },
  closeButton: {
    paddingHorizontal: 4,
  },
  closeIcon: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '400',
    lineHeight: 26,
  },
});

export default DevotionalOverlay;
