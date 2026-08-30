import {
  makeFtsPrefixQuery,
  normalizeForFtsQuery,
  generateTrigrams,
  makeTrigramMatchQuery,
  trigramOverlapScore,
} from '../src/utils/searchNormalize';

// `title_plain` is what the FTS5 index actually stores. It is produced by
// scripts/utils/buildDb.js#normalizeForFtsContent, which runs the SAME
// pipeline as normalizeForFtsQuery. We re-use normalizeForFtsQuery here as
// the index-time stand-in — if these ever drift, the contract is broken.
const indexedTitlePlain = (raw: string) => normalizeForFtsQuery(raw);

// Approximate what `<col> MATCH 'a* AND b* AND ...'` would do: every token
// (sans trailing `*`) must appear as a substring of the indexed text. AND/OR
// branches are joined with `(...) OR (...)` in makeFtsPrefixQuery, so split
// on top-level OR and accept any branch.
const ftsExpressionMatches = (
  ftsExpression: string,
  indexedText: string,
): boolean => {
  if (!ftsExpression) return false;
  const branches: string[] = [];
  if (ftsExpression.includes(' OR ')) {
    let depth = 0;
    let start = 0;
    for (let i = 0; i < ftsExpression.length; i++) {
      const ch = ftsExpression[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (
        depth === 0 &&
        ftsExpression.slice(i, i + 4) === ' OR ' &&
        ftsExpression[i - 1] === ')'
      ) {
        branches.push(ftsExpression.slice(start, i));
        start = i + 4;
        i += 3;
      }
    }
    branches.push(ftsExpression.slice(start));
  } else {
    branches.push(ftsExpression);
  }

  return branches.some(branch => {
    const inner = branch.startsWith('(') && branch.endsWith(')')
      ? branch.slice(1, -1)
      : branch;
    const tokens = inner.split(' AND ').map(s => s.replace(/\*$/, '').trim());
    return tokens.every(tok => tok.length > 0 && indexedText.includes(tok));
  });
};

describe('normalizeForFtsQuery', () => {
  it('lowercases, strips diacritics, and removes punctuation', () => {
    expect(normalizeForFtsQuery('Jeso ô, Mpitia anay')).toBe('jeso o mpitia anay');
  });

  it('treats curly and straight apostrophes the same way', () => {
    expect(normalizeForFtsQuery("Loharanon'aina")).toBe('loharanon aina');
    expect(normalizeForFtsQuery('Loharanon\u2019aina')).toBe('loharanon aina');
  });

  it('collapses runs of whitespace', () => {
    expect(normalizeForFtsQuery('Ry   Jeso\tLoharanon\u2019aina')).toBe(
      'ry jeso loharanon aina',
    );
  });

  it('handles non-string input gracefully', () => {
    expect(normalizeForFtsQuery(undefined)).toBe('');
    expect(normalizeForFtsQuery(null)).toBe('');
    expect(normalizeForFtsQuery(123)).toBe('123');
  });
});

describe('makeFtsPrefixQuery + ftsExpressionMatches contract', () => {
  it('matches the rough variant against the canonical title (example #1)', () => {
    const userInput = 'Jeso o mpitia anay';
    const titleRaw = 'Jeso ô, Mpitia anay';

    const expression = makeFtsPrefixQuery(normalizeForFtsQuery(userInput));
    expect(ftsExpressionMatches(expression, indexedTitlePlain(titleRaw))).toBe(true);
  });

  it("matches an apostrophe-bearing title from a non-apostrophe query (example #2)", () => {
    const userInput = "ry jeso loharanon'aina";
    const titleRaw = "Ry Jeso Loharanon'aina";

    const expression = makeFtsPrefixQuery(normalizeForFtsQuery(userInput));
    expect(ftsExpressionMatches(expression, indexedTitlePlain(titleRaw))).toBe(true);
  });

  it('matches when the user reorders words', () => {
    const expression = makeFtsPrefixQuery(normalizeForFtsQuery('mpitia anay jeso'));
    expect(ftsExpressionMatches(expression, indexedTitlePlain('Jeso ô, Mpitia anay'))).toBe(true);
  });

  it('matches when the user types only a partial subset of words', () => {
    const expression = makeFtsPrefixQuery(normalizeForFtsQuery('loharanon'));
    expect(ftsExpressionMatches(expression, indexedTitlePlain("Ry Jeso Loharanon'aina"))).toBe(true);
  });

  it('does NOT match an unrelated title', () => {
    const expression = makeFtsPrefixQuery(normalizeForFtsQuery('Jeso o mpitia anay'));
    expect(ftsExpressionMatches(expression, indexedTitlePlain('Endrey ny hatsaranao'))).toBe(false);
  });

  it('returns empty for an empty/whitespace query', () => {
    expect(makeFtsPrefixQuery(normalizeForFtsQuery(''))).toBe('');
    expect(makeFtsPrefixQuery(normalizeForFtsQuery('   '))).toBe('');
  });
});

describe('trigram fuzzy-fallback helpers', () => {
  it('generates every overlapping 3-char window, deduplicated', () => {
    expect(generateTrigrams('jeso')).toEqual(
      expect.arrayContaining(['jes', 'eso']),
    );
    expect(generateTrigrams('jeso')).toHaveLength(2);
    // "aaaa" only has one distinct trigram ("aaa") despite two windows.
    expect(generateTrigrams('aaaa')).toEqual(['aaa']);
  });

  it('treats a too-short string as its own single term instead of dropping it', () => {
    expect(generateTrigrams('jo')).toEqual(['jo']);
    expect(generateTrigrams('')).toEqual([]);
  });

  it('quotes every trigram so ones containing a space stay one MATCH term', () => {
    const expr = makeTrigramMatchQuery(['abc', 'b c']);
    expect(expr).toBe('"abc" OR "b c"');
  });

  it('scores full overlap as 1 and no overlap as 0', () => {
    const trigrams = generateTrigrams('jeso');
    expect(trigramOverlapScore(trigrams, 'jeso vato fehizoro')).toBe(1);
    expect(trigramOverlapScore(trigrams, 'zzzzzzzz')).toBe(0);
  });

  it('recovers a typo and a merged Malagasy elision above the 0.5 overlap floor', () => {
    // Missing one letter ("adriamanitra" for "andriamanitra").
    const typoTrigrams = generateTrigrams(normalizeForFtsQuery('adriamanitra'));
    expect(
      trigramOverlapScore(typoTrigrams, normalizeForFtsQuery('Andriamanitra')),
    ).toBeGreaterThanOrEqual(0.5);

    // Apostrophe/space dropped entirely — the index stores "amin ny" as two
    // tokens, but the merged query still shares most of its trigrams with it.
    const mergedTrigrams = generateTrigrams(normalizeForFtsQuery('aminny'));
    expect(
      trigramOverlapScore(mergedTrigrams, normalizeForFtsQuery("amin'ny")),
    ).toBeGreaterThanOrEqual(0.5);
  });
});
