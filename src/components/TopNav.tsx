import React from "react";
import { GlowTheme } from "../types";

/**
 * Properties required by the TopNav bar component to render and configure state.
 */
interface TopNavProps {
  /** The actively loaded visual theme holding CSS colors and raw Hex codes */
  currentTheme: GlowTheme;
  /** Binary flag reflecting if the backing underglow effect is active */
  topnavGlow: boolean;
  /** State modifier function to toggle the underglow status config */
  onToggleTopnavGlow: () => void;
}

/**
 * TopNav Component: Renders a sticky, high-contrast header panel.
 * It provides status indicators, the product title ("LUMINA GLOW"), and the toggle 
 * to actuate or standby the primary geometric backlight emission underneath the bar.
 */
export default function TopNav({
  currentTheme,
  topnavGlow,
  onToggleTopnavGlow
}: TopNavProps) {

  return (
    <div 
      className="relative z-40 transition-all duration-300 border-b border-slate-800/50 bg-[#0f172a]/95 backdrop-blur-lg px-5 py-4 flex flex-col gap-2 select-none"
      style={{
        boxShadow: topnavGlow 
          ? `0 10px 30px -15px rgba(${currentTheme.shadowColor}, 0.35)` 
          : "none"
      }}
    >
      {/* Top Bar content */}
      <div className="flex items-center justify-between">
        {/* Logo and interactive active icon */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span 
              className={`absolute w-3.5 h-3.5 rounded-full ${currentTheme.primaryColor} blur-sm opacity-80 ${topnavGlow ? "animate-ping" : "opacity-30"}`} 
            />
            <span className={`relative w-2 h-2 rounded-full ${currentTheme.primaryColor}`} />
          </div>
          <span 
            className="font-sans font-extrabold uppercase tracking-[0.25em] text-[11px] text-white transition-all duration-300"
            style={{
              textShadow: topnavGlow 
                ? `0 0 12px ${currentTheme.glowHex}` 
                : "none"
            }}
          >
            LUMINA GLOW
          </span>
          <span className="text-[8px] font-mono leading-none bg-slate-900 border border-slate-850 text-cyan-400 px-1 py-0.5 rounded-sm uppercase tracking-wider font-bold">
            BASIC
          </span>
        </div>

        {/* Dynamic Back-lit Underglow Switcher */}
        <button
          onClick={onToggleTopnavGlow}
          id="toggle-topnav-glow"
          className={`flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-mono px-2 py-1 rounded border transition-all ${
            topnavGlow 
              ? `${currentTheme.textColor} border-${currentTheme.glowHex}/40 bg-${currentTheme.glowHex}/5` 
              : "text-slate-500 border-slate-800 hover:border-slate-700 bg-transparent"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${topnavGlow ? currentTheme.primaryColor : "bg-slate-600"} ${topnavGlow ? "animate-pulse" : ""}`} />
          <span>Glow {topnavGlow ? "ACTIVE" : "STANDBY"}</span>
        </button>
      </div>
    </div>
  );
}
