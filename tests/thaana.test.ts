import { describe, expect, it } from 'vitest';
import {
  latinToThaanaPhonetic,
  normalizeLatinQuery,
  romanizeThaana,
  segmentGraphemes,
  splitGrapheme,
} from '../src/lib/thaana.ts';

describe('Thaana linguistic utilities', () => {
  it('segments Thaana graphemes into Akuru+Fili syllables', () => {
    expect(segmentGraphemes('ދިވެހި')).toEqual(['ދި', 'ވެ', 'ހި']);
    expect(segmentGraphemes('ހަހަރުވެތި')).toEqual(['ހަ', 'ހަ', 'ރު', 'ވެ', 'ތި']);
    expect(segmentGraphemes('ލޯބި')).toEqual(['ލޯ', 'ބި']);
  });

  it('splits grapheme into base consonant and fili', () => {
    expect(splitGrapheme('ލޯ')).toEqual({ base: 'ލ', fili: 'ޯ' });
    expect(splitGrapheme('ން')).toEqual({ base: 'ނ', fili: 'ް' });
    expect(splitGrapheme('ހ')).toEqual({ base: 'ހ', fili: '' });
  });

  it('romanizes Thaana and normalizes Latin search queries consistently', () => {
    expect(romanizeThaana('ލޯބި')).toBe('loabi');
    expect(romanizeThaana('ދިވެހި')).toBe('dhivehi');
    expect(normalizeLatinQuery('loabi')).toBe(normalizeLatinQuery('lobi'));
    expect(normalizeLatinQuery('dhivehi')).toBe(normalizeLatinQuery('divehi'));
  });

  it('converts phonetic Latin text to Thaana IME', () => {
    expect(latinToThaanaPhonetic('dhivehi')).toBe('ދިވެހި');
    expect(latinToThaanaPhonetic('loabi')).toBe('ލޯބި');
    expect(latinToThaanaPhonetic('haharu ')).toBe('ހަހަރު ');
    expect(latinToThaanaPhonetic('kan ')).toBe('ކަން ');
  });
});
