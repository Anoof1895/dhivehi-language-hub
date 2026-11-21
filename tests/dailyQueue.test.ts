import { describe, expect, it } from 'vitest';
import {
  buildActiveCandidatePool,
  ensureDailyAssignments,
  pickReplacementWordId,
  toggleActiveDeckSmart,
} from '../src/lib/dailyQueue.ts';
import type { GamePools } from '../src/types/dictionary.ts';

describe('Daily Words Queue, Topic Study Decks & Swapping', () => {
  const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it('fills exact daily target (1, 3, or 5) excluding known and SRS words', () => {
    const known = new Set([1, 2, 3]);
    const srs = new Set([4]);
    const res = ensureDailyAssignments(null, '2026-11-13', 3, pool, known, srs);

    expect(res.assignedIds.length).toBe(3);
    for (const id of res.assignedIds) {
      expect(known.has(id)).toBe(false);
      expect(srs.has(id)).toBe(false);
    }
    expect(new Set(res.assignedIds).size).toBe(3);
  });

  it('expands smoothly when daily target increases mid-day', () => {
    const first = ensureDailyAssignments(null, '2026-11-13', 1, pool, new Set(), new Set());
    expect(first.assignedIds.length).toBe(1);

    const expanded = ensureDailyAssignments(
      first,
      '2026-11-13',
      5,
      pool,
      new Set(),
      new Set()
    );
    expect(expanded.assignedIds.length).toBe(5);
    expect(expanded.assignedIds[0]).toBe(first.assignedIds[0]);
  });

  it('picks a non-excluded replacement ID when swapping known words', () => {
    const excluded = new Set([1, 2, 3, 4, 5]);
    const rep = pickReplacementWordId(pool, excluded, '2026-11-13', 1);
    expect(rep).not.toBeNull();
    expect(excluded.has(rep!)).toBe(false);
  });

  it('resolves Topic Study Decks in buildActiveCandidatePool and refreshes uncompleted slots when switching decks', () => {
    const mockPools: GamePools = {
      dailyCuratedIds: [1, 2, 3, 4, 5],
      deckPools: {
        honorific: [10],
        dialect: [20],
        figurative: [30],
        proverb: [40],
      },
      categoryPools: {
        maritime: [101, 102, 103],
        marine: [201, 202],
        flora: [],
        food: [],
        weather: [],
        wildlife: [],
        body_health: [],
        culture_religion: [],
        arts_games: [],
        home_crafts: [],
        clothing: [],
        people_emotions: [],
      },
      wordle4AnswerIds: [],
      wordle4ValidIds: [],
      clueChallengeIds: [],
    };

    const nextDecks = toggleActiveDeckSmart(['curated'], 'topic:maritime');
    expect(nextDecks).toEqual(['topic:maritime']);

    const maritimePool = buildActiveCandidatePool(mockPools, nextDecks);
    expect(maritimePool).toEqual([101, 102, 103]);

    // Existing progress had 1 completed word (#1 from curated) and 2 uncompleted words (#2, #3)
    const existing = {
      dateKey: '2026-11-21',
      assignedIds: [1, 2, 3],
      completedIds: [1],
      swappedIds: [],
      streakCount: 1,
      lastStreakDate: '2026-11-21',
    };

    const reconciled = ensureDailyAssignments(
      existing,
      '2026-11-21',
      3,
      maritimePool,
      new Set(),
      new Set()
    );

    expect(reconciled.assignedIds[0]).toBe(1); // completed word kept
    expect(reconciled.assignedIds.slice(1).every((id) => maritimePool.includes(id))).toBe(true);
  });
});
