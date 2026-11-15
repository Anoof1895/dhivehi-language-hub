import { THAANA_BASE_CONSONANTS } from '../../src/lib/thaanaCore.js';

/**
 * Metadata for all 39 base Thaana consonants (traditional name, ordinal, phonetic hint).
 */
const THAANA_LETTER_SPECS = [
  ['ހ', 'Haa', '1st', '/h/'],
  ['ށ', 'Shaviyani', '2nd', '/ʂ/ or final -h'],
  ['ނ', 'Noonu', '3rd', '/n/'],
  ['ރ', 'Raa', '4th', '/r/'],
  ['ބ', 'Baa', '5th', '/b/'],
  ['ޅ', 'Lhaviyani', '6th', '/ɭ/'],
  ['ކ', 'Kaafu', '7th', '/k/'],
  ['އ', 'Alifu', '8th', 'vowel carrier / glottal stop'],
  ['ވ', 'Vaavu', '9th', '/v/'],
  ['މ', 'Meemu', '10th', '/m/', 'also Divehi numeral 1'],
  ['ފ', 'Faafu', '11th', '/f/'],
  ['ދ', 'Dhaalu', '12th', '/d̪/'],
  ['ތ', 'Thaa', '13th', '/t̪/'],
  ['ލ', 'Laamu', '14th', '/l/'],
  ['ގ', 'Gaafu', '15th', '/g/'],
  ['ޏ', 'Gnaviyani', '16th', '/ɲ/'],
  ['ސ', 'Seenu', '17th', '/s/'],
  ['ޑ', 'Daviyani', '18th', '/ɖ/'],
  ['ޒ', 'Zaviyani', '19th', '/z/'],
  ['ޓ', 'Taviyani', '20th', '/ʈ/'],
  ['ޔ', 'Yaa', '21st', '/j/'],
  ['ޕ', 'Paviyani', '22nd', '/p/'],
  ['ޖ', 'Javiyani', '23rd', '/dʒ/'],
  ['ޗ', 'Chaviyani', '24th', '/tʃ/'],
  ['ޘ', 'Thaa (dotted)', '25th', 'Arabic /θ/'],
  ['ޙ', 'Haa (dotted)', '26th', 'Arabic /ħ/'],
  ['ޚ', 'Khaa', '27th', 'Arabic /x/'],
  ['ޛ', 'Dhaalu (dotted)', '28th', 'Arabic /ð/'],
  ['ޜ', 'Zaa', '29th', '/ʒ/'],
  ['ޝ', 'Sheenu', '30th', 'Arabic /ʃ/'],
  ['ޞ', 'Saadhu', '31st', 'Arabic /sˤ/'],
  ['ޟ', 'Dhaadhu', '32nd', 'Arabic /dˤ/'],
  ['ޠ', 'To', '33rd', 'Arabic /tˤ/'],
  ['ޡ', 'Zo', '34th', 'Arabic /zˤ/'],
  ['ޢ', 'Ainu', '35th', 'Arabic /ʕ/'],
  ['ޣ', 'Ghainu', '36th', 'Arabic /ɣ/'],
  ['ޤ', 'Qaafu', '37th', 'Arabic /q/'],
  ['ޥ', 'Waavu', '38th', 'Arabic /w/'],
  ['ޱ', 'Naviyani', '39th', 'retroflex /ɳ/'],
];

export const THAANA_LETTER_METADATA = Object.freeze(
  Object.fromEntries(
    THAANA_LETTER_SPECS.map(([ch, name, ord, sound, extra]) => {
      const enGloss = `Thaana letter ${name}, ${name.toLowerCase()}, letter`;
      const baseMeaning = `Thaana letter ${name} (${ord} letter of the Thaana alphabet, ${sound}).`;
      const enMeaning = extra ? `${baseMeaning.slice(0, -1)}; ${extra}.` : baseMeaning;
      return [ch, { ch, name, ord, sound, enGloss, enMeaning }];
    })
  )
);

export const THAANA_LETTER_SET = new Set(THAANA_BASE_CONSONANTS);

const DIALECT_DISPLAY = {
  addu: 'Addu dialect',
  fuvahmulah: 'Fuvahmulah dialect',
  huvadhoo: 'Huvadhoo dialect',
  laamu: 'Laamu dialect',
  lhaviyani: 'Lhaviyani dialect',
  haa: 'Northern dialect',
  archaic: 'Archaic Dhivehi',
};

export function getEntryId(e) {
  return e.id ?? e.i;
}

export function getEntryHeadword(e) {
  return e.headword ?? e.h;
}

export function getEntrySenses(e) {
  return e.senses ?? e.s ?? [];
}

export function getEntrySynonymIds(e) {
  return e.synonymIds ?? e.sy ?? [];
}

export function getEntryDialects(e) {
  return e.dialects ?? e.d ?? [];
}

export function getEntryRegisters(e) {
  return e.registers ?? e.rg ?? [];
}

export function getEntryWordclasses(e) {
  return e.wordclasses ?? e.wc ?? [];
}

export function getEntryRomanized(e) {
  return e.romanized ?? e.r ?? '';
}

export function getEntryReferencedInCount(e) {
  return e.referencedInCount ?? e.rc ?? 0;
}

export function isEntryCuratedDaily(e) {
  return Boolean(e.isCuratedDaily || e.cd === 1);
}

/**
 * Returns true when every Radheef sense of `entry` is a single-word cross-reference
 * to another canonical headword in `byHeadword`.
 */
export function isPureSynonymStub(entry, byHeadword) {
  const synIds = getEntrySynonymIds(entry);
  const senses = getEntrySenses(entry);
  if (!synIds.length || !senses.length) return false;
  const selfId = getEntryId(entry);

  return senses.every((sense) => {
    const cleaned = String(sense)
      .replace(/^\([އ-ޱ]+\.\)\s*/, '')
      .replace(/\.$/, '')
      .trim();
    if (!cleaned || /\s/.test(cleaned)) return false;
    const target = byHeadword.get(cleaned);
    return Boolean(target && getEntryId(target) !== selfId);
  });
}

/**
 * Finds deterministic anchor IDs for pure-synonym cycles that have no path to any
 * primary descriptive entry, ensuring 100% translation reachability.
 */
export function findUnresolvedCycleAnchors(entries, byHeadword) {
  const byId = new Map(entries.map((e) => [getEntryId(e), e]));
  const stubIds = new Set();
  const resolved = new Set();

  for (const e of entries) {
    const id = getEntryId(e);
    const hw = getEntryHeadword(e);
    if (!THAANA_LETTER_SET.has(hw) && isPureSynonymStub(e, byHeadword)) {
      stubIds.add(id);
    } else {
      resolved.add(id);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const id of stubIds) {
      if (resolved.has(id)) continue;
      const e = byId.get(id);
      if (getEntrySynonymIds(e).some((tid) => resolved.has(tid))) {
        resolved.add(id);
        changed = true;
      }
    }
  }

  const unresolved = [...stubIds].filter((id) => !resolved.has(id)).sort((a, b) => a - b);
  const anchors = new Set();
  const visited = new Set();

  for (const startId of unresolved) {
    if (visited.has(startId)) continue;
    // BFS over undirected synonym edges within unresolved components
    const queue = [startId];
    const comp = [];
    visited.add(startId);
    while (queue.length > 0) {
      const cur = queue.shift();
      comp.push(cur);
      const curEntry = byId.get(cur);
      for (const nxt of getEntrySynonymIds(curEntry)) {
        if (!resolved.has(nxt) && !visited.has(nxt)) {
          visited.add(nxt);
          queue.push(nxt);
        }
      }
      for (const otherId of unresolved) {
        if (!visited.has(otherId) && getEntrySynonymIds(byId.get(otherId)).includes(cur)) {
          visited.add(otherId);
          queue.push(otherId);
        }
      }
    }
    comp.sort((a, b) => a - b);
    anchors.add(comp[0]);
  }

  return anchors;
}

/**
 * Indexes raw translation records from `data/en-translations.json` (either `{ entries: {...} }`
 * or a flat map keyed by headword or canonical id).
 */
export function indexRawTranslations(rawData) {
  const byHeadword = new Map();
  const byId = new Map();
  if (!rawData || typeof rawData !== 'object') {
    return { byHeadword, byId };
  }

  const sourceMap =
    rawData.entries && typeof rawData.entries === 'object' && !Array.isArray(rawData.entries)
      ? rawData.entries
      : rawData;

  for (const [key, val] of Object.entries(sourceMap)) {
    if (!val || typeof val !== 'object') continue;
    const enGloss = typeof val.enGloss === 'string' ? val.enGloss.trim() : '';
    const enMeaning = typeof val.enMeaning === 'string' ? val.enMeaning.trim() : '';
    if (!enGloss && !enMeaning) continue;

    const rec = {
      ...val,
      enGloss,
      enMeaning,
      stage: val.stage || 'draft',
    };

    if (/^\d+$/.test(key)) {
      const numId = Number(key);
      byId.set(numId, rec);
      if (typeof rec.headword === 'string' && rec.headword.trim()) {
        byHeadword.set(rec.headword.trim(), rec);
      }
    } else {
      byHeadword.set(key.trim(), rec);
      if (typeof rec.id === 'number') {
        byId.set(rec.id, rec);
      }
    }
  }

  return { byHeadword, byId };
}

function stageRank(stage) {
  if (stage === 'auto-letter') return 4;
  if (stage === 'polish') return 3;
  if (stage === 'draft') return 2;
  if (stage === 'synonym') return 1;
  return 0;
}

function dedupeGlossKeywords(glossStrings, maxChars = 75) {
  const seen = new Set();
  const out = [];
  let len = 0;
  for (const g of glossStrings) {
    if (!g) continue;
    for (const part of g.split(/[,;]+/)) {
      const clean = part.trim();
      if (!clean) continue;
      const key = clean.toLowerCase();
      if (seen.has(key)) continue;
      const nextLen = len + (out.length ? 2 : 0) + clean.length;
      if (out.length > 0 && nextLen > maxChars) continue;
      seen.add(key);
      out.push(clean);
      len = nextLen;
      if (out.length >= 5) break;
    }
    if (out.length >= 5) break;
  }
  return out.join(', ');
}

/**
 * Applies auto-labeling for the 39 Thaana letters and iterative synonym propagation
 * across `synonymIds` without mutating `rawTranslations`.
 */
export function applyLettersAndSynonymPropagation(entries, rawTranslations) {
  const { byHeadword: rawByHw, byId: rawById } = indexRawTranslations(rawTranslations);
  const entryById = new Map();
  const entryByHw = new Map();
  for (const e of entries) {
    entryById.set(getEntryId(e), e);
    entryByHw.set(getEntryHeadword(e), e);
  }

  const resolvedById = new Map();

  // Pass 1: Seed Thaana letters + direct translations (excluding stale synonym records)
  for (const e of entries) {
    const id = getEntryId(e);
    const hw = getEntryHeadword(e);

    if (THAANA_LETTER_SET.has(hw)) {
      const meta = THAANA_LETTER_METADATA[hw];
      resolvedById.set(id, {
        id,
        headword: hw,
        enGloss: meta.enGloss,
        enMeaning: meta.enMeaning,
        stage: 'auto-letter',
        qualityRank: 4,
      });
      continue;
    }

    const direct = rawByHw.get(hw) ?? rawById.get(id);
    if (direct && direct.stage !== 'synonym') {
      const st = direct.stage === 'polish' ? 'polish' : 'draft';
      resolvedById.set(id, {
        ...direct,
        id,
        headword: hw,
        stage: st,
        qualityRank: stageRank(st),
      });
    }
  }

  // Pass 2: Iterative multi-hop propagation over single-word synonym links (`synonymIds`)
  const MAX_HOPS = 8;
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    let changed = false;

    for (const e of entries) {
      const id = getEntryId(e);
      const hw = getEntryHeadword(e);
      if (THAANA_LETTER_SET.has(hw)) continue;

      const synIds = getEntrySynonymIds(e);
      if (!synIds.length) continue;

      const existing = resolvedById.get(id);
      const pureStub = isPureSynonymStub(e, entryByHw);
      // Never overwrite direct polish or direct non-stub draft translations
      if (existing && existing.stage === 'polish') continue;
      if (existing && existing.stage === 'draft' && !pureStub) continue;

      const candidates = [];
      for (const tid of synIds) {
        const target = resolvedById.get(tid);
        if (target && (target.enGloss || target.enMeaning)) {
          candidates.push(target);
        }
      }
      if (!candidates.length) continue;

      // Prefer highest quality target (auto-letter / polish > draft > synonym)
      candidates.sort((a, b) => (b.qualityRank ?? 0) - (a.qualityRank ?? 0));
      const best = candidates[0];
      const bestRank = best.qualityRank ?? 0;

      // Only upgrade an existing draft pure-stub if target is polished/auto-letter
      if (existing && existing.stage === 'draft' && bestRank < 3) continue;
      // Only upgrade an existing propagated synonym if target quality improved
      if (existing && existing.stage === 'synonym' && (existing.qualityRank ?? 0) >= bestRank) {
        continue;
      }

      const mergedGloss = dedupeGlossKeywords(
        candidates.slice(0, 2).map((c) => c.enGloss)
      );
      const dialects = getEntryDialects(e);
      const dialectPrefix =
        dialects.length > 0 && DIALECT_DISPLAY[dialects[0]]
          ? `${DIALECT_DISPLAY[dialects[0]]}: `
          : '';
      let enMeaning = best.enMeaning || best.enGloss;
      if (dialectPrefix && !enMeaning.toLowerCase().includes(dialects[0])) {
        enMeaning = `${dialectPrefix}${enMeaning}`;
      }
      if (enMeaning.length > 220) {
        enMeaning = `${enMeaning.slice(0, 217).trimEnd()}...`;
      }

      resolvedById.set(id, {
        id,
        headword: hw,
        enGloss: mergedGloss || best.enGloss,
        enMeaning,
        stage: 'synonym',
        derivedFrom: best.headword,
        derivedStage: best.stage === 'synonym' ? best.derivedStage || 'draft' : best.stage,
        qualityRank: bestRank > 0 ? bestRank - 0.1 : 1,
      });
      changed = true;
    }

    if (!changed) break;
  }

  const resolvedByHeadword = new Map();
  const stats = {
    totalEntries: entries.length,
    translatedCount: 0,
    autoLetter: 0,
    polish: 0,
    draft: 0,
    synonymPropagated: 0,
  };

  for (const e of entries) {
    const id = getEntryId(e);
    const hw = getEntryHeadword(e);
    const rec = resolvedById.get(id);
    if (!rec) continue;
    resolvedByHeadword.set(hw, rec);
    stats.translatedCount++;
    if (rec.stage === 'auto-letter') stats.autoLetter++;
    else if (rec.stage === 'polish') stats.polish++;
    else if (rec.stage === 'draft') stats.draft++;
    else if (rec.stage === 'synonym') stats.synonymPropagated++;
  }

  return { resolvedById, resolvedByHeadword, stats };
}

const DRAFT_LEAD_STRIP_RE =
  /^(?:a|an|the)\s+(?:type|kind|sort|form|state|act|action|process)\s+of\s+/i;

/**
 * Distills 1-4 concise search keywords from a raw Stage-1 English translation.
 */
export function deriveDraftGlossFromEnglish(translatedText, maxChars = 60) {
  if (!translatedText || typeof translatedText !== 'string') return '';
  let text = translatedText
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const clauses = text
    .split(/[.;:!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const keywords = [];
  const seen = new Set();

  for (const clause of clauses) {
    let cleaned = clause
      .replace(DRAFT_LEAD_STRIP_RE, '')
      .replace(/^(?:to\s+be|something\s+that|one\s+who)\s+/i, '')
      .trim();

    for (const sub of cleaned.split(/[,/]+/)) {
      let tok = sub
        .replace(/^[\[\]"'“”‘’]+|[\[\]"'“”‘’.]+$/g, '')
        .trim();
      if (!tok || !/[A-Za-z]/.test(tok)) continue;
      // Truncate overly long descriptive clauses to first 4 words for gloss keywords
      const words = tok.split(/\s+/);
      if (words.length > 4) {
        tok = words.slice(0, 4).join(' ');
      }
      const key = tok.toLowerCase();
      if (seen.has(key)) continue;
      const joinedLen = keywords.join(', ').length + (keywords.length ? 2 : 0) + tok.length;
      if (keywords.length > 0 && joinedLen > maxChars) continue;
      seen.add(key);
      keywords.push(tok);
      if (keywords.length >= 4) break;
    }
    if (keywords.length >= 4) break;
  }

  return keywords.join(', ');
}

function sanitizeField(val, maxLen) {
  return String(val ?? '')
    .replace(/\|/g, '/')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^["']+|["']+$/g, '')
    .trim()
    .slice(0, maxLen)
    .trim();
}

/**
 * Parses model output in `ID|enGloss|enMeaning` format (with JSONL fallback),
 * validates every returned ID against `expectedIds`, and reports missed rows.
 */
export function parseBatchTranslationOutput(rawText, expectedIds) {
  const expectedSet = new Set(expectedIds.map((x) => Number(x)));
  const validById = new Map();
  const invalidLines = [];

  const cleanedText = String(rawText ?? '')
    .replace(/```[a-zA-Z]*\r?\n?/g, '')
    .replace(/```/g, '');

  for (const rawLine of cleanedText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    let id = null;
    let rawGloss = '';
    let rawMeaning = '';

    if (line.startsWith('{') && line.endsWith('}')) {
      try {
        const obj = JSON.parse(line);
        id = Number(obj.id ?? obj.i);
        rawGloss = obj.enGloss ?? obj.gloss ?? obj.g ?? '';
        rawMeaning = obj.enMeaning ?? obj.meaning ?? obj.m ?? '';
      } catch {
        invalidLines.push(line);
        continue;
      }
    } else {
      const parts = line.split('|');
      if (parts.length < 3) {
        invalidLines.push(line);
        continue;
      }
      const idStr = parts[0].replace(/^\s*[-*•]?\s*/, '').trim();
      if (!/^\d+$/.test(idStr)) {
        invalidLines.push(line);
        continue;
      }
      id = Number(idStr);
      rawGloss = parts[1];
      rawMeaning = parts.slice(2).join(' / ');
    }

    if (!Number.isInteger(id) || !expectedSet.has(id)) {
      invalidLines.push(line);
      continue;
    }
    if (validById.has(id)) continue;

    const enGloss = sanitizeField(rawGloss, 90);
    const enMeaning = sanitizeField(rawMeaning, 240);

    if (!enGloss || !enMeaning || !/[A-Za-z]/.test(enGloss) || !/[A-Za-z]/.test(enMeaning)) {
      invalidLines.push(line);
      continue;
    }

    validById.set(id, { id, enGloss, enMeaning });
  }

  const missedIds = expectedIds.filter((id) => !validById.has(Number(id)));
  return { validById, missedIds, invalidLines };
}

/**
 * Relaxed academic safety settings for Gemini Interactions API dictionary translation.
 */
export const POLISH_SAFETY_SETTINGS_OFF = [
  { type: 'hate_speech', threshold: 'off' },
  { type: 'dangerous_content', threshold: 'off' },
  { type: 'harassment', threshold: 'off' },
  { type: 'sexually_explicit', threshold: 'off' },
  { type: 'civic_integrity', threshold: 'off' },
];

export const POLISH_SAFETY_SETTINGS_BLOCK_NONE = [
  { type: 'hate_speech', threshold: 'block_none' },
  { type: 'dangerous_content', threshold: 'block_none' },
  { type: 'harassment', threshold: 'block_none' },
  { type: 'sexually_explicit', threshold: 'block_none' },
  { type: 'civic_integrity', threshold: 'block_none' },
];

/**
 * Returns true if an error/message represents a safety/prohibited-content filter refusal
 * (as opposed to an invalid `safety_settings` parameter error, quota limit, or model 404).
 */
export function isContentFilterError(errOrMsg, explicitStatus = 0) {
  const msg =
    typeof errOrMsg === 'string'
      ? errOrMsg
      : String(errOrMsg?.message ?? errOrMsg ?? '');
  const lower = msg.toLowerCase();
  const status =
    explicitStatus ||
    errOrMsg?.status ||
    errOrMsg?.statusCode ||
    (/\b400\b/.test(lower) ? 400 : 0);

  if (lower.includes('safety_setting') || lower.includes('safety setting')) {
    return false;
  }

  if (
    lower.includes('prohibited_content') ||
    lower.includes('prohibited content') ||
    lower.includes('prohibited') ||
    lower.includes('recitation') ||
    lower.includes('content_filter') ||
    lower.includes('content filter')
  ) {
    return true;
  }

  return (
    status === 400 &&
    (lower.includes('safety') || lower.includes('blocked') || lower.includes('harm'))
  );
}

/**
 * Determines whether a primary entry still needs translation/polishing for `mode`.
 */
export function isEntryPendingForMode(entry, storeEntries, indexedByHw, indexedById, mode) {
  const id = getEntryId(entry);
  const hw = getEntryHeadword(entry);
  const rawStoreRec = storeEntries?.[hw] ?? storeEntries?.[String(id)];
  if (rawStoreRec?.skipReason === 'safety_blocked') {
    return false;
  }
  const rec = indexedByHw.get(hw) ?? indexedById.get(id);
  if (mode === 'draft') {
    return !rec || (rec.stage !== 'draft' && rec.stage !== 'polish' && rec.verified !== true);
  }
  return !rec || (rec.stage !== 'polish' && rec.verified !== true);
}

/**
 * Runs `translateBatchFn` on a batch and recursively bisects whenever a batch hits
 * repeated content-filter blocks (`contentFiltered: true`), isolating only the single
 * offending entry with `onEntryBlocked` so remaining entries still save.
 */
export async function processPolishBatchWithBisection({
  batch,
  byId,
  translateBatchFn,
  onBatchSuccess,
  onEntryBlocked,
  onCheckpoint,
  shouldStop = () => false,
  log = console,
  retryMissedRounds = 2,
  batchLabel = 'Batch',
}) {
  let polishedCount = 0;
  let blockedCount = 0;
  let lastMeta = { slotLabel: '', modelUsed: '' };
  const unresolvedIds = new Set();

  async function runNode(subBatch, allowMissedRetry, depth) {
    if (subBatch.length === 0 || shouldStop()) return;

    const res = await translateBatchFn(subBatch);
    if (!res) {
      for (const e of subBatch) unresolvedIds.add(getEntryId(e));
      return;
    }

    if (res.slotLabel || res.modelUsed) {
      lastMeta = {
        slotLabel: res.slotLabel ?? lastMeta.slotLabel,
        modelUsed: res.modelUsed ?? lastMeta.modelUsed,
      };
    }

    if (res.contentFiltered) {
      if (subBatch.length === 1) {
        const offending = subBatch[0];
        if (onEntryBlocked) {
          onEntryBlocked(offending, res);
        }
        blockedCount++;
        log.warn(
          `[Polish] ${batchLabel}: Isolated single flagged word #${getEntryId(offending)} "${getEntryHeadword(offending)}" -> skipReason="safety_blocked"`
        );
        if (onCheckpoint) onCheckpoint();
        return;
      }

      const mid = Math.ceil(subBatch.length / 2);
      log.warn(
        `[Polish] ${batchLabel} (depth ${depth}): ${subBatch.length} entries hit prohibited-content filter twice — bisecting into ${mid} + ${subBatch.length - mid}...`
      );
      await runNode(subBatch.slice(0, mid), allowMissedRetry, depth + 1);
      if (!shouldStop()) {
        await runNode(subBatch.slice(mid), allowMissedRetry, depth + 1);
      }
      return;
    }

    if (res.validById && res.validById.size > 0 && onBatchSuccess) {
      polishedCount += onBatchSuccess(res);
      if (depth > 0 && onCheckpoint) {
        onCheckpoint();
      }
    }

    let missedIds = res.missedIds ?? [];
    if (!allowMissedRetry || missedIds.length === 0) {
      for (const id of missedIds) unresolvedIds.add(id);
      return;
    }

    for (let retryRound = 1; retryRound <= retryMissedRounds && missedIds.length > 0; retryRound++) {
      if (shouldStop()) break;
      log.warn(
        `[Polish] ${batchLabel}: ${missedIds.length} missed rows — retry round ${retryRound}...`
      );
      const retryChunkSize = Math.min(50, missedIds.length);
      const roundMissed = [];

      for (let m = 0; m < missedIds.length; m += retryChunkSize) {
        if (shouldStop()) {
          roundMissed.push(...missedIds.slice(m));
          break;
        }
        const subEntries = missedIds
          .slice(m, m + retryChunkSize)
          .map((id) => byId.get(id))
          .filter(Boolean);
        if (subEntries.length === 0) continue;

        const beforeUnresolved = new Set(unresolvedIds);
        unresolvedIds.clear();
        await runNode(subEntries, false, depth + 1);
        for (const id of unresolvedIds) roundMissed.push(id);
        unresolvedIds.clear();
        for (const id of beforeUnresolved) unresolvedIds.add(id);
      }

      missedIds = roundMissed;
    }

    for (const id of missedIds) unresolvedIds.add(id);
  }

  await runNode(batch, true, 0);
  return {
    polishedCount,
    blockedCount,
    stillMissedCount: unresolvedIds.size,
    slotLabel: lastMeta.slotLabel,
    modelUsed: lastMeta.modelUsed,
  };
}
