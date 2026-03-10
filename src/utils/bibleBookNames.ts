const BIBLENOW_SHORT_NAMES_BY_ID: Record<number, string> = {
  1: 'Genesisy',
  2: 'Eksodosy',
  3: 'Levitikosy',
  4: 'Nomery',
  5: 'Deotoronomia',
  6: 'Josoa',
  7: 'Mpitsara',
  8: 'Rota',
  9: '1 Samoela',
  10: '2 Samoela',
  11: '1 Mpanjaka',
  12: '2 Mpanjaka',
  13: '1 Tantara',
  14: '2 Tantara',
  15: 'Ezra',
  16: 'Nehemia',
  17: 'Estera',
  18: 'Joba',
  19: 'Salamo',
  20: 'Ohabolana',
  21: 'Mpitoriteny',
  22: "Tonon-Kiran'i Solomona",
  23: 'Isaia',
  24: 'Jeremia',
  25: 'Fitomaniana',
  26: 'Ezekiela',
  27: 'Daniela',
  28: 'Hosea',
  29: 'Joela',
  30: 'Amosa',
  31: 'Obadia',
  32: 'Jona',
  33: 'Mika',
  34: 'Nahoma',
  35: 'Habakoka',
  36: 'Zefania',
  37: 'Hagay',
  38: 'Zakaria',
  39: 'Malakia',
  40: 'Matio',
  41: 'Marka',
  42: 'Lioka',
  43: 'Jaona',
  44: "Asan'ny Apostoly",
  45: 'Romana',
  46: '1 Korintiana',
  47: '2 Korintiana',
  48: 'Galatiana',
  49: 'Efesiana',
  50: 'Filipiana',
  51: 'Kolosiana',
  52: '1 Tesaloniana',
  53: '2 Tesaloniana',
  54: '1 Timoty',
  55: '2 Timoty',
  56: 'Titosy',
  57: 'Filemona',
  58: 'Hebreo',
  59: 'Jakoba',
  60: '1 Petera',
  61: '2 Petera',
  62: '1 Jaona',
  63: '2 Jaona',
  64: '3 Jaona',
  65: 'Joda',
  66: 'Apokalypsy',
};

export const getBibleBookShortName = (name: string, bookId?: number) => {
  const raw = (name ?? '').trim();
  if (!raw) return raw;

  if (typeof bookId === 'number') {
    const mapped = BIBLENOW_SHORT_NAMES_BY_ID[bookId];
    if (mapped) {
      return mapped;
    }
  }

  // Normalize typographic apostrophes used in MG65 (’ ʻ etc.) so regexes work reliably.
  const normalized = raw.replace(/[\u2019\u2018\u02BC]/g, "'");

  const ordinalToNumber = (ordinal: string) => {
    const o = ordinal.toLowerCase();
    if (o === 'voalohany') return '1';
    if (o === 'faharoa') return '2';
    if (o === 'fahatelo') return '3';
    return null;
  };

  // Example: "Epistily faharoa an'i Petera" => "2 Petera"
  // Example: "Epistily voalohany an'i Jaona" => "1 Jaona"
  const epistilyToApostolyMatch = normalized.match(
    /^Epistily\s+(voalohany|faharoa|fahatelo)\s+an'?i\s+(.+)$/i
  );
  if (epistilyToApostolyMatch) {
    const n = ordinalToNumber(epistilyToApostolyMatch[1]);
    const who = (epistilyToApostolyMatch[2] || '').trim();
    if (n && who) return `${n} ${who}`;
  }

  // Example: "Epistily faharoan'i Petera" => "2 Petera"
  // Example: "Epistily fahatelon'i Jaona" => "3 Jaona"
  const epistilyOrdinalPossessiveMatch = normalized.match(
    /^Epistily\s+(voalohany|faharoa|fahatelo)n'?i\s+(.+)$/i
  );
  if (epistilyOrdinalPossessiveMatch) {
    const n = ordinalToNumber(epistilyOrdinalPossessiveMatch[1]);
    const who = (epistilyOrdinalPossessiveMatch[2] || '').trim();
    if (n && who) return `${n} ${who}`;
  }

  // Example: "Epistilin'i Paoly ho an'ny Galatiana" => "Galatiana"
  // Example: "Epistilin'i Paoly ho an'ny Korintiana voalohany" => "1 Korintiana"
  const hoAnnyMatch = normalized.match(/\bho\s+an'?ny\s+/i);
  let extractedAfterHoAnny: string | null = null;
  if (hoAnnyMatch) {
    const idx = normalized.toLowerCase().lastIndexOf(hoAnnyMatch[0].toLowerCase());
    if (idx >= 0) {
      const after = normalized.slice(idx + hoAnnyMatch[0].length).trim();
      if (after) {
        extractedAfterHoAnny = after;
      }
    }
  }

  // Example: "Filazantsaran'i Matio" => "Matio"
  const withoutPrefix = (extractedAfterHoAnny ?? normalized)
    .replace(/^Filazantsaran'?i\s+/i, '')
    .replace(/^Epistily\s+/i, '')
    .replace(/^Epistilin'?i\s+Paoly\s+/i, '')
    .replace(/^Epistilin'?i\s+/i, '')
    .replace(/^Bokin'?ny\s+/i, '')
    .replace(/^Ny\s+/i, '')
    .trim();

  const base = withoutPrefix || normalized;

  // Example: "Korintiana voalohany" => "Korintiana 1"
  // Example: "Tesaloniana faharoa" => "Tesaloniana 2"
  const ordinalSuffixMatch = base.match(/^(.*)\s+(voalohany|faharoa|fahatelo)$/i);
  if (ordinalSuffixMatch) {
    const n = ordinalToNumber(ordinalSuffixMatch[2]);
    const stem = (ordinalSuffixMatch[1] || '').trim();
    if (n && stem) return `${n} ${stem}`;
  }

  return base;
};
