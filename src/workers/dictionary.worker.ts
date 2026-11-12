import { hydrateEntry, type CompactEntry } from '../lib/hydrate.ts';
import {
  hasThaana,
  latinToThaanaPhonetic,
  normalizeLatinQuery,
} from '../lib/thaana.ts';
import {
  getCachedDictPart,
  setCachedDictPart,
} from '../storage/db.ts';
import type {
  DictionaryEntry,
  GamePools,
  PipelineReport,
  SearchFilters,
  SearchResultItem,
} from '../types/dictionary.ts';

let entries: DictionaryEntry[] = [];
let links: number[][] = [];
let gamePools: GamePools | null = null;
let report: PipelineReport | null = null;

const headwordToId = new Map<string, number>();
let normalizedRomans: string[] = [];
let joinedSenses: string[] = [];
let wordle4ValidSet = new Set<number>();
let initialized = false;

async function ensureInitialized() {
  if (initialized) return;

  const reportResp = await fetch('/data/pipeline-report.json');
  if (!reportResp.ok) throw new Error('Failed to load pipeline-report.json');
  report = (await reportResp.json()) as PipelineReport;
  const version = report.generatedAt;

  let [cachedCore, cachedLinks, cachedPools] = await Promise.all([
    getCachedDictPart<CompactEntry[]>('core', version).catch(() => null),
    getCachedDictPart<number[][]>('links', version).catch(() => null),
    getCachedDictPart<GamePools>('pools', version).catch(() => null),
  ]);

  if (!cachedCore || !cachedLinks || !cachedPools) {
    const [coreRes, linksRes, poolsRes] = await Promise.all([
      fetch('/data/dictionary-core.json'),
      fetch('/data/dictionary-links.json'),
      fetch('/data/game-pools.json'),
    ]);
    if (!coreRes.ok || !linksRes.ok || !poolsRes.ok) {
      throw new Error('Failed to fetch compiled Radheef dictionary assets');
    }
    [cachedCore, cachedLinks, cachedPools] = (await Promise.all([
      coreRes.json(),
      linksRes.json(),
      poolsRes.json(),
    ])) as [CompactEntry[], number[][], GamePools];

    // Cache in IndexedDB in background (ignore quota issues)
    Promise.all([
      setCachedDictPart('core', version, cachedCore),
      setCachedDictPart('links', version, cachedLinks),
      setCachedDictPart('pools', version, cachedPools),
    ]).catch(() => {});
  }

  entries = cachedCore.map(hydrateEntry);
  links = cachedLinks;
  gamePools = cachedPools;
  wordle4ValidSet = new Set(gamePools.wordle4ValidIds);

  normalizedRomans = new Array(entries.length);
  joinedSenses = new Array(entries.length);
  headwordToId.clear();

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    headwordToId.set(e.headword, e.id);
    normalizedRomans[i] = normalizeLatinQuery(e.romanized);
    joinedSenses[i] = e.senses.join(' \n ');
  }

  initialized = true;
}

function matchesFacets(e: DictionaryEntry, filters: SearchFilters): boolean {
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

function runSearch(filters: SearchFilters, offset: number, limit: number) {
  const rawQuery = filters.query.trim();
  const matches: SearchResultItem[] = [];

  if (!rawQuery) {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!matchesFacets(e, filters)) continue;
      // Prioritize rich entries with cross-links/families when browsing unfiltered
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

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (!matchesFacets(e, filters)) continue;

    let bestScore = 0;
    let matchType: SearchResultItem['matchType'] = 'contains';
    let snippet: string | undefined;

    if (queryIsThaana) {
      if (e.headword === rawQuery) {
        bestScore = 1000;
        matchType = 'exact';
      } else if (e.headword.startsWith(rawQuery)) {
        bestScore = 720 - Math.min(e.headword.length, 40);
        matchType = 'prefix';
      } else if (e.headword.includes(rawQuery)) {
        bestScore = 420 - Math.min(e.headword.length, 40);
        matchType = 'contains';
      } else if (filters.searchInDefinitions && joinedSenses[i].includes(rawQuery)) {
        bestScore = 140 + Math.min(e.referencedInCount, 40);
        matchType = 'definition';
        snippet = e.senses.find((s) => s.includes(rawQuery));
      }
    } else {
      const rom = normalizedRomans[i];
      if (phoneticThaana && e.headword === phoneticThaana) {
        bestScore = 980;
        matchType = 'exact';
      } else if (normLatin && rom === normLatin) {
        bestScore = 920;
        matchType = 'romanized';
      } else if (phoneticThaana && e.headword.startsWith(phoneticThaana)) {
        bestScore = 700 - Math.min(e.headword.length, 40);
        matchType = 'prefix';
      } else if (normLatin && rom.startsWith(normLatin)) {
        bestScore = 580 - Math.min(rom.length, 40);
        matchType = 'romanized';
      } else if (phoneticThaana && e.headword.includes(phoneticThaana)) {
        bestScore = 360 - Math.min(e.headword.length, 40);
        matchType = 'contains';
      } else if (normLatin && rom.includes(normLatin)) {
        bestScore = 240 - Math.min(rom.length, 40);
        matchType = 'romanized';
      } else if (
        filters.searchInDefinitions &&
        phoneticThaana &&
        joinedSenses[i].includes(phoneticThaana)
      ) {
        bestScore = 120;
        matchType = 'definition';
        snippet = e.senses.find((s) => s.includes(phoneticThaana));
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

function getEntryDetail(id: number) {
  const entry = entries[id];
  if (!entry) return null;
  const mapIds = (ids: number[]) =>
    ids.map((x) => entries[x]).filter((x): x is DictionaryEntry => Boolean(x));

  const backlinkIds = links[id] ?? [];
  return {
    entry,
    familyEntries: mapIds(entry.familyIds),
    synonymEntries: mapIds(
      Array.from(new Set([...entry.synonymIds, ...entry.synonymOfIds])).slice(0, 16)
    ),
    explicitBaseEntries: mapIds(entry.explicitBaseIds),
    backlinkEntries: mapIds(backlinkIds.slice(0, 40)),
    totalBacklinks: entry.referencedInCount,
  };
}

function autocompleteHeadwords(query: string, limit: number = 10) {
  const q = query.trim();
  if (!q) return [];
  const isTh = hasThaana(q);
  const ph = isTh ? q : latinToThaanaPhonetic(q);
  const romQ = isTh ? '' : normalizeLatinQuery(q);
  const out: Array<{ id: number; headword: string; romanized: string; score: number }> = [];

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.headword.includes(' ') || e.graphemeCount < 2) continue;
    let score = 0;
    if (e.headword === q || e.headword === ph) score = 1000;
    else if (e.headword.startsWith(q) || (ph && e.headword.startsWith(ph)))
      score = 700 - e.headword.length;
    else if (romQ && normalizedRomans[i].startsWith(romQ))
      score = 500 - normalizedRomans[i].length;
    else if (e.headword.includes(q) || (ph && e.headword.includes(ph)))
      score = 300 - e.headword.length;
    if (score > 0) {
      out.push({ id: e.id, headword: e.headword, romanized: e.romanized, score });
    }
  }
  out.sort((a, b) => b.score - a.score || a.id - b.id);
  return out.slice(0, limit);
}

self.onmessage = async (ev: MessageEvent) => {
  const { reqId, action, payload } = ev.data as {
    reqId: number;
    action: string;
    payload?: Record<string, unknown>;
  };

  try {
    await ensureInitialized();

    let result: unknown;
    switch (action) {
      case 'init':
        result = {
          report,
          gamePools,
          headwords: entries.map((e) => e.headword),
        };
        break;
      case 'search':
        result = runSearch(
          payload?.filters as SearchFilters,
          Number(payload?.offset ?? 0),
          Number(payload?.limit ?? 40)
        );
        break;
      case 'getEntries': {
        const ids = (payload?.ids as number[]) ?? [];
        result = ids.map((id) => entries[id]).filter(Boolean);
        break;
      }
      case 'getEntryDetail':
        result = getEntryDetail(Number(payload?.id));
        break;
      case 'getByHeadword': {
        const hw = String(payload?.headword ?? '').trim();
        const id = headwordToId.get(hw);
        result = id !== undefined ? getEntryDetail(id) : null;
        break;
      }
      case 'checkWordleGuess': {
        const word = String(payload?.word ?? '').trim();
        const id = headwordToId.get(word);
        const valid = id !== undefined && wordle4ValidSet.has(id);
        result = {
          valid,
          entry: id !== undefined ? entries[id] : null,
        };
        break;
      }
      case 'autocomplete':
        result = autocompleteHeadwords(
          String(payload?.query ?? ''),
          Number(payload?.limit ?? 8)
        );
        break;
      default:
        throw new Error(`Unknown worker action: ${action}`);
    }

    self.postMessage({ reqId, ok: true, result });
  } catch (err) {
    self.postMessage({
      reqId,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
