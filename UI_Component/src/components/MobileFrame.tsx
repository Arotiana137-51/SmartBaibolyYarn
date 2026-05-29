import React, { useState, useEffect } from "react";
import { Battery, Wifi, Signal, Sparkles } from "lucide-react";

/**
 * Interface detailing child components wrapped inside the mobile view simulator shell.
 */
interface MobileFrameProps {
  children: React.ReactNode;
}

/**
 * MobileFrame Component:
 * Embeds the core application inside a high-fidelity virtual mobile shell on wider viewport monitors.
 * Simulates a hardware device layout complete with system time, 5G beacons, Wi-Fi networks, and status metrics.
 */
export default function MobileFrame({ children }: MobileFrameProps) {
  // State hook preserving the active system clock readout
  const [time, setTime] = useState("");

  useEffect(() => {
    /**
     * Periodically tracks and normalizes current system hours and minutes 
     * to populate the device's clock read-out block.
     */
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      let minutes = now.getMinutes();
      const strHours = hours < 10 ? `0${hours}` : `${hours}`;
      const strMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
      setTime(`${strHours}:${strMinutes}`);
    };

    updateTime();
    // Re-check system time every 30 seconds to maintain high readout accuracy
    const interval = setInterval(updateTime, 30000); 
    
    // Garbage collection on component unmount
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-0 sm:p-6 md:p-12 font-sans overflow-hidden relative">
      
      {/* 
        ========================================================
        1. DYNAMIC AMBIENT BACKING DECK (Bleeding Color Effects)
        ========================================================
        These absolute divs act as decorative soft-glowing background visual filters
        mimicking active screen bleed on the simulated viewport.
      */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full bg-cyan-500/10 blur-[80px] pointer-events-none animate-ambient" />
      <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] rounded-full bg-blue-500/5 blur-[90px] pointer-events-none animate-ambient" style={{ animationDelay: "-3s" }} />

      {/* 
        ========================================================
        2. SMARTPHONE HARDWARE SIMULATOR壳 (Shell Shell)
        ========================================================
      */}
      <div 
        id="mobile-device-shell"
        className="relative w-full max-w-sm sm:h-[840px] h-screen sm:rounded-[40px] rounded-0 bg-[#0f172a] border-0 sm:border-8 border-slate-800 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden transition-all duration-300 ring-1 ring-white/5"
      >
        
        {/* Device camera and speaker block (Dynamic Island concept) - Hidden on physical small layouts */}
        <div className="hidden sm:flex absolute top-2 left-1/2 -translate-x-1/2 w-40 h-8 rounded-full bg-black z-50 items-center justify-center border border-slate-800/20">
          {/* Main camera lens simulator */}
          <div className="w-3 h-3 rounded-full bg-[#0f172a] border border-slate-800/40 ml-4 mr-auto flex items-center justify-center">
            <span className="w-1 h-1 rounded-full bg-cyan-500/50 block animate-pulse" />
          </div>
          {/* Depth sensor simulator */}
          <div className="w-1.5 h-1.5 rounded-full bg-[#0f172a] mr-4" />
        </div>

        {/* 
          ========================================================
          3. DEVICE UTILITY STATUS BAR 
          ========================================================
        */}
        <div className="h-14 pt-4 sm:pt-6 px-6 bg-slate-950/40 backdrop-blur-md flex items-center justify-between text-[11px] font-mono tracking-tight text-slate-400 select-none z-40 border-b border-slate-900/50">
          
          {/* Simulated current clock readout */}
          <div className="font-semibold text-slate-200">
            {time || "13:00"}
          </div>

          {/* Invisible padding block reserving layout space on wider desktop notches */}
          <div className="hidden sm:block w-32 h-2" />

          {/* Diagnostic connectivity icons */}
          <div className="flex items-center gap-2">
            <Signal className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] text-cyan-400 font-bold">5G</span>
            <Wifi className="w-3.5 h-3.5 text-slate-400" />
            <div className="flex items-center gap-1 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
              <span className="text-[9px] text-cyan-400 font-bold font-mono">98%</span>
              <Battery className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
            </div>
          </div>
        </div>

        {/* 
          ========================================================
          4. SCREEN CLIENT AREA (Renders Child Visual Content)
          ========================================================
        */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-[#0f172a] grid-bg">
          {children}
        </div>

        {/* 
          ========================================================
          5. HOME GESTURE BAR INDICATOR
          ========================================================
        */}
        <div className="h-5 sm:h-7 bg-slate-950/40 backdrop-blur-md flex items-center justify-center pb-2 z-40 border-t border-slate-900/40">
          <div className="w-28 h-1 rounded-full bg-slate-700/60" />
        </div>
      </div>

      {/* Aesthetic subtitle metadata floating external to the viewport frame */}
      <div className="hidden sm:flex items-center gap-1.5 mt-4 text-[10px] font-mono uppercase tracking-widest text-slate-500/80">
        <Sparkles className="w-3 h-3 text-cyan-500/80" />
        <span>Nexus Balance Device Shell</span>
      </div>
    </div>
  );
}
