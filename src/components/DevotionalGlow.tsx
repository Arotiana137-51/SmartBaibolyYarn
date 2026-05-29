import React, {useEffect} from 'react';
import {Pressable, StyleSheet, useWindowDimensions} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {Defs, Ellipse, RadialGradient, Stop} from 'react-native-svg';
import {useTheme} from '../contexts/ThemeContext';
import {useInAppNotifications} from '../contexts/InAppNotificationContext';
import {hexToRgba} from '../utils/colorUtils';

const BAR_HEIGHT = 3;
const ELLIPSE_DEPTH = 65;
const INTENSITY = 0.75;
const UNREAD_OPACITY = 1.0 * INTENSITY;
// Opacity of the bar when there's nothing fresh to announce. Stays as a
// thin tap target so users can re-open today's devotional any time.
const SEEN_BAR_OPACITY = 0.35;
const FADE_OUT_MS = 280;
// Scroll distance (px) over which the ellipse radius grows from baseline to
// its cap. Past this the radius holds — the glow doesn't keep ballooning on
// long chapters.
const SCROLL_RANGE_PX = 300;
const SCALE_MIN = 0.95;
const SCALE_MAX = 2.5;

// Horizontal glow strip rendered below TopBar: 3px solid bar + a half-ellipse
// radial gradient projection.
// Gradient is static (rasterized once); only opacity + scaleY animate on the
// UI thread via Reanimated. Sized to actual rendered area to keep VRAM small
// on low-end Android.
//
// Two visual states, both tappable (Pressable always mounted):
//   - unreadCount > 0:  ellipse fully visible, bar bright. "New devotional."
//   - unreadCount = 0:  ellipse faded out, bar dimmed to SEEN_BAR_OPACITY.
//                       Still a permanent shortcut into DevotionalScreen.
//
// The ellipse radius (vertical scale) is driven by the reader's scroll
// position when `scrollY` is provided — pulled up from MainScreen and written
// by Bible/Hymn readers via useAnimatedScrollHandler. Past SCROLL_RANGE_PX
// the radius caps so it doesn't keep growing on long chapters.
type Props = {
  // Called when the user taps the glow. MainScreen opens the inline
  // DevotionalOverlay in response.
  onOpen: () => void;
  // Reader scroll offset in px. When omitted the glow stays at baseline
  // radius (screens without a reader still mount the glow without growth).
  scrollY?: SharedValue<number>;
};

export const DevotionalGlow: React.FC<Props> = ({onOpen, scrollY}) => {
  const {theme} = useTheme();
  const {width: screenWidth} = useWindowDimensions();
  const {unreadCount, markAllSeen} = useInAppNotifications();
  // Match the ellipse to the actual screen width so the visible glow reaches
  // both edges. Recomputed on rotation / split-screen via useWindowDimensions.
  const ellipseWidth = screenWidth;
  const ellipseRx = ellipseWidth / 2;
  const opacity = useSharedValue(UNREAD_OPACITY);
  const barOpacity = useSharedValue(1);
  // Local fallback so the animated style can always read a SharedValue
  // (avoids conditional hook wiring when the parent doesn't pass scrollY).
  const fallbackScroll = useSharedValue(0);
  const driverScroll = scrollY ?? fallbackScroll;

  const hasUnread = unreadCount > 0;

  useEffect(() => {
    if (!hasUnread) {
      opacity.value = withTiming(0, {
        duration: FADE_OUT_MS,
        easing: Easing.out(Easing.cubic),
      });
      barOpacity.value = withTiming(SEEN_BAR_OPACITY, {
        duration: FADE_OUT_MS,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }
    barOpacity.value = withTiming(1, {duration: FADE_OUT_MS});
    opacity.value = withTiming(UNREAD_OPACITY, {
      duration: FADE_OUT_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [hasUnread, opacity, barOpacity]);

  const ellipseAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      driverScroll.value,
      [0, SCROLL_RANGE_PX],
      [SCALE_MIN, SCALE_MAX],
      Extrapolation.CLAMP,
    );
    return {
      opacity: opacity.value,
      transform: [{scaleY: scale}],
    };
  });

  const barAnimatedStyle = useAnimatedStyle(() => ({
    opacity: barOpacity.value,
  }));

  const glowColor = theme.colors.accentBlue;
  const accentColor = hexToRgba(glowColor, 0.19);

  const handlePress = () => {
    onOpen();
    // Mark seen synchronously so the glow transitions to its dimmed state
    // immediately instead of waiting for the overlay to fully enter.
    if (hasUnread) markAllSeen();
  };

  return (
    <Pressable
      onPress={handlePress}
      // hitSlop expands the touch target downward into the ellipse area so the
      // user can tap the visible glow, not just the 3px bar.
      hitSlop={{top: 0, bottom: ELLIPSE_DEPTH, left: 0, right: 0}}
      accessibilityRole="button"
      accessibilityLabel="Open today's devotional"
      style={styles.container}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ellipseWrapper,
          {width: ellipseWidth, height: ELLIPSE_DEPTH},
          ellipseAnimatedStyle,
        ]}>
        <Svg
          width={ellipseWidth}
          height={ELLIPSE_DEPTH}
          viewBox={`0 0 ${ellipseWidth} ${ELLIPSE_DEPTH}`}
        >
          <Defs>
            <RadialGradient
              id="devotionalGlowGradient"
              cx={ellipseWidth / 2}
              cy={0}
              rx={ellipseRx}
              ry={ELLIPSE_DEPTH}
              fx={ellipseWidth / 2}
              fy={0}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0%" stopColor={glowColor} stopOpacity={1} />
              <Stop offset="60%" stopColor={accentColor} stopOpacity={1} />
              <Stop offset="100%" stopColor={glowColor} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse
            cx={ellipseWidth / 2}
            cy={0}
            rx={ellipseRx}
            ry={ELLIPSE_DEPTH}
            fill="url(#devotionalGlowGradient)"
          />
        </Svg>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.bar,
          {
            backgroundColor: glowColor,
            shadowColor: glowColor,
          },
          barAnimatedStyle,
        ]}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: BAR_HEIGHT,
    zIndex: 40,
  },
  ellipseWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // width/height supplied inline from useWindowDimensions so the ellipse
    // exactly fills the screen on rotation / split-screen.
    transformOrigin: 'top',
  },
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 2,
  },
});

export default DevotionalGlow;
