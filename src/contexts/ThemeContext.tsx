import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Animated, StyleSheet, View} from 'react-native';

interface ThemeColors {
  backgroundPrimary: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  readerBackground: string;
  readerText: string;
  textPrimary: string;
  textSecondary: string;
  textWatermark: string;
  divider: string;
  accentBlue: string;
  accentGold: string;
  glow: string;
  navBackground: string;
  verseNumber: string;
};

export type Theme = {
  isDark: boolean;
  colors: ThemeColors;
};

type ThemeContextValue = {
  theme: Theme;
  isDarkMode: boolean;
  setDarkMode: (enabled: boolean) => void;
  toggleDarkMode: () => void;
  isReady: boolean;
};

const STORAGE_KEY = 'settings.darkMode';

const darkColors: ThemeColors = {
  backgroundPrimary: '#000000',
  backgroundSecondary: '#1C1C1E',
  backgroundTertiary: '#2C2C2E',
  readerBackground: '#0B0B0C',
  readerText: '#B3B3B3',
  textPrimary: '#F2F2F7',
  textSecondary: '#8E8E93',
  textWatermark: '#7A7A80',
  divider: '#3A3A3C',
  accentBlue: '#0A84FF',
  accentGold: '#FFD60A',
  glow: '#64D2FF',
  navBackground: '#1982C4',
  verseNumber: '#4A90E2',
};

const lightColors: ThemeColors = {
  backgroundPrimary: '#ffffff',
  backgroundSecondary: '#f0f0f0',
  backgroundTertiary: '#ffffff',
  readerBackground: '#FDFBF7',
  readerText: '#111111',
  textPrimary: '#111111',
  textSecondary: '#666666',
  textWatermark: '#8C8C90',
  divider: '#e5e5e5',
  accentBlue: '#3A86FF',
  accentGold: '#FFD60A',
  glow: '#64D2FF',
  navBackground: '#247BA0',
  verseNumber: '#4A90E2',
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const transitionOpacity = useRef(new Animated.Value(0)).current;
  const [transitionColor, setTransitionColor] = useState<string>('transparent');

  useEffect(() => {
    (async () => {
      try {
        const value = await AsyncStorage.getItem(STORAGE_KEY);
        if (value === 'true') {
          setIsDarkMode(true);
        }
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const persist = useCallback(async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
    } catch {
      // ignore persistence errors
    }
  }, []);

  const setDarkMode = useCallback(
    (enabled: boolean) => {
      const nextColors = enabled ? darkColors : lightColors;
      setTransitionColor(nextColors.backgroundPrimary);
      Animated.sequence([
        Animated.timing(transitionOpacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(transitionOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      setIsDarkMode(enabled);
      persist(enabled);
    },
    [persist, transitionOpacity]
  );

  const toggleDarkMode = useCallback(() => {
    setDarkMode(!isDarkMode);
  }, [isDarkMode, setDarkMode]);

  const theme: Theme = useMemo(
    () => ({
      isDark: isDarkMode,
      colors: isDarkMode ? darkColors : lightColors,
    }),
    [isDarkMode]
  );

  const value: ThemeContextValue = useMemo(
    () => ({
      theme,
      isDarkMode,
      setDarkMode,
      toggleDarkMode,
      isReady,
    }),
    [theme, isDarkMode, setDarkMode, toggleDarkMode, isReady]
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.transitionOverlay,
            {
              backgroundColor: transitionColor,
              opacity: transitionOpacity,
            },
          ]}
        />
      </View>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  transitionOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
