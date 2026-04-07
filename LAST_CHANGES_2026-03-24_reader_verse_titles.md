# Last changes (2026-03-24): Reader verse titles + paragraph rendering

## Goal
- Display **section/paragraph titles** (YAML `verse_title`) in the reader at the verse where they belong.
- Adjust reader formatting so verses render as a more continuous paragraph: **avoid hard line breaks inside a verse** unless there is a **new verse title**.
- Keep **Psalms** and **Proverbs** rendering behavior unchanged.

## What was changed

### 1) Fetch verse titles from SQLite
- **File:** `src/hooks/useBibleData.ts`
- **Change:** Extended `BibleVerse` to include `title?: string | null`.
- **Change:** Updated SQL queries to fetch `title`:
  - `loadVerses`: now selects `text, title`
  - `getVerse`: now selects `text, title`

### 2) New reader helper to flatten intra-verse line breaks
- **File:** `src/utils/bibleTextUtils.tsx`
- **Added:** `flattenBibleTextForReader(text: string)`
- **Behavior:**
  - Uses `processBibleTextWithMetadataForReader`.
  - Joins non-italic lines with spaces so verse text flows as one paragraph.
  - Keeps block-italic lines (formerly bracketed blocks) on their own lines.

### 3) Render verse titles and apply new flattening logic in the reader
- **File:** `src/components/BibleReaderView.tsx`
- **Behavior:**
  - If `item.title` exists, renders it **bold** above the verse number.
  - For non-Psalms/Proverbs verses **without** a title, uses `flattenBibleTextForReader` so text is not split into multiple lines.
  - Psalms/Proverbs remain unchanged.

### 4) Also show titles in `BibleReaderScreen`
- **File:** `src/screens/BibleReaderScreen.tsx`
- **Behavior:** If `item.title` exists, renders it before the verse line.

## Data/source notes
- YAML already contains `verse_title` (example: `bible_verse_mg1865_mg_4.yaml` has `verse_title` at `mg_4 1:1`).
- The DB build script already imports `verse_title` into SQLite column `Verses.title`.

## Rebuild database assets
To make titles appear in the app after code changes, rebuild and copy DB assets:

```bash
yarn build:database
```

This rebuilds dev DB + prod ZIP and copies to Android/iOS assets.

---

## Update (2026-04-07): Translate book selection titles to Malagasy

### File: `src/components/BibleSelectionModal.tsx`
- Changed step titles from French to Malagasy:
  - "Sélectionner un Livre" → "Fisafidianana boky"
  - "Sélectionner un Chapitre" → "Fisafidianana toko"
  - "Sélectionner un Verset" → "Fisafidianana andininy"
- Updated search placeholder from "Mitady boky..." to "Anaran'ny boky karohana..."
