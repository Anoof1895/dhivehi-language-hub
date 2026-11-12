import { fnv1aHash, mulberry32 } from './date.ts';

export function pickDailyClueId(clueIds: number[], dateKey: string): number {
  const seed = fnv1aHash(`maana-kulhi-v1:${dateKey}`);
  const rng = mulberry32(seed);
  return clueIds[Math.floor(rng() * clueIds.length)];
}

export function pickClueDistractorIds(
  poolIds: number[],
  targetId: number,
  dateKey: string,
  count: number = 3
): number[] {
  const seed = fnv1aHash(`maana-choices-v1:${dateKey}:${targetId}`);
  const rng = mulberry32(seed);
  const picked: number[] = [];
  const used = new Set<number>([targetId]);
  let guard = 0;

  while (picked.length < count && guard < 200) {
    guard++;
    const candidate = poolIds[Math.floor(rng() * poolIds.length)];
    if (!used.has(candidate)) {
      used.add(candidate);
      picked.push(candidate);
    }
  }
  return picked;
}

export function redactHeadwordInClue(sense: string, headword: string): string {
  if (!headword || headword.length < 2) return sense;
  return sense.split(headword).join('••••');
}

export function buildClueShareText(
  dateKey: string,
  attempts: number,
  maxAttempts: number,
  won: boolean,
  isPractice: boolean
): string {
  const score = won ? `${attempts}/${maxAttempts}` : `X/${maxAttempts}`;
  const header = isPractice
    ? `މާނަ ކުޅި (ތަމްރީނު) ${score}`
    : `މާނަ ކުޅި ${dateKey} · ${score}`;
  const blocks = Array.from({ length: maxAttempts }, (_, idx) => {
    if (won && idx === attempts - 1) return '🟩';
    if (idx < attempts) return '🟥';
    return '⬜';
  }).join('');
  return `${header}\n${blocks}`;
}
