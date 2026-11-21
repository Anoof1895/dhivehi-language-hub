import { describe, expect, it } from 'vitest';
import { hydrateEntry } from '../src/lib/hydrate.ts';
import {
  buildSearchIndex,
  executeSearch,
  pickRandomEntryId,
} from '../src/lib/search.ts';
import type { DictionaryEntry, SearchFilters } from '../src/types/dictionary.ts';

function makeFilters(query: string, overrides: Partial<SearchFilters> = {}): SearchFilters {
  return {
    query,
    matchMode: 'any',
    category: '',
    wordclass: '',
    dialect: '',
    register: '',
    hasFamily: false,
    hasSynonyms: false,
    searchInDefinitions: false,
    ...overrides,
  };
}

describe('hydrateEntry, bilingual search, categories, rhyme filter & seeded random', () => {
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
      ct: ['people_emotions'],
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
      ct: ['people_emotions'],
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
      ct: ['body_health'],
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
      ct: ['home_crafts'],
      cd: 1,
    }),
    hydrateEntry({
      i: 4,
      si: [14],
      h: 'ބޮއްކުރާ',
      r: 'bokkuraa',
      g: 4,
      s: ['ކުޑަ އުޅަނދެއް'],
      eg: 'bokkura, rowboat',
      em: 'A small traditional Maldivian rowboat.',
      ct: ['maritime'],
      cd: 1,
    }),
    hydrateEntry({
      i: 5,
      si: [15],
      h: 'ކަރާ',
      r: 'karaa',
      g: 2,
      s: ['ވެލެއްގައި އަޅާ ފޮނި މޭވާއެއް'],
      eg: 'watermelon',
      em: 'A large sweet fruit with red flesh.',
      ct: ['flora', 'food'],
      cd: 1,
    }),
  ];

  const index = buildSearchIndex(sampleEntries);

  it('hydrates compact eg, em, and ct fields onto DictionaryEntry', () => {
    expect(sampleEntries[0].enGloss).toBe('love, affection, fondness');
    expect(sampleEntries[0].enMeaning).toBe(
      'Warm affection, love, and tenderness toward someone.'
    );
    expect(sampleEntries[0].categories).toEqual(['people_emotions']);
    expect(sampleEntries[5].categories).toEqual(['flora', 'food']);
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

  it('filters by thematic category and stacks with queries', () => {
    const maritimeOnly = executeSearch(
      index,
      makeFilters('', { category: 'maritime' })
    );
    expect(maritimeOnly.entries.map((e) => e.headword)).toEqual(['ބޮއްކުރާ']);

    const floraOnly = executeSearch(
      index,
      makeFilters('', { category: 'flora' })
    );
    expect(floraOnly.entries.map((e) => e.headword)).toEqual(['ކަރާ']);
  });

  it('supports Ends With / Rhyme (matchMode="suffix") for Thaana, vowel-tail, and Latin endings', () => {
    const byThaanaSuffix = executeSearch(
      index,
      makeFilters('ރާ', { matchMode: 'suffix' })
    );
    expect(byThaanaSuffix.entries.map((e) => e.headword)).toEqual([
      'ކަރާ',
      'ބޮއްކުރާ',
    ]);
    expect(byThaanaSuffix.items[0].matchType).toBe('suffix');

    // Vowel-carrier އާ -> matches words ending with fili ާ (ކަރާ, ބޮއްކުރާ)
    const byVowelTail = executeSearch(
      index,
      makeFilters('އާ', { matchMode: 'suffix' })
    );
    expect(byVowelTail.entries.map((e) => e.headword)).toEqual([
      'ކަރާ',
      'ބޮއްކުރާ',
    ]);

    // Latin long-vowel rhyme "aa" -> matches karaa, bokkuraa
    const byLatinRhyme = executeSearch(
      index,
      makeFilters('aa', { matchMode: 'suffix' })
    );
    expect(byLatinRhyme.entries.map((e) => e.headword)).toEqual([
      'ކަރާ',
      'ބޮއްކުރާ',
    ]);
  });

  it('shuffles deterministically with randomOrder + randomSeed for duplicate-free pagination', () => {
    const page1 = executeSearch(
      index,
      makeFilters('', { randomOrder: true, randomSeed: 12345 }),
      0,
      3
    );
    const page2 = executeSearch(
      index,
      makeFilters('', { randomOrder: true, randomSeed: 12345 }),
      3,
      3
    );

    const combinedIds = [...page1.items, ...page2.items].map((m) => m.id);
    expect(combinedIds).toHaveLength(sampleEntries.length);
    expect(new Set(combinedIds).size).toBe(sampleEntries.length);
  });

  it('picks a random rich discovery entry while respecting excludeIds and category filters', () => {
    const picked = pickRandomEntryId(index, {
      filters: makeFilters('', { category: 'maritime' }),
      preferRich: true,
      seed: 99,
    });
    expect(picked).toBe(4); // ބޮއްކުރާ

    const excludedAllButOne = pickRandomEntryId(index, {
      excludeIds: [0, 1, 2, 4, 5],
      preferRich: true,
      seed: 42,
    });
    expect(excludedAllButOne).toBe(3); // މޭޒު
  });
});
