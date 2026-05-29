/**
 * Identifiers for the discrete palette options available in the spectrum.
 * Each id maps directly to a high-fidelity visual theme optimized for sub-navigation,
 * border gradients, and organic shadows.
 */
export type GlowThemeId = "purple" | "sunset" | "cyan" | "emerald" | "amber" | "rose";

/**
 * Interface representing a comprehensive visual theme preset.
 * Designed to provide synchronized colors for both CSS (Tailwind classes) 
 * and inline styled canvas vectors (hexadecimal raw values).
 */
export interface GlowTheme {
  id: GlowThemeId;
  name: string;
  primaryColor: string;     // Tailwind background color class, e.g. "bg-violet-500"
  secondaryColor: string;   // Tailwind secondary companion class, e.g. "bg-fuchsia-500"
  textColor: string;        // Tailwind text highlight or toggle class, e.g. "text-violet-400"
  accentBorder: string;     // Tailwind border transparency companion class, e.g. "border-violet-500/20"
  shadowColor: string;      // RGB decimal format for custom hardware-accelerated dynamic box shadows, e.g. "139, 92, 246"
  glowHex: string;          // Primary hexadecimal glow color used in radial background gradients, e.g., "#8b5cf6"
  glowAccentHex: string;    // Complementary secondary hexadecimal highlight value, e.g., "#ec4899"
}

export type PresetType = "orb" | "cyber" | "pads";

/**
 * Interface detailing the complete application telemetry and configuration settings.
 */
export interface GlowConfig {
  preset: PresetType;
  theme: GlowThemeId;
  intensity: number;       // Adaptive lux intensity scalar ranging from 0 to 100
  size: number;            // Scale coordinate ranging from 50 to 120 (percent of base size)
  speed: "slow" | "medium" | "fast" | "breath"; // Frequency parameters for pulse animations
  showReflections: boolean;
  blendMode: "screen" | "multiply" | "normal";
  soundResponsive: boolean;
}

/**
 * Static dictionary of aesthetic themes representing premium glow configurations
 * calibrated for high-contrast visibility against standard deep charcoal (#0a0f1d) canvases.
 */
export const GLOW_THEMES: Record<GlowThemeId, GlowTheme> = {
  purple: {
    id: "purple",
    name: "Aether Violet",
    primaryColor: "bg-violet-500",
    secondaryColor: "bg-fuchsia-500",
    textColor: "text-violet-400",
    accentBorder: "border-violet-500/20",
    shadowColor: "139, 92, 246",
    glowHex: "#8b5cf6",
    glowAccentHex: "#d946ef",
  },
  sunset: {
    id: "sunset",
    name: "Coral Sunset",
    primaryColor: "bg-orange-500",
    secondaryColor: "bg-rose-500",
    textColor: "text-orange-400",
    accentBorder: "border-orange-500/20",
    shadowColor: "249, 115, 22",
    glowHex: "#f97316",
    glowAccentHex: "#f43f5e",
  },
  cyan: {
    id: "cyan",
    name: "Cyber Aqua",
    primaryColor: "bg-cyan-500",
    secondaryColor: "bg-blue-600",
    textColor: "text-cyan-400",
    accentBorder: "border-cyan-500/20",
    shadowColor: "6, 182, 212",
    glowHex: "#06b6d4",
    glowAccentHex: "#2563eb",
  },
  emerald: {
    id: "emerald",
    name: "Bio Emerald",
    primaryColor: "bg-emerald-500",
    secondaryColor: "bg-teal-500",
    textColor: "text-emerald-400",
    accentBorder: "border-emerald-500/20",
    shadowColor: "16, 185, 129",
    glowHex: "#10b981",
    glowAccentHex: "#14b8a6",
  },
  amber: {
    id: "amber",
    name: "Solar Gold",
    primaryColor: "bg-amber-500",
    secondaryColor: "bg-yellow-500",
    textColor: "text-amber-400",
    accentBorder: "border-amber-500/20",
    shadowColor: "245, 158, 11",
    glowHex: "#f59e0b",
    glowAccentHex: "#eab308",
  },
  rose: {
    id: "rose",
    name: "Neon Petal",
    primaryColor: "bg-rose-500",
    secondaryColor: "bg-pink-500",
    textColor: "text-rose-400",
    accentBorder: "border-rose-500/20",
    shadowColor: "244, 63, 94",
    glowHex: "#f43f5e",
    glowAccentHex: "#ec4899",
  },
};

