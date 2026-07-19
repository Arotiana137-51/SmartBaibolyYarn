import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import {useTheme} from '../contexts/ThemeContext';
import {useTutorial, useTutorialTargets} from '../contexts/TutorialContext';
import {useAdaptiveInsets} from '../hooks/useAdaptiveInsets';
import type {TargetScope} from '../tutorials/registry';

const HOLE_PAD = 8;
const CARD_MAX_WIDTH = 300;
const CARD_GAP = 14;
const SCRIM = 'rgba(0,0,0,0.72)';

type Rect = {x: number; y: number; width: number; height: number};

type Props = {
  // Which hierarchy this overlay instance draws for. The screen-level mount
  // renders 'screen' steps; a mount inside a RN <Modal> renders 'modal' steps.
  scope?: TargetScope;
};

// One overlay instance. Multiple can be mounted (screen + inside each modal);
// each only renders when the active step's scope matches its own.
const TutorialOverlay: React.FC<Props> = ({scope = 'screen'}) => {
  const {theme, primaryColor} = useTheme();
  const {activeTutorial, step, stepIndex, stepCount, next, skip} = useTutorial();
  const targets = useTutorialTargets();
  const insets = useAdaptiveInsets();

  // Root ref: we measure the overlay's OWN window origin and subtract it from
  // the target's window coords. That cancels any status-bar / safe-area offset
  // between window space and this overlay's local space — so the hole lands on
  // the toggle on any screen size, not shifted up/down.
  const rootRef = useRef<View | null>(null);
  // One rect per highlighted target (targetId + any extraTargetIds). Empty =
  // no measurable target (centered card / modal fallback).
  const [rects, setRects] = useState<Rect[]>([]);
  // Overlay's own height (local space) — card placement clamps to THIS, not the
  // full window, so the card never falls below the overlay's visible area.
  const [overlayH, setOverlayH] = useState(0);
  // Measured coach-card height — placement clamps to it so the card is always
  // fully on-screen, even when the highlighted target is nearly full-height.
  const [cardH, setCardH] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [screen, setScreen] = useState(() => Dimensions.get('window'));
  // Measured Skip-pill size — its anchor is chosen dynamically so it never
  // covers a highlighted hole (a tappable target) or the coach card.
  const [skipSize, setSkipSize] = useState({w: 0, h: 0});

  const pulse = useSharedValue(0);

  const stepScope: TargetScope = step?.scope ?? 'screen';
  const isMine = !!step && stepScope === scope;
  const accent = primaryColor ?? theme.colors.navBackground;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = Dimensions.addEventListener('change', ({window}) => setScreen(window));
    return () => sub?.remove();
  }, []);

  // Pulse loop — only while this overlay is showing a hole and motion is allowed.
  useEffect(() => {
    if (!isMine || reduceMotion || rects.length === 0) {
      cancelAnimation(pulse);
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, {duration: 900, easing: Easing.inOut(Easing.ease)}),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [isMine, reduceMotion, rects.length, pulse]);

  // Measure the active target. Re-run whenever the step or screen changes.
  // Modal-scope steps measure too when their target is registered (hymn
  // category strip / keypad) so we can spotlight + dim inside the modal; steps
  // whose target isn't measurable fall back to a card-only layout below.
  const measure = useCallback(() => {
    if (!isMine || !step || step.targetId === null) {
      setRects([]);
      return;
    }
    const ids = [step.targetId, ...(step.extraTargetIds ?? [])];
    // Measure each target in window space, then subtract this overlay's own
    // window origin so results are local to the overlay (offset-corrected).
    const rootNode = rootRef.current;
    const withOrigin = (cb: (ox: number, oy: number) => void) => {
      if (rootNode && typeof rootNode.measureInWindow === 'function') {
        rootNode.measureInWindow((ox, oy) => cb(ox, oy));
      } else {
        cb(0, 0);
      }
    };
    withOrigin((ox, oy) => {
      const collected: Rect[] = [];
      let pending = ids.length;
      const done = () => {
        pending -= 1;
        if (pending === 0) setRects(collected);
      };
      ids.forEach(id => {
        const node = targets.current.get(id)?.current;
        if (!node || typeof node.measureInWindow !== 'function') {
          done();
          return;
        }
        node.measureInWindow((tx, ty, width, height) => {
          if (width > 0 && height > 0) {
            collected.push({x: tx - ox, y: ty - oy, width, height});
          }
          done();
        });
      });
    });
  }, [isMine, step, targets]);

  // Modal-scoped targets (grids) mount as the user drills in, so a single
  // measure can land before layout. Retry a few times over ~600ms.
  useEffect(() => {
    if (!isMine) {
      setRects([]);
      return;
    }
    let tries = 0;
    measure();
    const iv = setInterval(() => {
      tries += 1;
      measure();
      if (tries >= 6) clearInterval(iv);
    }, 100);
    return () => clearInterval(iv);
    // `screen` re-runs measurement on rotation.
  }, [isMine, stepIndex, measure, screen]);

  const glowStyle = useAnimatedStyle(() => {
    const w = 2 + pulse.value * 2; // 2 → 4
    return {
      borderWidth: w,
      shadowOpacity: 0.4 + pulse.value * 0.5,
    };
  });

  if (!activeTutorial || !isMine) return null;

  // Modal-scope WITHOUT a measured target: fall back to a floating coach card
  // pinned to the bottom (no hole). Once the target is measured (rect set) we
  // fall through to the shared spotlight+dim path below, same as screen steps.
  if (stepScope === 'modal' && rects.length === 0) {
    return (
      <View style={styles.modalCardWrap} pointerEvents="box-none">
        <Pressable
          onPress={skip}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Ampiasa avy hatrany"
          style={[styles.skip, {top: insets.top + 25}]}>
          <Text style={styles.skipText}>Ampiasa avy hatrany</Text>
          <Text style={styles.skipClose}>✕</Text>
        </Pressable>
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[
            styles.card,
            styles.modalCard,
            // Clear the floating Baiboly/Fihirana toggle: it sits at
            // insets.bottom + 12 and is ~42px tall. Push the card above it.
            {backgroundColor: accent, marginBottom: insets.bottom + 66},
          ]}>
          <Text style={styles.counterOnAccent}>
            {stepIndex + 1} / {stepCount}
          </Text>
          <Text style={styles.bodyOnAccent}>{step?.text}</Text>
        </View>
      </View>
    );
  }

  // Padded holes, one per measured target. ponytail: multi-hole steps assume
  // their targets share a row (e.g. the two chapter chevrons) — side scrims use
  // the shared band, add per-hole y-tiling if a future step stacks vertically.
  const holes = rects.map(r => ({
    x: Math.max(0, r.x - HOLE_PAD),
    y: Math.max(0, r.y - HOLE_PAD),
    width: r.width + HOLE_PAD * 2,
    height: r.height + HOLE_PAD * 2,
  }));
  const hasHoles = holes.length > 0;

  // Union bounding box across all holes — drives card placement + the band.
  const box = hasHoles
    ? holes.reduce(
        (acc, h) => ({
          left: Math.min(acc.left, h.x),
          top: Math.min(acc.top, h.y),
          right: Math.max(acc.right, h.x + h.width),
          bottom: Math.max(acc.bottom, h.y + h.height),
        }),
        {left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity},
      )
    : null;

  // Horizontal scrim segments inside the band: gaps left of the first hole,
  // between holes, and right of the last hole.
  const sorted = [...holes].sort((a, b) => a.x - b.x);
  const gaps: {left: number; width: number}[] = [];
  if (box) {
    let cursor = 0;
    for (const h of sorted) {
      if (h.x > cursor) gaps.push({left: cursor, width: h.x - cursor});
      cursor = Math.max(cursor, h.x + h.width);
    }
    gaps.push({left: cursor, width: screen.width - cursor});
  }

  // Coach card placement: below the holes if they fit in the top 60%, else above.
  // Centered (no hole) steps get a vertically-centered card.
  // Use the overlay's measured height when we have it; fall back to the window
  // height before first layout.
  const H = overlayH > 0 ? overlayH : screen.height;

  // Card height falls back to a rough estimate before its first onLayout so the
  // very first frame still clamps sensibly.
  const ch = cardH > 0 ? cardH : 150;
  const MARGIN = CARD_GAP;

  const placeBelow = box
    ? step?.placement === 'bottom'
      ? true
      : step?.placement === 'top'
        ? false
        : box.bottom < H * 0.6
    : false;

  // Always resolve to a single top, then clamp so the whole card stays on-screen
  // regardless of target size (a flex:1 target must not shove the card off-top).
  let cardTop: number;
  if (!box) {
    cardTop = H * 0.5 - 90;
  } else if (placeBelow) {
    cardTop = box.bottom + CARD_GAP;
  } else {
    cardTop = box.top - CARD_GAP - ch;
  }
  // Reserve the Android system nav bar (insets.bottom) so a bottom-placed card
  // never lands under the native navigation. 0 on devices that don't inset,
  // so this is a no-op where the old clamp was already correct.
  cardTop = Math.max(
    MARGIN,
    Math.min(cardTop, H - ch - MARGIN - insets.bottom),
  );

  const isLast = stepIndex === stepCount - 1;

  // Skip-pill anchor: default top-right, but if a hole or the coach card would
  // sit under it, fall through corners (TR → TL → BR → BL) to the first that
  // clears both. Keeps the pill from covering the very control the step wants
  // the user to tap. Uses measured pill size; before first layout the default
  // top-right is used (rough estimate) and corrected on the next frame.
  const skipTop = insets.top + 45;
  const skipBottom = insets.bottom + 16;
  const sw = skipSize.w || 190;
  const sh = skipSize.h || 40;
  const overlaps = (ax: number, ay: number): boolean => {
    const hit = (r: {left: number; top: number; right: number; bottom: number}) =>
      ax < r.right && ax + sw > r.left && ay < r.bottom && ay + sh > r.top;
    if (holes.some(h => hit({left: h.x, top: h.y, right: h.x + h.width, bottom: h.y + h.height})))
      return true;
    // Coach card spans ~86% width centered; treat its band as blocked.
    const cardLeft = screen.width * 0.07;
    return hit({left: cardLeft, top: cardTop, right: screen.width - cardLeft, bottom: cardTop + ch});
  };
  // Corners as (ax, ay) top-left positions, TR → TL → BR → BL.
  const rightX = screen.width - 12 - sw;
  const bottomY = H - skipBottom - sh;
  const candidates = [
    {ax: rightX, ay: skipTop, style: {right: 12, left: undefined, top: skipTop}},
    {ax: 12, ay: skipTop, style: {left: 12, right: undefined, top: skipTop}},
    {ax: rightX, ay: bottomY, style: {right: 12, left: undefined, top: bottomY}},
    {ax: 12, ay: bottomY, style: {left: 12, right: undefined, top: bottomY}},
  ];
  const skipAnchor =
    (candidates.find(c => !overlaps(c.ax, c.ay)) ?? candidates[0]).style;

  return (
    <View
      ref={rootRef}
      onLayout={e => setOverlayH(e.nativeEvent.layout.height)}
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none">
      {box ? (
        <>
          {/* Scrim rects framing the transparent hole(s). They capture taps
              (block interaction elsewhere); holes are left open so the real
              element underneath stays tappable when a step needs a live tap.
              Top band above the row, bottom band below it, and horizontal gap
              segments beside/between the holes within the row. */}
          <View style={[styles.scrim, {left: 0, top: 0, right: 0, height: box.top}]} />
          <View
            style={[styles.scrim, {left: 0, top: box.bottom, right: 0, bottom: 0}]}
          />
          {gaps.map((g, i) => (
            <View
              key={`gap-${i}`}
              style={[
                styles.scrim,
                {left: g.left, top: box.top, width: g.width, height: box.bottom - box.top},
              ]}
            />
          ))}
          {/* Glow border around each hole. pointerEvents none so taps pass to
              the real control beneath. */}
          {holes.map((h, i) => (
            <Animated.View
              key={`hole-${i}`}
              pointerEvents="none"
              style={[
                styles.hole,
                glowStyle,
                {
                  left: h.x,
                  top: h.y,
                  width: h.width,
                  height: h.height,
                  borderColor: accent,
                  shadowColor: accent,
                },
              ]}
            />
          ))}
        </>
      ) : (
        // Centered step: full dim, taps blocked.
        <View style={[StyleSheet.absoluteFill, {backgroundColor: SCRIM}]} />
      )}

      {/* Persistent Skip pill — top-right, above everything. Sits 15px below
          the safe-area top so it clears the notch on any screen size. */}
      <Pressable
        onPress={skip}
        hitSlop={12}
        onLayout={e =>
          setSkipSize({
            w: e.nativeEvent.layout.width,
            h: e.nativeEvent.layout.height,
          })
        }
        accessibilityRole="button"
        accessibilityLabel="Ampiasa avy hatrany"
        style={[styles.skip, skipAnchor]}>
        <Text style={styles.skipText}>Ampiasa avy hatrany</Text>
        <Text style={styles.skipClose}>✕</Text>
      </Pressable>

      {/* Coach card */}
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        onLayout={e => setCardH(e.nativeEvent.layout.height)}
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.backgroundSecondary,
            top: cardTop,
          },
        ]}>
        <Text style={[styles.counter, {color: theme.colors.textSecondary}]}>
          {stepIndex + 1} / {stepCount}
        </Text>
        <Text style={[styles.body, {color: theme.colors.textPrimary}]}>{step?.text}</Text>
        {/* Next button hidden on targetEvent steps — the real control advances,
            and the step text already tells the user what to do. */}
        {step?.advanceOn === 'targetEvent' ? null : (
          <Pressable
            onPress={next}
            style={[styles.nextBtn, {backgroundColor: accent}]}
            accessibilityRole="button">
            <Text style={styles.nextText}>{isLast ? 'Vita ✓' : 'Manaraka →'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  scrim: {position: 'absolute', backgroundColor: SCRIM},
  hole: {
    position: 'absolute',
    borderRadius: 12,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 0},
    elevation: 0,
  },
  skip: {
    position: 'absolute',
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  skipText: {color: '#FFFFFF', fontWeight: '700', fontSize: 13},
  skipClose: {color: '#FFFFFF', fontWeight: '700', fontSize: 14, marginLeft: 8},
  card: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: CARD_MAX_WIDTH,
    width: '86%',
    borderRadius: 14,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
  },
  counter: {fontSize: 12, fontWeight: '700', marginBottom: 6},
  body: {fontSize: 16, lineHeight: 22, marginBottom: 14},
  nextBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  nextText: {color: '#FFFFFF', fontWeight: '700', fontSize: 15},
  modalCardWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  modalCard: {
    marginBottom: 40,
    bottom: undefined,
    top: undefined,
  },
  counterOnAccent: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    color: 'rgba(255,255,255,0.85)',
  },
  bodyOnAccent: {fontSize: 16, lineHeight: 22, color: '#FFFFFF'},
});

export default TutorialOverlay;
