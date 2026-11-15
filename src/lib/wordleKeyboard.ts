import {
  THAANA_BASE_CONSONANTS,
  THAANA_FILI,
  composeSyllable,
  isThaanaChar,
  latinToThaanaPhonetic,
  segmentGraphemes,
  splitGrapheme,
} from './thaana.ts';

export type WordleInputMode = 'qwerty' | 'phonetic';

export interface WordleInputState {
  tiles: string[];
  pendingIdx: number | null;
  phoneticBuffer: string;
}

export const EMPTY_WORDLE_INPUT: WordleInputState = {
  tiles: [],
  pendingIdx: null,
  phoneticBuffer: '',
};

/**
 * Standard Maldivian Thaana QWERTY (Divehi Phonetic) consonant mappings.
 * Lowercase & Shift keys cover all 24 primary consonants plus standard dotted Shift letters.
 */
export const THAANA_QWERTY_CONSONANTS: Readonly<Record<string, string>> = {
  // 24 primary consonants
  h: 'ހ',
  S: 'ށ',
  n: 'ނ',
  r: 'ރ',
  b: 'ބ',
  L: 'ޅ',
  k: 'ކ',
  w: 'އ',
  v: 'ވ',
  m: 'މ',
  f: 'ފ',
  d: 'ދ',
  t: 'ތ',
  l: 'ލ',
  g: 'ގ',
  N: 'ޏ',
  s: 'ސ',
  D: 'ޑ',
  z: 'ޒ',
  T: 'ޓ',
  y: 'ޔ',
  p: 'ޕ',
  j: 'ޖ',
  c: 'ޗ',
  // Extended dotted consonants (standard Divehi Phonetic Shift layer)
  X: 'ޘ',
  H: 'ޙ',
  K: 'ޚ',
  J: 'ޛ',
  R: 'ޜ',
  C: 'ޝ',
  B: 'ޞ',
  M: 'ޟ',
  Y: 'ޠ',
  Z: 'ޡ',
  W: 'ޢ',
  G: 'ޣ',
  Q: 'ޤ',
  V: 'ޥ',
};

/**
 * Standard Maldivian Thaana QWERTY fili (vowel & sukun) mappings.
 */
export const THAANA_QWERTY_FILI: Readonly<Record<string, string>> = {
  a: 'ަ',
  A: 'ާ',
  i: 'ި',
  I: 'ީ',
  u: 'ު',
  U: 'ޫ',
  e: 'ެ',
  E: 'ޭ',
  o: 'ޮ',
  O: 'ޯ',
  q: 'ް',
};

const THAANA_FILI_SET = new Set(THAANA_FILI);
const THAANA_CONSONANT_SET = new Set(THAANA_BASE_CONSONANTS);

export function isDirectThaanaInputChar(ch: string): boolean {
  if (!ch) return false;
  const code = ch.codePointAt(0);
  if (code === undefined) return false;
  return ch.length === 1 && code >= 0x0780 && code <= 0x07b1;
}

export function mapQwertyKeyToThaana(
  key: string
): { kind: 'consonant' | 'fili'; char: string } | null {
  if (isDirectThaanaInputChar(key)) {
    if (THAANA_FILI_SET.has(key)) return { kind: 'fili', char: key };
    if (THAANA_CONSONANT_SET.has(key)) return { kind: 'consonant', char: key };
    return null;
  }

  const mappedConsonant = THAANA_QWERTY_CONSONANTS[key];
  if (mappedConsonant) return { kind: 'consonant', char: mappedConsonant };

  const mappedFili = THAANA_QWERTY_FILI[key];
  if (mappedFili) return { kind: 'fili', char: mappedFili };

  return null;
}

export function applyWordleConsonant(
  state: WordleInputState,
  ch: string
): WordleInputState {
  if (state.tiles.length >= 4) return state;
  const nextTiles = [...state.tiles, ch];
  return {
    tiles: nextTiles,
    pendingIdx: nextTiles.length - 1,
    phoneticBuffer: nextTiles.join(''),
  };
}

export function applyWordleFili(
  state: WordleInputState,
  fili: string
): WordleInputState {
  if (state.tiles.length === 0) return state;
  const targetSlot =
    state.pendingIdx !== null ? state.pendingIdx : state.tiles.length - 1;
  const cur = state.tiles[targetSlot];
  if (!cur) return state;
  const { base } = splitGrapheme(cur);
  const nextTiles = [...state.tiles];
  nextTiles[targetSlot] = composeSyllable(base || cur, fili);
  return {
    tiles: nextTiles,
    pendingIdx: null,
    phoneticBuffer: nextTiles.join(''),
  };
}

export function applyWordleBackspace(state: WordleInputState): WordleInputState {
  if (state.tiles.length === 0) return state;
  const lastIdx = state.tiles.length - 1;
  const { base, fili } = splitGrapheme(state.tiles[lastIdx]);
  if (fili) {
    const nextTiles = [...state.tiles];
    nextTiles[lastIdx] = base;
    return {
      tiles: nextTiles,
      pendingIdx: lastIdx,
      phoneticBuffer: nextTiles.join(''),
    };
  }
  const nextTiles = state.tiles.slice(0, -1);
  return {
    tiles: nextTiles,
    pendingIdx: null,
    phoneticBuffer: nextTiles.join(''),
  };
}

function isPureThaanaOutput(text: string): boolean {
  const nonWs = text.replace(/\s+/g, '');
  if (!nonWs) return false;
  for (const ch of nonWs) {
    if (!isThaanaChar(ch)) return false;
  }
  return true;
}

function detectChangedFlashKey(prevTiles: string[], nextTiles: string[]): string | null {
  if (nextTiles.length === 0) return null;
  const lastIdx = nextTiles.length - 1;
  const nextLast = splitGrapheme(nextTiles[lastIdx]);

  if (nextTiles.length > prevTiles.length) {
    return nextLast.fili || nextLast.base || null;
  }

  const prevLast = prevTiles[lastIdx] ? splitGrapheme(prevTiles[lastIdx]) : { base: '', fili: '' };
  if (nextLast.base && nextLast.base !== prevLast.base) {
    return nextLast.base;
  }
  if (nextLast.fili && nextLast.fili !== prevLast.fili) {
    return nextLast.fili;
  }
  return nextLast.fili || nextLast.base || null;
}

export function applyWordlePhoneticKey(
  state: WordleInputState,
  key: string
): { handled: boolean; next: WordleInputState; flashKey: string | null } {
  // Direct OS Thaana characters always work even while in Phonetic mode
  if (isDirectThaanaInputChar(key)) {
    if (THAANA_FILI_SET.has(key)) {
      return {
        handled: true,
        next: applyWordleFili(state, key),
        flashKey: key,
      };
    }
    if (THAANA_CONSONANT_SET.has(key)) {
      return {
        handled: true,
        next: applyWordleConsonant(state, key),
        flashKey: key,
      };
    }
    return { handled: false, next: state, flashKey: null };
  }

  // Space in Phonetic mode closes a pending consonant with sukun (ް)
  if (key === ' ') {
    if (state.tiles.length === 0 || state.pendingIdx === null) {
      return { handled: true, next: state, flashKey: null };
    }
    const nextBuf = `${state.phoneticBuffer} `;
    const converted = latinToThaanaPhonetic(nextBuf);
    if (!isPureThaanaOutput(converted)) {
      return { handled: true, next: state, flashKey: null };
    }
    const graphemes = segmentGraphemes(converted);
    if (graphemes.length === 0 || graphemes.length > 4) {
      return { handled: true, next: state, flashKey: null };
    }
    const lastFili = splitGrapheme(graphemes[graphemes.length - 1]).fili;
    return {
      handled: true,
      next: {
        tiles: graphemes,
        pendingIdx: lastFili ? null : graphemes.length - 1,
        phoneticBuffer: nextBuf,
      },
      flashKey: lastFili || null,
    };
  }

  if (!/^[a-zA-Z'`]$/.test(key)) {
    return { handled: false, next: state, flashKey: null };
  }

  const nextBuf = state.phoneticBuffer + key;
  const converted = latinToThaanaPhonetic(nextBuf);
  if (!isPureThaanaOutput(converted)) {
    return { handled: false, next: state, flashKey: null };
  }

  const graphemes = segmentGraphemes(converted);
  if (graphemes.length === 0 || graphemes.length > 4) {
    return { handled: true, next: state, flashKey: null };
  }

  const lastFili = splitGrapheme(graphemes[graphemes.length - 1]).fili;
  const flashKey = detectChangedFlashKey(state.tiles, graphemes);

  return {
    handled: true,
    next: {
      tiles: graphemes,
      pendingIdx: lastFili ? null : graphemes.length - 1,
      phoneticBuffer: nextBuf,
    },
    flashKey,
  };
}

export function processWordleKeyDown(
  state: WordleInputState,
  mode: WordleInputMode,
  key: string
): { handled: boolean; next: WordleInputState; flashKey: string | null } {
  if (mode === 'phonetic') {
    return applyWordlePhoneticKey(state, key);
  }

  const mapped = mapQwertyKeyToThaana(key);
  if (!mapped) {
    return { handled: false, next: state, flashKey: null };
  }

  if (mapped.kind === 'fili') {
    return {
      handled: true,
      next: applyWordleFili(state, mapped.char),
      flashKey: mapped.char,
    };
  }

  return {
    handled: true,
    next: applyWordleConsonant(state, mapped.char),
    flashKey: mapped.char,
  };
}
