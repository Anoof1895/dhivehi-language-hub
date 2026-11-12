import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import { segmentGraphemes } from '../src/lib/thaanaCore.js';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');

const coreRaw = fs.readFileSync(path.join(DATA_DIR, 'dictionary-core.json'));
const linksRaw = fs.readFileSync(path.join(DATA_DIR, 'dictionary-links.json'));
const poolsRaw = fs.readFileSync(path.join(DATA_DIR, 'game-pools.json'));
const report = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'pipeline-report.json'), 'utf8'));

const core = JSON.parse(coreRaw.toString('utf8'));
const links = JSON.parse(linksRaw.toString('utf8'));
const pools = JSON.parse(poolsRaw.toString('utf8'));

// 1. Core counts
assert.equal(report.rawEntryCount, 38778, 'rawEntryCount must be 38778');
assert.equal(report.canonicalEntryCount, 38719, 'canonicalEntryCount must be 38719');
assert.equal(report.mergedDuplicateGroups, 59, 'mergedDuplicateGroups must be 59');
assert.equal(core.length, 38719, 'dictionary-core length must match 38719');
assert.equal(links.length, 38719, 'dictionary-links length must match 38719');
assert.equal(report.droppedEmptySenses, 1, 'exactly 1 empty <li> must be dropped');
assert.equal(report.repairedWordclassParens, 118, 'exactly 118 paren wordclasses repaired');
assert.ok(report.inferredWordclasses.abstract_kan >= 100, 'abstract_kan must be >= 100');
assert.ok(report.inferredWordclasses.verbal_masdhar >= 1700, 'verbal_masdhar must be >= 1700');

// 2. Entry-level integrity
const byHw = new Map();
for (let i = 0; i < core.length; i++) {
  const e = core[i];
  assert.equal(e.i, i, `Entry index mismatch at ${i}`);
  assert.ok(e.h.length > 0, `Empty headword at ${i}`);
  assert.ok(e.s.length > 0, `Empty senses array at ${i} (${e.h})`);
  for (const s of e.s) {
    assert.ok(s.trim().length > 0, `Blank sense inside ${e.h}`);
    assert.ok(!s.startsWith(')'), `Unrepaired leading ')' in ${e.h}: ${s}`);
  }
  for (const wc of e.wc || []) {
    assert.ok(!wc.startsWith('('), `Unrepaired leading '(' wordclass in ${e.h}: ${wc}`);
  }
  byHw.set(e.h, e);
}

// 3. Specific edge cases verified from radheef.json
const addiha = byHw.get('އައްޑިހަ');
assert.ok(addiha, 'އައްޑިހަ must exist');
assert.equal(addiha.si.length, 2, 'އައްޑިހަ duplicate must be merged');
assert.ok(!addiha.s.some((s) => s.trim() === ''), 'އައްޑިހަ empty sense must be removed');

const naadabarovala = byHw.get('ނާޑަބަރޮވަލަ');
assert.ok(naadabarovala, 'ނާޑަބަރޮވަލަ must exist');
assert.ok(naadabarovala.d?.includes('addu'), 'ނާޑަބަރޮވަލަ must be tagged addu dialect');
assert.ok(!naadabarovala.s.includes(')'), 'ނާޑަބަރޮވަލަ stray ")" sense must be dropped');

const hashanhulhu = byHw.get('ހަށަންފުޅުބެންނެވުން');
assert.ok(hashanhulhu?.rg?.includes('honorific'), 'Honorific tag must be extracted');
assert.ok((hashanhulhu?.eb?.length ?? 0) > 0, 'Explicit base derivation must link to ހަށަންބަނުން');

const haharu = byHw.get('ހަހަރު');
const haharuveti = byHw.get('ހަހަރުވެތި');
assert.ok(haharu && haharuveti, 'ހަހަރު and ހަހަރުވެތި must exist');
assert.ok(haharuveti.f?.includes(haharu.i), 'ހަހަރުވެތި family must include ހަހަރު');

const vakaru = byHw.get('ވަކަރުޖެހުން');
assert.deepEqual(vakaru?.wc, ['މ'], 'ެމ typo must normalize to މ');

const boaharu = byHw.get('ބޯހަރުކަން');
assert.deepEqual(boaharu?.wc, ['ނއނ'], 'ނއށ typo must normalize to ނއނ');

// 4. Game pools integrity
assert.ok(pools.wordle4ValidIds.length >= 8500, 'wordle4ValidIds >= 8500');
assert.ok(pools.wordle4AnswerIds.length >= 5000, 'wordle4AnswerIds >= 5000');
assert.ok(pools.clueChallengeIds.length >= 1400, 'clueChallengeIds >= 1400');

for (const id of pools.wordle4ValidIds) {
  const e = core[id];
  assert.ok(e, `Invalid wordle4 ID ${id}`);
  assert.equal(segmentGraphemes(e.h).length, 4, `Non-4-grapheme wordle4 entry: ${e.h}`);
}

const totalRawBytes = coreRaw.length + linksRaw.length + poolsRaw.length;
const totalGzipBytes =
  zlib.gzipSync(coreRaw).length +
  zlib.gzipSync(linksRaw).length +
  zlib.gzipSync(poolsRaw).length;

console.log('ALL PIPELINE ASSERTIONS PASSED!');
console.log({
  coreBytes: coreRaw.length,
  linksBytes: linksRaw.length,
  poolsBytes: poolsRaw.length,
  totalRawMB: (totalRawBytes / (1024 * 1024)).toFixed(2),
  totalGzipMB: (totalGzipBytes / (1024 * 1024)).toFixed(2),
  haharuFamily: haharu.f?.map((id) => core[id].h),
  haharuvetiFamily: haharuveti.f?.map((id) => core[id].h),
  hashanhulhuBase: hashanhulhu.eb?.map((id) => core[id].h),
});
