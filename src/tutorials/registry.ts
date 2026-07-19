// Tutorial data — pure, append-only. To add a mini-tutorial later: append a
// Tutorial object here (+ its steps). No engine change needed.
//
// `text` is the Malagasy coach-mark copy shown next to the highlighted element.
// It's kept inline (not in i18n/strings.ts) on purpose: that module is a strict
// union type where every key must be declared, and this copy is tutorial-local
// data. Overwrite the placeholders below with the final wording.

// Every spotlightable UI element registers itself under one of these ids via
// useTutorialTarget(id). null target = a centered card (welcome / done), no hole.
export type TargetId =
  | 'bottomNav'         // Baiboly ↔ Fihirana toggle (CustomBottomNav)
  | 'topbarTitle'       // tap to open book/hymn selector
  | 'topbarPrev'        // ‹‹ chevron (previous chapter/hymn)
  | 'topbarNext'        // › chevron (next chapter/hymn)
  | 'topbarMenu'        // hamburger
  | 'cultMenuItem'      // "Fotoam-pivavahana" row inside the hamburger popover
  | 'selBookTab'        // Boky tab inside BibleSelectionModal's SelectionTopBar
  | 'selChapterGrid'    // Toko grid
  | 'selVerseGrid'      // Andininy grid
  | 'hymnCategoryTabs'  // category strip inside HymnSelectionModal
  | 'hymnKeypad'        // numeric keypad
  | 'cultAddButtons'    // Hampio Baiboly / Fihirana row on CultModeScreen
  | 'cultList'          // the playlist itself (what-to-read, drag to reorder)
  | 'cultActivateToggle'// Velomy ny fotoana switch row on CultModeScreen
  | 'cultReaderNav'     // ‹ playlist chevron in the reader (Home) once active
  | 'cultReaderNavNext' // › playlist chevron (paired with cultReaderNav)
  | 'notificationGlow'; // daily devotional cue

// A side-effect the engine performs when the step becomes active — it drives
// the REAL app UI (opens the actual modal, switches mode) so the user learns
// the true gesture, not a fake.
export type DriveVerb =
  | 'openBookSelector'
  | 'openHymnSelector'
  | 'switchToBible'
  | 'switchToHymnal'
  | 'openMenu'
  // Cult tutorial: go back to the reader (Home) and force-show the playlist
  // ‹ › chevrons so the last step can spotlight the real control.
  | 'showCultReaderNav';

// When does the step advance to the next one?
//  - 'tap'         : user taps the coach card's Next button
//  - 'targetEvent' : the driven UI fires its real progress callback
//                    (e.g. BibleSelectionModal.onProgressChange reaches 'verse')
export type AdvanceOn = 'tap' | 'targetEvent';

// Which overlay hierarchy the target lives in. RN <Modal> renders in a separate
// native tree, so a step targeting the selection grids must be drawn by the
// overlay mounted INSIDE that modal, not the screen-level one.
export type TargetScope = 'screen' | 'modal' | 'cult';

export type CoachStep = {
  id: string;
  targetId: TargetId | null;
  // Extra targets to spotlight alongside targetId in the SAME step (multiple
  // holes, one card). Same scope as targetId. Used e.g. to highlight both
  // chapter-navigation chevrons at once.
  extraTargetIds?: TargetId[];
  scope?: TargetScope;          // default 'screen'
  text: string;                 // MG coach-mark copy (placeholder — replace)
  placement?: 'top' | 'bottom' | 'auto'; // default 'auto'
  drive?: DriveVerb;
  advanceOn?: AdvanceOn;        // default 'tap'
  // For 'targetEvent' steps: the progress key the driven UI must reach to
  // advance. Bible: 'chapter' | 'verse' | 'selected'. Hymn: 'category' | 'selected'.
  awaitProgress?: string;
};

export type Tutorial = {
  id: string;
  title: string;                // MG, shown in the Help/Toro-lalana quest log
  icon: string;                 // single glyph/emoji — no icon lib
  autoStart?: boolean;
  order: number;
  // Which screen the Help quest-log sends the user to before starting. Defaults
  // to 'Home' (where the screen-scope overlay lives). Set to 'CultMode' etc. for
  // tutorials whose targets live on another screen.
  launchRoute?: 'Home' | 'CultMode';
  steps: CoachStep[];
};

export const ONBOARDING_ID = 'onboarding';
export const CULT_TUTORIAL_ID = 'cultMode';

export const TUTORIALS: Tutorial[] = [
  {
    id: ONBOARDING_ID,
    title: 'Fampidirana', // Getting started
    icon: '🚀',
    autoStart: true,
    order: 0,
    steps: [
      {
        id: 'welcome',
        targetId: null,
        text: 'Tongasoa! Andao hianarantsika haingana ny fomba fampiasa ny e-Baiboly.',
      },
      {
        id: 'modeToggle',
        targetId: 'bottomNav',
        text: 'Eto ianao mifindra: Baiboly na Fihirana.',
      },
      // --- Bible drill: reach any verse in 3 taps ---
      {
        id: 'openSelector',
        targetId: 'topbarTitle',
        text: "Tsindrio ny lohateny hitadiavana boky, toko, andininy anaty Baiboly na Fihirana arakaraky ny safidinao teny ambany.",
        advanceOn: 'targetEvent',
        awaitProgress: 'open',
      },
      {
        id: 'pickBook',
        targetId: 'selBookTab',
        scope: 'modal',
        text: 'Safidio ny boky hovakiana — ohatra: Jaona.',
        advanceOn: 'targetEvent',
        awaitProgress: 'chapter',
      },
      {
        id: 'pickChapter',
        targetId: 'selChapterGrid',
        scope: 'modal',
        text: 'Safidio ny toko .',
        advanceOn: 'targetEvent',
        awaitProgress: 'verse',
      },
      {
        id: 'pickVerse',
        targetId: 'selVerseGrid',
        scope: 'modal',
        text: "Safidio ny andininy hanombohana sy hamaranana  ny famakiana teny (ao anatin'ny toko nosafidiana) ",
        advanceOn: 'targetEvent',
        awaitProgress: 'selected',
      },
      {
        id: 'nextChapter',
        targetId: 'topbarNext',
        extraTargetIds: ['topbarPrev'],
        text: "Ireo tsindry ‹‹ sy ›› ireo no ifindrana toko: ‹‹ mankany amin'ny toko teo aloha, ›› mankany amin'ny toko manaraka.",
      },
      // --- Hymn drill: jump to any hymn by number ---
      {
        id: 'switchHymnal',
        targetId: 'bottomNav',
        text: 'Andao ho any amin\'ny Fihirana.',
        drive: 'switchToHymnal',
      },
      {
        id: 'openHymnSelector',
        targetId: 'topbarTitle',
        text: "Tahaka ny tao amin' ny Baiboly ihany, tsindrio eto isafidianana ny hira.",
        advanceOn: 'targetEvent',
        awaitProgress: 'open',
      },
      {
        id: 'pickCategory',
        targetId: 'hymnCategoryTabs',
        scope: 'modal',
        text: "Akisaho mianavanana na miankavia ny karazana boky fihirana ery ambony, avy eo tsindrio izay tianao hikarohana hira hirana mialohan'ny hanindrinao ny laharan-kira.",
        advanceOn: 'targetEvent',
        awaitProgress: 'category',
      },
      {
        id: 'typeNumber',
        targetId: 'hymnKeypad',
        scope: 'modal',
        placement: 'top',
        text: 'Soraty ny laharana — ohatra: 164 — dia OK.',
        advanceOn: 'targetEvent',
        awaitProgress: 'selected',
      },
      // NOTE: devotional step removed until that feature stabilizes —
      // re-add a {targetId:'notificationGlow'} step here when it's ready.
      {
        id: 'done',
        targetId: null,
        text: "Vita! Azonao averina foana ao amin'ny Toro-lalana.",
      },
    ],
  },
  {
    id: CULT_TUTORIAL_ID,
    title: 'Fotoam-pivavahana', // Worship-service playlist
    icon: '⛪',
    order: 1,
    launchRoute: 'Home',
    steps: [
      {
        id: 'cultOpenMenu',
        targetId: 'topbarMenu',
        scope: 'screen',
        text: "Ny Fotoam-pivavahana dia hita ao anaty menio. Tsindrio ny kisary ☰ eto an-tampony.",
        advanceOn: 'targetEvent',
        awaitProgress: 'menuOpened',
      },
      {
        id: 'cultPickMenuItem',
        targetId: 'cultMenuItem',
        scope: 'modal',
        text: "Tsindrio \"Fotoam-pivavahana\" ao anaty lisitra.",
        advanceOn: 'targetEvent',
        awaitProgress: 'cultMenuSelected',
      },
      {
        id: 'cultWelcome',
        targetId: null,
        scope: 'cult',
        text: "Ny Fotoam-pivavahana dia ahafahanao manomana mialoha lisitry ny Baiboly sy hira harahina mandritra ny fotoana.",
      },
      {
        id: 'cultAddBible',
        targetId: 'cultAddButtons',
        scope: 'cult',
        placement: 'bottom',
        text: "Tsindrio \"Hampio Baiboly\" hanampiana andininy: safidio boky, toko ary andininy.",
        advanceOn: 'targetEvent',
        awaitProgress: 'cultBibleAdded',
      },
      {
        id: 'cultAddHymn',
        targetId: 'cultAddButtons',
        scope: 'cult',
        placement: 'bottom',
        text: "Ampio hira izao: tsindrio \"Hampio Fihirana\" dia soraty ny laharan-kira.",
        advanceOn: 'targetEvent',
        awaitProgress: 'cultHymnAdded',
      },
      {
        id: 'cultList',
        targetId: 'cultList',
        scope: 'cult',
        placement: 'bottom',
        text: "Ireo teny sy hira nampidirinao dia miseho eto amin'ny lisitra, araka ny filaharana hovakiana.",
      },
      {
        id: 'cultReorderList',
        targetId: 'cultList',
        scope: 'cult',
        placement: 'top',
        text: "Hanova ny filaharana: tsindrio ela ny mari-pisintonana ☰ eo anilan'ny anarana, dia sintony miakatra na midina.",
      },
      {
        id: 'cultActivate',
        targetId: 'cultActivateToggle',
        scope: 'cult',
        placement: 'bottom',
        text: "Rehefa voalahatrao ireo teny sy hira, dia velomy ity teboka ity. Avy eo dia miverena ary amin'ny ",
        advanceOn: 'targetEvent',
        awaitProgress: 'cultActivated',
      },
      {
        id: 'cultReaderNav',
        targetId: 'cultReaderNav',
        extraTargetIds: ['cultReaderNavNext'],
        scope: 'screen',
        drive: 'showCultReaderNav',
        placement: 'top',
        text: "Velona ny fotoana! Tsindrio › hatramin'ny farany dia miverina ‹ hatramin'ny voalohany: hitanao miova avy hatrany ny teny na hira harahina.",
        advanceOn: 'targetEvent',
        awaitProgress: 'cultNavStepped',
      },
      {
        id: 'cultDone',
        targetId: null,
        scope: 'screen',
        text: "Vita! Azonao averina foana ao amin'ny Toro-lalana.",
      },
    ],
  },
];

export const getTutorial = (id: string): Tutorial | undefined =>
  TUTORIALS.find(tu => tu.id === id);
