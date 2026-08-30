/**
 * Guards the custom primary-color persistence: a saved colour must be restored
 * on the next launch. Regression test for the bug where an early return in the
 * hydrate effect skipped the colour (and low-end mode) read whenever a theme
 * mode had already been saved, so the accent always fell back to the default.
 */
import React from 'react';
import {act, create} from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ThemeProvider, useTheme} from '../src/contexts/ThemeContext';

const PRIMARY_KEY = '@ui_primary_color';
const THEME_MODE_KEY = 'settings.themeMode';
const LOW_END_KEY = 'settings.lowEndMode';

// Capture the live context so the test can drive it imperatively.
let api: ReturnType<typeof useTheme>;
const Capture = () => {
  api = useTheme();
  return null;
};

const mount = async () => {
  await act(async () => {
    create(
      <ThemeProvider>
        <Capture />
      </ThemeProvider>,
    );
  });
  // let the hydrate effect settle
  await act(async () => {
    await Promise.resolve();
  });
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('a chosen primary colour is persisted and restored on relaunch', async () => {
  await mount();
  expect(api.primaryColor).toBeNull();

  await act(async () => api.setPrimaryColor('#B5179E'));
  expect(await AsyncStorage.getItem(PRIMARY_KEY)).toBe('#B5179E');

  // Relaunch: fresh provider reading from storage.
  await mount();
  expect(api.primaryColor).toBe('#B5179E');
  expect(api.theme.colors.navBackground).toBe('#B5179E');
});

test('colour and low-end mode still hydrate when a theme mode was already saved', async () => {
  await AsyncStorage.setItem(THEME_MODE_KEY, 'dark');
  await AsyncStorage.setItem(LOW_END_KEY, 'true');
  await AsyncStorage.setItem(PRIMARY_KEY, '#F72585');

  await mount();
  expect(api.isDarkMode).toBe(true);
  expect(api.isLowEndMode).toBe(true);
  expect(api.primaryColor).toBe('#F72585');
});

test('dark/light choice survives a relaunch both ways', async () => {
  await mount();
  await act(async () => api.setDarkMode(true));
  await mount();
  expect(api.isDarkMode).toBe(true);

  // ...and back to light, so the restore isn't just a stuck default.
  await act(async () => api.setDarkMode(false));
  await mount();
  expect(api.isDarkMode).toBe(false);
});

test('a legacy darkMode flag still hydrates when no themeMode key exists', async () => {
  await AsyncStorage.setItem('settings.darkMode', 'true');
  await mount();
  expect(api.isDarkMode).toBe(true);
});

test('resetting to the default clears the stored colour', async () => {
  await AsyncStorage.setItem(PRIMARY_KEY, '#F72585');
  await mount();

  await act(async () => api.setPrimaryColor(null));
  await mount();
  expect(api.primaryColor).toBeNull();
});
