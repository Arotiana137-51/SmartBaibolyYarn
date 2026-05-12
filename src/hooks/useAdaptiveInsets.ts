/**
 * Uniform safe-area handling for SmartBaibolyYarn.
 *
 * react-native-safe-area-context returns 0 for top inset on some Android
 * devices that still draw a translucent status bar (notably Android 11 on
 * Galaxy A/J series), causing content to overlap the status bar. This hook
 * floors the top inset to StatusBar.currentHeight on Android so that case
 * is covered without affecting iPhones with notch/Dynamic Island.
 *
 * iOS values pass through unchanged — react-native-safe-area-context already
 * returns the correct safe-area for notch and Dynamic Island devices.
 */
import { useMemo } from 'react';
import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ANDROID_FALLBACK_TOP = 24;

export interface AdaptiveInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
  rawTop: number;
}

export const useAdaptiveInsets = (): AdaptiveInsets => {
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const androidFloor =
      Platform.OS === 'android'
        ? StatusBar.currentHeight ?? ANDROID_FALLBACK_TOP
        : 0;

    return {
      top: Math.max(insets.top, androidFloor),
      bottom: Math.max(insets.bottom, 0),
      left: insets.left,
      right: insets.right,
      rawTop: insets.top,
    };
  }, [insets.top, insets.bottom, insets.left, insets.right]);
};
