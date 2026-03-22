import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type JesusNameVariant = 'jesosy' | 'jesoa';

type JesusNameContextValue = {
  variant: JesusNameVariant;
  setVariant: (variant: JesusNameVariant) => void;
  isReady: boolean;
  transformText: (text: string) => string;
};

const STORAGE_KEY_JESUS_NAME = 'settings.jesusName';

const JesusNameContext = createContext<JesusNameContextValue | null>(null);

const transformJesusName = (text: string, variant: JesusNameVariant) => {
  if (!text) {
    return text;
  }

  // Replace any casing variant of Jesosy/Jesoa, but avoid replacing inside other words.
  // Use ASCII word boundaries; this should work for Malagasy text around these words.
  const regex = /\b(Jesosy|Jesoa)\b/gi;
  const replacement = variant === 'jesoa' ? 'Jesoa' : 'Jesosy';
  return text.replace(regex, replacement);
};

export const JesusNameProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [variant, setVariantState] = useState<JesusNameVariant>('jesosy');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_JESUS_NAME);
        if (stored === 'jesoa' || stored === 'jesosy') {
          setVariantState(stored);
        }
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const persist = useCallback(async (next: JesusNameVariant) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_JESUS_NAME, next);
    } catch {
      // ignore persistence errors
    }
  }, []);

  const setVariant = useCallback(
    (next: JesusNameVariant) => {
      setVariantState(next);
      persist(next);
    },
    [persist]
  );

  const transformText = useCallback(
    (text: string) => transformJesusName(text, variant),
    [variant]
  );

  const value: JesusNameContextValue = useMemo(
    () => ({
      variant,
      setVariant,
      isReady,
      transformText,
    }),
    [variant, setVariant, isReady, transformText]
  );

  return <JesusNameContext.Provider value={value}>{children}</JesusNameContext.Provider>;
};

export const useJesusName = () => {
  const ctx = useContext(JesusNameContext);
  if (!ctx) {
    throw new Error('useJesusName must be used within JesusNameProvider');
  }
  return ctx;
};

export const __test__transformJesusName = transformJesusName;
