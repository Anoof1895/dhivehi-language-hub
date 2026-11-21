import type {
  CategoryTag,
  CoreDeckKey,
  DeckKey,
  DialectTag,
  InferredWordclass,
  RegisterTag,
  TopicDeckKey,
  UiLanguage,
} from '../types/dictionary.ts';

export interface BiLabel {
  dv: string;
  en: string;
}

export interface CategoryMeta {
  key: CategoryTag;
  label: BiLabel;
  shortLabel: BiLabel;
  badgeClass: string;
}

export const CATEGORY_KEYS: CategoryTag[] = [
  'maritime',
  'marine',
  'flora',
  'food',
  'weather',
  'wildlife',
  'body_health',
  'culture_religion',
  'arts_games',
  'home_crafts',
  'clothing',
  'people_emotions',
];

export const CATEGORY_META: Record<CategoryTag, CategoryMeta> = {
  maritime: {
    key: 'maritime',
    label: { dv: 'އޮޑިދޯންޏާއި ކަނޑު', en: 'Boats & Sea' },
    shortLabel: { dv: 'އޮޑިދޯންޏާއި ކަނޑު', en: 'Boats & Sea' },
    badgeClass:
      'bg-cyan-600/12 text-cyan-800 dark:bg-cyan-400/15 dark:text-cyan-300',
  },
  marine: {
    key: 'marine',
    label: { dv: 'މަސްމަހާމެހި', en: 'Fish & Marine' },
    shortLabel: { dv: 'މަސްމަހާމެހި', en: 'Fish & Marine' },
    badgeClass:
      'bg-teal-600/12 text-teal-800 dark:bg-teal-400/15 dark:text-teal-300',
  },
  flora: {
    key: 'flora',
    label: { dv: 'ރުއްގަހާއި ގަސް', en: 'Plants & Palms' },
    shortLabel: { dv: 'ރުއްގަހާއި ގަސް', en: 'Plants & Palms' },
    badgeClass:
      'bg-emerald-600/12 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300',
  },
  food: {
    key: 'food',
    label: { dv: 'ކެއިންބުއިން', en: 'Food & Cooking' },
    shortLabel: { dv: 'ކެއިންބުއިން', en: 'Food & Cooking' },
    badgeClass:
      'bg-orange-600/12 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300',
  },
  weather: {
    key: 'weather',
    label: { dv: 'މޫސުމާއި ނަކަތް', en: 'Weather & Sky' },
    shortLabel: { dv: 'މޫސުމާއި ނަކަތް', en: 'Weather & Sky' },
    badgeClass:
      'bg-sky-600/12 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300',
  },
  wildlife: {
    key: 'wildlife',
    label: { dv: 'ދޫނިސޫފާސޫފި', en: 'Birds & Wildlife' },
    shortLabel: { dv: 'ދޫނިސޫފާސޫފި', en: 'Birds & Wildlife' },
    badgeClass:
      'bg-lime-600/14 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300',
  },
  body_health: {
    key: 'body_health',
    label: { dv: 'ހަށިގަނޑާއި ޞިއްޙަތު', en: 'Body & Health' },
    shortLabel: { dv: 'ހަށިގަނޑާއި ޞިއްޙަތު', en: 'Body & Health' },
    badgeClass:
      'bg-rose-600/12 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300',
  },
  culture_religion: {
    key: 'culture_religion',
    label: { dv: 'ސަގާފަތާއި ދީން', en: 'Culture & Faith' },
    shortLabel: { dv: 'ސަގާފަތާއި ދީން', en: 'Culture & Faith' },
    badgeClass:
      'bg-amber-600/14 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300',
  },
  arts_games: {
    key: 'arts_games',
    label: { dv: 'ޅެމާއި ކުޅިވަރު', en: 'Music & Games' },
    shortLabel: { dv: 'ޅެމާއި ކުޅިވަރު', en: 'Music & Games' },
    badgeClass:
      'bg-purple-600/12 text-purple-800 dark:bg-purple-400/15 dark:text-purple-300',
  },
  home_crafts: {
    key: 'home_crafts',
    label: { dv: 'ގެދޮރާއި އާލާތް', en: 'Home & Crafts' },
    shortLabel: { dv: 'ގެދޮރާއި އާލާތް', en: 'Home & Crafts' },
    badgeClass:
      'bg-stone-600/14 text-stone-800 dark:bg-stone-400/15 dark:text-stone-300',
  },
  clothing: {
    key: 'clothing',
    label: { dv: 'ފޭރާމާއި ގަހަނާ', en: 'Clothing & Jewelry' },
    shortLabel: { dv: 'ފޭރާމާއި ގަހަނާ', en: 'Clothing & Jewelry' },
    badgeClass:
      'bg-pink-600/12 text-pink-800 dark:bg-pink-400/15 dark:text-pink-300',
  },
  people_emotions: {
    key: 'people_emotions',
    label: { dv: 'އިޙްސާސާއި އާއިލާ', en: 'Emotions & Family' },
    shortLabel: { dv: 'އިޙްސާސާއި އާއިލާ', en: 'Emotions & Family' },
    badgeClass:
      'bg-indigo-600/12 text-indigo-800 dark:bg-indigo-400/15 dark:text-indigo-300',
  },
};

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

export const CORE_DECK_KEYS: CoreDeckKey[] = [
  'curated',
  'honorific',
  'dialect',
  'figurative',
  'proverb',
];

export const DECK_LABELS: Record<CoreDeckKey, BiLabel> = {
  curated: { dv: 'މައިގަނޑު ރަދީފު', en: 'Core Curated (28.3k)' },
  honorific: { dv: 'މާތްބަސް', en: 'Honorifics' },
  dialect: { dv: 'ބަހުރުވަތައް', en: 'Regional Dialects' },
  figurative: { dv: 'މަޖާޒީ މާނަ', en: 'Figurative' },
  proverb: { dv: 'މިސާލުބަސް', en: 'Proverbs & Idioms' },
};

export function categoryToDeckKey(cat: CategoryTag): TopicDeckKey {
  return `topic:${cat}`;
}

export function isTopicDeckKey(deck: string): deck is TopicDeckKey {
  return deck.startsWith('topic:') && CATEGORY_KEYS.includes(deck.slice(6) as CategoryTag);
}

export function deckKeyToCategory(deck: DeckKey): CategoryTag | null {
  if (!isTopicDeckKey(deck)) return null;
  return deck.slice(6) as CategoryTag;
}

export function getDeckBiLabel(deck: DeckKey): BiLabel {
  if (isTopicDeckKey(deck)) {
    const cat = deck.slice(6) as CategoryTag;
    return CATEGORY_META[cat]?.label ?? { dv: cat, en: cat };
  }
  return DECK_LABELS[deck] ?? { dv: deck, en: deck };
}

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
