export const hexToRgba = (hex: string, alpha: number): string => {
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

const parseHex = (hex: string): {r: number; g: number; b: number} | null => {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length !== 3 && normalized.length !== 6) return null;
  const expanded =
    normalized.length === 3
      ? normalized.split('').map(ch => ch + ch).join('')
      : normalized;
  const int = parseInt(expanded, 16);
  if (Number.isNaN(int)) return null;
  return {r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255};
};

const toHex = (r: number, g: number, b: number): string => {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const h = (n: number) => clamp(n).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
};

// Lighten a hex color by mixing it toward white. amount is 0..1 (0 = same, 1 = white).
export const lightenHex = (hex: string, amount: number): string => {
  const parsed = parseHex(hex);
  if (!parsed) return hex;
  const t = Math.max(0, Math.min(1, amount));
  const r = parsed.r + (255 - parsed.r) * t;
  const g = parsed.g + (255 - parsed.g) * t;
  const b = parsed.b + (255 - parsed.b) * t;
  return toHex(r, g, b);
};

// Darken a hex color by mixing it toward black. amount is 0..1 (0 = same, 1 = black).
export const darkenHex = (hex: string, amount: number): string => {
  const parsed = parseHex(hex);
  if (!parsed) return hex;
  const t = Math.max(0, Math.min(1, amount));
  const r = parsed.r * (1 - t);
  const g = parsed.g * (1 - t);
  const b = parsed.b * (1 - t);
  return toHex(r, g, b);
};

// Reduce saturation by mixing each channel toward the color's own grayscale value.
// amount is 0..1 (0 = same, 1 = fully gray).
export const desaturateHex = (hex: string, amount: number): string => {
  const parsed = parseHex(hex);
  if (!parsed) return hex;
  const t = Math.max(0, Math.min(1, amount));
  const gray = 0.2126 * parsed.r + 0.7152 * parsed.g + 0.0722 * parsed.b;
  const r = parsed.r + (gray - parsed.r) * t;
  const g = parsed.g + (gray - parsed.g) * t;
  const b = parsed.b + (gray - parsed.b) * t;
  return toHex(r, g, b);
};

// Render-time transform for highlight colors in dark mode: darker and slightly
// less saturated so the highlight stops washing out off-white reader text.
// Accepts hex; passes through anything else (e.g. rgba()) unchanged so existing
// theme-supplied translucent highlights are not double-processed.
export const dimHighlightForDarkMode = (color: string): string => {
  if (typeof color !== 'string') return color;
  const trimmed = color.trim();
  if (!trimmed.startsWith('#')) return trimmed;
  const desaturated = desaturateHex(trimmed, 0.25);
  return darkenHex(desaturated, 0.45);
};

// WCAG-style relative luminance for "is this color dark?" decisions.
export const getRelativeLuminance = (hex: string): number => {
  const parsed = parseHex(hex);
  if (!parsed) return 1;
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(parsed.r) + 0.7152 * channel(parsed.g) + 0.0722 * channel(parsed.b);
};
