import type { DailyTarget, DeckKey, GamePools } from '../types/dictionary.ts';
import { fnv1aHash, mulberry32 } from './date.ts';

export interface DailyProgressState {
  dateKey: string;
  assignedIds: number[];
  completedIds: number[];
  swappedIds: number[];
  streakCount: number;
  lastStreakDate: string | null;
}

export function buildActiveCandidatePool(
  pools: GamePools,
  activeDecks: DeckKey[]
): number[] {
  const decks = activeDecks.length > 0 ? activeDecks : (['curated'] as DeckKey[]);
  const merged = new Set<number>();
  for (const d of decks) {
    const list =
      d === 'curated' ? pools.dailyCuratedIds : pools.deckPools[d] ?? [];
    for (const id of list) merged.add(id);
  }
  return Array.from(merged);
}

export function pickReplacementWordId(
  pool: number[],
  excluded: Set<number>,
  dateKey: string,
  salt: number
): number | null {
  if (pool.length === 0) return null;
  const seed = fnv1aHash(`daily-words-v1:${dateKey}:${salt}`);
  const rng = mulberry32(seed);
  const start = Math.floor(rng() * pool.length);

  // Stride deterministically across pool to preserve variety without cloning 28k array
  const stride = 7919; // prime step coprime to most pool sizes; fallback linear below
  for (let i = 0; i < Math.min(pool.length, 400); i++) {
    const idx = (start + i * stride) % pool.length;
    const candidate = pool[idx];
    if (!excluded.has(candidate)) return candidate;
  }

  for (let i = 0; i < pool.length; i++) {
    const idx = (start + i) % pool.length;
    const candidate = pool[idx];
    if (!excluded.has(candidate)) return candidate;
  }

  return null;
}

export function ensureDailyAssignments(
  existing: DailyProgressState | null,
  dateKey: string,
  target: DailyTarget,
  pool: number[],
  knownIds: Set<number>,
  existingSrsIds: Set<number>
): DailyProgressState {
  const isSameDay = existing?.dateKey === dateKey;
  const assigned = isSameDay ? [...existing.assignedIds] : [];
  const completed = isSameDay ? [...existing.completedIds] : [];
  const swapped = isSameDay ? [...existing.swappedIds] : [];

  // Remove any assigned words that were later marked known (unless already completed today)
  const filteredAssigned = assigned.filter(
    (id) => !knownIds.has(id) || completed.includes(id)
  );

  const excluded = new Set<number>([
    ...knownIds,
    ...filteredAssigned,
    ...swapped,
    ...existingSrsIds,
  ]);
  for (const id of completed) {
    excluded.delete(id);
  }

  let salt = swapped.length + filteredAssigned.length + 1;
  while (filteredAssigned.length < target) {
    const nextId = pickReplacementWordId(pool, excluded, dateKey, salt++);
    if (nextId === null) break;
    excluded.add(nextId);
    filteredAssigned.push(nextId);
  }

  return {
    dateKey,
    assignedIds: filteredAssigned,
    completedIds: completed,
    swappedIds: swapped,
    streakCount: existing?.streakCount ?? 0,
    lastStreakDate: existing?.lastStreakDate ?? null,
  };
}
