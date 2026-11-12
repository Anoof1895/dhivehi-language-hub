import { describe, expect, it } from 'vitest';
import {
  buildWordleShareText,
  evaluateThaanaWordleGuess,
  getConsonantKeyStates,
  pickDailyWordleId,
} from '../src/lib/wordle.ts';

describe('4-grapheme Thaana Wordle engine', () => {
  it('marks all exact when guess matches target', () => {
    expect(evaluateThaanaWordleGuess('ހަހަރުވެތި'.slice(0, 8), 'ހަހަރުވެތި'.slice(0, 8))).toEqual([
      'exact',
      'exact',
      'exact',
      'exact',
    ]);
  });

  it('distinguishes exact, present, consonant-different-fili, and absent tiles', () => {
    // target: ކަ ލަ ފު ށި  (4 graphemes)
    // guess:  ކަ ފި ލޫ ޓު
    // slot 0: ކަ === ކަ -> exact
    // slot 1: ފި vs ލަ -> consonant 'ފ' exists at slot 2 ('ފު') -> consonant
    // slot 2: ލޫ vs ފު -> consonant 'ލ' exists at slot 1 ('ލަ') -> consonant
    // slot 3: ޓު -> absent
    const res = evaluateThaanaWordleGuess('ކަފިލޫޓު', 'ކަލަފުށި');
    expect(res).toEqual(['exact', 'consonant', 'consonant', 'absent']);

    // Check present (exact syllable wrong position)
    const resPresent = evaluateThaanaWordleGuess('ފުކަޓުޓު', 'ކަލަފުށި');
    expect(resPresent).toEqual(['present', 'present', 'absent', 'absent']);
  });

  it('aggregates highest-priority consonant state for keyboard', () => {
    const guesses = ['ކަފިލޫޓު', 'ކަލަފުށި'];
    const evals = guesses.map((g) => evaluateThaanaWordleGuess(g, 'ކަލަފުށި'));
    const keys = getConsonantKeyStates(guesses, evals);
    expect(keys['ކ']).toBe('exact');
    expect(keys['ޓ']).toBe('absent');
  });

  it('picks deterministic daily wordle ID and formats share grid', () => {
    const pool = [10, 20, 30, 40, 50];
    expect(pickDailyWordleId(pool, '2026-11-13')).toBe(
      pickDailyWordleId(pool, '2026-11-13')
    );
    const share = buildWordleShareText(
      '2026-11-13',
      [['exact', 'present', 'consonant', 'absent']],
      false,
      false
    );
    expect(share).toContain('🟩🟨🟦⬛');
  });
});
