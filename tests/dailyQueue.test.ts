import { describe, expect, it } from 'vitest';
import {
  ensureDailyAssignments,
  pickReplacementWordId,
} from '../src/lib/dailyQueue.ts';

describe('Daily Words Queue & Swapping', () => {
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
});
