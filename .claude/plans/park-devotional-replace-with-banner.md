# Park the devotional feature, replace with a dismissible reader notification

## Goal
Stop shipping the full devotional UX on `main` while keeping all the work
recoverable on a dedicated branch. Replace it with a small, lightweight
notification banner pinned to the top of both readers (Bible + Hymn). The
banner shows a short paragraph derived from today's devotional JSON
(reusing the existing `DevotionalManager` + `useDailyDevotional`
pipeline) and is dismissed by tapping outside it. Dismissal is
per-session only — banner reappears on next launch.

## User decisions (already captured)
- **Preservation**: move current devotional work to a new branch
  `devotional-feature` before stripping `main`.
- **Notification content**: reuse `docs/devotionals/<date>.json` via the
  existing manager, but render only a one-line summary (first paragraph,
  truncated).
- **Where shown**: both Bible and Hymn readers, pinned above the verse
  list.
- **Dismissal**: per-session React state. No AsyncStorage.

## Phase 1 — Preserve current work on a branch

The working tree has un-committed devotional churn (uncommitted edits,
new untracked files like `DevotionalGlow.tsx`, `DevotionalOverlay.tsx`,
`useDevotionalGlow.ts`, `useDevotionalPullTrigger.ts`, and modified
readers/screens). We need ALL of it preserved on
`devotional-feature` before we strip `main`.

Steps:
1. From `main`, `git checkout -b devotional-feature`.
2. `git add -A` then commit:
   `wip(devotional): snapshot inline overlay + glow before main strip`.
3. Push the branch: `git push -u origin devotional-feature`.
4. Switch back to `main`: `git checkout main`. The working tree comes
   with us (the WIP is now safe in the branch); we will undo it on
   `main` via deletes/reverts below.

Confirm before proceeding: user must approve the branch name
`devotional-feature` and confirm they want it pushed to origin
(otherwise we leave it local-only).

## Phase 2 — Strip devotional UI from `main`

Goal: `main` no longer renders a full devotional anywhere. The data
layer (`DevotionalManager`, `useDailyDevotional`, `ContentSource`,
schema, `docs/devotionals/*.json`) STAYS — the new banner reads from it.

### 2a. Delete UI-only files (no longer needed on `main`)
- `src/screens/DevotionalScreen.tsx`
- `src/components/DevotionalGlow.tsx` (untracked file)
- `src/components/devotional/DevotionalView.tsx`
- `src/components/devotional/DevotionalBlocks.tsx`
- `src/components/devotional/DevotionalOverlay.tsx` (untracked)
- `src/components/devotional/DevotionalLoadingBar.tsx` (untracked)
- `src/hooks/useDevotionalGlow.ts` (untracked)
- `src/hooks/useDevotionalPullTrigger.ts` (untracked)
- The already-deleted `NotificationGlow.tsx` and
  `ReaderRevealBanner.tsx` stay deleted (matches current `git status`).

After deletion the `src/components/devotional/` directory may be empty
— if so, remove it. The `src/devotional/` directory (schema +
topics) STAYS because `useDailyDevotional` + the new banner both
consume the `Devotional` type.

### 2b. Strip wiring from `RootNavigator.tsx`
- Remove the `import DevotionalScreen` line.
- Remove the `Devotional: undefined;` entry from `RootStackParamList`.
- Remove the `<Stack.Screen name="Devotional" …>` block.

### 2c. Strip wiring from `MainScreen.tsx`
Touch points to remove (from the read I did above):
- Imports: `DevotionalGlow`, `DevotionalOverlay`, `useDevotionalGlow`.
- `useDevotionalGlow()` call.
- `devotionalScrollY = useSharedValue(0)` (only used by glow + readers).
  `useSharedValue` import from `react-native-reanimated` may then be
  unused — drop the whole import line if so.
- `devotionalOpen` state, `openDevotional`, `closeDevotional`, plus the
  three places that referenced them: the `SelectionTopBar` /
  `TopBar` conditional, the `<DevotionalGlow>` render, the
  `<DevotionalOverlay>` render, the `devotionalOpen ? null : <Bottom…>`
  guard.
- Pass-throughs to readers: drop `onPullToOpenDevotional` and
  `glowScrollY` props from both `BibleReaderView` and `HymnReaderView`
  call sites.

### 2d. Strip pull-to-open from the readers
In both `BibleReaderView.tsx` and `HymnReaderView.tsx`:
- Drop the `import {useDevotionalPullTrigger}` line.
- Drop the `onPullToOpenDevotional?` and `glowScrollY?` props from the
  TypeScript prop type.
- Drop `handlePullTrigger` callback + the `useDevotionalPullTrigger`
  call.
- Drop the `glowScrollHandler` (`useAnimatedScrollHandler` from
  reanimated) and its `onScroll={glowScrollHandler}` /
  `scrollEventThrottle` on the FlatList. (If reanimated `Animated.FlatList`
  was only used for the glow scroll handler, revert to plain
  `FlatList` to avoid pulling reanimated into the render tree.)
- Drop the `<RefreshControl … refreshing={refreshing}
  onRefresh={onRefresh} />` `refreshControl` prop. (Pull-to-refresh is
  removed entirely because its only consumer was the devotional
  trigger.)
- The new banner is added in Phase 3 below; readers themselves don't
  render it (`MainScreen` owns the banner above the reader container,
  same place the old TopBar / overlay lived).

### 2e. i18n
Keep `'devotional.title': 'Fampahatsiarovana'` for now — the new banner
may use it as a label. (Cheap to keep; removing it is a no-op if
unused.)

## Phase 3 — Build the new notification banner

### Files to create
- `src/components/ReaderNotificationBanner.tsx` — the dismissible UI.
- `src/hooks/useReaderNotification.ts` — picks the one-line summary
  out of `useDailyDevotional`'s `Devotional` blocks.

### `useReaderNotification` (hook)
- Calls `useDailyDevotional()` (already implemented; cache-first, never
  throws).
- Returns `{ summary: string | null, title: string | null }`.
- Summary extraction: take the first `paragraph` block from
  `devotional.blocks`; trim; truncate at ~140 chars on a word boundary
  with an `…` suffix; fall back to the first `verse` block's `text`
  if there is no paragraph; return `null` if neither exists.
- No new state, no AsyncStorage, no fetch — just a derivation.

### `ReaderNotificationBanner` (component)
- Props: `{ summary: string; title?: string | null; onDismiss: () => void; }`
- Renders a single-line-tall card pinned above the reader's FlatList:
  thin accent stripe on the left (uses `theme.colors.accentBlue` for
  brand consistency), title in `TEXT_STYLES.captionStrong`-ish weight,
  summary in regular reader text, all on `theme.colors.backgroundSecondary`.
- Tap-outside dismissal: implemented in `MainScreen` (see below) by
  wrapping the reader container in a `Pressable` that fires `onDismiss`
  when the banner is visible and the user taps anywhere that isn't the
  banner itself. The banner stops touch propagation via a
  `<Pressable onPress={() => {}}>` wrapper.
- `StyleSheet.create()` only — matches project rule.
- Named export only (project rule for components).

### `MainScreen.tsx` wiring
- Add state: `const [notificationVisible, setNotificationVisible] = useState(true);`
  (per-session — resets on app launch / mount, as requested.)
- Add the hook: `const { summary, title } = useReaderNotification();`
- Render the banner directly above `<View style={styles.readerContainer}>`,
  inside the `SafeAreaView`, conditioned on `notificationVisible && summary`.
- "Tap-outside" semantics:
  - Wrap `readerContainer` in a `Pressable` with `onPress={() => {
    if (notificationVisible) setNotificationVisible(false); }}`.
  - The banner's inner `Pressable onPress={() => {}}` swallows taps so
    only outside taps dismiss it.
  - The reader's existing tap targets (verse double-tap, long-press)
    still bubble through because the wrapping `Pressable` only
    dismisses; it doesn't capture or block. Need to verify this against
    the existing `swipeResponder` (`PanResponder`) — `Pressable` does
    not consume drags, so the swipe-between-modes gesture is unaffected.
  - There's a risk that single-tap verse interactions inadvertently
    dismiss the banner. Acceptable per the user's spec ("dismissed on
    clicking outside of it"); the banner is short-lived per session so
    even an accidental dismiss is mild.

## Phase 4 — Verify, then commit

1. `yarn typecheck` — must pass clean. Drop now-unused imports
   surfaced by tsc.
2. `yarn lint` — fix any new warnings introduced.
3. Manual smoke (user-driven on device) — out of scope for this plan's
   code changes, but call it out in the final report so the user knows
   to test.
4. Commit on `main` with a single, atomic message (no AI co-author
   trailer, per global rule):
   - `feat(reader): replace inline devotional with dismissible top banner`
   - body summarizes: parked devotional UI on `devotional-feature`,
     removed screens/overlay/glow/pull-trigger, added
     `ReaderNotificationBanner` reading from existing devotional cache.

## Files touched

### Created
- `src/components/ReaderNotificationBanner.tsx`
- `src/hooks/useReaderNotification.ts`

### Modified
- `src/screens/MainScreen.tsx`
- `src/navigation/RootNavigator.tsx`
- `src/components/BibleReaderView.tsx`
- `src/components/HymnReaderView.tsx`

### Deleted on `main` (preserved on `devotional-feature`)
- `src/screens/DevotionalScreen.tsx`
- `src/components/DevotionalGlow.tsx`
- `src/components/devotional/` (whole folder if empty)
- `src/hooks/useDevotionalGlow.ts`
- `src/hooks/useDevotionalPullTrigger.ts`

### Untouched (still backing the new banner)
- `src/devotional/schema.ts`
- `src/devotional/topics.ts`
- `src/services/devotional/DevotionalManager.ts`
- `src/services/content/*` (ContentSource layer)
- `src/hooks/useDailyDevotional.ts`
- `docs/devotionals/*.json`

## Risks / open items

- **Reanimated may still be used elsewhere.** The readers' only
  reanimated touch is the glow scroll handler. After removal,
  `Animated.FlatList` reverts to `FlatList`. Reanimated stays a
  dependency (other surfaces use it) — only the import drops.
- **Pull-to-refresh removal**: today its sole purpose is opening the
  devotional. Removing it is the right call for now; if the user wants
  a different refresh action later, that's a new feature.
- **Tap-outside semantics**: the wrapping `Pressable` may cause one
  unexpected dismiss on a single tap inside the reader. Spec
  matches user's request; acceptable trade-off for per-session UX.
- **The new branch push** assumes the user wants `devotional-feature`
  pushed to origin. If not, we leave it local.
