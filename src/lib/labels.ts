import type {
  DeckKey,
  DialectTag,
  InferredWordclass,
  RegisterTag,
  UiLanguage,
} from '../types/dictionary.ts';

export interface BiLabel {
  dv: string;
  en: string;
}

export const WORDCLASS_LABELS: Record<string, BiLabel> = {
  'ނ': { dv: 'ނަން', en: 'Noun' },
  'މ': { dv: 'މަސްދަރު', en: 'Verb' },
  'ނއ': { dv: 'ނަންއިތުރު', en: 'Adjective' },
  'ނއނ': { dv: 'ނަންއިތުރުގެ ނަން', en: 'Abstract Noun' },
  'އ': { dv: 'އަކުރު', en: 'Particle' },
  'ކއ': { dv: 'ކަންއިތުރު', en: 'Adverb' },
  'ގބ': { dv: 'ގުޅިބަސް', en: 'Idiom / Phrase' },
  'އކ': { dv: 'އަޑުކިޔާބަސް', en: 'Interjection' },
  'އތ': { dv: 'އިތުރުބަސް', en: 'Intensifier' },
  'ކ': { dv: 'ކަން', en: 'Inflected Verb' },
  'އމ': { dv: 'އަމުރު', en: 'Imperative' },
  'މކ': { dv: 'މަސްދަރު (ޚާއްޞަ)', en: 'Specialized Verb' },
  unclassified: { dv: 'ބައި ކަނޑައެޅިފައެއް ނެތް', en: 'Unclassified' },
};

export const INFERRED_WORDCLASS_LABELS: Record<Exclude<InferredWordclass, null>, BiLabel> = {
  phrase_proverb: { dv: 'ޢިބާރާތް / މިސާލުބަސް (ލަފާކުރެވޭ)', en: 'Phrase / Proverb (Inferred)' },
  verbal_masdhar: { dv: 'މަސްދަރު (ލަފާކުރެވޭ)', en: 'Verb -n (Inferred)' },
  abstract_kan: { dv: 'ނަންއިތުރުގެ ނަން (ލަފާކުރެވޭ)', en: 'Abstract -kan (Inferred)' },
};

export const DIALECT_LABELS: Record<DialectTag, BiLabel> = {
  addu: { dv: 'އައްޑޫ ބަހުރުވަ (ސ.)', en: 'Addu Dialect' },
  fuvahmulah: { dv: 'ފުވައްމުލަކު ބަހުރުވަ (ޏ.)', en: 'Fuvahmulah Dialect' },
  huvadhoo: { dv: 'ހުވަދޫ ބަހުރުވަ (ގ.)', en: 'Huvadhoo Dialect' },
  laamu: { dv: 'ލާމު ބަހުރުވަ (ލ.)', en: 'Laamu Dialect' },
  lhaviyani: { dv: 'ޅަވިޔަނި ބަހުރުވަ (ޅ.)', en: 'Lhaviyani Dialect' },
  haa: { dv: 'ބޮޑުތިލަދުންމަތީ ބަހުރުވަ (ހ.)', en: 'Northern Dialect' },
  archaic: { dv: 'ބޯދާ ދިވެހި (ބދ.)', en: 'Archaic / Old Dhivehi' },
};

export const REGISTER_LABELS: Record<RegisterTag, BiLabel> = {
  honorific: { dv: 'މާތްގޮތް', en: 'Honorific' },
  figurative: { dv: 'މަޖާޒު', en: 'Figurative' },
  proverb: { dv: 'މިސާލުބަސް', en: 'Proverb / Idiom' },
};

export const DECK_LABELS: Record<DeckKey, BiLabel> = {
  curated: { dv: 'މައިގަނޑު ރަދީފު', en: 'Core Curated (28.3k)' },
  honorific: { dv: 'މާތްބަސް', en: 'Honorifics' },
  dialect: { dv: 'ބަހުރުވަތައް', en: 'Regional Dialects' },
  figurative: { dv: 'މަޖާޒީ މާނަ', en: 'Figurative' },
  proverb: { dv: 'މިސާލުބަސް', en: 'Proverbs & Idioms' },
};

export const UI_LANGUAGE_OPTIONS: Array<{
  key: UiLanguage;
  label: string;
  shortLabel: string;
  settingsLabel: string;
}> = [
  { key: 'en', label: 'EN', shortLabel: 'EN', settingsLabel: 'English (EN)' },
  { key: 'dv', label: 'ދިވެހި', shortLabel: 'ދިވެހި', settingsLabel: 'ދިވެހި' },
];

export function nextUiLanguage(lang: UiLanguage): UiLanguage {
  return lang === 'en' ? 'dv' : 'en';
}

export function getUiDirection(lang: UiLanguage): 'ltr' | 'rtl' {
  return lang === 'en' ? 'ltr' : 'rtl';
}

export function formatCount(
  count: number,
  singular: string,
  plural: string = `${singular}s`
): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}

export function formatBiLabel(label: BiLabel, lang: UiLanguage): string {
  return lang === 'en' ? label.en : label.dv;
}

export function t(dv: string, en: string, lang: UiLanguage): string {
  return lang === 'en' ? en : dv;
}
