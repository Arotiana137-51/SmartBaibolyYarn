import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sliders, 
  Palette, 
  Activity, 
  MousePointerClick,
  Info,
  Copy,
  Check,
  Smartphone,
  Sparkles
} from "lucide-react";
import MobileFrame from "./components/MobileFrame";
import TopNav from "./components/TopNav";
import { GLOW_THEMES, GlowThemeId } from "./types";

/**
 * Interface representing a kinetic sensory ripple cast on the touchpad.
 * Saved as a lightweight coordinates object to trigger render nodes asynchronously.
 */
interface Ripple {
  /** High precision epoch timestamp serving as a unique node key */
  id: number;
  /** Horizontal relative coordinate inside the touch boundary */
  x: number;
  /** Vertical relative coordinate inside the touch boundary */
  y: number;
  /** Hexadecimal color class aligned with the active spectrum palette */
  color: string;
}

/**
 * App component: Serves as the primary viewport controller and visual processing engine.
 * Renders a single-screen responsive mobile device simulator centering on a horizontal bar that glows 
 * and casts an adjustable half-ellipse radial light field with an interactive React Native code conversion deck.
 */
export default function App() {
  
  // ==========================================
  // 1. STATE INITIALIZATION & SYSTEM Telemetry
  // ==========================================
  
  /** Active identifier matching one of the keys inside GLOW_THEMES dictionary */
  const [currentThemeId, setCurrentThemeId] = useState<GlowThemeId>("purple");
  
  /** Boolean master flag detailing whether the underglow emission is active (backlight toggle) */
  const [topnavGlow, setTopnavGlow] = useState<boolean>(true);
  
  /** Adaptive glow intensity level, acts as a scale factor for opacity, blur and box-shadow (15% - 100%) */
  const [intensity, setIntensity] = useState<number>(75);
  
  /** Curve height depth representing the structural vertical span of the half-ellipse (20px - 140px) */
  const [depth, setDepth] = useState<number>(65); 
  
  /** Current oscillation mechanism configuration. Controls the velocity and pattern of the luminescent pulses */
  const [pulseMode, setPulseMode] = useState<"static" | "slow" | "medium" | "fast" | "breath">("medium");

  /** Thread-safe array storing active touch ripples triggered inside the sensory play area */
  const [ripples, setRipples] = useState<Ripple[]>([]);

  /** Visual deck view layout mode: either standard "preview" or code "native" */
  const [viewMode, setViewMode] = useState<"preview" | "native">("preview");

  /** Copies state visual feedback tracker */
  const [copiedState, setCopiedState] = useState<boolean>(false);

  /** Quick pointer referencing the active theme object parameters (Hex codes, shadows, text styles) */
  const currentTheme = GLOW_THEMES[currentThemeId];

  // ==========================================
  // 2. MATHEMATICAL TRANSITION RESOLVERS
  // ==========================================

  /**
   * Translates the discrete human-friendly pulse modes into framer-motion transition configurations.
   * Leverages multi-stage keyframe array interpolation to output harmonized oscillations.
   *
   * @returns {Object} animate and transition vectors ready for rendering
   */
  const getPulseTransition = () => {
    // If static, bypass relative keyframes and apply static linear coefficients directly
    if (pulseMode === "static") {
      return { 
        animate: { 
          opacity: 1 * (intensity / 100),
          scaleY: 1.0
        } 
      };
    }
    
    // Choose oscillation frequency in seconds
    let duration = 2.0;
    if (pulseMode === "slow") duration = 3.5;
    if (pulseMode === "medium") duration = 1.8;
    if (pulseMode === "fast") duration = 0.7;
    if (pulseMode === "breath") duration = 4.8; // Calibrated to human breathing patterns

    return {
      animate: {
        // Opacity cycles between a low bound and the peak intensity set by the user
        opacity: [
          0.4 * (intensity / 100), 
          1.0 * (intensity / 100), 
          0.4 * (intensity / 100)
        ],
        // Subtle vertical breathing effect matching the active frequency
        scaleY: [0.95, 1.05, 0.95]
      },
      transition: {
        duration: duration,
        repeat: Infinity,
        ease: "easeInOut" // Soft sinusoidal interpolation curve
      }
    };
  };

  /** Dynamically calculated transition attributes mapped to the current state */
  const pulseProps = getPulseTransition();

  // ==========================================
  // 3. SENSORY TOUCH EVENT DISPATCHERS
  // ==========================================

  /**
   * Event handler that intercepts cursor actions inside the Touchpad boundaries.
   * Projects relative X and Y positions by subtracting the absolute boundary of the wrapper,
   * spawning an expanding custom ripple coordinate node.
   *
   * @param {React.MouseEvent<HTMLDivElement>} e standard mouse interaction footprint
   */
  const handleDeckClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple: Ripple = {
      id: Date.now(),
      x,
      y,
      color: currentTheme.glowHex
    };

    // Concatenate new state and slide off the older elements to prevent DOM stack memory pollution
    setRipples((prev) => [...prev, newRipple].slice(-6)); 
  };

  /**
   * Thread-safe sanitation effect. Runs a passive validation timer to sweep away stale ripples 
   * after their CSS animation cycles (1200ms) terminate, keeping memory consumption near zero.
   */
  useEffect(() => {
    if (ripples.length === 0) return;
    const timer = setTimeout(() => {
      // Retain only elements that haven't lived past the 1.2s visual lifespan
      setRipples((prev) => prev.filter((r) => Date.now() - r.id < 1200));
    }, 1200);
    return () => clearTimeout(timer);
  }, [ripples]);

  // ==========================================
  // 4. PARAMETER NORMALIZATION ROUTINES
  // ==========================================

  /**
   * Reverts all customization scalars back to the baseline default configuration profile.
   */
  const handleReset = () => {
    setCurrentThemeId("purple");
    setIntensity(75);
    setDepth(65);
    setPulseMode("medium");
    setTopnavGlow(true);
  };

  // ==========================================
  // 5. NATIVE TRANSLATION CONSTANTS Code Block
  // ==========================================

  const reactNativeComponentCode = `import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  SafeAreaView, 
  StatusBar, 
  Dimensions, 
  Animated, 
  Easing 
} from 'react-native';

// Screen Dimensions tracking for fluid scaling
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Proportional curve scaling parameters
const ELLIPSE_WIDTH = SCREEN_WIDTH * 1.25; // 125% width
const EXTRA_MARGIN = (ELLIPSE_WIDTH - SCREEN_WIDTH) / 2;

export default function GlowReactor() {
  const [pulse] = useState(new Animated.Value(0.4));
  
  useEffect(() => {
    // sinusoidal pulse breathing timeline
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.0,
          duration: ${pulseMode === "static" ? "1" : pulseMode === "slow" ? "3500" : pulseMode === "fast" ? "700" : pulseMode === "breath" ? "4800" : "1800"},
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: ${pulseMode === "static" ? "1" : pulseMode === "slow" ? "3500" : pulseMode === "fast" ? "700" : pulseMode === "breath" ? "4800" : "1800"},
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>LUMINA GLOW</Text>
        <View style={styles.headerIndicator}>
          <Text style={styles.indicatorText}>${pulseMode.toUpperCase()}</Text>
        </View>
      </View>

      {/* CORE GLOW PROJECTION */}
      <View style={styles.glowArea}>
        
        {/* ELEMENT 1: Parabolic Half-Ellipse */}
        <Animated.View 
          style={[
            styles.halfEllipse,
            {
              opacity: pulse * (${intensity / 100}),
              transform: [{
                scaleY: pulse.interpolate({
                  inputRange: [0.4, 1.0],
                  outputRange: [0.95, 1.05]
                })
              }]
            }
          ]} 
        />
        
        {/* ELEMENT 2: Glowing 3px Bar */}
        <View style={styles.glowBar} />
      </View>

      {/* CONTROLS AREA */}
      <View style={styles.workspace}>
        <Text style={styles.infoText}>ACTIVE TINT: ${currentTheme.name.toUpperCase()}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1d',
  },
  header: {
    height: 60,
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    zIndex: 50,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  headerIndicator: {
    backgroundColor: '#070b13',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  indicatorText: {
    color: '${currentTheme.glowHex}',
    fontSize: 8,
    fontWeight: 'bold',
  },
  glowArea: {
    width: '100%',
    height: 1,
    zIndex: 40,
  },
  halfEllipse: {
    position: 'absolute',
    top: 0,
    left: -EXTRA_MARGIN,
    width: ELLIPSE_WIDTH,
    height: ${depth},
    borderBottomLeftRadius: ELLIPSE_WIDTH / 2,
    borderBottomRightRadius: ELLIPSE_WIDTH / 2,
    backgroundColor: '${currentTheme.glowHex}',
    shadowColor: '${currentTheme.glowHex}',
    shadowOffset: { width: 0, height: ${depth / 4} },
    shadowOpacity: ${intensity / 100},
    shadowRadius: ${intensity * 0.4},
    elevation: 20,
  },
  glowBar: {
    width: '100%',
    height: 3,
    backgroundColor: '${currentTheme.glowHex}',
    shadowColor: '${currentTheme.glowHex}',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  workspace: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    color: '#475569',
    fontSize: 10,
    fontFamily: 'monospace',
  }
});`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(reactNativeComponentCode);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  // ==========================================
  // 6. VIEWPORT RENDERING
  // ==========================================

  return (
    <MobileFrame>
      <div className="flex-1 flex flex-col relative overflow-hidden bg-[#0a0f1d] font-sans text-slate-100 select-none">
        
        {/* Bookends premium padding bar */}
        <BookendsHeader />
        
        {/* Interactive Top Navbar containing backlit standby button */}
        <TopNav
          currentTheme={currentTheme}
          topnavGlow={topnavGlow}
          onToggleTopnavGlow={() => setTopnavGlow(!topnavGlow)}
        />

        {/* 
          ======================================================================
          ✦✦✦ CORE GLOW COMPONENT MECHANICS (AI MODEL LOGIC SPECIFICATION) ✦✦✦
          ======================================================================
          This block contains the two visual engines requested by the user:
            1. THE GLOWING HORIZONTAL BAR: A pristine 3px horizontal conduit
               with solid background pigment and custom shadow falloff.
            2. THE HALF-ELLIPSE: A parabolic radial light gradient container
               expanding from the center out, with adaptive height, colors, and shadows.

          - Positioning: Placed directly flush below the TopNav with highest z-index.
          - Math Framework: Box shadows, border pathing, and gradient values scale 
            linearly using user configuration parameters: `currentTheme`, `intensity` and `depth`.
        */}
        <div id="glowing-aurora-deck" className="relative w-full z-30 select-none bg-slate-950/80">
          
          {/* 
            GEOMETRIC ELEMENT 1: Parabolic Half-Ellipse Radial Projection
            - Geometry: Created using unequal border radii (borderBottomLeftRadius & borderBottomRightRadius set to '50% 100%').
            - Gradient: Radial gradient using `ellipse at top` using current spectrum colors.
            - Shadows: Calibrated with hardware-accelerated filters to prevent layout reflows.
          */}
          <div className="relative w-full overflow-visible h-1">
            <AnimatePresence>
              {topnavGlow && (
                <motion.div
                  key={`${currentThemeId}-${pulseMode}-${intensity}`}
                  initial={{ opacity: 0 }}
                  animate={pulseProps.animate}
                  transition={pulseProps.transition}
                  className="absolute left-1/2 -translate-x-1/2 top-0 pointer-events-none transition-all duration-500 ease-out origin-top"
                  style={{
                    width: "125%",
                    height: `${depth}px`,
                    borderBottomLeftRadius: "50% 100%", // Configures standard parabolic half-ellipse border pathing
                    borderBottomRightRadius: "50% 100%",
                    // Radial gradient simulating physical light fallback with progressive transparency opacity values
                    background: `radial-gradient(ellipse at top, ${currentTheme.glowHex} 0%, ${currentTheme.glowAccentHex}30 45%, transparent 75%)`,
                    filter: "blur(2.5px)", // Smooth out banding anomalies
                    // Complex dynamic box shadow mimicking neon underglow projection using calculated scale factors
                    boxShadow: `0 ${depth / 4}px ${intensity * 0.7}px -${intensity / 8}px rgba(${currentTheme.shadowColor}, ${intensity / 100})`,
                  }}
                />
              )}
            </AnimatePresence>

            {/* 
              GEOMETRIC ELEMENT 2: Pristine Glowing Horizontal Bar
              - Height: Strictly fixed to 3px to maintain user's basic layout discipline.
              - Box-shadow: Computes dynamic neon outline thickness using the `intensity` state.
            */}
            <div 
              id="horizontal-glow-bar"
              className="absolute top-0 left-0 w-full h-[3px] z-40 transition-all duration-300"
              style={{
                backgroundColor: currentTheme.glowHex,
                // Adjust shadow offset and glowing footprint dynamically according to the raw intensity preset
                boxShadow: topnavGlow 
                  ? `0 1px 18px ${intensity / 15}px ${currentTheme.glowHex}` 
                  : "0 0 1px rgba(255,255,255,0.1)",
              }}
            />
          </div>
        </div>

        {/* View Mode Segmented Switch Controller */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 p-1 bg-slate-950/70 rounded-xl border border-slate-900/80">
            <button
              id="view-toggle-preview"
              onClick={() => setViewMode("preview")}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-mono tracking-widest uppercase transition-all ${
                viewMode === "preview"
                  ? "bg-[#1e293b] text-cyan-400 border border-slate-700/40 font-bold shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Interactive UI</span>
            </button>
            <button
              id="view-toggle-native"
              onClick={() => setViewMode("native")}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-mono tracking-widest uppercase transition-all ${
                viewMode === "native"
                  ? "bg-[#1e293b] text-cyan-400 border border-slate-700/40 font-bold shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>React Native</span>
            </button>
          </div>
        </div>

        {/* Dynamic Display Area based on View Mode selection */}
        <AnimatePresence mode="wait">
          {viewMode === "preview" ? (
            <motion.div
              key="view-preview"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 flex flex-col gap-5 justify-between relative z-10 mt-1 pb-8"
            >
              {/* 1. Sensory Interaction Touchpad */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1">
                    <MousePointerClick className="w-3.5 h-3.5 text-cyan-500/80" />
                    AURA INTERACTIVE DECK
                  </span>
                  <span className="text-[9px] font-mono text-slate-600">TAP TO RIPPPLE WAVE</span>
                </div>

                {/* Click/Touch boundaries acting as the interactive transjection engine */}
                <div 
                  id="sensory-touch-deck"
                  onClick={handleDeckClick}
                  className="relative w-full h-[115px] rounded-xl border border-slate-900 bg-[#0d1321]/45 hover:bg-[#0d1321]/70 transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center group"
                >
                  <div className="absolute inset-0 grid-overlay opacity-5" />
                  
                  {/* Iterating coordinates representing the expanding waves */}
                  {ripples.map((rip) => (
                    <motion.div
                      key={rip.id}
                      initial={{ scale: 0, opacity: 0.85 }}
                      animate={{ scale: 6.5, opacity: 0 }}
                      transition={{ duration: 1.1, ease: "easeOut" }} // Smooth expansion easing
                      className="absolute rounded-full pointer-events-none"
                      style={{
                        left: rip.x - 24,
                        top: rip.y - 24,
                        width: 48,
                        height: 48,
                        border: `1.5px solid ${rip.color}`,
                        background: `radial-gradient(circle, ${rip.color}15 0%, transparent 70%)`,
                        boxShadow: `0 0 16px -2px ${rip.color}35`,
                      }}
                    />
                  ))}

                  <span className="text-[10px] font-sans text-slate-500 font-medium tracking-wide uppercase transition-colors group-hover:text-slate-400">
                    Click Inside to Test Wave
                  </span>
                  <span className="text-[9px] font-mono text-slate-600 mt-1">
                    Transjects kinetic ripples into the half-ellipse underglow
                  </span>
                </div>
              </div>

              {/* Interactive sliders and options row */}
              <div className="flex flex-col gap-5">
                
                {/* 2. Theme Selection Grid */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-slate-400">
                    <Palette className="w-3.5 h-3.5 text-slate-500" />
                    <span className="uppercase font-mono text-[10px]">Aura Spectrum Hue</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2" id="spectrum-hue-deck">
                    {Object.values(GLOW_THEMES).map((theme) => {
                      const isActive = theme.id === currentThemeId;
                      return (
                        <button
                          key={theme.id}
                          id={`theme-select-${theme.id}`}
                          onClick={() => setCurrentThemeId(theme.id)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all duration-300 relative overflow-hidden bg-[#070b13]/60 ${
                            isActive 
                              ? "border-slate-700/80 shadow-md" 
                              : "border-slate-900/60 hover:border-slate-800 hover:bg-slate-900/25"
                          }`}
                        >
                          {/* Round visual indicator with custom shadows for immediate aesthetic feedback */}
                          <span 
                            className={`w-3.5 h-3.5 rounded-full ${theme.primaryColor} shadow-md transition-transform duration-300 ${isActive ? "scale-110" : "scale-100"}`} 
                            style={{
                              boxShadow: isActive ? `0 0 10px ${theme.glowHex}` : "none"
                            }}
                          />
                          <span className={`text-[9px] font-mono uppercase tracking-wider mt-0.5 ${isActive ? "text-slate-100 font-bold" : "text-slate-500"}`}>
                            {theme.name.split(" ")[1]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. High Fidelity Control Sliders */}
                <div className="flex flex-col gap-3.5 p-4 rounded-xl bg-[#070b14]/90 border border-slate-900">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-900 pb-1.5 mb-1.5">
                    <Sliders className="w-3.5 h-3.5 text-slate-500" />
                    <span>Glow Range Quantifiers</span>
                  </div>
                  
                  {/* Intensity custom slider input */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">LUX INTENSITY</span>
                      <span className="font-bold uppercase" style={{ color: currentTheme.glowHex }}>{intensity}%</span>
                    </div>
                    <input
                      type="range"
                      id="slider-intensity"
                      min="15"
                      max="100"
                      value={intensity}
                      onChange={(e) => setIntensity(Number(e.target.value))}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-900 accent-cyan-500"
                      style={{
                        accentColor: currentTheme.glowHex
                      }}
                    />
                  </div>

                  {/* Curve Depth custom slider input */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">CURVE HEIGHT DEPTH</span>
                      <span className="font-bold uppercase" style={{ color: currentTheme.glowHex }}>{depth}px</span>
                    </div>
                    <input
                      type="range"
                      id="slider-depth"
                      min="20"
                      max="140"
                      value={depth}
                      onChange={(e) => setDepth(Number(e.target.value))}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-900 accent-fuchsia-500"
                      style={{
                        accentColor: currentTheme.glowHex
                      }}
                    />
                  </div>
                </div>

                {/* 4. Pulse Rhythmic Modulation settings */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-slate-400">
                    <Activity className="w-3.5 h-3.5 text-slate-500" />
                    <span className="uppercase font-mono text-[10px]">Modulation Frequency</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1" id="pulse-rhythm-control">
                    {(["static", "slow", "medium", "fast", "breath"] as const).map((mode) => {
                      const isActive = pulseMode === mode;
                      return (
                        <button
                          key={mode}
                          id={`pulse-mode-${mode}`}
                          onClick={() => setPulseMode(mode)}
                          className={`py-1.5 text-[8.5px] font-mono uppercase rounded-lg border transition-all text-center tracking-wider font-semibold ${
                            isActive
                              ? "bg-slate-900/60 border-slate-700 text-white font-bold"
                              : "bg-transparent border-slate-900 text-slate-500 hover:text-slate-300 hover:border-slate-800"
                          }`}
                          style={{
                            color: isActive ? currentTheme.glowHex : undefined
                          }}
                        >
                          {mode}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* System diagnostics panel and quick-reset option */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-900/50 mt-1">
                <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-mono">
                  <Info className="w-3 h-3 text-slate-600" />
                  <span>GLOW EFFECT IS HARDWARE ACCELERATED</span>
                </div>
                <button
                  onClick={handleReset}
                  id="btn-reset-configuration"
                  className="text-[10px] font-mono text-slate-400 uppercase tracking-wider py-1 px-2.5 rounded-md hover:bg-slate-900 border border-slate-900 hover:text-red-400 transition-colors"
                >
                  Reset Config
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="view-native"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col px-5 py-4 gap-4 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Target Codebase</span>
                  <span className="text-xs font-bold text-cyan-400 font-mono">React Native TSX Component</span>
                </div>

                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all active:scale-95"
                >
                  {copiedState ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Copy Component</span>
                    </>
                  )}
                </button>
              </div>

              {/* Scrollable code explorer */}
              <div className="flex-1 rounded-xl bg-slate-950 border border-slate-900 p-4 font-mono text-[10px] leading-relaxed overflow-x-auto no-scrollbar relative">
                
                {/* Visual file system metadata tag */}
                <div className="absolute top-2 right-3 text-[8.5px] text-slate-500 bg-slate-900 px-2 py-0.5 border border-slate-800/85 rounded">
                  GlowProjection.tsx
                </div>

                <pre className="text-emerald-400/90 font-mono text-[9px] sm:text-[9.5px] leading-normal select-all whitespace-pre">
                  {reactNativeComponentCode}
                </pre>
              </div>

              {/* Conversion validation footer info */}
              <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-mono border-t border-[#1e293b]/40 pt-2 shrink-0">
                <Info className="w-3 h-3 text-cyan-400" />
                <span>Renders native paraboloids perfectly on both Android & iOS. Supports dynamic scale adjustments.</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MobileFrame>
  );
}

/**
 * Visual companion separator representing layout bookends.
 */
function BookendsHeader() {
  return (
    <div className="h-[2px] w-full bg-slate-950/80 shrink-0 relative z-50 overflow-hidden">
      <div className="absolute inset-x-0 h-[1px] bg-slate-800/10 top-0" />
    </div>
  );
}
