import fs from 'node:fs';
import path from 'node:path';
import {
  segmentGraphemes,
  splitGrapheme,
  romanizeThaana,
  stripThaanaPunctuation,
  THAANA_BASE_CONSONANTS,
} from '../src/lib/thaanaCore.js';
import { applyLettersAndSynonymPropagation } from './lib/en-translation-utils.mjs';

const WORKSPACE_ROOT = process.cwd();
const RAW_JSON_PATH = path.join(WORKSPACE_ROOT, 'radheef.json');
const EN_TRANSLATIONS_PATH = path.join(WORKSPACE_ROOT, 'data', 'en-translations.json');
const OUT_DIR = path.join(WORKSPACE_ROOT, 'public', 'data');

const CONSONANT_SET = new Set(THAANA_BASE_CONSONANTS);

const DIALECT_CODE_MAP = {
  'ސ': 'addu',
  'ޏ': 'fuvahmulah',
  'ގ': 'huvadhoo',
  'ލ': 'laamu',
  'ޅ': 'lhaviyani',
  'ހ': 'haa',
  'ބދ': 'archaic',
};

const INLINE_DIALECT_MAP = {
  'ސ': 'addu',
  'ޏ': 'fuvahmulah',
  'ގ': 'huvadhoo',
  'ލ': 'laamu',
  'ޅ': 'lhaviyani',
  'ހ': 'haa',
  'ބދ': 'archaic',
  'ބ': 'archaic',
};

const WORDCLASS_TYPO_MAP = {
  'ެމ': 'މ',
  'ނއށ': 'ނއނ',
  'ނއފ': 'މ',
  'ހށ': 'ނ',
  'ވ': 'މ',
  'ކނ': 'ނ',
  'ނކ': 'ނ',
  'ރކ': 'ނ',
  'މބ': 'ގބ',
  'ނނކ': 'ކ',
};

const VALID_GRAMMAR_CLASSES = new Set([
  'ނ',
  'މ',
  'ނއ',
  'ނއނ',
  'އ',
  'ކއ',
  'ގބ',
  'އކ',
  'އތ',
  'ކ',
  'އމ',
  'މކ',
]);

const SUFFIXES = [
  'ކުރެވުން',
  'ކޮށްލުން',
  'ވެގަތުން',
  'ވެރިކަން',
  'ވެތިކަން',
  'ކުރުން',
  'ފުޅު',
  'ކޮޅު',
  'ވެރި',
  'ވެތި',
  'ކަން',
  'ކޮށް',
  'ވުން',
  'ލުން',
  'އުން',
  'ުން',
  'ން',
];

function addUnique(arr, val) {
  if (val && !arr.includes(val)) arr.push(val);
}

function cleanSenseText(raw) {
  let s = raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();

  if (!s) return { text: '', droppedEmpty: true, repairedParen: false };
  if (s === ')') return { text: '', droppedEmpty: false, repairedParen: true };

  let repairedParen = false;
  if (s.startsWith(')')) {
    s = s.slice(1).trim();
    repairedParen = true;
    if (!s) return { text: '', droppedEmpty: false, repairedParen: true };
  }

  // Clean minor spacing inside quotes like `" ހަށަންބަނުން"`
  s = s.replace(/"\s+([^"]+?)\s*"/g, '"$1"').replace(/"\s+([^"]+?)"/g, '"$1"');

  return { text: s, droppedEmpty: false, repairedParen };
}

function parseWordclassAndDialects(rawWc, headword) {
  const trimmed = (rawWc || '').trim();
  const dialects = [];
  let repairedParen = false;
  let normalizedTypo = false;

  if (!trimmed) {
    return { wordclass: '', dialects, repairedParen, normalizedTypo };
  }

  let wc = trimmed;
  if (wc.startsWith('(')) {
    wc = wc.slice(1).trim();
    repairedParen = true;
  }

  if (DIALECT_CODE_MAP[wc]) {
    dialects.push(DIALECT_CODE_MAP[wc]);
    return { wordclass: '', dialects, repairedParen, normalizedTypo };
  }

  if (WORDCLASS_TYPO_MAP[wc]) {
    wc = WORDCLASS_TYPO_MAP[wc];
    normalizedTypo = true;
  } else if (wc === 'ރ' || wc === 'މއ') {
    normalizedTypo = true;
    wc = headword.endsWith('ން') ? 'މ' : wc === 'މއ' ? 'އމ' : 'ނ';
  }

  if (!VALID_GRAMMAR_CLASSES.has(wc)) {
    // Fallback sanity guard
    wc = headword.endsWith('ން') ? 'މ' : 'ނ';
    normalizedTypo = true;
  }

  return { wordclass: wc, dialects, repairedParen, normalizedTypo };
}

function inferWordclass(headword, officialWordclasses) {
  if (officialWordclasses.length > 0) return null;
  const hw = headword.trim();
  if (/\s/.test(hw) || /[.،؛؟!]$/.test(hw)) return 'phrase_proverb';
  if (hw.length >= 4 && hw.endsWith('ކަން')) return 'abstract_kan';
  if (hw.length >= 3 && hw.endsWith('ން')) return 'verbal_masdhar';
  return null;
}

function extractDerivationRoot(hw) {
  if (hw.includes(' ') || hw.length < 4) return null;
  let stem = hw;
  for (let pass = 0; pass < 2; pass++) {
    let matched = false;
    for (const suf of SUFFIXES) {
      if (stem.endsWith(suf) && stem.length - suf.length >= 3) {
        // Guard ambiguous short 'ން' unless stem >= 4 or already stripped once
        if (suf === 'ން' && pass === 0 && stem.length < 5) continue;
        stem = stem.slice(0, -suf.length);
        matched = true;
        break;
      }
    }
    if (!matched) break;
  }
  return stem !== hw ? stem : null;
}

function isPureWordle4Word(hw) {
  if (!hw || /\s/.test(hw)) return false;
  const graphemes = segmentGraphemes(hw);
  if (graphemes.length !== 4) return false;
  return graphemes.every((g) => {
    const { base } = splitGrapheme(g);
    return CONSONANT_SET.has(base);
  });
}

function main() {
  console.log('Reading radheef.json...');
  const raw = JSON.parse(fs.readFileSync(RAW_JSON_PATH, 'utf8'));

  const stats = {
    generatedAt: new Date().toISOString(),
    rawEntryCount: raw.length,
    canonicalEntryCount: 0,
    mergedDuplicateGroups: 0,
    totalSenses: 0,
    droppedEmptySenses: 0,
    repairedLeadingParenSenses: 0,
    repairedWordclassParens: 0,
    normalizedWordclassTypos: 0,
    unclassifiedWordclasses: 0,
    inferredWordclasses: {},
    dialectCounts: {},
    registerCounts: {},
    synonymLinkCount: 0,
    explicitBaseLinkCount: 0,
    entriesWithFamily: 0,
    totalCrossLinks: 0,
    entriesWithCrossLinks: 0,
    curatedDailyCount: 0,
    wordle4AnswerCount: 0,
    wordle4ValidCount: 0,
    clueChallengeCount: 0,
    englishTranslatedCount: 0,
    englishCoveragePct: 0,
    englishSources: {
      autoLetter: 0,
      polish: 0,
      draft: 0,
      synonymPropagated: 0,
    },
  };

  // Phase 1: Clean and group by canonical headword
  const byHeadword = new Map();
  const orderedHeadwords = [];

  for (const row of raw) {
    const hw = (row.headword || '').trim();
    if (!hw) continue;

    const rawSenses = [...String(row.definition || '').matchAll(/<li>([\s\S]*?)<\/li>/g)].map(
      (m) => m[1]
    );

    const cleanedSenses = [];
    for (const rs of rawSenses) {
      const res = cleanSenseText(rs);
      if (res.droppedEmpty) stats.droppedEmptySenses++;
      if (res.repairedParen) stats.repairedLeadingParenSenses++;
      if (res.text) cleanedSenses.push(res.text);
    }

    const { wordclass, dialects, repairedParen, normalizedTypo } = parseWordclassAndDialects(
      row.wordclass,
      hw
    );
    if (repairedParen) stats.repairedWordclassParens++;
    if (normalizedTypo) stats.normalizedWordclassTypos++;

    let record = byHeadword.get(hw);
    if (!record) {
      record = {
        id: orderedHeadwords.length,
        sourceIds: [],
        headword: hw,
        rawWordclasses: [],
        wordclasses: [],
        senses: [],
        dialects: [],
        registers: [],
      };
      byHeadword.set(hw, record);
      orderedHeadwords.push(record);
    }

    record.sourceIds.push(row._id);
    if (row.wordclass) addUnique(record.rawWordclasses, row.wordclass.trim());
    if (wordclass) addUnique(record.wordclasses, wordclass);
    for (const d of dialects) addUnique(record.dialects, d);
    for (const s of cleanedSenses) addUnique(record.senses, s);

    // Inline metadata extraction from senses
    for (const s of cleanedSenses) {
      const inlineMatches = s.matchAll(/\(([އ-ޱ]+)\.\)/g);
      for (const m of inlineMatches) {
        const dTag = INLINE_DIALECT_MAP[m[1]];
        if (dTag) addUnique(record.dialects, dTag);
      }
      if (s.includes('މާތްގޮތް') || s.includes('މާތް ގޮތް')) {
        addUnique(record.registers, 'honorific');
      }
      if (s.includes('މަޖާޒު')) {
        addUnique(record.registers, 'figurative');
      }
      if (s.includes('މިސާލުބަހ') || s.includes('މިސާލުބަސް')) {
        addUnique(record.registers, 'proverb');
      }
    }

    if (
      wordclass === 'ގބ' ||
      row.wordclass === 'މބ' ||
      row.wordclass === '(ގބ' ||
      /[.؟!]$/.test(hw)
    ) {
      addUnique(record.registers, 'proverb');
    }
  }

  stats.canonicalEntryCount = orderedHeadwords.length;
  stats.mergedDuplicateGroups = raw.length - orderedHeadwords.length;

  // Phase 2: Build lookup map and compute final fields
  const headwordToId = new Map();
  for (const e of orderedHeadwords) {
    headwordToId.set(e.headword, e.id);
  }

  const entries = orderedHeadwords.map((e) => {
    const inferredWordclass = inferWordclass(e.headword, e.wordclasses);
    if (e.wordclasses.length === 0) stats.unclassifiedWordclasses++;
    if (inferredWordclass) {
      stats.inferredWordclasses[inferredWordclass] =
        (stats.inferredWordclasses[inferredWordclass] || 0) + 1;
    }
    for (const d of e.dialects) {
      stats.dialectCounts[d] = (stats.dialectCounts[d] || 0) + 1;
    }
    for (const r of e.registers) {
      stats.registerCounts[r] = (stats.registerCounts[r] || 0) + 1;
    }
    stats.totalSenses += e.senses.length;

    const graphemeCount = segmentGraphemes(e.headword).length;
    const romanized = romanizeThaana(e.headword);

    const isSingleWordSynonymOnly =
      e.senses.length === 1 &&
      !/\s/.test(e.senses[0].replace(/^\([އ-ޱ]+\.\)\s*/, '').replace(/\.$/, ''));

    const isCuratedDaily =
      !e.headword.includes(' ') &&
      graphemeCount >= 2 &&
      e.dialects.length === 0 &&
      !isSingleWordSynonymOnly &&
      e.senses.length > 0;

    if (isCuratedDaily) stats.curatedDailyCount++;

    return {
      id: e.id,
      sourceIds: e.sourceIds,
      headword: e.headword,
      romanized,
      graphemeCount,
      wordclasses: e.wordclasses,
      rawWordclasses: e.rawWordclasses,
      inferredWordclass,
      senses: e.senses,
      dialects: e.dialects,
      registers: e.registers,
      synonymIds: [],
      synonymOfIds: [],
      explicitBaseIds: [],
      familyIds: [],
      familyRoot: null,
      referencedInCount: 0,
      isCuratedDaily,
    };
  });

  // Phase 3: Synonyms, Explicit Base Derivations, and Reverse Cross-Links
  const referencedIn = Array.from({ length: entries.length }, () => []);
  const explicitDerivPatterns = [
    /["«]([^"»]+)["»]\s*(?:މި\s*ބަހ|މިބަހ|މި\s*މަސްދަރ|މިމަސްދަރ)/,
    /([^\s."«»]+)\s+(?:މި\s*ބަހުގެ|މިބަހުގެ|މި\s*މަސްދަރުގެ|މިމަސްދަރުގެ|މި\s*ބަސް\s)/,
  ];

  for (const e of entries) {
    const seenTokens = new Set();

    for (const sense of e.senses) {
      // 1. Single-word synonym link
      const withoutDialect = sense.replace(/^\([އ-ޱ]+\.\)\s*/, '').replace(/\.$/, '').trim();
      if (withoutDialect && !/\s/.test(withoutDialect)) {
        const synId = headwordToId.get(withoutDialect);
        if (synId !== undefined && synId !== e.id) {
          addUnique(e.synonymIds, synId);
          addUnique(entries[synId].synonymOfIds, e.id);
        }
      }

      // 2. Explicit base derivation quotes
      for (const re of explicitDerivPatterns) {
        const m = sense.match(re);
        if (m && m[1]) {
          const baseCandidate = m[1].trim();
          const baseId = headwordToId.get(baseCandidate);
          if (baseId !== undefined && baseId !== e.id) {
            addUnique(e.explicitBaseIds, baseId);
            addUnique(entries[baseId].explicitBaseIds, e.id);
          }
          break;
        }
      }

      // 3. Reverse cross-link tokens
      const rawTokens = sense.split(/\s+/);
      for (const rt of rawTokens) {
        const tok = stripThaanaPunctuation(rt);
        if (!tok || tok === e.headword || tok.length < 2) continue;
        if (seenTokens.has(tok)) continue;
        const targetId = headwordToId.get(tok);
        if (targetId !== undefined && targetId !== e.id) {
          seenTokens.add(tok);
          referencedIn[targetId].push(e.id);
        }
      }
    }
  }

  for (let i = 0; i < entries.length; i++) {
    stats.synonymLinkCount += entries[i].synonymIds.length;
    stats.explicitBaseLinkCount += entries[i].explicitBaseIds.length;
    const refs = referencedIn[i];
    entries[i].referencedInCount = refs.length;
    if (refs.length > 0) {
      stats.entriesWithCrossLinks++;
      stats.totalCrossLinks += refs.length;
    }
    // Keep up to 250 backlinks per word sorted for snappy UI display
    if (refs.length > 250) {
      referencedIn[i] = refs.slice(0, 250);
    }
  }

  // Phase 4: Hybrid Root-Word Family Bundling
  const stemGroups = new Map();
  const entryStemKey = new Array(entries.length).fill(null);

  for (const e of entries) {
    if (e.headword.includes(' ') || e.graphemeCount < 2) continue;

    // 1. Prefer suffix-derived stem
    let rootKey = extractDerivationRoot(e.headword);
    // 2. Or longest existing headword prefix with safe length guard
    if (!rootKey) {
      for (let len = e.headword.length - 1; len >= 4; len--) {
        const prefix = e.headword.slice(0, len);
        const prefixId = headwordToId.get(prefix);
        if (prefixId !== undefined) {
          const pEntry = entries[prefixId];
          // Avoid short 2-grapheme non-sukun false collisions on long words
          const isSafeCompound =
            pEntry.graphemeCount >= 3 ||
            (prefix.endsWith('ް') && prefix.length >= 4 && e.headword.length <= prefix.length + 10);
          if (isSafeCompound) {
            rootKey = prefix;
            break;
          }
        }
      }
    }
    // 3. Fallback: own headword as potential root for others
    if (!rootKey) {
      rootKey = e.headword;
    }

    entryStemKey[e.id] = rootKey;
    if (!stemGroups.has(rootKey)) stemGroups.set(rootKey, []);
    stemGroups.get(rootKey).push(e.id);
  }

  // Build focused familyIds per entry (explicit bases + stem siblings + direct synonyms, max 10)
  for (const e of entries) {
    const family = [];
    const rootKey = entryStemKey[e.id];
    const rootId = rootKey ? headwordToId.get(rootKey) : undefined;
    if (rootId !== undefined && rootId !== e.id) {
      addUnique(family, rootId);
    }

    for (const bId of e.explicitBaseIds) {
      if (bId !== e.id) addUnique(family, bId);
    }

    if (rootKey && stemGroups.has(rootKey)) {
      const siblings = stemGroups
        .get(rootKey)
        .filter((id) => id !== e.id)
        .sort((a, b) => {
          const lenDiff =
            Math.abs(entries[a].headword.length - e.headword.length) -
            Math.abs(entries[b].headword.length - e.headword.length);
          return lenDiff || a - b;
        });
      for (const sId of siblings) {
        if (family.length >= 10) break;
        addUnique(family, sId);
      }
    }

    // Also include 1-2 direct synonyms if space remains
    for (const synId of e.synonymIds) {
      if (family.length >= 10) break;
      addUnique(family, synId);
    }

    e.familyIds = family;
    e.familyRoot = family.length > 0 ? rootKey : null;
    if (family.length > 0) stats.entriesWithFamily++;
  }

  // Phase 5: Build Game Pools
  const dailyCuratedIds = [];
  const deckPools = {
    honorific: [],
    dialect: [],
    figurative: [],
    proverb: [],
  };
  const wordle4ValidIds = [];
  const wordle4AnswerIds = [];
  const clueChallengeIds = [];

  for (const e of entries) {
    if (e.isCuratedDaily) dailyCuratedIds.push(e.id);
    if (e.registers.includes('honorific')) deckPools.honorific.push(e.id);
    if (e.dialects.length > 0) deckPools.dialect.push(e.id);
    if (e.registers.includes('figurative')) deckPools.figurative.push(e.id);
    if (e.registers.includes('proverb')) deckPools.proverb.push(e.id);

    if (isPureWordle4Word(e.headword)) {
      wordle4ValidIds.push(e.id);
      if (e.isCuratedDaily) {
        wordle4AnswerIds.push(e.id);
      }
    }

    if (!e.headword.includes(' ') && e.graphemeCount >= 2 && e.senses.length >= 4) {
      clueChallengeIds.push(e.id);
    }
  }

  stats.wordle4ValidCount = wordle4ValidIds.length;
  stats.wordle4AnswerCount = wordle4AnswerIds.length;
  stats.clueChallengeCount = clueChallengeIds.length;

  // Phase 6: Non-destructively merge English translations + auto-label Thaana letters + propagate synonyms
  let rawEnTranslations = {};
  if (fs.existsSync(EN_TRANSLATIONS_PATH)) {
    console.log('Merging English translations from data/en-translations.json...');
    rawEnTranslations = JSON.parse(fs.readFileSync(EN_TRANSLATIONS_PATH, 'utf8'));
  } else {
    console.log('No data/en-translations.json found; applying auto-labels for Thaana letters only.');
  }

  const { resolvedByHeadword, stats: enStats } = applyLettersAndSynonymPropagation(
    entries,
    rawEnTranslations
  );
  stats.englishTranslatedCount = enStats.translatedCount;
  stats.englishCoveragePct = Number(((enStats.translatedCount / entries.length) * 100).toFixed(2));
  stats.englishSources = {
    autoLetter: enStats.autoLetter,
    polish: enStats.polish,
    draft: enStats.draft,
    synonymPropagated: enStats.synonymPropagated,
  };

  // Write compact JSON artifacts (omitting empty/default fields to keep PWA bundle lean)
  const compactEntries = entries.map((e) => {
    const c = {
      i: e.id,
      si: e.sourceIds,
      h: e.headword,
      r: e.romanized,
      g: e.graphemeCount,
      s: e.senses,
    };
    const tr = resolvedByHeadword.get(e.headword);
    if (tr?.enGloss) c.eg = tr.enGloss;
    if (tr?.enMeaning) c.em = tr.enMeaning;
    if (e.wordclasses.length) c.wc = e.wordclasses;
    if (e.inferredWordclass) c.iw = e.inferredWordclass;
    if (e.dialects.length) c.d = e.dialects;
    if (e.registers.length) c.rg = e.registers;
    if (e.synonymIds.length) c.sy = e.synonymIds;
    if (e.synonymOfIds.length) c.so = e.synonymOfIds;
    if (e.explicitBaseIds.length) c.eb = e.explicitBaseIds;
    if (e.familyIds.length) c.f = e.familyIds;
    if (e.familyRoot) c.fr = e.familyRoot;
    if (e.referencedInCount) c.rc = e.referencedInCount;
    if (e.isCuratedDaily) c.cd = 1;
    return c;
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'dictionary-core.json'), JSON.stringify(compactEntries));
  fs.writeFileSync(path.join(OUT_DIR, 'dictionary-links.json'), JSON.stringify(referencedIn));
  fs.writeFileSync(
    path.join(OUT_DIR, 'game-pools.json'),
    JSON.stringify({
      dailyCuratedIds,
      deckPools,
      wordle4AnswerIds,
      wordle4ValidIds,
      clueChallengeIds,
    })
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'pipeline-report.json'),
    JSON.stringify(stats, null, 2)
  );

  console.log('Pipeline complete! Summary:');
  console.log(JSON.stringify(stats, null, 2));
}

main();
