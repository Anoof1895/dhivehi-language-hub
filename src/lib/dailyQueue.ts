import type { CategoryTag, DailyTarget, DeckKey, GamePools } from '../types/dictionary.ts';
import { fnv1aHash, mulberry32 } from './date.ts';
import { isTopicDeckKey } from './labels.ts';

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
    let list: number[];
    if (isTopicDeckKey(d)) {
      const cat = d.slice(6) as CategoryTag;
      list = pools.categoryPools?.[cat] ?? [];
    } else if (d === 'curated') {
      list = pools.dailyCuratedIds;
    } else {
      list = pools.deckPools[d] ?? [];
    }
    for (const id of list) merged.add(id);
  }
  if (merged.size === 0) {
    for (const id of pools.dailyCuratedIds) merged.add(id);
  }
  return Array.from(merged);
}

/**
 * Smart deck toggling:
 * - If user is currently on default `['curated']` and clicks a specialized or Topic Study Deck,
 *   switch directly to that deck (rather than diluting it inside 28,300 curated words).
 * - If user clicks `'curated'` while on Topic Study Decks, switch cleanly back to `['curated']`.
 * - If user unchecks the last remaining deck, fall back to `['curated']`.
 */
export function toggleActiveDeckSmart(
  currentDecks: DeckKey[],
  clickedDeck: DeckKey
): DeckKey[] {
  const exists = currentDecks.includes(clickedDeck);
  if (exists) {
    const next = currentDecks.filter((d) => d !== clickedDeck);
    return next.length > 0 ? next : ['curated'];
  }

  if (clickedDeck === 'curated') {
    return ['curated'];
  }

  if (currentDecks.length === 1 && currentDecks[0] === 'curated') {
    return [clickedDeck];
  }

  return [...currentDecks.filter((d) => d !== 'curated'), clickedDeck];
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
  const poolSet = new Set<number>(pool);

  // Keep completed words even if user switches topic decks mid-day;
  // for uncompleted slots, require that they exist in the active pool and are not marked known.
  const filteredAssigned = assigned.filter(
    (id) =>
      completed.includes(id) ||
      (!knownIds.has(id) && (poolSet.size === 0 || poolSet.has(id)))
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
