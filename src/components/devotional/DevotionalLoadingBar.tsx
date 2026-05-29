import React, {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import {useTheme} from '../../contexts/ThemeContext';
import {hexToRgba} from '../../utils/colorUtils';

// Indeterminate horizontal glow used as the devotional loading state.
// Mirrors the visual language of DevotionalGlow (thin accent bar + soft
// shadow) instead of the generic ActivityIndicator spinner — the bar is
// the brand cue for "devotional content arriving".
//
// Animation: a short bright segment sweeps left → right across the rail
// repeatedly. The rail itself sits at a low opacity so the moving segment
// reads as the active part. UI-thread driven via Reanimated; no JS frame
// callbacks.

const BAR_HEIGHT = 3;
const SWEEP_MS = 1400;
const SEGMENT_WIDTH_RATIO = 0.35;
const RAIL_OPACITY = 0.22;

export const DevotionalLoadingBar: React.FC = () => {
  const {theme} = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: SWEEP_MS,
        easing: Easing.inOut(Easing.cubic),
      }),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [progress]);

  const sweepStyle = useAnimatedStyle(() => {
    // translateX expressed as a percentage of the rail width.
    // -100% places the segment just off the left edge, 100% off the right.
    const pct = -100 + progress.value * 200;
    return {
      transform: [{translateX: `${pct}%`}],
    };
  });

  const accent = theme.colors.accentBlue;

  return (
    <View
      style={[
        styles.rail,
        {
          backgroundColor: hexToRgba(accent, RAIL_OPACITY),
        },
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel="Mihantona...">
      <Animated.View
        style={[
          styles.segment,
          {
            width: `${SEGMENT_WIDTH_RATIO * 100}%`,
            backgroundColor: accent,
            shadowColor: accent,
          },
          sweepStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  rail: {
    width: '100%',
    height: BAR_HEIGHT,
    overflow: 'hidden',
  },
  segment: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: BAR_HEIGHT / 2,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
});

export default DevotionalLoadingBar;
