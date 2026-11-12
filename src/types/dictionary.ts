export type DialectTag =
  | 'addu'
  | 'fuvahmulah'
  | 'huvadhoo'
  | 'laamu'
  | 'lhaviyani'
  | 'haa'
  | 'archaic';

export type RegisterTag = 'honorific' | 'figurative' | 'proverb';

export type InferredWordclass =
  | 'phrase_proverb'
  | 'verbal_masdhar'
  | 'abstract_kan'
  | null;

export interface DictionaryEntry {
  id: number;
  sourceIds: number[];
  headword: string;
  romanized: string;
  graphemeCount: number;
  wordclasses: string[];
  rawWordclasses: string[];
  inferredWordclass: InferredWordclass;
  senses: string[];
  dialects: DialectTag[];
  registers: RegisterTag[];
  synonymIds: number[];
  synonymOfIds: number[];
  explicitBaseIds: number[];
  familyIds: number[];
  familyRoot: string | null;
  referencedInCount: number;
  isCuratedDaily: boolean;
}

export interface GamePools {
  dailyCuratedIds: number[];
  deckPools: {
    honorific: number[];
    dialect: number[];
    figurative: number[];
    proverb: number[];
  };
  wordle4AnswerIds: number[];
  wordle4ValidIds: number[];
  clueChallengeIds: number[];
}

export interface PipelineReport {
  generatedAt: string;
  rawEntryCount: number;
  canonicalEntryCount: number;
  mergedDuplicateGroups: number;
  totalSenses: number;
  droppedEmptySenses: number;
  repairedLeadingParenSenses: number;
  repairedWordclassParens: number;
  normalizedWordclassTypos: number;
  unclassifiedWordclasses: number;
  inferredWordclasses: Record<string, number>;
  dialectCounts: Record<string, number>;
  registerCounts: Record<string, number>;
  synonymLinkCount: number;
  explicitBaseLinkCount: number;
  entriesWithFamily: number;
  totalCrossLinks: number;
  entriesWithCrossLinks: number;
  curatedDailyCount: number;
  wordle4AnswerCount: number;
  wordle4ValidCount: number;
  clueChallengeCount: number;
}

export interface SearchFilters {
  query: string;
  wordclass: string; // '' = all, 'unclassified' = blank
  dialect: DialectTag | '';
  register: RegisterTag | '';
  hasFamily: boolean;
  hasSynonyms: boolean;
  searchInDefinitions: boolean;
}

export interface SearchResultItem {
  id: number;
  score: number;
  matchType: 'exact' | 'prefix' | 'romanized' | 'contains' | 'definition' | 'reverse';
  snippet?: string;
}

export type UiLanguage = 'en' | 'dv' | 'dv-en';
export type ThemeMode = 'light' | 'dark';
export type DailyTarget = 1 | 3 | 5;
export type DeckKey = 'curated' | 'honorific' | 'dialect' | 'figurative' | 'proverb';

export interface UserSettings {
  dailyTarget: DailyTarget;
  activeDecks: DeckKey[];
  theme: ThemeMode;
  uiLanguage: UiLanguage;
  showRomanization: boolean;
  phoneticImeEnabled: boolean;
}
