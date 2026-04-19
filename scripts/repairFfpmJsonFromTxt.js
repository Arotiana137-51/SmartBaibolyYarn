const fs = require('fs');
const path = require('path');

function normalizeLine(line) {
  return String(line)
    .replace(/\uFEFF/g, '')
    .replace(/\r/g, '')
    .trim();
}

function isNoiseLine(line) {
  if (!line) return true;
  if (/^G[ée]n[ée]r[ée] par http:\/\/fihirana\.org/i.test(line)) return true;
  if (/^Page\s+\d+\s+sur\s+\d+/i.test(line)) return true;
  if (/^Fihirana\s+FFPM/i.test(line)) return true;
  if (/^Entrez dans ses portes/i.test(line)) return true;
  if (/^C[ée]l[ée]brez-le/i.test(line)) return true;
  if (/^Psaumes\s+\d+:/i.test(line)) return true;
  return false;
}

function parseTxtToHymns(txtRaw) {
  const rawLines = txtRaw.split(/\n/);
  const lines = rawLines
    .map(normalizeLine)
    .filter((l) => !isNoiseLine(l));

  const hymns = [];
  let i = 0;

  const headerRe = /^(\d+)\s*-\s*(.+)$/; // e.g. "27 - Fitiavana tokoa"
  const verseStartRe = /^(\d+)\.(?:\s+|$)(.*)$/; // e.g. "1. ..."

  while (i < lines.length) {
    const line = lines[i];
    const headerMatch = headerRe.exec(line);
    if (!headerMatch) {
      i += 1;
      continue;
    }

    const number = parseInt(headerMatch[1], 10);
    const title = headerMatch[2].trim();

    i += 1;

    // Skip blank lines after header
    while (i < lines.length && !lines[i]) i += 1;

    const verses = [];
    let currentVerse = null;

    const finalizeVerse = () => {
      if (!currentVerse) return;
      const text = currentVerse.lines.join('\n').trim();
      if (text) {
        verses.push({
          andininy: currentVerse.number,
          tononkira: text,
          fiverenany: false,
        });
      }
      currentVerse = null;
    };

    // Consume until next header or EOF
    while (i < lines.length) {
      const l = lines[i];
      const nextHeader = headerRe.exec(l);
      if (nextHeader) break;

      if (!l) {
        // blank line: keep as paragraph break inside verse
        if (currentVerse) currentVerse.lines.push('');
        i += 1;
        continue;
      }

      const verseMatch = verseStartRe.exec(l);
      if (verseMatch) {
        // new verse
        finalizeVerse();
        currentVerse = {
          number: parseInt(verseMatch[1], 10),
          lines: [],
        };
        const rest = (verseMatch[2] || '').trim();
        if (rest) currentVerse.lines.push(rest);
        i += 1;
        continue;
      }

      // continuation line
      if (!currentVerse) {
        // Sometimes the txt may have stray lines before "1."; ignore those.
        i += 1;
        continue;
      }

      currentVerse.lines.push(l);
      i += 1;
    }

    finalizeVerse();

    hymns.push({
      number,
      title,
      verses,
    });

    // Do not increment i here; outer loop continues (current i is at next header or EOF)
  }

  return hymns;
}

function buildJsonObjectFromHymns(hymns) {
  const out = {};
  for (const hymn of hymns) {
    const key = `ffpm_${hymn.number}`;
    out[key] = {
      laharana: String(hymn.number),
      sokajy: 'ffpm',
      lohateny: '',
      mpanoratra: [],
      hira: hymn.verses,
    };
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const txtPath = args[0] || path.resolve('C:/Users/Arotiana/Downloads/fihirana-ffpm[1].txt');
  const jsonPath = args[1] || path.resolve(__dirname, '../src/data/hymns/01_fihirana_ffpm.json');

  const txtRaw = fs.readFileSync(txtPath, 'utf8');
  const hymns = parseTxtToHymns(txtRaw);

  if (!hymns.length) {
    console.error('No hymns parsed from txt. Aborting.');
    process.exit(1);
  }

  const jsonObj = buildJsonObjectFromHymns(hymns);

  // Basic sanity checks
  const hymnNumbers = hymns.map((h) => h.number);
  const min = Math.min(...hymnNumbers);
  const max = Math.max(...hymnNumbers);
  console.log(`Parsed hymns: ${hymns.length} (min=${min}, max=${max})`);

  // Write pretty JSON
  fs.writeFileSync(jsonPath, JSON.stringify(jsonObj, null, 4) + '\n', 'utf8');
  console.log(`Wrote repaired JSON: ${jsonPath}`);
}

if (require.main === module) {
  main();
}
