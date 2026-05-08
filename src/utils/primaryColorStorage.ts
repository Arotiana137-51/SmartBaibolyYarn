import AsyncStorage from '@react-native-async-storage/async-storage';

export const PRIMARY_COLOR_STORAGE_KEY = '@ui_primary_color';

const HEX_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const isValidHexColor = (hex: unknown): hex is string =>
  typeof hex === 'string' && HEX_REGEX.test(hex.trim());

export const getStoredPrimaryColor = async (): Promise<string | null> => {
  try {
    const raw = await AsyncStorage.getItem(PRIMARY_COLOR_STORAGE_KEY);
    if (raw && isValidHexColor(raw)) return raw.trim();
    return null;
  } catch {
    return null;
  }
};

export const setStoredPrimaryColor = async (hex: string | null): Promise<void> => {
  try {
    if (hex === null) {
      await AsyncStorage.removeItem(PRIMARY_COLOR_STORAGE_KEY);
      return;
    }
    if (!isValidHexColor(hex)) return;
    await AsyncStorage.setItem(PRIMARY_COLOR_STORAGE_KEY, hex);
  } catch {
    // ignore persistence errors
  }
};
