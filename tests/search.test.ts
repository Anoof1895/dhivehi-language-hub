import { describe, expect, it } from 'vitest';
import { hydrateEntry } from '../src/lib/hydrate.ts';
import { buildSearchIndex, executeSearch } from '../src/lib/search.ts';
import type { DictionaryEntry, SearchFilters } from '../src/types/dictionary.ts';

function makeFilters(query: string, overrides: Partial<SearchFilters> = {}): SearchFilters {
  return {
    query,
    wordclass: '',
    dialect: '',
    register: '',
    hasFamily: false,
    hasSynonyms: false,
    searchInDefinitions: false,
    ...overrides,
  };
}

describe('hydrateEntry & bilingual English search', () => {
  const sampleEntries: DictionaryEntry[] = [
    hydrateEntry({
      i: 0,
      si: [10],
      h: 'ލޯބި',
      r: 'loabi',
      g: 2,
      s: ['އޯގާތެރިކަމާއި ކުލުނުވެރިކަން.'],
      eg: 'love, affection, fondness',
      em: 'Warm affection, love, and tenderness toward someone.',
      rc: 18,
      cd: 1,
    }),
    hydrateEntry({
      i: 1,
      si: [11],
      h: 'ހަހަރު',
      r: 'haharu',
      g: 3,
      s: ['ލޯބި'],
      eg: 'love, affection',
      em: 'Love or affection (synonym of ލޯބި).',
      sy: [0],
    }),
    hydrateEntry({
      i: 2,
      si: [12],
      h: 'މުލައްދަނޑި',
      r: 'muladdandi',
      g: 5,
      s: ['ބާރާއި ލޯބިވެރިކަން ހުންނަ ގޮތެއް'],
      eg: 'forearm, strength',
      em: 'Forearm; figuratively something beloved or close to heart (love-related usage).',
    }),
    hydrateEntry({
      i: 3,
      si: [13],
      h: 'މޭޒު',
      r: 'meyzu',
      g: 2,
      s: ['ތަށިފަދަ ތަކެތި ބަހައްޓާ އެއްޗެއް'],
      eg: 'table, desk',
      em: 'A piece of furniture with a flat top supported by legs.',
    }),
  ];

  const index = buildSearchIndex(sampleEntries);

  it('hydrates compact eg and em fields onto DictionaryEntry', () => {
    expect(sampleEntries[0].enGloss).toBe('love, affection, fondness');
    expect(sampleEntries[0].enMeaning).toBe(
      'Warm affection, love, and tenderness toward someone.'
    );
  });

  it('finds Dhivehi phonetic and romanized matches like "loabi" -> ލޯބި', () => {
    const res = executeSearch(index, makeFilters('loabi'));
    expect(res.total).toBeGreaterThanOrEqual(1);
    expect(res.entries[0].headword).toBe('ލޯބި');
  });

  it('finds English gloss matches and ranks exact glosses above meaning-only matches', () => {
    const res = executeSearch(index, makeFilters('love'));
    const headwords = res.entries.map((e) => e.headword);
    expect(headwords).toContain('ލޯބި');
    expect(headwords).toContain('ހަހަރު');
    // Both exact-gloss matches rank above the meaning-only match
    expect(headwords[0]).toBe('ލޯބި');
    expect(headwords.indexOf('ހަހަރު')).toBeLessThan(headwords.indexOf('މުލައްދަނޑި'));
    expect(headwords).not.toContain('މޭޒު');
    expect(res.items[0].matchType).toBe('english');
  });

  it('matches English meaning text even when searchInDefinitions is off for word-boundary hits', () => {
    const res = executeSearch(index, makeFilters('furniture'));
    expect(res.entries.map((e) => e.headword)).toEqual(['މޭޒު']);
    expect(res.items[0].matchType).toBe('english');
    expect(res.items[0].snippet).toContain('furniture');
  });
});
