import { describe, expect, it } from 'vitest';
import {
  EMPTY_WORDLE_INPUT,
  THAANA_QWERTY_CONSONANTS,
  THAANA_QWERTY_FILI,
  applyWordleBackspace,
  isDirectThaanaInputChar,
  mapQwertyKeyToThaana,
  processWordleKeyDown,
  type WordleInputState,
} from '../src/lib/wordleKeyboard.ts';

function typeSequence(
  keys: string[],
  mode: 'qwerty' | 'phonetic',
  initial: WordleInputState = EMPTY_WORDLE_INPUT
) {
  let state = initial;
  const flashes: Array<string | null> = [];
  for (const key of keys) {
    if (key === 'Backspace') {
      state = applyWordleBackspace(state);
      flashes.push('Backspace');
      continue;
    }
    const res = processWordleKeyDown(state, mode, key);
    state = res.next;
    flashes.push(res.flashKey);
  }
  return { state, flashes };
}

describe('Thaana Wordle keyboard mapping & input engine', () => {
  it('maps all 24 primary consonants, 11 fili, and dotted shift keys in QWERTY mode', () => {
    expect(THAANA_QWERTY_CONSONANTS.h).toBe('ހ');
    expect(THAANA_QWERTY_CONSONANTS.S).toBe('ށ');
    expect(THAANA_QWERTY_CONSONANTS.L).toBe('ޅ');
    expect(THAANA_QWERTY_CONSONANTS.N).toBe('ޏ');
    expect(THAANA_QWERTY_CONSONANTS.D).toBe('ޑ');
    expect(THAANA_QWERTY_CONSONANTS.T).toBe('ޓ');
    expect(THAANA_QWERTY_CONSONANTS.c).toBe('ޗ');

    // Extended dotted shift keys
    expect(THAANA_QWERTY_CONSONANTS.H).toBe('ޙ');
    expect(THAANA_QWERTY_CONSONANTS.C).toBe('ޝ');
    expect(THAANA_QWERTY_CONSONANTS.Q).toBe('ޤ');
    expect(THAANA_QWERTY_CONSONANTS.W).toBe('ޢ');
    expect(THAANA_QWERTY_CONSONANTS.K).toBe('ޚ');
    expect(THAANA_QWERTY_CONSONANTS.G).toBe('ޣ');
    expect(THAANA_QWERTY_CONSONANTS.B).toBe('ޞ');
    expect(THAANA_QWERTY_CONSONANTS.M).toBe('ޟ');
    expect(THAANA_QWERTY_CONSONANTS.Y).toBe('ޠ');
    expect(THAANA_QWERTY_CONSONANTS.Z).toBe('ޡ');
    expect(THAANA_QWERTY_CONSONANTS.X).toBe('ޘ');
    expect(THAANA_QWERTY_CONSONANTS.J).toBe('ޛ');
    expect(THAANA_QWERTY_CONSONANTS.R).toBe('ޜ');
    expect(THAANA_QWERTY_CONSONANTS.V).toBe('ޥ');

    expect(THAANA_QWERTY_FILI.a).toBe('ަ');
    expect(THAANA_QWERTY_FILI.A).toBe('ާ');
    expect(THAANA_QWERTY_FILI.q).toBe('ް');
  });

  it('builds 4-syllable Thaana words via QWERTY keys and deletes fili/tile cleanly on Backspace', () => {
    // ހަށަނަރަ -> h a S a n a r a
    const { state, flashes } = typeSequence(
      ['h', 'a', 'S', 'a', 'n', 'a', 'r', 'a'],
      'qwerty'
    );
    expect(state.tiles).toEqual(['ހަ', 'ށަ', 'ނަ', 'ރަ']);
    expect(state.pendingIdx).toBeNull();
    expect(flashes).toEqual(['ހ', 'ަ', 'ށ', 'ަ', 'ނ', 'ަ', 'ރ', 'ަ']);

    // Backspace deletes last fili first, then consonant
    const afterBs1 = applyWordleBackspace(state);
    expect(afterBs1.tiles).toEqual(['ހަ', 'ށަ', 'ނަ', 'ރ']);
    expect(afterBs1.pendingIdx).toBe(3);

    const afterBs2 = applyWordleBackspace(afterBs1);
    expect(afterBs2.tiles).toEqual(['ހަ', 'ށަ', 'ނަ']);
    expect(afterBs2.pendingIdx).toBeNull();
  });

  it('accepts direct Unicode Thaana input across U+0780..U+07B1', () => {
    expect(isDirectThaanaInputChar('ހ')).toBe(true);
    expect(isDirectThaanaInputChar('ޱ')).toBe(true);
    expect(isDirectThaanaInputChar('ް')).toBe(true);
    expect(isDirectThaanaInputChar('a')).toBe(false);

    expect(mapQwertyKeyToThaana('ޱ')).toEqual({ kind: 'consonant', char: 'ޱ' });
    expect(mapQwertyKeyToThaana('ޯ')).toEqual({ kind: 'fili', char: 'ޯ' });

    const { state } = typeSequence(['ދ', 'ި', 'ވ', 'ެ', 'ހ', 'ި'], 'qwerty');
    expect(state.tiles).toEqual(['ދި', 'ވެ', 'ހި']);
  });

  it('supports live Phonetic typing with digraphs, long vowels, and Space for sukun', () => {
    // hashabas + Space -> ހަށަބަސް
    const { state, flashes } = typeSequence(
      ['h', 'a', 's', 'h', 'a', 'b', 'a', 's', ' '],
      'phonetic'
    );
    expect(state.tiles).toEqual(['ހަ', 'ށަ', 'ބަ', 'ސް']);
    expect(state.pendingIdx).toBeNull();
    expect(flashes[flashes.length - 1]).toBe('ް');

    // Long vowel digraphs: loabi -> ލޯބި
    const { state: loabi } = typeSequence(['l', 'o', 'a', 'b', 'i'], 'phonetic');
    expect(loabi.tiles).toEqual(['ލޯ', 'ބި']);

    // Backspace in phonetic mode deletes last fili then consonant cleanly, and allows continuing
    const afterBs = applyWordleBackspace(loabi);
    expect(afterBs.tiles).toEqual(['ލޯ', 'ބ']);
    const { state: loabaa } = typeSequence(['a', 'a'], 'phonetic', afterBs);
    expect(loabaa.tiles).toEqual(['ލޯ', 'ބާ']);
  });

  it('caps input at 4 syllables and ignores non-Thaana ASCII keys like x in Phonetic mode', () => {
    const { state } = typeSequence(
      ['h', 'a', 'S', 'a', 'n', 'a', 'r', 'a', 'k', 'a'],
      'qwerty'
    );
    expect(state.tiles).toEqual(['ހަ', 'ށަ', 'ނަ', 'ރަ']);

    const invalidPhonetic = processWordleKeyDown(EMPTY_WORDLE_INPUT, 'phonetic', 'x');
    expect(invalidPhonetic.handled).toBe(false);
    expect(invalidPhonetic.next.tiles).toEqual([]);
  });
});
