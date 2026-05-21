/**
 * Inline Bible-reference parsing for verse text.
 *
 * NT verses in the Malagasy MG65 dataset commonly cite OT quotations using
 * a parenthesized reference like:
 *
 *     "...izay nataon'i Jehovah hoe (Isaia 7:14), izany hoe..."
 *     "...araka ny voasoratra hoe: (Salamo 91:11-12) ..."
 *     "...(I Mpanjaka 19:18) ..."
 *
 * We turn those into tappable segments that navigate to the cited passage.
 * The matched span is the whole `(BookName chapter:verse[-verseEnd])`
 * group, parentheses included, so the rendered text reads exactly the
 * same — only the tap target changes.
 *
 * Book matching is canonical-name only (matches the `Books.name` column
 * for the bundled MG65 DB). Abbreviations like "Sal." or "Mat." are NOT
 * matched on purpose — false positives in the middle of running prose
 * are worse than missing a few citations.
 */

export type BibleRefSegment =
  | {kind: 'plain'; text: string}
  | {
      kind: 'ref';
      text: string; // exact substring including parentheses
      bookId: number;
      bookName: string;
      chapter: number;
      verseStart: number;
      verseEnd: number; // === verseStart for single-verse refs
    };

// Canonical Malagasy book names as stored in BibleMG65.db. Listed in
// descending length so multi-word names ("I Mpanjaka", "II Korintiana",
// "Asan'ny Apostoly") are matched before any single-word prefix could
// shadow them. Generated from `select id, name from Books order by id`.
export const BOOKS: ReadonlyArray<{id: number; name: string}> = [
  {id: 1, name: 'Genesisy'},
  {id: 2, name: 'Eksodosy'},
  {id: 3, name: 'Levitikosy'},
  {id: 4, name: 'Nomery'},
  {id: 5, name: 'Deoteronomia'},
  {id: 6, name: 'Josoa'},
  {id: 7, name: 'Mpitsara'},
  {id: 8, name: 'Rota'},
  {id: 9, name: 'I Samoela'},
  {id: 10, name: 'II Samoela'},
  {id: 11, name: 'I Mpanjaka'},
  {id: 12, name: 'II Mpanjaka'},
  {id: 13, name: 'I Tantara'},
  {id: 14, name: 'II Tantara'},
  {id: 15, name: 'Ezra'},
  {id: 16, name: 'Nehemia'},
  {id: 17, name: 'Estera'},
  {id: 18, name: 'Joba'},
  {id: 19, name: 'Salamo'},
  {id: 20, name: 'Ohabolana'},
  {id: 21, name: 'Mpitoriteny'},
  {id: 22, name: "Tonon-kiran'i Solomona"},
  {id: 23, name: 'Isaia'},
  {id: 24, name: 'Jeremia'},
  {id: 25, name: 'Fitomaniana'},
  {id: 26, name: 'Ezekiela'},
  {id: 27, name: 'Daniela'},
  {id: 28, name: 'Hosea'},
  {id: 29, name: 'Joela'},
  {id: 30, name: 'Amosa'},
  {id: 31, name: 'Obadia'},
  {id: 32, name: 'Jona'},
  {id: 33, name: 'Mika'},
  {id: 34, name: 'Nahoma'},
  {id: 35, name: 'Habakoka'},
  {id: 36, name: 'Zefania'},
  {id: 37, name: 'Hagay'},
  {id: 38, name: 'Zakaria'},
  {id: 39, name: 'Malakia'},
  {id: 40, name: 'Matio'},
  {id: 41, name: 'Marka'},
  {id: 42, name: 'Lioka'},
  {id: 43, name: 'Jaona'},
  {id: 44, name: "Asan'ny Apostoly"},
  {id: 45, name: 'Romana'},
  {id: 46, name: 'I Korintiana'},
  {id: 47, name: 'II Korintiana'},
  {id: 48, name: 'Galatiana'},
  {id: 49, name: 'Efesiana'},
  {id: 50, name: 'Filipiana'},
  {id: 51, name: 'Kolosiana'},
  {id: 52, name: 'I Tesaloniana'},
  {id: 53, name: 'II Tesaloniana'},
  {id: 54, name: 'I Timoty'},
  {id: 55, name: 'II Timoty'},
  {id: 56, name: 'Titosy'},
  {id: 57, name: 'Filemona'},
  {id: 58, name: 'Hebreo'},
  {id: 59, name: 'Jakoba'},
  {id: 60, name: 'I Petera'},
  {id: 61, name: 'II Petera'},
  {id: 62, name: 'I Jaona'},
  {id: 63, name: 'II Jaona'},
  {id: 64, name: 'III Jaona'},
  {id: 65, name: 'Joda'},
  {id: 66, name: 'Apokalypsy'},
];

// Sort longest-first so "II Korintiana" is tried before "I Korintiana"
// and "Salamo" before any shorter prefix. Then escape regex specials
// (apostrophes in "Asan'ny Apostoly" are safe, but the dash in
// "Tonon-kiran'i Solomona" must not be eaten).
export const BOOKS_BY_LENGTH = [...BOOKS].sort(
  (a, b) => b.name.length - a.name.length,
);

export const escapeRegex = (s: string) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const BOOK_NAME_ALT = BOOKS_BY_LENGTH.map(b =>
  escapeRegex(b.name),
).join('|');

// Whole-string regex for one parenthesized ref. We allow:
//   - one or more spaces between book name and chapter
//   - `:` or `.` between chapter and verse (some sources use `.`)
//   - ASCII hyphen `-` or unicode en-dash `–` for verse ranges
const REF_REGEX = new RegExp(
  `\\((${BOOK_NAME_ALT})\\s+(\\d+)[:.]\\s*(\\d+)(?:\\s*[-–]\\s*(\\d+))?\\)`,
  'g',
);

export const BOOK_BY_NAME = new Map<string, {id: number; name: string}>(
  BOOKS.map(b => [b.name, b]),
);

/**
 * Split `text` into a sequence of plain and `ref` segments. Concatenating
 * `segment.text` for every segment reproduces the original input.
 *
 * Returns a single plain segment when no ref is found, so callers can
 * always render the result uniformly.
 */
export const parseInlineBibleRefs = (text: string): BibleRefSegment[] => {
  if (!text) {
    return [];
  }

  const segments: BibleRefSegment[] = [];
  let lastIndex = 0;
  // Reset because RegExp objects with the `g` flag are stateful across calls.
  REF_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = REF_REGEX.exec(text)) !== null) {
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;

    if (matchStart > lastIndex) {
      segments.push({kind: 'plain', text: text.slice(lastIndex, matchStart)});
    }

    const bookName = match[1];
    const chapter = parseInt(match[2], 10);
    const parsedStart = parseInt(match[3], 10);
    const parsedEnd =
      typeof match[4] === 'string' && match[4].length > 0
        ? parseInt(match[4], 10)
        : parsedStart;
    const verseStart = Math.min(
      parsedStart,
      Number.isFinite(parsedEnd) ? parsedEnd : parsedStart,
    );
    const verseEnd = Math.max(
      parsedStart,
      Number.isFinite(parsedEnd) ? parsedEnd : parsedStart,
    );

    const book = BOOK_BY_NAME.get(bookName);
    if (book && Number.isFinite(chapter) && Number.isFinite(verseStart)) {
      segments.push({
        kind: 'ref',
        text: match[0],
        bookId: book.id,
        bookName: book.name,
        chapter,
        verseStart,
        verseEnd,
      });
    } else {
      // Defensive: if a book name in the regex somehow didn't round-trip
      // through the map, render the match as plain text rather than drop it.
      segments.push({kind: 'plain', text: match[0]});
    }

    lastIndex = matchEnd;
  }

  if (lastIndex < text.length) {
    segments.push({kind: 'plain', text: text.slice(lastIndex) });
  }

  // No matches at all → return the input as a single plain segment so the
  // caller can keep its rendering path uniform.
  if (segments.length === 0) {
    return [{kind: 'plain', text}];
  }

  return segments;
};

export type InlineBibleRef = Extract<BibleRefSegment, {kind: 'ref'}>;
