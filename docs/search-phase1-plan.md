# Search overhaul — working reference (Phase 1 in progress)

> **Status doc.** If work is interrupted, resume from here. Created 2026-06-19.
> Scope decided with the user: see "Roadmap" at bottom. **Phase 1 is the active task.**

## The reported bug

User searched **"jeso vato fehizoro"** in the FF (Fihirana Fanampiny) category and got
nothing, even though hymn **`ff_3` "Jesoa Vato Fehizoro"** exists.

## Root cause (CONFIRMED against `assets/data/dev/Hymns.db`, not theory)

The hymn IS matched by SQLite — it's buried and mis-ranked. Three compounding causes:

1. **Greedy Jesus-name expansion.** `makeFtsPrefixQuery` in `useHymnSearch.ts` adds
   standalone whole-corpus branches `(jesosy*)` and `(jesoa*)` with no other token.
   Measured row counts for "jeso vato fehizoro":
   | MATCH expression | rows |
   |---|---|
   | precise `jeso* AND vato* AND fehizoro*` | 6 |
   | `jesosy*` alone | 531 |
   | `jesoa*` alone | 78 |
   | **current full expansion** | **604** |
2. **No relevance ranking.** Query is `ORDER BY number, verse_number` — `bm25()` ignored.
   So the exact title match competes with 600 noise rows ordered by hymn number, then
   chopped at `LIMIT 200`.
3. **Auto-tab-switch hides it.** `SearchScreen` auto-jumps to whichever category has the
   most matches (fallback order ffpm→fifo→ff→antema). The 57 noisy FFPM matches win, so
   the user lands on FFPM while their FF hit sits on an unselected tab.

## PROVEN fix (ran on the real DB)

Tamed expansion (replace "jeso" in place, drop standalone wildcards):
```
(jeso* AND vato* AND fehizoro*) OR (jesosy* AND vato* AND fehizoro*) OR (jesoa* AND vato* AND fehizoro*)
```
→ 604 rows collapse to **6**. Ranked query (verses by `bm25(HymnVersesFts)`, title matches
boosted by a large negative offset so they sort first):
```
1  title ff#3      -123.60  Jesoa Vato Fehizoro
2  verse ff#3       -32.99  Jesoa Vato Fehizoro
3  verse ff#3       -28.26
...
```
`ff_3` ranks #1. SQLite `ORDER BY score ASC` (bm25 returns negative; lower = better).

## Key files

| File | Role |
|---|---|
| `src/hooks/useHymnSearch.ts` | Hymn search. Has PRIVATE diverged copy of normalize + prefix-query. Greedy expansion lives here (~line 38-66). Query+ORDER BY ~line 129-159. |
| `src/hooks/useBibleSearch.ts` | Bible search. ALSO a private diverged copy of normalize/prefix (line 47-95). Has extra `makeJesusNameLikeParams`. Groups by book; sorts by bookId. |
| `src/utils/searchNormalize.ts` | CANONICAL normalize. Has `\p{L}` (correct), 1-char-token filtering, AND a full **unused** trigram toolkit (`generateTrigrams`/`trigramSimilarity`/`makeTrigramMatchQuery`) — dead code, the basis for Phase 3 fuzzy. |
| `src/screens/SearchScreen.tsx` | 1137 lines. Bible content ~line 200-470, Hymn content ~line 480-700. Auto-tab `useEffect` line 521-559. Hymn section grouping line 577-612. `getHymnCategoryGroupTitle` line 568. |
| `scripts/buildHymnsDatabase.js` | Builds Hymns.db. FTS schema line 83-99 (HymnsFts title+authors, HymnVersesFts contentless). NOT touched in Phase 1. |
| `scripts/utils/buildDb.js` | `normalizeForFtsContent` — the INDEX-TIME normalize. Must stay in lockstep with query-time. |

## Important facts

- **814 of 827 FFPM hymns have NO title** (only `ff`, `antema`, 13 FFPM do). Title search
  is effectively FFPM-dead; verse search carries FFPM. EXPECTED, not a bug.
- FTS tokenizer: `unicode61 remove_diacritics 2`, `prefix='2 3 4'`. Two hymn FTS tables:
  `HymnsFts` (title_plain, authors_plain + UNINDEXED hymn_id/number/category) and
  `HymnVersesFts` (contentless, text_plain, rowid→HymnVerses.id).
- `HymnVersesFts` is contentless: read verse text via `JOIN HymnVerses v ON v.rowid=f.rowid`.
- Local sqlite3 CLI at platform-tools LACKS fts5. Use the node `sqlite3` module for FTS
  testing (it has fts5). DB to test against: `assets/data/dev/Hymns.db`.
- LIKE fallback path exists for when fts5 module is missing — keep it working.

## PHASE 1 PLAN (active — no DB rebuild, no version bump)

### Step 1 — Centralize normalize/query helpers
- In `searchNormalize.ts`: add a shared `makeFtsPrefixQuery` variant that takes an optional
  **synonym map** (for Jesus-name) instead of hardcoding it, OR keep Jesus logic in a small
  shared helper `expandJesusTokens`. Goal: ONE implementation.
- Delete the private `normalizeForFtsQuery` + `makeFtsPrefixQuery` from BOTH
  `useHymnSearch.ts` and `useBibleSearch.ts`; import from `searchNormalize.ts`.
- Keep `containsJesusNameVariant` / `looksLikeJesusPrefix` shared too.

### Step 2 — Tame the Jesus expansion (the actual bug)
- In the shared prefix-query builder: when expanding Jesus variants, replace the matching
  token IN PLACE only. **Remove the standalone `(variant*)` branches entirely.**
- Verify multi-word queries keep AND semantics; single bare "jeso"/"jesosy" query may still
  expand to `(jesosy*) OR (jesoa*)` (that case is legitimately broad — only one token).

### Step 3 — Add bm25 ranking + reshape result to one-row-per-hymn
- Hymn `ftsSearchQuery`: select `bm25(HymnVersesFts)` for the verse arm and
  `bm25(HymnsFts) - <BIG_BOOST>` for the title arm; `ORDER BY score ASC`. Drop the old
  `ORDER BY number, verse_number`. Keep `LIMIT 200`.
- **DECIDED display = accordion dropdown (one row per hymn).** Collapse in JS to one
  `HymnSearchResult` per `hymn_id`: keep the best (lowest) score, the best-matched verse as
  the collapsed snippet, AND a `matchedVerses: { verseNumber, text }[]` array (sorted by
  verseNumber) + `matchCount`. Card shows best verse + "N matches ▾" chip; tap toggles
  expansion to list all matched verses vertically.
- **NEW `HymnSearchResult` shape** (consumed ONLY in useHymnSearch.ts + SearchScreen.tsx —
  confirmed safe to change): add `matchedVerses: Array<{verseNumber:number; text:string}>`
  and `matchCount:number`. Keep existing `matchedVerse`/`verseNumber` as the "best" one for
  back-compat / collapsed snippet.
- **Nav constraint:** hymn deep-link supports ONLY `selectedHymnId` (MainScreen.tsx:207);
  no jump-to-stanza. So tapping a verse row in the accordion opens the hymn (same as the
  card). Per-verse scroll is OUT OF SCOPE for Phase 1.
- Bible `searchBible`: it already aggregates per-book; add `bm25(VersesFts)` and sort books
  by best (min) score instead of bookId. (Lower priority — Bible bug less acute.)

### Step 4 — Fix auto-tab-switch
- `SearchScreen` line 521-559: instead of fixed ffpm→fifo→ff→antema "first category with
  any match", pick the category of the **best-ranked (first) result** in the already-sorted
  `searchResults`. Falls back to current behavior only if results empty.

### Step 4b — Accordion UI in SearchScreen
- `renderHymnResult` (line 643-696): add expand/collapse. Local `expandedIds: Set<string>`
  state; tap chip/card toggles. Collapsed = current card + "N matches ▾" chip (only when
  matchCount>1). Expanded = render `item.matchedVerses` as a vertical stack below a divider,
  each row `vN  <snippet>` using existing `highlightText`. StyleSheet.create only (no inline
  objects per project rule). NO nested horizontal/vertical scroll (low-end safety).
- keyExtractor (line 792): now one row per hymn → `${item.id}` is enough; drop the
  `:verseNumber:index` suffix or keep index for safety.

### Step 5 — Verify
- Node + `sqlite3` module against `assets/data/dev/Hymns.db`: assert "jeso vato fehizoro"
  → ff_3 ranks #1, total ≤ ~10 rows. Also smoke: "fehizoro", "jesosy", "famonjena".
- `yarn typecheck` + `yarn lint`. Manual: run app, search, confirm FF tab auto-selected.

### NO rebuild needed for Phase 1
All changes are runtime TS over the EXISTING index. `yarn build:hymns` and DB version bump
are NOT required until Phase 3 (trigram fuzzy needs new indexed columns).

## Roadmap (full)
1. **Phase 1 (this doc)** — bug fix. No rebuild.
2. **Phase 2** — `useGlobalSearch`: parallel bible+hymn, one sectioned scroll. Section order
   is **mode-aware** (active mode's source first: hymnal→hymns first, bible→bible first).
   No rebuild.
3. **Phase 3** — wire dead trigram toolkit for typo tolerance + recent-searches/autocomplete.
   **NEEDS `yarn build:hymns`/`build:bible` + DB version bump** (new FTS columns).
4. **Phase 4** — same search inside fotoam-pivavahana (cult) mode selection as fallback.

Legacy decompiled Java (reference only, don't crawl by default):
`C:\Users\Arotiana\Documents\SmartBaibolySourceCode\sources\org\smartbaiboly`

Unrelated aside: `android/app/build/outputs/bundle/release/Bugs.md` shows a startup crash
`MainActivity.onCreate`/fragment at 86.8% / 453 users — separate task, not search.
