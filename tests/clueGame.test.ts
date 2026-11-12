import { describe, expect, it } from 'vitest';
import {
  buildClueShareText,
  pickClueDistractorIds,
  pickDailyClueId,
  redactHeadwordInClue,
} from '../src/lib/clueGame.ts';

describe('Maana Kulhi Clue Challenge', () => {
  it('redacts exact headword inside clues', () => {
    expect(redactHeadwordInClue('މިއީ ހަހަރު ގެ މާނައެވެ.', 'ހަހަރު')).toBe(
      'މިއީ •••• ގެ މާނައެވެ.'
    );
  });

  it('picks deterministic daily clue ID and non-colliding distractors', () => {
    const pool = [101, 102, 103, 104, 105, 106, 107];
    const target = pickDailyClueId(pool, '2026-11-13');
    expect(pool).toContain(target);

    const distractors = pickClueDistractorIds(pool, target, '2026-11-13', 3);
    expect(distractors.length).toBe(3);
    expect(distractors).not.toContain(target);
    expect(new Set(distractors).size).toBe(3);
  });

  it('builds clue game emoji share card', () => {
    const txt = buildClueShareText('2026-11-13', 2, 5, true, false);
    expect(txt).toContain('2/5');
    expect(txt).toContain('🟥🟩⬜⬜⬜');
  });
});
