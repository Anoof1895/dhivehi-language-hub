import { describe, expect, it } from 'vitest';
import {
  Rating,
  applySrsRating,
  createNewSrsCard,
  previewSrsRatings,
} from '../src/lib/fsrs.ts';

describe('FSRS v6 spaced repetition wrapper', () => {
  it('creates a new card, previews 4 ratings, and advances interval on Good/Easy', async () => {
    const now = new Date('2026-11-13T00:00:00.000Z');
    const card = await createNewSrsCard(42, now);
    expect(card.entryId).toBe(42);
    expect(card.reps).toBe(0);

    const previews = await previewSrsRatings(card, now);
    expect(previews.length).toBe(4);
    expect(previews.map((p) => p.grade)).toEqual([
      Rating.Again,
      Rating.Hard,
      Rating.Good,
      Rating.Easy,
    ]);

    const updated = await applySrsRating(card, Rating.Easy, now);
    expect(updated.reps).toBe(1);
    expect(new Date(updated.dueAt).getTime()).toBeGreaterThan(now.getTime());
    expect(updated.scheduledDays).toBeGreaterThanOrEqual(1);
  });
});
