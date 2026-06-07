import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';

// "You have an unread devotional" indicator. Renders a thin accent-coloured
// bar that pulses gently, with a 3-pixel soft fade out at the bottom so it
// doesn't feel like a hard separator. Lives in the normal flow between the
// TopBar and the (collapsed) ReaderRevealBanner; the parent wraps this in
// a Pressable to make tapping it reveal the banner. When `active` is false
// the component renders nothing at all — no layout reservation, no pulse.
//
// Design contract:
//   - This bar is the *only* visible cue while a devotional is unread.
//     The banner stays collapsed by default so reading is not interrupted.
//   - Tap (handled by the parent) or scroll-to-reveal is how the user
//     opens the banner. Once they dismiss the banner, `markSeen` flips
//     hasUnread to false → this component disappears.

const GLOW_HEIGHT = 13;
// Bottom fade: 3 one-pixel rows where the accent colour fades to fully
// transparent. There is no gradient library in this project; 3 stacked
// Views are visually indistinguishable from a real linear gradient at
// this thickness, with zero native dependency cost.
const FADE_ROW_ALPHAS = [0.66, 0.4, 0.18];
const FADE_HEIGHT = FADE_ROW_ALPHAS.length; // 3px

const PULSE_LOW = 0.18;
const PULSE_HIGH = 0.72;
const PULSE_DURATION_MS = 1800;

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const parsed =
    normalized.length === 3
      ? normalized
          .split('')
          .map(ch => ch + ch)
          .join('')
      : normalized;
  const int = parseInt(parsed, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

type Props = {
  // When true the glow pulses; when false it renders nothing. The caller
  // owns the unread/seen logic — typically MainScreen wiring this from
  // `useDevotionalUnread(devotional?.date)`.
  active: boolean;
};

export const NotificationGlow: React.FC<Props> = ({active}) => {
  const {theme} = useTheme();
  const opacity = useRef(new Animated.Value(PULSE_LOW)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!active) {
      loopRef.current?.stop();
      opacity.setValue(0);
      return;
    }

    opacity.setValue(PULSE_LOW);
    const sequence = Animated.sequence([
      Animated.timing(opacity, {
        toValue: PULSE_HIGH,
        duration: PULSE_DURATION_MS / 2,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: PULSE_LOW,
        duration: PULSE_DURATION_MS / 2,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ]);

    const loop = Animated.loop(sequence);
    loopRef.current = loop;
    loop.start();

    return () => {
      loop.stop();
    };
  }, [active, opacity]);

  if (!active) {
    return null;
  }

  return (
    // pointerEvents="box-none" lets the parent's Pressable still receive
    // the tap. We're decorative; the tap target is owned upstream.
    <View pointerEvents="box-none" style={styles.container}>
      <Animated.View
        style={[
          styles.bar,
          {
            backgroundColor: theme.colors.accentBlue,
            opacity,
            shadowColor: theme.colors.accentBlue,
          },
        ]}
      />
      {/* Soft bottom fade: 3 stacked 1-pixel rows of the accent colour at
          descending alpha. The pulsing bar's own opacity multiplies into
          these visually, but we keep the fade rows at static alpha so the
          softening edge stays present even when the bar dims to PULSE_LOW. */}
      {FADE_ROW_ALPHAS.map((alpha, i) => (
        <View
          key={i}
          style={[
            styles.fadeRow,
            {backgroundColor: hexToRgba(theme.colors.accentBlue, alpha * 0.5)},
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // glow bar + 3px soft bottom fade
    height: GLOW_HEIGHT + FADE_HEIGHT,
    width: '100%',
  },
  bar: {
    height: GLOW_HEIGHT,
    width: '100%',
    shadowOffset: {width: 0, height: 0},
    shadowRadius: 6,
    shadowOpacity: 1,
    elevation: 4,
  },
  fadeRow: {
    height: 1,
    width: '100%',
  },
});

export default NotificationGlow;
