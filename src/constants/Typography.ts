/**
 * Typography System for SmartBaibolyYarn
 * Based on mobile best practices and accessibility guidelines
 */
import { Platform } from 'react-native';

export const TYPOGRAPHY_SCALE = {
  // Base font size (minimum for accessibility)
  base: 16,
  
  // Heading sizes (1.3x ratio for hierarchy)
  h1: 24,    // 1.5x base - Display headings
  h2: 20,    // 1.25x base - Major headings
  h3: 18,    // 1.125x base - Subheadings
  
  // Body text
  body: 18,   // Base size - Main content
  bodyLarge: 20, // Emphasized body
  
  // Small text
  small: 14,   // 0.875x base - Secondary info
  tiny: 12,    // 0.75x base - Metadata, timestamps
  
  // Specialized sizes
  caption: 14, // Image captions, labels
  footnote: 12, // Footnotes, references
} as const;

export const LINE_HEIGHTS = {
  tight: 1.2,    // Headings
  normal: 1.65,   // Body text
  relaxed: 1.8,  // Long-form content
} as const;

export const LETTER_SPACING = {
  tight: -0.5,   // Headings
  normal: 0,     // Body text
  relaxed: 0.5,  // Emphasized text
} as const;

export const FONT_WEIGHTS = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

export const FONT_FAMILIES = {
  // Use platform-specific system fonts for optimal performance
  primary: Platform.OS === 'ios' ? 'System' : 'Roboto',
} as const;

// Typography styles for common use cases
export const TEXT_STYLES = {
  // Headings
  heading: {
    fontFamily: FONT_FAMILIES.primary,
    fontSize: TYPOGRAPHY_SCALE.h2,
    lineHeight: LINE_HEIGHTS.tight * TYPOGRAPHY_SCALE.h2,
    letterSpacing: LETTER_SPACING.tight,
    fontWeight: '600',
    color: '#1c1c1c',
  },
  
  subheading: {
    fontFamily: FONT_FAMILIES.primary,
    fontSize: TYPOGRAPHY_SCALE.h3,
    lineHeight: LINE_HEIGHTS.tight * TYPOGRAPHY_SCALE.h3,
    letterSpacing: LETTER_SPACING.normal,
    fontWeight: '500',
    color: '#1c1c1c',
  },
  
  // Body text
  body: {
    fontFamily: FONT_FAMILIES.primary,
    fontSize: TYPOGRAPHY_SCALE.body,
    lineHeight: LINE_HEIGHTS.normal * TYPOGRAPHY_SCALE.body,
    letterSpacing: LETTER_SPACING.normal,
    fontWeight: '400',
    color: '#1c1c1c',
  },
  
  bodyLarge: {
    fontFamily: FONT_FAMILIES.primary,
    fontSize: TYPOGRAPHY_SCALE.bodyLarge,
    lineHeight: LINE_HEIGHTS.normal * TYPOGRAPHY_SCALE.bodyLarge,
    letterSpacing: LETTER_SPACING.normal,
    fontWeight: '400',
    color: '#1c1c1c',
  },
  
  // Secondary text
  caption: {
    fontFamily: FONT_FAMILIES.primary,
    fontSize: TYPOGRAPHY_SCALE.caption,
    lineHeight: LINE_HEIGHTS.normal * TYPOGRAPHY_SCALE.caption,
    letterSpacing: LETTER_SPACING.normal,
    fontWeight: '400',
    color: '#6f6f6f',
  },
  
  small: {
    fontFamily: FONT_FAMILIES.primary,
    fontSize: TYPOGRAPHY_SCALE.small,
    lineHeight: LINE_HEIGHTS.normal * TYPOGRAPHY_SCALE.small,
    letterSpacing: LETTER_SPACING.normal,
    fontWeight: '400',
    color: '#6f6f6f',
  },
  
  // UI elements
  button: {
    fontFamily: FONT_FAMILIES.primary,
    fontSize: TYPOGRAPHY_SCALE.body,
    lineHeight: LINE_HEIGHTS.tight * TYPOGRAPHY_SCALE.body,
    letterSpacing: LETTER_SPACING.tight,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Bible verse numbers
  verseNumber: {
    fontFamily: FONT_FAMILIES.primary,
    fontSize: TYPOGRAPHY_SCALE.small,
    lineHeight: LINE_HEIGHTS.tight * TYPOGRAPHY_SCALE.small,
    letterSpacing: LETTER_SPACING.normal,
    fontWeight: '700',
    color: '#007991', // Use mid-tone teal for verse numbers
  },
} as const;

// Helper function to scale font sizes based on user preference
export const scaleFontSize = (baseSize: number, scale: number = 1) => {
  return Math.round(baseSize * scale);
};

// Accessibility helper - ensures minimum 16px for body text
export const getAccessibleFontSize = (size: number) => {
  return Math.max(size, 16);
};
