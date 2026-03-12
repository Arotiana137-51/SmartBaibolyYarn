import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppMode } from '../screens/MainScreen';
import {useTheme} from '../contexts/ThemeContext';

interface CustomBottomNavProps {
  activeMode: AppMode;
  onTabPress: (mode: AppMode) => void;
}

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

const CustomBottomNav: React.FC<CustomBottomNavProps> = ({ activeMode, onTabPress }) => {
  const insets = useSafeAreaInsets();
  const {theme} = useTheme();

  const trackBackground = theme.isDark
    ? hexToRgba(theme.colors.readerBackground, 0.85)
    : hexToRgba(theme.colors.readerBackground, 0.85);

  const trackBorder = theme.isDark
    ? hexToRgba(theme.colors.divider, 0.38)
    : hexToRgba(theme.colors.divider, 0.5);

  const inactivePressed = theme.isDark
    ? 'rgba(255,255,255,0.08)'
    : 'rgba(0,0,0,0.06)';

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          backgroundColor: 'transparent',
          bottom: Math.max(insets.bottom, 0) + 15,
          paddingBottom: 0,
        },
      ]}
    >
      <View
        style={[
          styles.segmentedTrack,
          {
            backgroundColor: trackBackground,
            borderColor: trackBorder,
          },
        ]}
      >
        <Pressable
          onPress={() => onTabPress('bible')}
          style={({pressed}) => [
            styles.segment,
            activeMode === 'bible'
              ? {backgroundColor: theme.colors.navBackground}
              : null,
            pressed && activeMode !== 'bible'
              ? {backgroundColor: inactivePressed}
              : null,
          ]}
        >
          <Text
            style={[
              styles.segmentText,
              activeMode === 'bible'
                ? {color: '#FFFFFF', fontWeight: '700'}
                : {color: theme.colors.textPrimary, fontWeight: '600'},
            ]}
          >
            Baiboly
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onTabPress('hymnal')}
          style={({pressed}) => [
            styles.segment,
            activeMode === 'hymnal'
              ? {backgroundColor: theme.colors.navBackground}
              : null,
            pressed && activeMode !== 'hymnal'
              ? {backgroundColor: inactivePressed}
              : null,
          ]}
        >
          <Text
            style={[
              styles.segmentText,
              activeMode === 'hymnal'
                ? {color: '#FFFFFF', fontWeight: '700'}
                : {color: theme.colors.textPrimary, fontWeight: '600'},
            ]}
          >
            Fihirana
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  segmentedTrack: {
    width: '100%',
    maxWidth: 380,
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 1,
    padding: 4,
    elevation: 7,
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 8},
  },
  segment: {
    flex: 1,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 16,
  },
});

export default CustomBottomNav;
