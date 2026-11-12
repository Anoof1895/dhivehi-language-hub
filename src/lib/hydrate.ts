import type {
  DialectTag,
  DictionaryEntry,
  InferredWordclass,
  RegisterTag,
} from '../types/dictionary.ts';

export interface CompactEntry {
  i: number;
  si: number[];
  h: string;
  r: string;
  g: number;
  s: string[];
  wc?: string[];
  iw?: InferredWordclass;
  d?: DialectTag[];
  rg?: RegisterTag[];
  sy?: number[];
  so?: number[];
  eb?: number[];
  f?: number[];
  fr?: string;
  rc?: number;
  cd?: 1;
}

export function hydrateEntry(c: CompactEntry): DictionaryEntry {
  return {
    id: c.i,
    sourceIds: c.si,
    headword: c.h,
    romanized: c.r,
    graphemeCount: c.g,
    wordclasses: c.wc ?? [],
    rawWordclasses: c.wc ?? [],
    inferredWordclass: c.iw ?? null,
    senses: c.s,
    dialects: c.d ?? [],
    registers: c.rg ?? [],
    synonymIds: c.sy ?? [],
    synonymOfIds: c.so ?? [],
    explicitBaseIds: c.eb ?? [],
    familyIds: c.f ?? [],
    familyRoot: c.fr ?? null,
    referencedInCount: c.rc ?? 0,
    isCuratedDaily: c.cd === 1,
  };
}
