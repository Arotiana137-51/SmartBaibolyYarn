/**
 * Adaptive sizing system for SmartBaibolyYarn.
 *
 * Goal: stop hard-coded paddings/fonts from overflowing on small Android (≤360dp)
 * and from blowing up on tablets. Baseline is iPhone 14/15 standard at 375pt;
 * scales clamp to [0.85, 1.25] so layouts never collapse or balloon.
 *
 * Pure JS — no native deps beyond `useWindowDimensions` (RN core).
 */
import { useMemo } from 'react';
import { Dimensions, Platform, useWindowDimensions } from 'react-native';

export const BASE_WIDTH = 375;
export const BASE_HEIGHT = 812;

const MIN_SCALE = 0.85;
const MAX_SCALE = 1.25;
const MAX_FONT_SCALE = 1.3; // cap system "Largest font" so wrapping stays sane

export type ScreenClass = 'xsmall' | 'small' | 'regular' | 'large' | 'xlarge';

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const classify = (width: number): ScreenClass => {
  if (width <= 320) return 'xsmall';
  if (width <= 360) return 'small';
  if (width <= 400) return 'regular';
  if (width <= 430) return 'large';
  return 'xlarge';
};

/**
 * Static helpers for use outside React (StyleSheet.create, constants, etc.).
 * Reads Dimensions once — won't react to orientation changes. Prefer the hook
 * for anything rendered.
 */
const initial = Dimensions.get('window');

export const scale = (size: number, w: number = initial.width) =>
  Math.round(clamp((size * w) / BASE_WIDTH, size * MIN_SCALE, size * MAX_SCALE));

export const verticalScale = (size: number, h: number = initial.height) =>
  Math.round(clamp((size * h) / BASE_HEIGHT, size * MIN_SCALE, size * MAX_SCALE));

/** Moderate scale — dampens by `factor` (default 0.5). Good for fontSize. */
export const moderateScale = (
  size: number,
  factor: number = 0.5,
  w: number = initial.width,
) => Math.round(size + (scale(size, w) - size) * factor);

/**
 * Hook variant — re-runs on orientation change, Android split-screen, and
 * iPad multitasking. Use this from components.
 */
export const useResponsive = () => {
  const { width, height, fontScale } = useWindowDimensions();

  return useMemo(() => {
    const screenClass = classify(width);
    const isSmall = width <= 360;
    const isXSmall = width <= 320;
    const isTablet = width >= 600;
    const cappedFontScale = Math.min(fontScale, MAX_FONT_SCALE);

    const s = (n: number) =>
      Math.round(clamp((n * width) / BASE_WIDTH, n * MIN_SCALE, n * MAX_SCALE));
    const vs = (n: number) =>
      Math.round(clamp((n * height) / BASE_HEIGHT, n * MIN_SCALE, n * MAX_SCALE));
    const ms = (n: number, factor: number = 0.5) =>
      Math.round(n + (s(n) - n) * factor);

    // Effective font size combines design size, optional user pref, and
    // system fontScale (capped). Floor at 12 so things never become unreadable.
    const fontFor = (size: number, userScale: number = 1) =>
      Math.max(12, Math.round(ms(size) * userScale * cappedFontScale));

    return {
      width,
      height,
      fontScale: cappedFontScale,
      screenClass,
      isSmall,
      isXSmall,
      isTablet,
      isIOS: Platform.OS === 'ios',
      isAndroid: Platform.OS === 'android',
      scale: s,
      verticalScale: vs,
      moderateScale: ms,
      fontFor,
    };
  }, [width, height, fontScale]);
};
