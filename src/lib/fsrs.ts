import { DefaultScheduler, Rating, type Grade } from 'ts-fsrs';

export type FSRS6Scheduler = Awaited<ReturnType<typeof DefaultScheduler<'FSRS-6'>>>;

export interface StoredSrsCard {
  entryId: number;
  stability: number;
  difficulty: number;
  state: number;
  scheduleStatus: string;
  dueAt: string; // ISO string
  lastReviewAt: string | null;
  cardId: string | number;
  reps: number;
  lapses: number;
  scheduledDays: number;
  learningStep: number;
  addedAt: string;
}

export interface ReviewPreviewOption {
  grade: Grade;
  labelDv: string;
  labelEn: string;
  nextDue: Date;
}

let schedulerPromise: Promise<FSRS6Scheduler> | null = null;

export function getFsrsScheduler(): Promise<FSRS6Scheduler> {
  if (!schedulerPromise) {
    schedulerPromise = DefaultScheduler({
      version: 'FSRS-6',
      enableFuzz: true,
    });
  }
  return schedulerPromise;
}

export async function createNewSrsCard(
  entryId: number,
  now: Date = new Date()
): Promise<StoredSrsCard> {
  const scheduler = await getFsrsScheduler();
  const c = scheduler.newCard({ now, cardId: entryId });
  return serializeCard(entryId, c, now.toISOString());
}

function serializeCard(
  entryId: number,
  c: ReturnType<FSRS6Scheduler['newCard']>,
  addedAt: string
): StoredSrsCard {
  return {
    entryId,
    stability: c.stability,
    difficulty: c.difficulty,
    state: c.state,
    scheduleStatus: String(c.scheduleStatus),
    dueAt: c.dueAt.toISOString(),
    lastReviewAt: c.lastReviewAt ? c.lastReviewAt.toISOString() : null,
    cardId: c.cardId,
    reps: c.reps,
    lapses: c.lapses,
    scheduledDays: c.scheduledDays,
    learningStep: c.learningStep,
    addedAt,
  };
}

type FsrsCardInput = Parameters<FSRS6Scheduler['review']>[0]['card'];

function hydrateFsrsInput(stored: StoredSrsCard): FsrsCardInput {
  return {
    stability: stored.stability,
    difficulty: stored.difficulty,
    state: stored.state as FsrsCardInput['state'],
    scheduleStatus: stored.scheduleStatus as FsrsCardInput['scheduleStatus'],
    dueAt: new Date(stored.dueAt),
    lastReviewAt: stored.lastReviewAt ? new Date(stored.lastReviewAt) : null,
    cardId: stored.cardId,
    reps: stored.reps,
    lapses: stored.lapses,
    scheduledDays: stored.scheduledDays,
    learningStep: stored.learningStep,
  };
}

export async function previewSrsRatings(
  stored: StoredSrsCard,
  now: Date = new Date()
): Promise<ReviewPreviewOption[]> {
  const scheduler = await getFsrsScheduler();
  const labels: Record<number, { dv: string; en: string }> = {
    [Rating.Again]: { dv: 'އަލުން', en: 'Again' },
    [Rating.Hard]: { dv: 'އުނދަގޫ', en: 'Hard' },
    [Rating.Good]: { dv: 'ރަނގަޅު', en: 'Good' },
    [Rating.Easy]: { dv: 'ފަސޭހަ', en: 'Easy' },
  };
  const items = [...scheduler.preview({ card: hydrateFsrsInput(stored), now })];
  return items.map((item) => ({
    grade: item.grade,
    labelDv: labels[item.grade]?.dv ?? '',
    labelEn: labels[item.grade]?.en ?? '',
    nextDue: item.card.dueAt,
  }));
}

export async function applySrsRating(
  stored: StoredSrsCard,
  grade: Grade,
  now: Date = new Date()
): Promise<StoredSrsCard> {
  const scheduler = await getFsrsScheduler();
  const res = scheduler.review({
    card: hydrateFsrsInput(stored),
    now,
    grade,
  });
  return serializeCard(stored.entryId, res.card, stored.addedAt);
}

export { Rating, type Grade };
