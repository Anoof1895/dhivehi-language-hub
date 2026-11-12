import { describe, expect, it } from 'vitest';
import {
  DIALECT_LABELS,
  WORDCLASS_LABELS,
  formatBiLabel,
  formatCount,
  getUiDirection,
  nextUiLanguage,
  t,
} from '../src/lib/labels.ts';
import { formatInterval } from '../src/lib/date.ts';

describe('UI language modes, directionality, and pluralization', () => {
  it('returns clean English-only labels in en mode without Dhivehi text', () => {
    expect(formatBiLabel(WORDCLASS_LABELS['ނ'], 'en')).toBe('Noun');
    expect(formatBiLabel(WORDCLASS_LABELS['މ'], 'en')).toBe('Verb');
    expect(formatBiLabel(DIALECT_LABELS.addu, 'en')).toBe('Addu Dialect');
    expect(t('މިއަދުގެ ކުރިއެރުން', "Today's Progress", 'en')).toBe("Today's Progress");
  });

  it('returns Dhivehi-only in dv mode and bilingual in dv-en mode', () => {
    expect(formatBiLabel(WORDCLASS_LABELS['ނ'], 'dv')).toBe('ނަން');
    expect(formatBiLabel(WORDCLASS_LABELS['ނ'], 'dv-en')).toBe('ނަން · \u2066Noun\u2069');
  });

  it('uses ltr direction for en mode and rtl for dv and dv-en', () => {
    expect(getUiDirection('en')).toBe('ltr');
    expect(getUiDirection('dv')).toBe('rtl');
    expect(getUiDirection('dv-en')).toBe('rtl');
  });

  it('cycles through all three UI language modes', () => {
    expect(nextUiLanguage('dv')).toBe('en');
    expect(nextUiLanguage('en')).toBe('dv-en');
    expect(nextUiLanguage('dv-en')).toBe('dv');
  });

  it('pluralizes counts properly (1 day vs 0/2 days)', () => {
    expect(formatCount(0, 'day')).toBe('0 days');
    expect(formatCount(1, 'day')).toBe('1 day');
    expect(formatCount(5, 'day')).toBe('5 days');
    expect(formatCount(1, 'result')).toBe('1 result');
    expect(formatCount(3, 'result')).toBe('3 results');
  });

  it('formats FSRS intervals in en, dv, and dv-en modes', () => {
    const now = new Date('2026-11-13T00:00:00.000Z');
    const oneDay = new Date('2026-11-14T00:00:00.000Z');
    const fourDays = new Date('2026-11-17T00:00:00.000Z');
    expect(formatInterval(now, oneDay, 'en')).toBe('1 day');
    expect(formatInterval(now, fourDays, 'en')).toBe('4 days');
    expect(formatInterval(now, oneDay, 'dv')).toBe('1 ދުވަސް');
    expect(formatInterval(now, oneDay, 'dv-en')).toBe('1 ދުވަސް \u2066(1d)\u2069');
  });
});
