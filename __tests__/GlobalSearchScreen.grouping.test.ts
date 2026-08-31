import {
  __test__groupInOrder as groupInOrder,
  __test__bibleGenreFor as bibleGenreFor,
  __test__ffpmThemeFor as ffpmThemeFor,
} from '../src/screens/GlobalSearchScreen';

describe('bibleGenreFor', () => {
  it('maps every genre boundary to the right book IDs', () => {
    expect(bibleGenreFor(1)).toBe('Pentateoka');
    expect(bibleGenreFor(5)).toBe('Pentateoka');
    expect(bibleGenreFor(6)).toBe('Boky ara-tantara');
    expect(bibleGenreFor(39)).toBe('Mpaminany madinika');
    expect(bibleGenreFor(40)).toBe('Filazantsara');
    expect(bibleGenreFor(44)).toBe("Asan'ny Apostoly");
    expect(bibleGenreFor(57)).toBe("Epistily nosoratan'i Paoly");
    expect(bibleGenreFor(58)).toBe('Taratasy Ankapobeny');
    expect(bibleGenreFor(65)).toBe('Taratasy Ankapobeny');
    expect(bibleGenreFor(66)).toBe('Apokalipsy');
  });

  it('falls back to Hafa outside the 1-66 book range', () => {
    expect(bibleGenreFor(0)).toBe('Hafa');
    expect(bibleGenreFor(67)).toBe('Hafa');
  });
});

describe('ffpmThemeFor', () => {
  it('maps every verified theme boundary (hymns 1-216)', () => {
    expect(ffpmThemeFor(1)).toBe('Andriamanitra Ray');
    expect(ffpmThemeFor(36)).toBe('Andriamanitra Ray');
    expect(ffpmThemeFor(37)).toBe('Jesosy Kristy Tompo');
    expect(ffpmThemeFor(173)).toBe('Jesosy Kristy Tompo');
    expect(ffpmThemeFor(174)).toBe('Ny Fanahy Masina');
    expect(ffpmThemeFor(216)).toBe('Ny soratra masina');
  });

  it('returns null past #216, where there is no verified range', () => {
    expect(ffpmThemeFor(217)).toBeNull();
    expect(ffpmThemeFor(827)).toBeNull();
  });
});

describe('groupInOrder', () => {
  it('orders groups per the given order and appends leftovers alphabetically', () => {
    const items = ['b', 'a', 'z', 'a', 'c'];
    const result = groupInOrder(items, x => x, ['a', 'b']);
    expect(result.map(([key]) => key)).toEqual(['a', 'b', 'c', 'z']);
    expect(result.find(([key]) => key === 'a')?.[1]).toEqual(['a', 'a']);
  });

  it('omits keys with no items', () => {
    const result = groupInOrder(['a'], x => x, ['a', 'b']);
    expect(result.map(([key]) => key)).toEqual(['a']);
  });
});
