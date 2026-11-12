// Shared Thaana linguistic utilities used by both the Node build pipeline and browser runtime.

export const THAANA_BASE_CONSONANTS = [
  'ހ', 'ށ', 'ނ', 'ރ', 'ބ', 'ޅ', 'ކ', 'އ', 'ވ', 'މ', 'ފ', 'ދ',
  'ތ', 'ލ', 'ގ', 'ޏ', 'ސ', 'ޑ', 'ޒ', 'ޓ', 'ޔ', 'ޕ', 'ޖ', 'ޗ',
  'ޘ', 'ޙ', 'ޚ', 'ޛ', 'ޜ', 'ޝ', 'ޞ', 'ޟ', 'ޠ', 'ޡ', 'ޢ', 'ޣ', 'ޤ', 'ޥ', 'ޱ',
];

export const THAANA_PRIMARY_CONSONANTS = THAANA_BASE_CONSONANTS.slice(0, 24);
export const THAANA_EXTENDED_CONSONANTS = THAANA_BASE_CONSONANTS.slice(24);

export const THAANA_FILI = [
  'ަ', 'ާ', 'ި', 'ީ', 'ު', 'ޫ', 'ެ', 'ޭ', 'ޮ', 'ޯ', 'ް',
];

const FILI_SET = new Set(THAANA_FILI);
const CONSONANT_SET = new Set(THAANA_BASE_CONSONANTS);

const graphemeSegmenter = new Intl.Segmenter('dv', { granularity: 'grapheme' });

export function isThaanaChar(ch) {
  const code = ch.codePointAt(0) ?? 0;
  return code >= 0x0780 && code <= 0x07bf;
}

export function hasThaana(text) {
  for (const ch of text) {
    if (isThaanaChar(ch)) return true;
  }
  return false;
}

export function segmentGraphemes(word) {
  const result = [];
  for (const seg of graphemeSegmenter.segment(word.trim())) {
    if (seg.segment.trim() !== '') {
      result.push(seg.segment);
    }
  }
  return result;
}

export function splitGrapheme(grapheme) {
  let base = '';
  let fili = '';
  for (const ch of grapheme) {
    if (FILI_SET.has(ch)) {
      fili += ch;
    } else if (CONSONANT_SET.has(ch) || !base) {
      base += ch;
    } else {
      fili += ch;
    }
  }
  return { base, fili };
}

export function composeSyllable(base, fili = '') {
  return `${base}${fili}`;
}

const CONSONANT_ROMAN = {
  'ހ': 'h',
  'ށ': 'sh',
  'ނ': 'n',
  'ރ': 'r',
  'ބ': 'b',
  'ޅ': 'lh',
  'ކ': 'k',
  'އ': '',
  'ވ': 'v',
  'މ': 'm',
  'ފ': 'f',
  'ދ': 'dh',
  'ތ': 'th',
  'ލ': 'l',
  'ގ': 'g',
  'ޏ': 'gn',
  'ސ': 's',
  'ޑ': 'd',
  'ޒ': 'z',
  'ޓ': 't',
  'ޔ': 'y',
  'ޕ': 'p',
  'ޖ': 'j',
  'ޗ': 'ch',
  'ޘ': 'th',
  'ޙ': 'h',
  'ޚ': 'kh',
  'ޛ': 'dh',
  'ޜ': 'z',
  'ޝ': 'sh',
  'ޞ': 's',
  'ޟ': 'dh',
  'ޠ': 't',
  'ޡ': 'z',
  'ޢ': '',
  'ޣ': 'gh',
  'ޤ': 'q',
  'ޥ': 'w',
  'ޱ': 'n',
};

const FILI_ROMAN = {
  'ަ': 'a',
  'ާ': 'aa',
  'ި': 'i',
  'ީ': 'ee',
  'ު': 'u',
  'ޫ': 'oo',
  'ެ': 'e',
  'ޭ': 'ey',
  'ޮ': 'o',
  'ޯ': 'oa',
  'ް': '',
};

export function romanizeThaana(text) {
  const words = text.trim().split(/\s+/);
  const outWords = [];

  for (const word of words) {
    const graphemes = segmentGraphemes(word);
    let out = '';
    for (let i = 0; i < graphemes.length; i++) {
      const { base, fili } = splitGrapheme(graphemes[i]);
      if (!CONSONANT_SET.has(base)) {
        out += graphemes[i];
        continue;
      }

      if (fili === 'ް') {
        if (base === 'އ') {
          // Geminates next consonant or acts as soft glottal 'h' at end
          const next = graphemes[i + 1];
          if (next) {
            const nextBase = splitGrapheme(next).base;
            const nextRom = CONSONANT_ROMAN[nextBase];
            if (nextRom) {
              out += nextRom[0];
              continue;
            }
          }
          out += 'h';
          continue;
        }
        if (base === 'ށ' && i === graphemes.length - 1) {
          out += 'h';
          continue;
        }
        if (base === 'ތ' && i === graphemes.length - 1) {
          out += 'iy';
          continue;
        }
        out += CONSONANT_ROMAN[base] ?? '';
        continue;
      }

      const cRom = CONSONANT_ROMAN[base] ?? '';
      const fRom = FILI_ROMAN[fili] ?? '';
      out += cRom + fRom;
    }
    outWords.push(out);
  }

  return outWords.join(' ').trim();
}

export function normalizeLatinQuery(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/dh/g, 'd')
    .replace(/th/g, 't')
    .replace(/lh/g, 'l')
    .replace(/sh/g, 's')
    .replace(/kh/g, 'k')
    .replace(/gh/g, 'g')
    .replace(/ch/g, 'c')
    .replace(/gn|ny/g, 'n')
    .replace(/aa/g, 'a')
    .replace(/ee|ii/g, 'i')
    .replace(/oo|uu/g, 'u')
    .replace(/ey|ai/g, 'e')
    .replace(/oa|au/g, 'o')
    .replace(/w/g, 'v')
    .replace(/q/g, 'k')
    .replace(/(.)\1+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// Phonetic Latin -> Thaana IME converter for users without OS Thaana keyboard
const DIGRAPHS = [
  ['dh', 'ދ'],
  ['th', 'ތ'],
  ['sh', 'ށ'],
  ['lh', 'ޅ'],
  ['gn', 'ޏ'],
  ['ny', 'ޏ'],
  ['ch', 'ޗ'],
  ['kh', 'ޚ'],
  ['gh', 'ޣ'],
  ['zh', 'ޜ'],
];

const SINGLE_CONSONANTS = {
  h: 'ހ',
  n: 'ނ',
  r: 'ރ',
  b: 'ބ',
  k: 'ކ',
  v: 'ވ',
  w: 'ވ',
  m: 'މ',
  f: 'ފ',
  l: 'ލ',
  g: 'ގ',
  s: 'ސ',
  d: 'ޑ',
  z: 'ޒ',
  t: 'ޓ',
  y: 'ޔ',
  p: 'ޕ',
  j: 'ޖ',
  q: 'ޤ',
  c: 'ޗ',
  H: 'ޙ',
  S: 'ޝ',
  D: 'ޟ',
  T: 'ޠ',
  Z: 'ޡ',
  N: 'ޱ',
  R: 'ޜ',
  K: 'ޚ',
  G: 'ޣ',
  F: 'ޞ',
  B: 'ޘ',
  J: 'ޛ',
  C: 'ޝ',
};

const VOWEL_DIGRAPHS = [
  ['aa', 'ާ'],
  ['ee', 'ީ'],
  ['oo', 'ޫ'],
  ['ey', 'ޭ'],
  ['oa', 'ޯ'],
  ['ai', 'ެ'],
];

const SINGLE_VOWELS = {
  a: 'ަ',
  i: 'ި',
  u: 'ު',
  e: 'ެ',
  o: 'ޮ',
  A: 'ާ',
  I: 'ީ',
  U: 'ޫ',
  E: 'ޭ',
  O: 'ޯ',
};

export function latinToThaanaPhonetic(input) {
  let out = '';
  let i = 0;
  let lastWasConsonantWithoutFili = false;

  while (i < input.length) {
    const ch = input[i];

    // Preserve already-typed Thaana or spaces/punctuation
    if (isThaanaChar(ch)) {
      out += ch;
      lastWasConsonantWithoutFili = CONSONANT_SET.has(ch);
      i++;
      continue;
    }

    if (/\s/.test(ch)) {
      if (lastWasConsonantWithoutFili) {
        out += 'ް';
      }
      out += ch;
      lastWasConsonantWithoutFili = false;
      i++;
      continue;
    }

    const two = input.slice(i, i + 2);
    const twoLower = two.toLowerCase();

    // Check vowel digraphs first
    const vDigraph = VOWEL_DIGRAPHS.find(([k]) => k === twoLower);
    if (vDigraph) {
      if (!lastWasConsonantWithoutFili) {
        out += 'އ';
      }
      out += vDigraph[1];
      lastWasConsonantWithoutFili = false;
      i += 2;
      continue;
    }

    // Check single vowel
    if (Object.prototype.hasOwnProperty.call(SINGLE_VOWELS, ch)) {
      if (!lastWasConsonantWithoutFili) {
        out += 'އ';
      }
      out += SINGLE_VOWELS[ch];
      lastWasConsonantWithoutFili = false;
      i += 1;
      continue;
    }

    // Check consonant digraphs
    const cDigraph = DIGRAPHS.find(([k]) => k === twoLower);
    if (cDigraph) {
      if (lastWasConsonantWithoutFili) {
        out += 'ް';
      }
      out += cDigraph[1];
      lastWasConsonantWithoutFili = true;
      i += 2;
      continue;
    }

    // Check single consonant
    if (Object.prototype.hasOwnProperty.call(SINGLE_CONSONANTS, ch)) {
      if (lastWasConsonantWithoutFili) {
        out += 'ް';
      }
      out += SINGLE_CONSONANTS[ch];
      lastWasConsonantWithoutFili = true;
      i += 1;
      continue;
    }

    // Double apostrophe / hyphen / unknown passthrough
    if (ch === "'" || ch === '`') {
      if (lastWasConsonantWithoutFili) {
        out += 'ް';
      } else {
        out += 'ޢ';
      }
      lastWasConsonantWithoutFili = false;
      i += 1;
      continue;
    }

    if (lastWasConsonantWithoutFili) {
      out += 'ް';
      lastWasConsonantWithoutFili = false;
    }
    out += ch;
    i += 1;
  }

  return out;
}

export function stripThaanaPunctuation(token) {
  return token.replace(/^[\s.,،؛؟!:"'«»()\[\]{}\-]+|[\s.,،؛؟!:"'«»()\[\]{}\-]+$/g, '');
}
