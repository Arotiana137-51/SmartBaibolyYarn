import {useMemo} from 'react';
import {useTheme} from '../contexts/ThemeContext';

// 12 canonical Christian topics. Authors pick exactly one per devotional.
// The enum is the *meaning*; the resolved tone (below) is the *appearance*.
// Add carefully — every entry must have a palette in both light and dark.
export const DEVOTIONAL_TOPICS = [
  'grace',
  'repentance',
  'faith',
  'love',
  'hope',
  'prayer',
  'wisdom',
  'suffering',
  'praise',
  'judgement',
  'comfort',
  'service',
] as const;

export type DevotionalTopic = (typeof DEVOTIONAL_TOPICS)[number];

export const isDevotionalTopic = (value: unknown): value is DevotionalTopic =>
  typeof value === 'string' &&
  (DEVOTIONAL_TOPICS as readonly string[]).includes(value);

// Malagasy label for the topic chip. The English key stays internal.
export const TOPIC_LABEL_MG: Record<DevotionalTopic, string> = {
  grace: 'Fahasoavana',
  repentance: 'Fibebahana',
  faith: 'Finoana',
  love: 'Fitiavana',
  hope: 'Fanantenana',
  prayer: 'Vavaka',
  wisdom: 'Fahendrena',
  suffering: 'Fijaliana',
  praise: 'Fiderana',
  judgement: 'Fitsarana',
  comfort: 'Fampiononana',
  service: 'Fanompoana',
};

// A tone is the resolved visual triplet for the active theme.
//   accent     — text/borders/eyebrows (the topic's "color")
//   surface    — soft background for callouts, quote blocks, the devotional card
//   onSurface  — body-text color that reads well on `surface`
export type DevotionalTone = {
  accent: string;
  surface: string;
  onSurface: string;
};

type TopicPalette = {
  light: DevotionalTone;
  dark: DevotionalTone;
};

// Each palette below was picked for two constraints:
//   1. accent → AA contrast against surface (text on tinted bg)
//   2. surface → reads as a soft tint, not a hard block, on the reader bg
// `onSurface` always tracks the theme's body text color so prose stays
// legible even if the tint is strong.
const PALETTES: Record<DevotionalTopic, TopicPalette> = {
  grace: {
    light: {accent: '#B45309', surface: '#FEF3C7', onSurface: '#2B2116'},
    dark: {accent: '#FBBF24', surface: '#3A2E14', onSurface: '#F2F2F7'},
  },
  repentance: {
    light: {accent: '#6B3F8E', surface: '#EDE4F3', onSurface: '#2B2116'},
    dark: {accent: '#B49AD9', surface: '#2E2438', onSurface: '#F2F2F7'},
  },
  faith: {
    light: {accent: '#1E4E8C', surface: '#E0EBFB', onSurface: '#2B2116'},
    dark: {accent: '#7AA8DC', surface: '#1B2A3E', onSurface: '#F2F2F7'},
  },
  love: {
    light: {accent: '#B83280', surface: '#FCE7F0', onSurface: '#2B2116'},
    dark: {accent: '#E58EB9', surface: '#3A1F2D', onSurface: '#F2F2F7'},
  },
  hope: {
    light: {accent: '#D97706', surface: '#FFF3E0', onSurface: '#2B2116'},
    dark: {accent: '#FBBF24', surface: '#3A2D14', onSurface: '#F2F2F7'},
  },
  prayer: {
    light: {accent: '#4338CA', surface: '#E8EAFC', onSurface: '#2B2116'},
    dark: {accent: '#A5B4FC', surface: '#1F2347', onSurface: '#F2F2F7'},
  },
  wisdom: {
    light: {accent: '#0F766E', surface: '#DCFCF6', onSurface: '#2B2116'},
    dark: {accent: '#5EEAD4', surface: '#15302D', onSurface: '#F2F2F7'},
  },
  suffering: {
    light: {accent: '#57534E', surface: '#F1EFED', onSurface: '#2B2116'},
    dark: {accent: '#A8A29E', surface: '#2A2826', onSurface: '#F2F2F7'},
  },
  praise: {
    light: {accent: '#92400E', surface: '#FDF1DC', onSurface: '#2B2116'},
    dark: {accent: '#FCD34D', surface: '#3A2D14', onSurface: '#F2F2F7'},
  },
  judgement: {
    light: {accent: '#334155', surface: '#E2E8F0', onSurface: '#2B2116'},
    dark: {accent: '#94A3B8', surface: '#1F2937', onSurface: '#F2F2F7'},
  },
  comfort: {
    light: {accent: '#4F7849', surface: '#ECF3E9', onSurface: '#2B2116'},
    dark: {accent: '#A3C293', surface: '#1F2E1B', onSurface: '#F2F2F7'},
  },
  service: {
    light: {accent: '#0369A1', surface: '#E0F2FE', onSurface: '#2B2116'},
    dark: {accent: '#7DD3FC', surface: '#143247', onSurface: '#F2F2F7'},
  },
};

// Default tone used when the devotional has no topic (or an unknown one
// slipped past the publish-time validator on an older app version).
// Tracks the user's primary accent so it still feels intentional.
const buildFallbackTone = (
  isDark: boolean,
  primaryAccent: string,
  bodyText: string,
): DevotionalTone => ({
  accent: primaryAccent,
  surface: isDark ? '#1C1C1E' : '#F2E6D5',
  onSurface: bodyText,
});

export const resolveDevotionalTone = (
  topic: DevotionalTopic | null | undefined,
  isDark: boolean,
  fallback: {primaryAccent: string; bodyText: string},
): DevotionalTone => {
  if (topic && isDevotionalTopic(topic)) {
    return isDark ? PALETTES[topic].dark : PALETTES[topic].light;
  }
  return buildFallbackTone(isDark, fallback.primaryAccent, fallback.bodyText);
};

export const useDevotionalTone = (
  topic: DevotionalTopic | null | undefined,
): DevotionalTone => {
  const {theme} = useTheme();
  return useMemo(
    () =>
      resolveDevotionalTone(topic, theme.isDark, {
        primaryAccent: theme.colors.accentBlue,
        bodyText: theme.colors.textPrimary,
      }),
    [topic, theme.isDark, theme.colors.accentBlue, theme.colors.textPrimary],
  );
};
