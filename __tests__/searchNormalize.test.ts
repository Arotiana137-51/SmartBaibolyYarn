import {
  makeFtsPrefixQuery,
  normalizeForFtsQuery,
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
