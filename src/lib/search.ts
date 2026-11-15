import { hasThaana, latinToThaanaPhonetic, normalizeLatinQuery } from './thaana.ts';
import type {
  DictionaryEntry,
  SearchFilters,
  SearchResultItem,
} from '../types/dictionary.ts';

export interface SearchIndex {
  entries: DictionaryEntry[];
  normalizedRomans: string[];
  joinedSenses: string[];
  enGlossLower: string[];
  enGlossItems: string[][];
  enMeaningLower: string[];
}

export function buildSearchIndex(entries: DictionaryEntry[]): SearchIndex {
  const n = entries.length;
  const normalizedRomans = new Array<string>(n);
  const joinedSenses = new Array<string>(n);
  const enGlossLower = new Array<string>(n);
  const enGlossItems = new Array<string[]>(n);
  const enMeaningLower = new Array<string>(n);

  for (let i = 0; i < n; i++) {
    const e = entries[i];
    normalizedRomans[i] = normalizeLatinQuery(e.romanized);
    joinedSenses[i] = e.senses.join(' \n ');
    const gloss = (e.enGloss ?? '').trim().toLowerCase();
    enGlossLower[i] = gloss;
    enGlossItems[i] = gloss
      ? gloss
          .split(/[,;]+/)
          .map((part) => part.trim())
          .filter(Boolean)
      : [];
    enMeaningLower[i] = (e.enMeaning ?? '').trim().toLowerCase();
  }

  return {
    entries,
    normalizedRomans,
    joinedSenses,
    enGlossLower,
    enGlossItems,
    enMeaningLower,
  };
}

export function matchesFacets(e: DictionaryEntry, filters: SearchFilters): boolean {
  if (filters.wordclass) {
    if (filters.wordclass === 'unclassified') {
      if (e.wordclasses.length > 0) return false;
    } else if (!e.wordclasses.includes(filters.wordclass)) {
      return false;
    }
  }
  if (filters.dialect && !e.dialects.includes(filters.dialect)) {
    return false;
  }
  if (filters.register && !e.registers.includes(filters.register)) {
    return false;
  }
  if (filters.hasFamily && e.familyIds.length === 0) {
    return false;
  }
  if (
    filters.hasSynonyms &&
    e.synonymIds.length === 0 &&
    e.synonymOfIds.length === 0
  ) {
    return false;
  }
  return true;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function executeSearch(
  index: SearchIndex,
  filters: SearchFilters,
  offset = 0,
  limit = 40
): { total: number; items: SearchResultItem[]; entries: DictionaryEntry[] } {
  const {
    entries,
    normalizedRomans,
    joinedSenses,
    enGlossLower,
    enGlossItems,
    enMeaningLower,
  } = index;

  const rawQuery = filters.query.trim();
  const matches: SearchResultItem[] = [];

  if (!rawQuery) {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!matchesFacets(e, filters)) continue;
      const baseScore =
        (e.isCuratedDaily ? 100 : 0) +
        Math.min(e.referencedInCount, 50) +
        e.senses.length * 4;
      matches.push({ id: e.id, score: baseScore, matchType: 'exact' });
    }
    matches.sort((a, b) => b.score - a.score || a.id - b.id);
    const slice = matches.slice(offset, offset + limit);
    return {
      total: matches.length,
      items: slice,
      entries: slice.map((m) => entries[m.id]),
    };
  }

  const queryIsThaana = hasThaana(rawQuery);
  const phoneticThaana = queryIsThaana ? '' : latinToThaanaPhonetic(rawQuery);
  const normLatin = queryIsThaana ? '' : normalizeLatinQuery(rawQuery);
  const qLower = queryIsThaana ? '' : rawQuery.toLowerCase();
  const enWordRe =
    !queryIsThaana && qLower
      ? new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(qLower)}(?:$|[^a-z0-9])`)
      : null;

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (!matchesFacets(e, filters)) continue;

    let bestScore = 0;
    let matchType: SearchResultItem['matchType'] = 'contains';
    let snippet: string | undefined;

    const consider = (
      score: number,
      type: SearchResultItem['matchType'],
      nextSnippet?: string
    ) => {
      if (score > bestScore) {
        bestScore = score;
        matchType = type;
        snippet = nextSnippet;
      }
    };

    if (queryIsThaana) {
      if (e.headword === rawQuery) {
        consider(1000, 'exact');
      } else if (e.headword.startsWith(rawQuery)) {
        consider(720 - Math.min(e.headword.length, 40), 'prefix');
      } else if (e.headword.includes(rawQuery)) {
        consider(420 - Math.min(e.headword.length, 40), 'contains');
      } else if (filters.searchInDefinitions && joinedSenses[i].includes(rawQuery)) {
        consider(
          140 + Math.min(e.referencedInCount, 40),
          'definition',
          e.senses.find((s) => s.includes(rawQuery))
        );
      }
    } else {
      const popularityBoost =
        (e.isCuratedDaily ? 6 : 0) + Math.min(e.referencedInCount, 30) * 0.2;

      // 1. Dhivehi phonetic & romanized signals
      const rom = normalizedRomans[i];
      if (phoneticThaana && e.headword === phoneticThaana) {
        consider(1000, 'exact');
      } else if (normLatin && rom === normLatin) {
        consider(920 + popularityBoost * 0.5, 'romanized');
      } else if (phoneticThaana && e.headword.startsWith(phoneticThaana)) {
        consider(700 - Math.min(e.headword.length, 40), 'prefix');
      } else if (normLatin && rom.startsWith(normLatin)) {
        consider(580 - Math.min(rom.length, 40), 'romanized');
      } else if (phoneticThaana && e.headword.includes(phoneticThaana)) {
        consider(360 - Math.min(e.headword.length, 40), 'contains');
      } else if (normLatin && rom.includes(normLatin)) {
        consider(240 - Math.min(rom.length, 40), 'romanized');
      } else if (
        filters.searchInDefinitions &&
        phoneticThaana &&
        joinedSenses[i].includes(phoneticThaana)
      ) {
        consider(
          120,
          'definition',
          e.senses.find((s) => s.includes(phoneticThaana))
        );
      }

      // 2. English gloss & meaning signals
      const gLower = enGlossLower[i];
      const gItems = enGlossItems[i];
      if (gLower && qLower) {
        if (gItems.includes(qLower)) {
          consider(960 + popularityBoost, 'english');
        } else if (gLower.includes(qLower)) {
          if (enWordRe?.test(gLower)) {
            consider(
              820 - Math.min(gLower.length, 40) + popularityBoost,
              'english'
            );
          } else if (gItems.some((item) => item.startsWith(qLower))) {
            consider(
              740 - Math.min(gLower.length, 40) + popularityBoost * 0.5,
              'english'
            );
          } else {
            consider(460 - Math.min(gLower.length, 40), 'english');
          }
        }
      }

      const mLower = enMeaningLower[i];
      if (mLower && qLower && mLower.includes(qLower)) {
        if (enWordRe?.test(mLower)) {
          consider(320 + popularityBoost, 'english', e.enMeaning);
        } else if (filters.searchInDefinitions) {
          consider(180 + popularityBoost * 0.25, 'english', e.enMeaning);
        }
      }
    }

    if (bestScore > 0) {
      matches.push({ id: e.id, score: bestScore, matchType, snippet });
    }
  }

  matches.sort((a, b) => b.score - a.score || a.id - b.id);
  const slice = matches.slice(offset, offset + limit);
  return {
    total: matches.length,
    items: slice,
    entries: slice.map((m) => entries[m.id]),
  };
}
