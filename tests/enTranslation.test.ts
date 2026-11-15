import { describe, expect, it } from 'vitest';
import { THAANA_BASE_CONSONANTS } from '../src/lib/thaanaCore.js';
import {
  POLISH_SAFETY_SETTINGS_OFF,
  THAANA_LETTER_METADATA,
  applyLettersAndSynonymPropagation,
  findUnresolvedCycleAnchors,
  indexRawTranslations,
  isContentFilterError,
  isEntryPendingForMode,
  isPureSynonymStub,
  parseBatchTranslationOutput,
  processPolishBatchWithBisection,
} from '../scripts/lib/en-translation-utils.mjs';

describe('en-translation-utils', () => {
  it('defines auto-label metadata for all 39 base Thaana consonants', () => {
    expect(Object.keys(THAANA_LETTER_METADATA)).toHaveLength(39);
    for (const ch of THAANA_BASE_CONSONANTS) {
      const meta = THAANA_LETTER_METADATA[ch];
      expect(meta).toBeDefined();
      expect(meta.enGloss).toContain('Thaana letter');
      expect(meta.enMeaning).toContain('Thaana letter');
    }
  });

  it('detects pure synonym stubs and propagates translations across multi-hop chains', () => {
    const entries = [
      {
        id: 1,
        headword: 'ހ',
        senses: ['ތާނަ އަކުރުގެ ފުރަތަމަ އަކުރު.'],
        synonymIds: [],
        dialects: [],
      },
      {
        id: 2,
        headword: 'ލޯބި',
        senses: ['އޯގާތެރިކަމާއި ކުލުނުވެރިކަން.'],
        synonymIds: [],
        dialects: [],
      },
      {
        id: 3,
        headword: 'ހަހަރު',
        senses: ['ލޯބި'],
        synonymIds: [2],
        dialects: [],
      },
      {
        id: 4,
        headword: 'އިޝްޤު',
        senses: ['ހަހަރު'],
        synonymIds: [3],
        dialects: [],
      },
      {
        id: 5,
        headword: 'ދެކުނުބަސް',
        senses: ['ނަލަ'],
        synonymIds: [6],
        dialects: ['addu'],
      },
      {
        id: 6,
        headword: 'ނަލަ',
        senses: ['ދެކުނުބަސް'],
        synonymIds: [5],
        dialects: [],
      },
    ];

    const byHeadword = new Map(entries.map((e) => [e.headword, e]));
    expect(isPureSynonymStub(entries[2], byHeadword)).toBe(true);
    expect(isPureSynonymStub(entries[1], byHeadword)).toBe(false);

    const anchors = findUnresolvedCycleAnchors(entries, byHeadword);
    expect(anchors.has(5)).toBe(true);
    expect(anchors.has(6)).toBe(false);

    const { resolvedById, stats } = applyLettersAndSynonymPropagation(entries, {
      entries: {
        '2': {
          id: 2,
          headword: 'ލޯބި',
          enGloss: 'love, affection',
          enMeaning: 'Warm affection and fondness.',
          stage: 'polish',
        },
      },
    });

    expect(resolvedById.get(1)?.stage).toBe('auto-letter');
    expect(resolvedById.get(2)?.enGloss).toBe('love, affection');
    expect(resolvedById.get(3)?.stage).toBe('synonym');
    expect(resolvedById.get(3)?.enGloss).toBe('love, affection');
    expect(resolvedById.get(3)?.derivedFrom).toBe('ލޯބި');
    expect(resolvedById.get(4)?.stage).toBe('synonym');
    expect(resolvedById.get(4)?.enGloss).toBe('love, affection');
    expect(resolvedById.get(4)?.derivedFrom).toBe('ހަހަރު');
    expect(resolvedById.get(4)?.derivedStage).toBe('polish');
    expect(stats.autoLetter).toBe(1);
    expect(stats.polish).toBe(1);
    expect(stats.synonymPropagated).toBe(2);
    expect(stats.translatedCount).toBe(4);
  });

  it('validates IDs and detects missed or malformed lines in batch model output', () => {
    const raw = [
      '```',
      '101 | love, affection | Deep fondness and care.',
      '{"id": 102, "enGloss": "house, home", "enMeaning": "A dwelling or building for habitation."}',
      '999 | unknown, bogus | Hallucinated ID not in request.',
      'bad-line-without-delimiters',
      '```',
    ].join('\n');

    const { validById, missedIds, invalidLines } = parseBatchTranslationOutput(raw, [
      101,
      102,
      103,
    ]);

    expect(validById.get(101)?.enGloss).toBe('love, affection');
    expect(validById.get(102)?.enMeaning).toBe('A dwelling or building for habitation.');
    expect(validById.has(999)).toBe(false);
    expect(missedIds).toEqual([103]);
    expect(invalidLines.length).toBe(2);
  });

  it('classifies prohibited-content errors distinctly from safety_setting schema errors', () => {
    expect(POLISH_SAFETY_SETTINGS_OFF).toHaveLength(5);
    expect(isContentFilterError('400 Prohibited Content', 400)).toBe(true);
    expect(isContentFilterError('PROHIBITED_CONTENT blocked by policy', 400)).toBe(true);
    expect(isContentFilterError('Invalid value in safety_settings threshold', 400)).toBe(false);
    expect(isContentFilterError('429 RESOURCE_EXHAUSTED quota exceeded', 429)).toBe(false);
  });

  it('recursively bisects content-filtered batches to isolate only the flagged word and skips blocked records', async () => {
    const batch = [
      { id: 10, headword: 'ހ', senses: ['x'] },
      { id: 11, headword: 'ފެން', senses: ['water'] },
      { id: 12, headword: 'ކެއުން', senses: ['eat'] },
      { id: 13, headword: 'މައްސަލަ', senses: ['poison'] },
      { id: 14, headword: 'ރީތި', senses: ['pretty'] },
      { id: 15, headword: 'ބަސް', senses: ['word'] },
    ];
    const byId = new Map(batch.map((e) => [e.id, e]));
    const storeEntries = {};

    const outcome = await processPolishBatchWithBisection({
      batch,
      byId,
      log: { warn: () => {} },
      translateBatchFn: async (subBatch) => {
        if (subBatch.some((e) => e.id === 13)) {
          return {
            contentFiltered: true,
            error: '400 prohibited content',
            slotLabel: 'Key #1',
            modelUsed: 'gemini-4-hydrogen',
            validById: new Map(),
            missedIds: [],
          };
        }
        const validById = new Map(
          subBatch.map((e) => [
            e.id,
            { id: e.id, enGloss: `gloss-${e.id}`, enMeaning: `Meaning for ${e.id}.` },
          ])
        );
        return {
          contentFiltered: false,
          validById,
          missedIds: [],
          slotLabel: 'Key #1',
          modelUsed: 'gemini-4-hydrogen',
        };
      },
      onBatchSuccess: (res) => {
        for (const [id, item] of res.validById.entries()) {
          const hw = byId.get(id).headword;
          storeEntries[hw] = {
            id,
            enGloss: item.enGloss,
            enMeaning: item.enMeaning,
            stage: 'polish',
            verified: true,
          };
        }
        return res.validById.size;
      },
      onEntryBlocked: (entry) => {
        storeEntries[entry.headword] = {
          id: entry.id,
          stage: 'blocked',
          skipReason: 'safety_blocked',
        };
      },
    });

    expect(outcome.polishedCount).toBe(5);
    expect(outcome.blockedCount).toBe(1);
    expect(storeEntries['މައްސަލަ'].skipReason).toBe('safety_blocked');
    expect(storeEntries['ރީތި'].verified).toBe(true);
    expect(storeEntries['ފެން'].verified).toBe(true);

    const { byHeadword, byId: indexedById } = indexRawTranslations(storeEntries);
    expect(
      isEntryPendingForMode(batch[3], storeEntries, byHeadword, indexedById, 'polish')
    ).toBe(false);
    expect(
      isEntryPendingForMode(batch[4], storeEntries, byHeadword, indexedById, 'polish')
    ).toBe(false);
  });
});
