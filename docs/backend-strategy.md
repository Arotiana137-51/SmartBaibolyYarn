# e-Baiboly — Backend Strategy

Living document. Last updated: 2026-05-24.

This is the technical decision record and rollout plan for adding a backend
to e-Baiboly. It covers push notifications, the devotional screen, typo
corrections, and (deferred) optional user accounts.

---

## 1. Context and constraints

- **Current scale**: ~15k installed users.
- **Design ceiling**: 100k DAU within 2 years of relaunch.
- **Long-term horizon**: 1M total installs.
- **Platforms**: Android + iOS, must behave identically.
- **App shape**: offline-first React Native (bare workflow), all data
  currently bundled locally. No backend exists today.
- **Existing infrastructure**: GitHub Pages serves OTA typo patches
  (`docs/patches/`) consumed by `src/services/database/PatchManager.ts`.
  This pipeline is working in production and costs $0.
- **Budget**: free tier preferred. Apple Developer Program ($99/yr) is
  accepted as the cost of shipping iOS, not a backend tax.
- **Author control**: the maintainer must be able to author and ship
  notifications and devotional content in near real time, without code
  changes per send.

---

## 2. Free-tier math at 100k DAU

This is the single most important section. Earlier drafts of this plan
assumed Firestore on the free Spark tier would absorb everything. It does
not — by an order of magnitude.

| Operation                        | Per user    | Daily total @ 100k DAU | Firestore free tier | Verdict |
|----------------------------------|-------------|------------------------|---------------------|---------|
| Read today's devotional          | 1 read      | 100,000 reads          | 50,000 / day        | breaks  |
| Subscribe to FCM topic           | 0 reads     | 0                      | n/a                 | ok      |
| Receive a push                   | 0 reads     | 0 (FCM is separate)    | unlimited           | ok      |
| Save a favorite (future)         | ~5 writes/d | 500,000 writes         | 20,000 / day        | breaks  |
| Sync favorites on launch (future)| ~10 reads/d | 1,000,000 reads        | 50,000 / day        | breaks  |

**Conclusion**: Firestore free tier cannot host the read-heavy devotional
content at our target scale, even ignoring future user accounts. FCM is
free at any scale and remains a clean fit. The devotional content belongs
on a CDN-cached static channel — which we already have via GitHub Pages.

---

## 3. Architectural decision

| Concern                  | Backend                                       | Why                                                                                       |
|--------------------------|-----------------------------------------------|-------------------------------------------------------------------------------------------|
| Push notifications       | FCM (Firebase Cloud Messaging)                | Unlimited free. Only sanctioned bridge to APNs on iOS anyway. Console-driven sends.       |
| Devotional content       | GitHub Pages JSON (mirrors OTA patch channel) | One document per day, identical for all users, perfect shape for CDN caching. Free.       |
| Typo corrections         | GitHub Pages (unchanged)                      | Already in production. Tied to bundled-DB versions — git-versioned diffs make sense here. |
| User accounts (deferred) | Decide later from {Cloudflare D1, Supabase, Firebase Blaze} | We do not have requirements firm enough to choose without overfitting.        |

Rejected options and why:
- **Firestore for devotionals**: ~$30/mo at 100k DAU vs. $0 on GitHub Pages,
  for content that does not need real-time semantics.
- **Supabase for everything**: 5GB egress / 500MB DB free tier is tight at
  100k DAU. Viable for accounts later, not necessary for content today.
- **A self-hosted backend (Node + Postgres on a VPS)**: costs operator time
  we don't have, no benefit over a static channel for read-only content.

---

## 4. Why we are deferring the user-accounts backend decision

User accounts are optional in our product: most users never need one. We
will only know the actual shape of the requirement after we ship the rest
of the backend work. Specifically, we need to learn:

1. **Opt-in rate** — probably <30% of DAU but unknown.
2. **What we actually sync** — favorites only? highlights? reading position?
   per-stanza notes? Each one moves the read/write ratio.
3. **Real-time requirement** — do two devices need to see updates within
   seconds (Firestore's killer feature), or is eventual consistency on next
   launch acceptable (everything else is cheaper)?
4. **Auth methods** — email/password, Google, Apple Sign-In are mandatory
   on iOS if we offer any other third-party auth.

Locking in a backend before answering these would either overpay (Firebase
Blaze) or underprovision (Supabase free tier under-budgeted on egress).

When the decision is forced, the candidates are:

| Option                       | Free-tier headroom @ 100k DAU                   | Trade                          |
|------------------------------|-------------------------------------------------|--------------------------------|
| Cloudflare Workers + D1      | 5M reads/day, 100k writes/day free              | Auth story is DIY (JWT or Clerk overlay) |
| Supabase                     | 500MB DB, 5GB egress, free                      | Tight at scale; great DX       |
| Firebase Auth + Firestore Blaze | Pay-as-you-go, ~$30–80/mo at 100k DAU        | Easiest integration; costs grow |
| PocketBase on a VPS          | ~$5/mo Hetzner                                  | We operate it                  |

### Privacy policy implications

User accounts change what personal data we collect. Before launching the
accounts feature we must:

- Update `ebaiboly-privacy-policy` (the published policy site) to disclose:
  - Email address (if email auth) or provider sub (if Google/Apple)
  - Server-stored favorites, highlights, preferences (whichever we sync)
  - The backend operator's identity (Firebase / Cloudflare / etc.) as a
    sub-processor
  - User rights: export, deletion, correction
  - Data retention policy (how long after account deletion)
- Add an in-app data deletion path (Apple now requires this for any app
  with accounts; Google Play also requires it as of 2026).
- Add age-gate or COPPA disclaimer if we expect under-13 users in any
  meaningful number (likely not, but worth documenting).
- File the Play Console *Data safety* form and the App Store *App Privacy*
  questionnaire **before** the release that introduces accounts ships.

These are not blockers for **Phases 1–3 below** (push + devotionals only).
They become blockers for Phase 4 (accounts).

---

## 5. Phased rollout

Each phase ships independently. We can stop after any phase and have a
working, valuable improvement in production. Phases are ordered by ratio
of user value to risk.

### Phase 1 — FCM project bootstrap (no app changes yet)

**Goal**: have a Firebase project that can send a push, with iOS and
Android credentials configured, before we touch the app.

Steps:
1. Create a Firebase project (free Spark plan). Name: `e-baiboly-prod`.
2. Register the Android app (`com.ebaiboly.app`) → download
   `google-services.json` → save to `android/app/`.
3. Register the iOS app (bundle id matches `ios/eBaiboly/Info.plist`) →
   download `GoogleService-Info.plist` → save to `ios/eBaiboly/`.
4. Upload the APNs **auth key** (.p8) from the Apple Developer Console to
   the Firebase project (Cloud Messaging settings). Note the key id and
   team id.
5. **Manual smoke test**: in the Firebase Console → Cloud Messaging → send
   a test message to "all users" — should reach 0 devices because the SDK
   isn't installed yet. Confirms the project is alive.

Exit criteria: Firebase project exists, both platform configs downloaded,
APNs key uploaded.

### Phase 2 — App-side FCM integration

**Goal**: app receives pushes, requests permission thoughtfully, supports
topics for segmentation.

Steps:
1. Install `@react-native-firebase/app` and `@react-native-firebase/messaging`.
2. Wire the platform plumbing: `google-services` Gradle plugin in
   `android/build.gradle`, CocoaPods `pod install` in `ios/`. Native module
   only — no JS yet.
3. **Add permission request flow**. Do NOT prompt on first launch. Pick a
   trigger moment: after first cult-mode activation, or first explicit
   visit to the devotional screen. The prompt should follow a soft pre-ask
   ("Get notified when a new devotional is posted? Yes / Not now"). Save
   the user's choice so we don't re-prompt.
4. **Subscribe new installs to a default topic** (`all_users_v1`) on first
   launch — no token database to maintain. Add a per-language topic
   (`mg_users`, `fr_users`) keyed off the active i18n locale.
5. **Foreground notification handler**: when the app is open, show an
   in-app banner instead of relying on the OS notification (which most
   systems suppress for foreground apps).
6. **Deep-link handler**: notifications may carry a `data` payload with
   `route` and `params` (e.g., `route: "Devotional", params: { date: "2026-05-24" }`).
   Wire React Navigation to consume it on tap.
7. Add a Personalization toggle for "Notifications" so the user can opt
   out without going to system settings. Toggle calls
   `messaging().unsubscribeFromTopic()`.

Exit criteria: maintainer can open Firebase Console, send a test push,
phone receives it within 10s, tapping it opens the right screen.

### Phase 3 — Devotional screen + content channel

**Goal**: devotional content is editable by committing a JSON file; the
app fetches and caches it offline.

#### Status (2026-05-24)

In place:

- [x] **In-app reveal surface** — `src/components/ReaderRevealBanner.tsx`
      renders the daily devotional card (+ notifications list) at the very
      top of both `BibleReaderView` and `HymnReaderView`. Returns null when
      neither exists, so the reader is untouched on first launch.
- [x] **Notification glow** — `src/components/NotificationGlow.tsx`
      (3px pulsing bar under TopBar) + `InAppNotificationContext`
      (AsyncStorage-backed inbox, capped at 50). Mounts only while
      `unreadCount > 0`; banner calls `markAllSeen()` on mount so the glow
      goes off automatically.
- [x] **Block-based content schema** — `src/devotional/schema.ts` defines
      `Devotional` and the eight `DevotionalBlock` variants (paragraph,
      heading, verse, callout, quote, prayer, list, image) with a runtime
      `isDevotional` type-predicate validator. **Chosen over HTML** for
      bundle size, theme parity, accessibility, and XSS surface — see
      conversation log in `Cult Planification.env`.
- [x] **Topic-driven styling** — `src/devotional/topics.ts` defines the
      12-topic enum (`grace`, `repentance`, `faith`, `love`, `hope`,
      `prayer`, `wisdom`, `suffering`, `praise`, `judgement`, `comfort`,
      `service`), a Malagasy label table (`TOPIC_LABEL_MG`), and the
      `useDevotionalTone` hook that resolves a topic → `{accent, surface,
      onSurface}` for the active light/dark theme. Authors pick *meaning*;
      the app picks *appearance*.
- [x] **Reveal banner consumes the new shape** — verseRef (now optional)
      + Malagasy topic chip + first-paragraph excerpt + author. Card
      surface/border/text all driven by `useDevotionalTone(devotional.topic)`.
- [x] **`useDailyDevotional` hook stub** — `src/hooks/useDailyDevotional.ts`
      returns `{data: null, status: 'idle'}` today; signature already
      matches the real implementation so the swap is one file.

Remaining:

- [ ] **Block renderers** — one native component per block type, plus a
      `<DevotionalView blocks={...} topic={...}>` that composes them and
      consumes the tone. Lives under `src/devotional/` or
      `src/components/devotional/`.
- [ ] **DevotionalScreen** — full-screen presentation opened from
      `ReaderRevealBanner`'s `onOpenDevotional` callback (and from the
      FCM deep link in Phase 2). Lists the last 30 days from cache; tapping
      an entry opens the block-rendered detail view. Add to
      `RootStackParamList` and the hamburger menu.
- [ ] **`DevotionalManager`** — replaces the stub in `useDailyDevotional`.
      Structurally parallel to `PatchManager`. Responsibilities:
      - Fetch `docs/devotionals/index.json` on launch (and pull-to-refresh).
      - For each entry newer than the local cache, fetch `<date>.json`,
        validate with `isDevotional`, and store in AsyncStorage.
      - Expose `useDailyDevotional()` (today) and `useDevotional(date)`
        (specific day) returning `{data, status}`.
- [ ] **Content channel layout on GitHub Pages**:
      ```
      docs/devotionals/
        index.json        ← { "latest": "2026-05-24", "available": [...] }
        2026-05-24.json   ← validated `Devotional` (topic + blocks)
      ```
- [ ] **`scripts/buildDevotional.js`** — Markdown→blocks compiler. Author
      writes Markdown + frontmatter (date, title, topic, author, verseRef);
      script emits validated `<date>.json` and updates `index.json`. Same
      UX as `yarn build:patch`.
- [ ] **FCM deep link wiring** (Phase 2 dependency): `route: "Devotional"`
      with optional `params: { date }` opens the right entry.

Exit criteria: maintainer commits a new `<date>.json` to main, GitHub
Pages publishes within ~1 minute, app pulls it on next launch (or on
pull-to-refresh), reading the devotional works fully offline after first
fetch.

### Phase 3b — Cult-mode programs channel (deferred until Phase 3 ships)

**Goal**: maintainer publishes curated cult-mode programs (e.g. Paska,
Noely Zandriny, fotoam-pivavahana standard) as JSON files; users import
them into Cult Mode in one tap. No editing required — the entries land
in `CultModeContext` ready to play.

#### Why a separate phase

Cult-mode programs share *zero* runtime concerns with devotionals: they
target a different context (`CultModeScreen`, not the reader header),
have a different cadence (curated event-tied content, not daily), and
have different lifetime (a Paska program is useful every year). But
they share *all* the infrastructure concerns: static JSON, GitHub Pages
CDN, runtime validator, AsyncStorage cache.

So this is a **second channel on the same plumbing**, not a new backend.
Holding it as 3b — not folding it into 3 — keeps the devotional path
honest and shippable on its own.

#### Decision: maintainer-curated only, no user publishing

Rejected for now:
- **User-published library** (anyone uploads, anyone discovers): real
  backend ($5–80/mo), moderation problem, premature.
- **Peer-to-peer share links** (`ebaiboly://program/<id>` between two
  users): viable later as a thin layer on top of 3b, but adds a hosting
  story for user-generated JSON. Defer.

Scope for 3b: the maintainer commits curated programs to
`docs/programs/`, the app fetches and lists them, user imports.

#### Content channel layout

```
docs/programs/
  index.json         ← { "available": [{"slug", "title", "language", "publishedAt"}, ...] }
  paska-2026.json    ← validated `Program`
  noely-zandriny.json
  fotoam-pivavahana-standard.json
```

#### Schema sketch

```ts
// src/programs/schema.ts (to be written)

type ProgramBibleEntry = {
  type: 'bible';
  bookId: number;
  bookName: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
};

type ProgramHymnEntry = {
  type: 'hymn';
  category: string;
  hymnNumber: number;
  title: string;
};

type ProgramEntry = ProgramBibleEntry | ProgramHymnEntry;

type Program = {
  slug: string;                  // url-safe, matches filename
  title: string;
  description?: string;
  language: 'mg' | 'fr';
  publishedAt: string;           // ISO
  entries: ProgramEntry[];
};
```

Critical detail: entries deliberately **omit** the `id` and `label`
fields that `src/types/cultMode.ts` defines on `CultBibleEntry` /
`CultHymnEntry`. The app regenerates `id` via `generateCultEntryId()`
and rebuilds `label` via `buildBibleLabel` / `buildHymnLabel` at import
time. This way:
- No id collisions when the same program is imported twice.
- Labels stay current if we ever change formatting rules.
- The JSON stays minimal and portable.

#### App-side work

1. **`src/programs/schema.ts`** — types + `isProgram` runtime validator,
   structurally parallel to `src/devotional/schema.ts`.
2. **`src/services/programs/ProgramManager.ts`** — fetch `index.json`,
   list available programs, fetch + validate a specific program on
   demand, cache to AsyncStorage. Mirror `DevotionalManager`.
3. **Import flow in `CultModeScreen`**:
   - Add an "Hampidiro programa" entry to the existing add-menu.
   - Opens a modal listing cached programs (offline) with a refresh
     control to pull the latest index.
   - Tapping a program previews the entries, then "Hampidiro" appends
     them to the active session via `CultModeContext` (each entry gets a
     fresh `id` and freshly built `label`).
   - User can still reorder/edit before starting — import doesn't lock
     anything.
4. **`scripts/buildProgram.js`** (optional, can skip for v1) — converts
   a human-friendly YAML/Markdown draft to validated JSON. For v1 the
   maintainer can hand-write the JSON; it's small.

#### What this unlocks later

- **Share-by-URL**: a `Program` is small enough to encode in a URL or
  short ID. Once the import flow exists, adding `ebaiboly://program/...`
  deep-link is a few hours of work, not a phase.
- **Seasonal push**: an FCM notification can carry
  `{route: "Programs", params: {slug: "paska-2026"}}` to surface the
  Paska program on Maundy Thursday.

Exit criteria: maintainer commits `paska-2026.json` to main, GitHub
Pages publishes within ~1 minute, user opens Cult Mode → "Hampidiro
programa" → sees Paska in the list → taps → entries appear in the
session, fully editable.

#### Cost

Identical to Phase 3: $0. Same GitHub Pages bucket, same CDN, same
free-tier headroom analysis.

#### Phase 3 ↔ 3b dependency

Phase 3b reuses the same patterns established by Phase 3
(`DevotionalManager`, AsyncStorage cache, runtime validators). Starting
3b before 3 ships would duplicate effort. **Do not begin Phase 3b until
Phase 3's `DevotionalManager` is in production and the patterns are
validated.**

### Phase 4 — User accounts (deferred, requires privacy-policy update)

**Goal**: optional account that syncs favorites, highlights, preferences
across devices. Anonymous usage remains the default and is undiminished.

Prerequisites (do NOT start Phase 4 until all of these are signed off):
- Privacy policy updated and deployed (see §4 above).
- Play Console Data Safety form updated.
- App Store App Privacy form updated.
- Account deletion flow designed (required by both stores).
- Final backend choice made (Cloudflare D1 / Supabase / Firebase Blaze).
- Auth method shortlist confirmed: at minimum email + Sign in with Apple
  (mandatory if we offer any other 3rd-party auth on iOS).

Steps (high-level, to be detailed when we get there):
1. Add the chosen SDK, configure auth providers.
2. Gate the feature behind a "Sign in (optional)" entry in the menu —
   never block reading on auth.
3. Design the sync model: last-writer-wins for preferences, set-union for
   favorites, append-only for highlights. Document conflict semantics.
4. Migrate existing local favorites/highlights to the server on first sign-in,
   with explicit user confirmation ("Upload your 47 favorites?").
5. Implement account deletion (in-app, single tap, server-side cascade).
6. Add observability: a single metric for sign-in success rate and a single
   metric for sync error rate.

Exit criteria: deferred. To be defined when the phase starts.

---

## 6. Open questions to resolve before each phase starts

### Before Phase 2
- Where exactly do we place the first permission prompt? (current bias:
  after the user successfully starts a cult-mode session.)
- Do we want a per-category topic split (e.g., `devotional_only` vs.
  `announcements`) so users can opt into one but not the other?

### Before Phase 3
- ~~Where does devotional cache live: AsyncStorage or an existing SQLite
  database?~~ **Decided: AsyncStorage.** The `useDailyDevotional` /
  `useDevotional(date)` surface is keyed by date; we don't need FTS over
  devotional text (it's a small daily payload, not a corpus). Keeps the
  manager small and isolated from the Bible/Hymn DB pipelines.
- ~~Do we support multiple languages per devotional entry?~~ **Open, but
  bias unchanged**: one JSON entry per day, multiple language fields
  inside. The current schema (`schema.ts`) is single-language — extending
  to multilingual would mean adding `lang: 'mg' | 'fr'` either to the
  `Devotional` root or per-block. Defer until we actually ship a French
  devotional.

### Before Phase 3b
- Do imported program entries become a snapshot (frozen at import time)
  or stay linked to the source program (so a re-published `paska-2026`
  updates already-imported sessions)? Bias: snapshot. Re-import is one
  tap; live-linking adds sync complexity for negligible benefit.
- Hymn entries embed `title` so a Hymns DB rebuild doesn't break the
  display label, but the resolved hymn at play-time still comes from the
  on-device DB. What happens if `category + hymnNumber` doesn't resolve
  (older app vs. newer program)? Bias: show the embedded title with a
  "tsy hita" marker rather than dropping the entry silently.

### Before Phase 4
- All the privacy/legal items in §4 above.
- Anonymous → signed-in migration UX.
- Account-less devices that go offline for months — how stale is "stale"?

---

## 7. Cost projection summary

| Phase                  | Monthly cost @ 15k DAU | Monthly cost @ 100k DAU | Notes                                  |
|------------------------|------------------------|--------------------------|----------------------------------------|
| Phase 1 (FCM setup)    | $0                     | $0                       | FCM is free forever                    |
| Phase 2 (push live)    | $0                     | $0                       |                                        |
| Phase 3 (devotionals)  | $0                     | $0                       | GitHub Pages CDN                       |
| Phase 3b (programs)    | $0                     | $0                       | Same channel as Phase 3                |
| Phase 4 (accounts)     | $0–$5                  | $0–$80                   | Depends on chosen backend, opt-in rate |

iOS: +$99/yr Apple Developer Program (flat, unrelated to backend choice).

---

## 8. Links to companion docs

- OTA patch channel: [docs/patches/README.md](./patches/README.md)
- Feature spec: [docs/feature-spec.md](./feature-spec.md)
- Component map: [docs/component-map.md](./component-map.md)
- Privacy policy repo: `arotiana137-51/ebaiboly-privacy-policy` (off-tree)
