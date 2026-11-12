import { segmentGraphemes, splitGrapheme } from './thaana.ts';
import { fnv1aHash, mulberry32 } from './date.ts';

export type TileStatus = 'exact' | 'present' | 'consonant' | 'absent';

export function pickDailyWordleId(answerIds: number[], dateKey: string): number {
  const seed = fnv1aHash(`basle-wordle-v1:${dateKey}`);
  const rng = mulberry32(seed);
  const idx = Math.floor(rng() * answerIds.length);
  return answerIds[idx];
}

export function evaluateThaanaWordleGuess(guess: string, target: string): TileStatus[] {
  const guessG = segmentGraphemes(guess);
  const targetG = segmentGraphemes(target);
  const len = targetG.length;
  const result: TileStatus[] = new Array(len).fill('absent');
  const targetConsumed = new Array(len).fill(false);

  // Pass 1: exact syllable + position match
  for (let i = 0; i < len; i++) {
    if (guessG[i] === targetG[i]) {
      result[i] = 'exact';
      targetConsumed[i] = true;
    }
  }

  // Pass 2: exact syllable elsewhere
  for (let i = 0; i < len; i++) {
    if (result[i] !== 'absent') continue;
    for (let j = 0; j < len; j++) {
      if (!targetConsumed[j] && guessG[i] === targetG[j]) {
        result[i] = 'present';
        targetConsumed[j] = true;
        break;
      }
    }
  }

  // Pass 3: matching base consonant with different fili (unconsumed target slot)
  for (let i = 0; i < len; i++) {
    if (result[i] !== 'absent') continue;
    const gBase = splitGrapheme(guessG[i] ?? '').base;
    if (!gBase) continue;
    // Check same position first, then any unconsumed position
    if (!targetConsumed[i] && splitGrapheme(targetG[i] ?? '').base === gBase) {
      result[i] = 'consonant';
      targetConsumed[i] = true;
      continue;
    }
    for (let j = 0; j < len; j++) {
      if (!targetConsumed[j] && splitGrapheme(targetG[j] ?? '').base === gBase) {
        result[i] = 'consonant';
        targetConsumed[j] = true;
        break;
      }
    }
  }

  return result;
}

const STATUS_RANK: Record<TileStatus, number> = {
  absent: 1,
  consonant: 2,
  present: 3,
  exact: 4,
};

export function getConsonantKeyStates(
  guesses: string[],
  evaluations: TileStatus[][]
): Record<string, TileStatus> {
  const map: Record<string, TileStatus> = {};
  for (let r = 0; r < guesses.length; r++) {
    const graphemes = segmentGraphemes(guesses[r]);
    const evalRow = evaluations[r] ?? [];
    for (let c = 0; c < graphemes.length; c++) {
      const { base } = splitGrapheme(graphemes[c]);
      const status = evalRow[c];
      if (!base || !status) continue;
      const prev = map[base];
      if (!prev || STATUS_RANK[status] > STATUS_RANK[prev]) {
        map[base] = status;
      }
    }
  }
  return map;
}

export function buildWordleShareText(
  dateKey: string,
  evaluations: TileStatus[][],
  won: boolean,
  isPractice: boolean
): string {
  const score = won ? `${evaluations.length}/6` : 'X/6';
  const header = isPractice
    ? `ބަސްލީ (ތަމްރީނު) ${score}`
    : `ބަސްލީ ${dateKey} · ${score}`;
  const emojiMap: Record<TileStatus, string> = {
    exact: '🟩',
    present: '🟨',
    consonant: '🟦',
    absent: '⬛',
  };
  const grid = evaluations.map((row) => row.map((s) => emojiMap[s]).join('')).join('\n');
  return `${header}\n\n${grid}`;
}
