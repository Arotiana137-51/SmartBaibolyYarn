import React, {useEffect, useMemo, useRef} from 'react';
import {Animated, Pressable, StyleSheet, Text, View} from 'react-native';

type Props = {
  isDarkMode: boolean;
  onToggle: (nextIsDarkMode: boolean) => void;
  disabled?: boolean;
};

const TRACK_WIDTH = 112;
const TRACK_HEIGHT = 42;
const KNOB_SIZE = 38;
const KNOB_PADDING = 2;

const SUN_GLYPH = '☀\uFE0E';
const SUN_TRACK_FONT_SIZE = 24;
const SUN_KNOB_FONT_SIZE = 20;

const MoonIcon: React.FC<{size: number; color: string; backgroundColor: string; opacity?: number}> = ({
  size,
  color,
  backgroundColor,
  opacity = 1,
}) => {
  const cutoutSize = Math.round(size * 0.78);
  const cutoutOffsetX = Math.round(size * 0.36);
  const cutoutOffsetY = Math.round(size * 0.04);

  return (
    <View style={{width: size, height: size, opacity}}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: cutoutOffsetX,
          top: cutoutOffsetY,
          width: cutoutSize,
          height: cutoutSize,
          borderRadius: cutoutSize / 2,
          backgroundColor,
        }}
      />
    </View>
  );
};

const ToggleThemeButton: React.FC<Props> = ({isDarkMode, onToggle, disabled}) => {
  const translateX = useRef(new Animated.Value(isDarkMode ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: isDarkMode ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [isDarkMode, translateX]);

  const knobTranslate = useMemo(() => {
    const maxX = TRACK_WIDTH - KNOB_SIZE - KNOB_PADDING * 2;
    return translateX.interpolate({
      inputRange: [0, 1],
      outputRange: [0, maxX],
    });
  }, [translateX]);

  const trackBackground = useMemo(() => {
    return isDarkMode ? '#111111' : '#FFFFFF';
  }, [isDarkMode]);

  const borderColor = useMemo(() => {
    return isDarkMode ? '#00000040' : '#00000020';
  }, [isDarkMode]);

  const knobBackground = useMemo(() => {
    return isDarkMode ? '#2A2A2A' : '#F3E7D6';
  }, [isDarkMode]);

  const iconBaseColor = useMemo(() => {
    return isDarkMode ? '#EDEDED' : '#2B2116';
  }, [isDarkMode]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{checked: isDarkMode, disabled: !!disabled}}
      accessibilityLabel="Toggle theme"
      disabled={disabled}
      onPress={() => onToggle(!isDarkMode)}
      style={({pressed}) => [styles.root, pressed ? styles.rootPressed : null]}
    >
      <View
        style={[
          styles.track,
          {
            backgroundColor: trackBackground,
            borderColor,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        <View style={styles.trackIcons} pointerEvents="none">
          <MoonIcon
            size={24}
            color={iconBaseColor}
            backgroundColor={trackBackground}
            opacity={!isDarkMode ? 1 : 0.35}
          />
          <Text
            style={[
              styles.sunTrack,
              {
                color: iconBaseColor,
                opacity: isDarkMode ? 1 : 0.35,
              },
            ]}
            allowFontScaling={false}
          >
            {SUN_GLYPH}
          </Text>
        </View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.knob,
            {
              backgroundColor: knobBackground,
              transform: [{translateX: knobTranslate}],
            },
          ]}
        >
          {isDarkMode ? (
            <Text style={[styles.sunKnob, {color: iconBaseColor}]} allowFontScaling={false}>
              {SUN_GLYPH}
            </Text>
          ) : (
            <MoonIcon size={20} color={iconBaseColor} backgroundColor={knobBackground} />
          )}
        </Animated.View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  root: {
    alignSelf: 'flex-start',
  },
  rootPressed: {
    opacity: 0.9,
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    borderWidth: 1,
    padding: KNOB_PADDING,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  trackIcons: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunTrack: {
    fontSize: SUN_TRACK_FONT_SIZE,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sunKnob: {
    fontSize: SUN_KNOB_FONT_SIZE,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});

export default ToggleThemeButton;
