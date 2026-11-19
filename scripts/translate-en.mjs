import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import {
  POLISH_SAFETY_SETTINGS_BLOCK_NONE,
  POLISH_SAFETY_SETTINGS_OFF,
  THAANA_LETTER_SET,
  applyLettersAndSynonymPropagation,
  deriveDraftGlossFromEnglish,
  findUnresolvedCycleAnchors,
  getEntryDialects,
  getEntryHeadword,
  getEntryId,
  getEntryReferencedInCount,
  getEntryRegisters,
  getEntryRomanized,
  getEntrySenses,
  getEntryWordclasses,
  indexRawTranslations,
  isContentFilterError,
  isEntryCuratedDaily,
  isEntryPendingForMode,
  isPureSynonymStub,
  parseBatchTranslationOutput,
  processPolishBatchWithBisection,
} from './lib/en-translation-utils.mjs';

const WORKSPACE_ROOT = process.cwd();
const CORE_PATH = path.join(WORKSPACE_ROOT, 'public', 'data', 'dictionary-core.json');
const TRANSLATIONS_PATH = path.join(WORKSPACE_ROOT, 'data', 'en-translations.json');

const DEFAULT_MODEL = 'gemini-4-hydrogen';
const GTX_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function maskKey(key, idx) {
  const tail = key.length >= 4 ? key.slice(-4) : '****';
  return `Key #${idx + 1} (…${tail})`;
}

function sanitizeErrorMessage(msg, keys = []) {
  let out = String(msg ?? 'Unknown error');
  for (const k of keys) {
    if (k && out.includes(k)) {
      out = out.split(k).join('[REDACTED_KEY]');
    }
  }
  return out;
}

/**
 * Loads `.env` and `.env.local` (`.env.local` overrides `.env`, process.env takes precedence if already set)
 * without mutating unrelated env variables or logging secret values.
 */
function loadLocalEnv() {
  const loaded = {};
  for (const file of ['.env', '.env.local']) {
    const full = path.join(WORKSPACE_ROOT, file);
    if (!fs.existsSync(full)) continue;
    const raw = fs.readFileSync(full, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      loaded[key] = val;
    }
  }
  return loaded;
}

function resolveApiKeys(localEnv) {
  const rawList =
    process.env.GEMINI_API_KEYS ??
    localEnv.GEMINI_API_KEYS ??
    process.env.GEMINI_API_KEY ??
    localEnv.GEMINI_API_KEY ??
    '';

  const keys = [];
  const seen = new Set();
  for (const part of rawList.split(',')) {
    const k = part.trim().replace(/^["']+|["']+$/g, '');
    if (!k || k.startsWith('your_key')) continue;
    if (!seen.has(k)) {
      seen.add(k);
      keys.push(k);
    }
  }
  return keys;
}

function parseArgs(argv) {
  const opts = {
    mode: '',
    model: '',
    fallbackModel: '',
    batchSize: null,
    maxRequests: Infinity,
    limit: Infinity,
    rpm: 5,
    tpm: 250_000,
    delayMs: 450,
    concurrency: 2,
    benchmark: 0,
    save: false,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => (i + 1 < argv.length ? argv[++i] : '');
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--mode') opts.mode = next();
    else if (arg.startsWith('--mode=')) opts.mode = arg.slice(7);
    else if (arg === '--model') opts.model = next();
    else if (arg.startsWith('--model=')) opts.model = arg.slice(8);
    else if (arg === '--fallback-model') opts.fallbackModel = next();
    else if (arg.startsWith('--fallback-model=')) opts.fallbackModel = arg.slice(17);
    else if (arg === '--batch-size') opts.batchSize = Number(next());
    else if (arg.startsWith('--batch-size=')) opts.batchSize = Number(arg.slice(13));
    else if (arg === '--max-requests') opts.maxRequests = Number(next());
    else if (arg.startsWith('--max-requests=')) opts.maxRequests = Number(arg.slice(15));
    else if (arg === '--limit') opts.limit = Number(next());
    else if (arg.startsWith('--limit=')) opts.limit = Number(arg.slice(8));
    else if (arg === '--rpm') opts.rpm = Number(next());
    else if (arg.startsWith('--rpm=')) opts.rpm = Number(arg.slice(6));
    else if (arg === '--delay-ms') opts.delayMs = Number(next());
    else if (arg.startsWith('--delay-ms=')) opts.delayMs = Number(arg.slice(11));
    else if (arg === '--concurrency') opts.concurrency = Number(next());
    else if (arg.startsWith('--concurrency=')) opts.concurrency = Number(arg.slice(14));
    else if (arg === '--benchmark') {
      const peek = argv[i + 1];
      if (peek && /^\d+$/.test(peek)) {
        opts.benchmark = Number(next());
      } else {
        opts.benchmark = 25;
      }
    } else if (arg.startsWith('--benchmark=')) opts.benchmark = Number(arg.slice(12));
    else if (arg === '--save') opts.save = true;
    else if (arg === '--dry-run') opts.dryRun = true;
  }

  return opts;
}

function printHelp() {
  console.log(`
Radheef 2-Stage English Translation Pipeline

Usage:
  node scripts/translate-en.mjs --mode draft [options]
  node scripts/translate-en.mjs --mode polish [options]
  node scripts/translate-en.mjs --benchmark 25 [options]

Options:
  --mode <draft|polish>       Stage 1 free dv->en draft, or Stage 2 Gemini polish
  --model <id>                Gemini model (default: GEMINI_MODEL or ${DEFAULT_MODEL})
  --fallback-model <id>       Optional fallback model if primary hits model_not_found/tier block
  --batch-size <n>            Entries per batch (default: 15 for draft, 200 for polish)
  --max-requests <n>          Maximum external API requests to perform in this run
  --limit <n>                 Maximum primary entries to translate in this run
  --rpm <n>                   Requests per minute limit per Gemini key (default: 5)
  --concurrency <n>           Stage 1 parallel workers (default: 2)
  --delay-ms <n>              Stage 1 minimum delay between requests per worker (default: 450)
  --benchmark [n]             Preview n (default 25) diverse entries side-by-side
  --save                      Persist --benchmark results into data/en-translations.json
  --dry-run                   Show queue counts and key status without calling APIs
`);
}

function loadCheckpointStore() {
  if (!fs.existsSync(TRANSLATIONS_PATH)) {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      stats: {},
      entries: {},
    };
  }
  const raw = JSON.parse(fs.readFileSync(TRANSLATIONS_PATH, 'utf8'));
  const entries =
    raw.entries && typeof raw.entries === 'object' && !Array.isArray(raw.entries)
      ? raw.entries
      : raw;
  return {
    version: raw.version || 1,
    updatedAt: raw.updatedAt || new Date().toISOString(),
    stats: raw.stats || {},
    entries: { ...entries },
  };
}

function saveCheckpointStore(store, coreEntries) {
  fs.mkdirSync(path.dirname(TRANSLATIONS_PATH), { recursive: true });
  const { resolvedByHeadword, stats } = applyLettersAndSynonymPropagation(coreEntries, store);

  // Merge auto-letters and synonym propagations into checkpoint cleanly without clobbering direct records
  const mergedEntries = { ...store.entries };
  for (const [hw, rec] of resolvedByHeadword.entries()) {
    const existing = mergedEntries[hw];
    if (rec.stage === 'auto-letter' || rec.stage === 'synonym') {
      if (!existing || existing.stage === 'synonym' || existing.stage === 'auto-letter') {
        mergedEntries[hw] = {
          id: rec.id,
          enGloss: rec.enGloss,
          enMeaning: rec.enMeaning,
          stage: rec.stage,
          ...(rec.derivedFrom ? { derivedFrom: rec.derivedFrom } : {}),
          ...(rec.derivedStage ? { derivedStage: rec.derivedStage } : {}),
        };
      }
    }
  }

  store.entries = mergedEntries;
  store.updatedAt = new Date().toISOString();
  store.stats = stats;

  const tmpPath = `${TRANSLATIONS_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tmpPath, TRANSLATIONS_PATH);
  return stats;
}

/**
 * Classifies canonical entries into letters, pure synonym stubs, and primary queue.
 */
function buildTranslationPlan(coreEntries) {
  const byHw = new Map(coreEntries.map((e) => [getEntryHeadword(e), e]));
  const cycleAnchors = findUnresolvedCycleAnchors(coreEntries, byHw);

  const primary = [];
  let letterCount = 0;
  let stubCount = 0;

  for (const e of coreEntries) {
    const id = getEntryId(e);
    const hw = getEntryHeadword(e);
    if (THAANA_LETTER_SET.has(hw)) {
      letterCount++;
      continue;
    }
    if (isPureSynonymStub(e, byHw) && !cycleAnchors.has(id)) {
      stubCount++;
      continue;
    }
    primary.push(e);
  }

  // Sort high-value words first so Stage 2 polishes curated and heavily cross-linked words earliest
  primary.sort((a, b) => {
    const dailyDiff = (isEntryCuratedDaily(b) ? 1 : 0) - (isEntryCuratedDaily(a) ? 1 : 0);
    if (dailyDiff !== 0) return dailyDiff;
    const rcDiff = getEntryReferencedInCount(b) - getEntryReferencedInCount(a);
    if (rcDiff !== 0) return rcDiff;
    const senseDiff = getEntrySenses(b).length - getEntrySenses(a).length;
    if (senseDiff !== 0) return senseDiff;
    return getEntryId(a) - getEntryId(b);
  });

  return { primary, letterCount, stubCount, cycleAnchorCount: cycleAnchors.size };
}

// ============================================================================
// STAGE 1: FREE DV -> EN DRAFT TRANSLATION (BATCHED GTX WITH ADAPTIVE BACKOFF)
// ============================================================================

function parseGtxResponse(json) {
  if (!Array.isArray(json) || !Array.isArray(json[0])) return '';
  return json[0]
    .map((seg) => (Array.isArray(seg) && typeof seg[0] === 'string' ? seg[0] : ''))
    .join('');
}

async function callGtxTranslate(text, retries = 3) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const body = new URLSearchParams({
        client: 'gtx',
        sl: 'dv',
        tl: 'en',
        dt: 't',
        q: text,
      });
      const res = await fetch(GTX_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'Mozilla/5.0',
        },
        body: body.toString(),
      });

      if (res.status === 429 || res.status >= 500) {
        const waitMs = 2000 * Math.pow(2, attempt) + Math.floor(Math.random() * 600);
        await sleep(waitMs);
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      return parseGtxResponse(data);
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await sleep(1500 * Math.pow(2, attempt));
      }
    }
  }
  throw lastErr ?? new Error('GTX request failed');
}

function buildDraftInputForEntry(e) {
  const hw = getEntryHeadword(e);
  const senses = getEntrySenses(e)
    .slice(0, 2)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
  // Separate headword and definition snippet with ` || ` so gloss extraction gets direct headword + sense terms
  return `${hw} || ${senses}`;
}

function extractDraftFields(rawTranslated, fallbackEntry) {
  const normalized = String(rawTranslated ?? '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\[\]]+\s*|\s*[\[\]]+$/g, '')
    .trim();

  const sepIdx = normalized.indexOf('||');
  let headPart = '';
  let defPart = normalized;
  if (sepIdx !== -1) {
    headPart = normalized.slice(0, sepIdx).trim();
    defPart = normalized.slice(sepIdx + 2).trim();
  }

  const enMeaning = (defPart || headPart || getEntryRomanized(fallbackEntry) || 'Dhivehi term')
    .replace(/\s*\|\|\s*/g, '; ')
    .slice(0, 200)
    .trim();

  const combinedForGloss = headPart && !defPart.toLowerCase().startsWith(headPart.toLowerCase())
    ? `${headPart}, ${defPart}`
    : defPart || headPart;

  const enGloss =
    deriveDraftGlossFromEnglish(combinedForGloss, 65) ||
    deriveDraftGlossFromEnglish(enMeaning, 65) ||
    headPart.slice(0, 60) ||
    enMeaning.slice(0, 60);

  return { enGloss, enMeaning };
}

/**
 * Translates a batch of entries using numbered marker delimiters (`[[[0]]] ...`),
 * automatically bisecting if Google Translate ever drops or merges a marker.
 */
async function translateDraftBatch(batch, requestBudget) {
  if (batch.length === 0 || requestBudget.used >= requestBudget.max) {
    return new Map();
  }

  if (batch.length === 1) {
    requestBudget.used++;
    const raw = await callGtxTranslate(buildDraftInputForEntry(batch[0]));
    const out = new Map();
    out.set(getEntryId(batch[0]), extractDraftFields(raw, batch[0]));
    return out;
  }

  const packed = batch
    .map((e, idx) => `[[[${idx}]]]\n${buildDraftInputForEntry(e)}`)
    .join('\n');

  requestBudget.used++;
  const translated = await callGtxTranslate(packed);

  const markerRe = /\[\[\[?\s*(\d+)\s*\]\]\]?/g;
  const matches = [...translated.matchAll(markerRe)];
  const parsed = new Map();

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const idx = Number(m[1]);
    if (idx < 0 || idx >= batch.length) continue;
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? translated.length) : translated.length;
    const chunk = translated.slice(start, end).trim();
    if (chunk && /[A-Za-z]/.test(chunk)) {
      parsed.set(idx, extractDraftFields(chunk, batch[idx]));
    }
  }

  const out = new Map();
  const missing = [];
  for (let i = 0; i < batch.length; i++) {
    if (parsed.has(i)) {
      out.set(getEntryId(batch[i]), parsed.get(i));
    } else {
      missing.push(batch[i]);
    }
  }

  // Bisect any missing subset to guarantee zero misaligned translations
  if (missing.length > 0 && requestBudget.used < requestBudget.max) {
    if (missing.length === batch.length) {
      const mid = Math.ceil(missing.length / 2);
      const left = await translateDraftBatch(missing.slice(0, mid), requestBudget);
      const right = await translateDraftBatch(missing.slice(mid), requestBudget);
      for (const [k, v] of left) out.set(k, v);
      for (const [k, v] of right) out.set(k, v);
    } else {
      const sub = await translateDraftBatch(missing, requestBudget);
      for (const [k, v] of sub) out.set(k, v);
    }
  }

  return out;
}

async function runStage1Draft(coreEntries, targetEntries, store, opts) {
  const batchSize = Math.max(1, opts.batchSize ?? 15);
  const concurrency = Math.max(1, Math.min(4, opts.concurrency ?? 2));
  const delayMs = Math.max(150, opts.delayMs ?? 450);

  // Build character-bounded batches so every request stays safely below ~3,200 chars
  const batches = [];
  let cur = [];
  let curChars = 0;
  for (const e of targetEntries) {
    const sampleLen = buildDraftInputForEntry(e).length + 12;
    if (cur.length >= batchSize || (cur.length > 0 && curChars + sampleLen > 3200)) {
      batches.push(cur);
      cur = [];
      curChars = 0;
    }
    cur.push(e);
    curChars += sampleLen;
  }
  if (cur.length > 0) batches.push(cur);

  console.log(
    `Stage 1 (--mode draft): ${targetEntries.length.toLocaleString()} entries across ~${batches.length} batches (batchSize=${batchSize}, concurrency=${concurrency}, delay=${delayMs}ms)`
  );

  if (opts.dryRun) return;

  const requestBudget = { used: 0, max: opts.maxRequests };
  let nextBatchIdx = 0;
  let completedEntries = 0;
  let globalBackoffUntil = 0;
  let stopRequested = false;

  const onSigInt = () => {
    if (!stopRequested) {
      stopRequested = true;
      console.log('\nGraceful stop requested — finishing active batch and saving checkpoint...');
    }
  };
  process.on('SIGINT', onSigInt);

  async function worker(workerId) {
    while (!stopRequested && requestBudget.used < requestBudget.max) {
      const idx = nextBatchIdx++;
      if (idx >= batches.length) break;

      const waitGlobal = globalBackoffUntil - Date.now();
      if (waitGlobal > 0) await sleep(waitGlobal);

      const batch = batches[idx];
      try {
        const resultMap = await translateDraftBatch(batch, requestBudget);
        const nowIso = new Date().toISOString();

        for (const e of batch) {
          const res = resultMap.get(getEntryId(e));
          if (!res) continue;
          const hw = getEntryHeadword(e);
          const existing = store.entries[hw];
          if (existing?.stage === 'polish') continue;
          store.entries[hw] = {
            id: getEntryId(e),
            enGloss: res.enGloss,
            enMeaning: res.enMeaning,
            stage: 'draft',
            updatedAt: nowIso,
          };
          completedEntries++;
        }

        const stats = saveCheckpointStore(store, coreEntries);
        console.log(
          `[Draft w${workerId}] Batch ${idx + 1}/${batches.length} (+${resultMap.size}/${batch.length}) | Reqs: ${requestBudget.used} | Total translated: ${stats.translatedCount.toLocaleString()}/${coreEntries.length.toLocaleString()}`
        );
      } catch (err) {
        console.warn(
          `[Draft w${workerId}] Batch ${idx + 1} error: ${err instanceof Error ? err.message : String(err)} — backing off 5s`
        );
        globalBackoffUntil = Math.max(globalBackoffUntil, Date.now() + 5000);
      }

      const jitter = Math.floor(Math.random() * 160);
      await sleep(delayMs + jitter);
    }
  }

  try {
    await Promise.all(Array.from({ length: concurrency }, (_, i) => worker(i + 1)));
  } finally {
    process.removeListener('SIGINT', onSigInt);
  }

  const finalStats = saveCheckpointStore(store, coreEntries);
  console.log('Stage 1 complete. Checkpoint summary:', finalStats);
  console.log(`Processed ${completedEntries.toLocaleString()} primary entries in ${requestBudget.used} requests.`);
}

// ============================================================================
// STAGE 2: GEMINI POLISH WITH MULTI-KEY ROTATION & PER-KEY 5 RPM RATE LIMITER
// ============================================================================

const POLISH_SYSTEM_INSTRUCTION = `You are an expert Dhivehi-English lexicographer translating entries from the official Maldivian dictionary (Dhivehi Basfoiy / Radheef).

For every input line formatted as:
ID|HEADWORD|TAGS|SENSES

Output EXACTLY ONE line in pipe-delimited format:
ID|enGloss|enMeaning

Strict rules:
1. Keep the numeric ID identical to the input. Never skip, merge, or invent IDs.
2. enGloss: 1 to 4 concise, natural English search keywords/synonyms separated by commas (max 55 chars, lowercase unless proper noun, no periods, no pipe '|'). Example: love, affection, fondness
3. enMeaning: 1 crisp, accurate English dictionary definition summarizing the Radheef senses (max 150 chars, no pipe '|'). Preserve register/dialect nuance if tagged (e.g. "Honorific: ...", "Idiom: ...", "Addu dialect: ...").
4. Output ONLY the ID|enGloss|enMeaning lines. Do NOT output markdown code fences, headers, numbering, or commentary.`;

class GeminiKeyPool {
  constructor(keys, rpmLimit, tpmLimit) {
    this.slots = keys.map((key, idx) => ({
      idx,
      label: maskKey(key, idx),
      key,
      client: new GoogleGenAI({ apiKey: key }),
      timestamps: [],
      tokenLedger: [],
      cooldownUntil: 0,
      dailyExhausted: false,
      invalidReason: null,
      requestsMade: 0,
    }));
    this.rpmLimit = Math.max(1, rpmLimit);
    this.tpmLimit = Math.max(10_000, tpmLimit);
    this.cursor = 0;
  }

  activeSlotCount() {
    return this.slots.filter((s) => !s.dailyExhausted && !s.invalidReason).length;
  }

  pruneSlot(slot, now) {
    const cutoff = now - 61_000;
    slot.timestamps = slot.timestamps.filter((t) => t > cutoff);
    slot.tokenLedger = slot.tokenLedger.filter((x) => x.t > cutoff);
  }

  async acquire(estimatedTokens) {
    while (true) {
      if (this.activeSlotCount() === 0) {
        throw new Error('ALL_KEYS_EXHAUSTED');
      }

      const now = Date.now();
      let earliestWaitMs = Infinity;

      for (let offset = 0; offset < this.slots.length; offset++) {
        const idx = (this.cursor + offset) % this.slots.length;
        const slot = this.slots[idx];
        if (slot.dailyExhausted || slot.invalidReason) continue;

        this.pruneSlot(slot, now);

        if (slot.cooldownUntil > now) {
          earliestWaitMs = Math.min(earliestWaitMs, slot.cooldownUntil - now);
          continue;
        }

        if (slot.timestamps.length >= this.rpmLimit) {
          const waitRpm = slot.timestamps[0] + 61_000 - now;
          earliestWaitMs = Math.min(earliestWaitMs, Math.max(500, waitRpm));
          continue;
        }

        // Enforce ~12.2s minimum spacing at 5 RPM to avoid burst 429s
        const minSpacingMs = Math.ceil(60_500 / this.rpmLimit);
        const lastReq = slot.timestamps[slot.timestamps.length - 1];
        if (lastReq && now - lastReq < minSpacingMs) {
          earliestWaitMs = Math.min(earliestWaitMs, minSpacingMs - (now - lastReq));
          continue;
        }

        const usedTpm = slot.tokenLedger.reduce((acc, x) => acc + x.tokens, 0);
        if (usedTpm + estimatedTokens > this.tpmLimit && slot.tokenLedger.length > 0) {
          const waitTpm = slot.tokenLedger[0].t + 61_000 - now;
          earliestWaitMs = Math.min(earliestWaitMs, Math.max(1000, waitTpm));
          continue;
        }

        // Slot ready
        slot.timestamps.push(now);
        slot.tokenLedger.push({ t: now, tokens: estimatedTokens });
        slot.requestsMade++;
        this.cursor = (idx + 1) % this.slots.length;
        return slot;
      }

      const sleepMs = Math.min(Math.max(earliestWaitMs, 500), 65_000);
      console.log(`All active Gemini keys cooling down (${Math.ceil(sleepMs / 1000)}s)...`);
      await sleep(sleepMs);
    }
  }

  classifyAndHandleError(slot, err) {
    const rawMsg = sanitizeErrorMessage(err?.message ?? err, [slot.key]);
    const status =
      err?.status ??
      err?.statusCode ??
      (/\b429\b/.test(rawMsg)
        ? 429
        : /\b404\b/.test(rawMsg)
        ? 404
        : /\b(401|403)\b/.test(rawMsg)
        ? 403
        : /\b400\b/.test(rawMsg)
        ? 400
        : 0);
    const lower = rawMsg.toLowerCase();

    if (status === 401 || status === 403 || lower.includes('permission_denied') || lower.includes('api key not valid')) {
      slot.invalidReason = rawMsg;
      console.warn(`${slot.label} disabled (auth/permission ${status}): ${rawMsg}`);
      return 'rotate';
    }

    if (status === 404 || lower.includes('model_not_found') || lower.includes('not found for api version')) {
      return 'model_error';
    }

    if (status === 429 || lower.includes('resource_exhausted') || lower.includes('quota') || lower.includes('rate_limit')) {
      const looksDaily =
        lower.includes('quota_exceeded') ||
        lower.includes('daily') ||
        lower.includes('per day') ||
        lower.includes('limit: 0') ||
        lower.includes('exceeded your current quota');

      if (looksDaily) {
        slot.dailyExhausted = true;
        console.warn(`${slot.label} hit daily/quota exhaustion — rotating to next key.`);
      } else {
        slot.cooldownUntil = Date.now() + 62_000;
        console.warn(`${slot.label} hit 429 rate limit — cooling down 62s and rotating.`);
      }
      return 'rotate';
    }

    if (
      lower.includes('safety_setting') ||
      lower.includes('safety setting') ||
      (status === 400 && lower.includes('threshold'))
    ) {
      return 'safety_setting_unsupported';
    }

    if (isContentFilterError(rawMsg, status)) {
      return 'content_filter';
    }

    return 'retry_transient';
  }
}

function formatPolishInputBatch(batch) {
  return batch
    .map((e) => {
      const id = getEntryId(e);
      const hw = getEntryHeadword(e).replace(/\|/g, '/');
      const tags = [
        ...getEntryWordclasses(e),
        ...getEntryDialects(e),
        ...getEntryRegisters(e),
      ].join(',');
      const senses = getEntrySenses(e)
        .slice(0, 4)
        .join(' / ')
        .replace(/\|/g, '/')
        .replace(/\r?\n+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .slice(0, 240)
        .trim();
      return `${id}|${hw}|${tags}|${senses}`;
    })
    .join('\n');
}

function extractInteractionText(interaction) {
  if (typeof interaction?.output_text === 'string' && interaction.output_text.trim()) {
    return interaction.output_text;
  }
  if (Array.isArray(interaction?.steps)) {
    const chunks = [];
    for (const step of interaction.steps) {
      if (step?.type === 'model_output' && Array.isArray(step.content)) {
        for (const c of step.content) {
          if (c?.type === 'text' && typeof c.text === 'string') {
            chunks.push(c.text);
          }
        }
      }
    }
    return chunks.join('\n');
  }
  return '';
}

async function callGeminiBatchWithRotation(keyPool, batch, opts, requestBudget) {
  const inputText = formatPolishInputBatch(batch);
  const estimatedTokens = Math.ceil((inputText.length + POLISH_SYSTEM_INSTRUCTION.length) / 3);
  let activeModel = opts.model;
  let transientAttempts = 0;
  let contentFilterAttempts = 0;
  let safetyMode = opts.safetyMode || 'off';

  while (requestBudget.used < requestBudget.max) {
    const slot = await keyPool.acquire(estimatedTokens);
    requestBudget.used++;

    try {
      const payload = {
        model: activeModel,
        input: inputText,
        system_instruction: POLISH_SYSTEM_INSTRUCTION,
        generation_config: {
          thinking_level: 'low',
          max_output_tokens: 16384,
        },
        store: false,
      };
      if (safetyMode === 'off') {
        payload.safety_settings = POLISH_SAFETY_SETTINGS_OFF;
      } else if (safetyMode === 'block_none') {
        payload.safety_settings = POLISH_SAFETY_SETTINGS_BLOCK_NONE;
      }

      const interaction = await slot.client.interactions.create(payload);

      if (interaction.status === 'failed') {
        throw new Error(interaction.error?.message || 'Interaction failed');
      }

      const rawOutput = extractInteractionText(interaction);
      const parsed = parseBatchTranslationOutput(
        rawOutput,
        batch.map((e) => getEntryId(e))
      );

      return {
        ...parsed,
        contentFiltered: false,
        slotLabel: slot.label,
        modelUsed: activeModel,
        usage: interaction.usage ?? null,
      };
    } catch (err) {
      const action = keyPool.classifyAndHandleError(slot, err);
      const cleanErr = sanitizeErrorMessage(err?.message ?? err, [slot.key]);

      if (action === 'model_error') {
        if (opts.fallbackModel && activeModel !== opts.fallbackModel) {
          console.warn(
            `Model "${activeModel}" failed (${cleanErr}). Falling back to "${opts.fallbackModel}".`
          );
          activeModel = opts.fallbackModel;
          continue;
        }
        throw new Error(
          `Model error for "${activeModel}": ${cleanErr}. Try passing --model gemini-4-argon or --model gemini-3.8-flash (or --fallback-model).`
        );
      }

      if (action === 'rotate') {
        continue;
      }

      if (action === 'safety_setting_unsupported') {
        if (safetyMode === 'off') {
          console.warn(`Safety setting "off" rejected on "${activeModel}" — falling back to "block_none".`);
          safetyMode = 'block_none';
          opts.safetyMode = 'block_none';
          continue;
        }
        if (safetyMode === 'block_none') {
          console.warn(`Safety settings rejected on "${activeModel}" — omitting custom safety_settings.`);
          safetyMode = 'none';
          opts.safetyMode = 'none';
          continue;
        }
      }

      if (action === 'content_filter') {
        contentFilterAttempts++;
        if (contentFilterAttempts === 1) {
          console.warn(
            `[Polish] Batch (${batch.length} entries) hit prohibited/safety filter on ${slot.label} (${cleanErr}); retrying once before bisecting...`
          );
          continue;
        }
        return {
          contentFiltered: true,
          error: cleanErr,
          slotLabel: slot.label,
          modelUsed: activeModel,
          validById: new Map(),
          missedIds: [],
          invalidLines: [],
        };
      }

      transientAttempts++;
      if (transientAttempts > 6) {
        throw new Error(`Transient error after 6 retries on ${slot.label}: ${cleanErr}`);
      }
      const backoffs = [5000, 10000, 20000, 35000, 60000, 60000];
      const backoff = backoffs[Math.min(transientAttempts - 1, backoffs.length - 1)];
      console.warn(`Transient error on ${slot.label} (${cleanErr}); retrying in ${backoff / 1000}s...`);
      await sleep(backoff);
    }
  }

  return null;
}

async function runStage2Polish(coreEntries, targetEntries, store, keys, opts) {
  const batchSize = Math.max(1, opts.batchSize ?? 200);
  const totalBatches = Math.ceil(targetEntries.length / batchSize);
  console.log(
    `Stage 2 (--mode polish): ${targetEntries.length.toLocaleString()} entries | model=${opts.model}${
      opts.fallbackModel ? ` (fallback=${opts.fallbackModel})` : ''
    } | batchSize=${batchSize} (~${totalBatches} batches) | safety=off/block_none | keys=${keys.length} (${keys
      .map((k, i) => maskKey(k, i))
      .join(', ')})`
  );

  if (opts.dryRun) return;
  if (keys.length === 0) {
    throw new Error('No Gemini API keys found. Add GEMINI_API_KEYS=key1,key2,... to .env.local');
  }

  const keyPool = new GeminiKeyPool(keys, opts.rpm, opts.tpm);
  const requestBudget = { used: 0, max: opts.maxRequests };
  const byId = new Map(coreEntries.map((e) => [getEntryId(e), e]));

  let stopRequested = false;
  const onSigInt = () => {
    if (!stopRequested) {
      stopRequested = true;
      console.log('\nGraceful stop requested — checkpointing current results before exit...');
    }
  };
  process.on('SIGINT', onSigInt);

  let polishedCount = 0;
  let blockedCount = 0;

  try {
    for (let start = 0; start < targetEntries.length; start += batchSize) {
      if (stopRequested || requestBudget.used >= requestBudget.max) break;
      const batch = targetEntries.slice(start, start + batchSize);
      const batchNum = Math.floor(start / batchSize) + 1;

      const batchOutcome = await processPolishBatchWithBisection({
        batch,
        byId,
        batchLabel: `Batch ${batchNum}/${totalBatches}`,
        shouldStop: () => stopRequested || requestBudget.used >= requestBudget.max,
        translateBatchFn: (subBatch) =>
          callGeminiBatchWithRotation(keyPool, subBatch, opts, requestBudget),
        onBatchSuccess: (res) => {
          const nowIso = new Date().toISOString();
          let saved = 0;
          for (const [id, item] of res.validById.entries()) {
            const entry = byId.get(id);
            if (!entry) continue;
            store.entries[getEntryHeadword(entry)] = {
              id,
              enGloss: item.enGloss,
              enMeaning: item.enMeaning,
              stage: 'polish',
              verified: true,
              model: res.modelUsed,
              updatedAt: nowIso,
            };
            saved++;
          }
          return saved;
        },
        onEntryBlocked: (entry, res) => {
          const hw = getEntryHeadword(entry);
          const id = getEntryId(entry);
          const prev = store.entries[hw];
          store.entries[hw] = {
            ...(prev && typeof prev === 'object' ? prev : {}),
            id,
            ...(prev?.enGloss ? {} : { stage: 'blocked' }),
            skipReason: 'safety_blocked',
            safetyError: res.error,
            model: res.modelUsed,
            updatedAt: new Date().toISOString(),
          };
        },
        onCheckpoint: () => {
          saveCheckpointStore(store, coreEntries);
        },
      });

      if (batchOutcome.polishedCount === 0 && batchOutcome.blockedCount === 0 && requestBudget.used >= requestBudget.max) {
        break;
      }

      polishedCount += batchOutcome.polishedCount;
      blockedCount += batchOutcome.blockedCount;

      const stats = saveCheckpointStore(store, coreEntries);
      console.log(
        `[Polish] Batch ${batchNum}/${totalBatches} via ${batchOutcome.slotLabel || 'Gemini'} (${batchOutcome.modelUsed || opts.model}) | Saved: ${batchOutcome.polishedCount}/${batch.length} | Blocked: ${batchOutcome.blockedCount} | Still missed: ${batchOutcome.stillMissedCount} | Reqs used: ${requestBudget.used} | Total polished: ${stats.polish.toLocaleString()}`
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'ALL_KEYS_EXHAUSTED') {
      console.warn('All Gemini API keys hit daily/auth limits. Progress has been saved cleanly; resume later!');
    } else {
      throw err;
    }
  } finally {
    process.removeListener('SIGINT', onSigInt);
  }

  const finalStats = saveCheckpointStore(store, coreEntries);
  console.log('Stage 2 summary:', finalStats);
  console.log(
    `Polished ${polishedCount.toLocaleString()} entries${blockedCount > 0 ? ` (${blockedCount} isolated as safety_blocked)` : ''} in ${requestBudget.used} API requests.`
  );
}

// ============================================================================
// BENCHMARK MODE: 25 DIVERSE WORDS SIDE-BY-SIDE
// ============================================================================

function selectBenchmarkEntries(coreEntries, count = 25) {
  const byHw = new Map(coreEntries.map((e) => [getEntryHeadword(e), e]));
  const picked = [];
  const usedIds = new Set();

  const tryPick = (entry, category) => {
    if (!entry) return false;
    const id = getEntryId(entry);
    if (usedIds.has(id)) return false;
    usedIds.add(id);
    picked.push({ category, entry });
    return true;
  };

  const perBucket = Math.max(1, Math.floor(count / 5));

  // 1. Normal curated words
  for (const hw of ['ލޯބި', 'ކެއުން', 'ފެން', 'ރީތި', 'ބަސް']) {
    if (picked.filter((p) => p.category === 'normal').length >= perBucket) break;
    tryPick(byHw.get(hw), 'normal');
  }
  for (const e of coreEntries) {
    if (picked.filter((p) => p.category === 'normal').length >= perBucket) break;
    if (
      isEntryCuratedDaily(e) &&
      getEntryDialects(e).length === 0 &&
      getEntryRegisters(e).length === 0 &&
      !isPureSynonymStub(e, byHw)
    ) {
      tryPick(e, 'normal');
    }
  }

  // 2. Honorific
  tryPick(byHw.get('ހަށަންފުޅުބެންނެވުން'), 'honorific');
  for (const e of coreEntries) {
    if (picked.filter((p) => p.category === 'honorific').length >= perBucket) break;
    if (getEntryRegisters(e).includes('honorific') && !isPureSynonymStub(e, byHw)) {
      tryPick(e, 'honorific');
    }
  }

  // 3. Idiom / Proverb / Figurative
  for (const e of coreEntries) {
    if (picked.filter((p) => p.category === 'idiom').length >= perBucket) break;
    if (
      (getEntryRegisters(e).includes('proverb') || getEntryWordclasses(e).includes('ގބ')) &&
      !isPureSynonymStub(e, byHw)
    ) {
      tryPick(e, 'idiom');
    }
  }

  // 4. Regional Dialects (diverse islands/archaic)
  for (const dTag of ['addu', 'fuvahmulah', 'huvadhoo', 'laamu', 'archaic']) {
    if (picked.filter((p) => p.category === 'dialect').length >= perBucket) break;
    const match = coreEntries.find(
      (e) =>
        !usedIds.has(getEntryId(e)) &&
        getEntryDialects(e).includes(dTag) &&
        !isPureSynonymStub(e, byHw)
    );
    tryPick(match, 'dialect');
  }

  // 5. Rare / specialized low-reference entries
  for (const e of coreEntries) {
    if (picked.length >= count) break;
    if (
      !THAANA_LETTER_SET.has(getEntryHeadword(e)) &&
      getEntryReferencedInCount(e) === 0 &&
      !isEntryCuratedDaily(e) &&
      !isPureSynonymStub(e, byHw) &&
      getEntrySenses(e).length >= 2
    ) {
      tryPick(e, 'rare');
    }
  }

  return picked.slice(0, count);
}

async function runBenchmark(coreEntries, store, keys, opts) {
  const sample = selectBenchmarkEntries(coreEntries, opts.benchmark);
  const sampleEntries = sample.map((s) => s.entry);
  console.log(`\n=== Benchmark Mode (${sample.length} diverse Radheef entries) ===`);
  console.log(
    `Categories: normal=${sample.filter((s) => s.category === 'normal').length}, honorific=${sample.filter((s) => s.category === 'honorific').length}, idiom=${sample.filter((s) => s.category === 'idiom').length}, dialect=${sample.filter((s) => s.category === 'dialect').length}, rare=${sample.filter((s) => s.category === 'rare').length}`
  );

  let draftMap = new Map();
  let polishMap = new Map();
  let polishMeta = null;

  const wantDraft = !opts.mode || opts.mode === 'draft' || opts.mode === 'both';
  const wantPolish = !opts.mode || opts.mode === 'polish' || opts.mode === 'both';

  if (wantDraft) {
    console.log('\nRunning Stage 1 (free dv->en draft) on benchmark sample...');
    const budget = { used: 0, max: 20 };
    for (let i = 0; i < sampleEntries.length; i += 10) {
      const chunk = sampleEntries.slice(i, i + 10);
      const res = await translateDraftBatch(chunk, budget);
      for (const [k, v] of res) draftMap.set(k, v);
      await sleep(300);
    }
  }

  if (wantPolish) {
    if (keys.length === 0) {
      console.warn('\nSkipping Stage 2 polish in benchmark: no GEMINI_API_KEYS configured.');
    } else {
      console.log(
        `\nRunning Stage 2 (Gemini model=${opts.model}) on benchmark sample using ${keys.length} key(s) (${keys
          .map((k, i) => maskKey(k, i))
          .join(', ')})...`
      );
      const keyPool = new GeminiKeyPool(keys, opts.rpm, opts.tpm);
      const budget = { used: 0, max: Math.min(opts.maxRequests, 5) };
      try {
        const res = await callGeminiBatchWithRotation(keyPool, sampleEntries, opts, budget);
        if (res && res.validById && !res.contentFiltered) {
          polishMap = res.validById;
          polishMeta = res;
        }
      } catch (err) {
        console.error(
          `Stage 2 benchmark failed: ${sanitizeErrorMessage(err?.message ?? err, keys)}`
        );
      }
    }
  }

  console.log('\n--- Side-by-Side Comparison ---');
  for (let i = 0; i < sample.length; i++) {
    const { category, entry } = sample[i];
    const id = getEntryId(entry);
    const hw = getEntryHeadword(entry);
    const rom = getEntryRomanized(entry);
    const sensePreview = getEntrySenses(entry).slice(0, 2).join(' | ').slice(0, 140);
    const d = draftMap.get(id);
    const p = polishMap.get(id);

    console.log(`\n[${i + 1}/${sample.length}] (${category.toUpperCase()}) #${id} ${hw} /${rom}/`);
    console.log(`  Radheef : ${sensePreview}`);
    if (d) {
      console.log(`  Stage 1 : [${d.enGloss}] — ${d.enMeaning}`);
    }
    if (p) {
      console.log(`  Stage 2 : [${p.enGloss}] — ${p.enMeaning}`);
    }
  }

  if (polishMeta) {
    console.log(
      `\nStage 2 Benchmark Validation: ${polishMap.size}/${sample.length} IDs validated via ${polishMeta.slotLabel} (${polishMeta.modelUsed})`
    );
  }

  if (opts.save) {
    const nowIso = new Date().toISOString();
    for (const entry of sampleEntries) {
      const id = getEntryId(entry);
      const hw = getEntryHeadword(entry);
      const p = polishMap.get(id);
      const d = draftMap.get(id);
      if (p) {
        store.entries[hw] = {
          id,
          enGloss: p.enGloss,
          enMeaning: p.enMeaning,
          stage: 'polish',
          model: polishMeta?.modelUsed || opts.model,
          updatedAt: nowIso,
        };
      } else if (d && store.entries[hw]?.stage !== 'polish') {
        store.entries[hw] = {
          id,
          enGloss: d.enGloss,
          enMeaning: d.enMeaning,
          stage: 'draft',
          updatedAt: nowIso,
        };
      }
    }
    const stats = saveCheckpointStore(store, coreEntries);
    console.log('Saved benchmark entries to data/en-translations.json:', stats);
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  if (!fs.existsSync(CORE_PATH)) {
    throw new Error('Missing public/data/dictionary-core.json. Run "npm run build:data" first.');
  }

  const localEnv = loadLocalEnv();
  if (!opts.model) {
    opts.model = process.env.GEMINI_MODEL || localEnv.GEMINI_MODEL || DEFAULT_MODEL;
  }

  const keys = resolveApiKeys(localEnv);
  const coreEntries = JSON.parse(fs.readFileSync(CORE_PATH, 'utf8'));
  const store = loadCheckpointStore();

  if (opts.benchmark > 0) {
    await runBenchmark(coreEntries, store, keys, opts);
    return;
  }

  if (opts.mode !== 'draft' && opts.mode !== 'polish') {
    printHelp();
    throw new Error('Specify --mode draft, --mode polish, or --benchmark 25');
  }

  const plan = buildTranslationPlan(coreEntries);
  const { byHeadword: existingByHw, byId: existingById } = indexRawTranslations(store);

  const pending = plan.primary.filter((e) =>
    isEntryPendingForMode(e, store.entries, existingByHw, existingById, opts.mode)
  );

  const targetEntries = Number.isFinite(opts.limit) ? pending.slice(0, opts.limit) : pending;

  console.log(
    `Corpus breakdown: total=${coreEntries.length.toLocaleString()} | letters=${plan.letterCount} | pureSynStubs=${plan.stubCount.toLocaleString()} (cycleAnchors=${plan.cycleAnchorCount}) | primary=${plan.primary.length.toLocaleString()} | pending(${opts.mode})=${pending.length.toLocaleString()}`
  );

  if (targetEntries.length === 0) {
    const stats = saveCheckpointStore(store, coreEntries);
    console.log('Nothing pending! Checkpoint synced:', stats);
    return;
  }

  if (opts.mode === 'draft') {
    await runStage1Draft(coreEntries, targetEntries, store, opts);
  } else {
    await runStage2Polish(coreEntries, targetEntries, store, keys, opts);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
