import { useEffect, useState } from 'react';
import {
  Brain,
  CheckCircle2,
  Eye,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { DictionaryEntry, UserSettings } from '../types/dictionary.ts';
import type { ReviewPreviewOption, StoredSrsCard, Grade } from '../lib/fsrs.ts';
import { previewSrsRatings } from '../lib/fsrs.ts';
import { formatInterval } from '../lib/date.ts';
import { t } from '../lib/labels.ts';
import { EnglishSummary } from '../components/EnglishSummary.tsx';
import { MetadataBadges } from '../components/MetadataBadges.tsx';
import { SenseText } from '../components/SenseText.tsx';
import { triggerHaptic } from '../lib/native.ts';

interface Props {
  settings: UserSettings;
  srsCards: StoredSrsCard[];
  knownIds: number[];
  entriesById: Record<number, DictionaryEntry>;
  headwordSet: Set<string>;
  onRateCard: (entryId: number, grade: Grade) => Promise<void>;
  onMarkKnown: (entryId: number) => void;
  onUnmarkKnown: (entryId: number) => void;
  onRemoveSrsCard: (entryId: number) => void;
  onInspectId: (id: number) => void;
  onInspectHeadword: (hw: string) => void;
  onNavigateDaily: () => void;
}

const GRADE_STYLES: Record<number, string> = {
  1: 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-500/35 dark:bg-rose-950/30 dark:text-rose-300',
  2: 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/35 dark:bg-amber-950/30 dark:text-amber-300',
  3: 'border-[#0D6E6E]/40 bg-[#0D6E6E]/10 text-[#0D6E6E] hover:bg-[#0D6E6E]/20 dark:border-[#2DD4BF]/40 dark:bg-[#2DD4BF]/15 dark:text-[#2DD4BF]',
  4: 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/35 dark:bg-emerald-950/30 dark:text-emerald-300',
};

export function ReviewView({
  settings,
  srsCards,
  knownIds,
  entriesById,
  headwordSet,
  onRateCard,
  onMarkKnown,
  onUnmarkKnown,
  onRemoveSrsCard,
  onInspectId,
  onInspectHeadword,
  onNavigateDaily,
}: Props) {
  const lang = settings.uiLanguage;
  const [revealed, setRevealed] = useState(false);
  const [previews, setPreviews] = useState<ReviewPreviewOption[]>([]);
  const [activeTab, setActiveTab] = useState<'queue' | 'deck' | 'known'>('queue');

  const now = new Date();
  const dueCards = srsCards
    .filter((c) => new Date(c.dueAt).getTime() <= now.getTime())
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

  const currentCard = dueCards[0] ?? null;
  const currentEntry = currentCard ? entriesById[currentCard.entryId] : null;

  useEffect(() => {
    setRevealed(false);
    if (!currentCard) {
      setPreviews([]);
      return;
    }
    let active = true;
    previewSrsRatings(currentCard, new Date()).then((opts) => {
      if (active) setPreviews(opts);
    });
    return () => {
      active = false;
    };
  }, [currentCard]);

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#E4DCCE] bg-white p-4 dark:border-[#213840] dark:bg-[#132329]">
          <div className="text-xs font-medium text-[#52636A] dark:text-[#9BB0B8]">
            {t('މިހާރު މުރާޖަޢާ ކުރަންޖެހޭ', 'Due for Review', lang)}
          </div>
          <div className="mt-1 text-2xl font-bold text-[#0D6E6E] dark:text-[#2DD4BF]">
            {dueCards.length}
          </div>
        </div>
        <div className="rounded-2xl border border-[#E4DCCE] bg-white p-4 dark:border-[#213840] dark:bg-[#132329]">
          <div className="text-xs font-medium text-[#52636A] dark:text-[#9BB0B8]">
            {t('FSRS ތާވަލުގައިވާ ބަސް', 'Active FSRS Cards', lang)}
          </div>
          <div className="mt-1 text-2xl font-bold text-[#142126] dark:text-[#F1F5F9]">
            {srsCards.length}
          </div>
        </div>
        <div className="rounded-2xl border border-[#E4DCCE] bg-white p-4 dark:border-[#213840] dark:bg-[#132329]">
          <div className="text-xs font-medium text-[#52636A] dark:text-[#9BB0B8]">
            {t('ކުރިން އެނގޭ ބަސްތައް', 'Marked Known', lang)}
          </div>
          <div className="mt-1 text-2xl font-bold text-[#D95D39] dark:text-[#FB923C]">
            {knownIds.length}
          </div>
        </div>
      </section>

      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'queue'
              ? 'bg-[#0D6E6E] text-white dark:bg-[#2DD4BF] dark:text-[#0B161A]'
              : 'border border-[#E4DCCE] bg-white text-[#52636A] dark:border-[#213840] dark:bg-[#132329] dark:text-[#9BB0B8]'
          }`}
        >
          {t(`މުރާޖަޢާ ކިއު (${dueCards.length})`, `Review Queue (${dueCards.length})`, lang)}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('deck')}
          className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'deck'
              ? 'bg-[#0D6E6E] text-white dark:bg-[#2DD4BF] dark:text-[#0B161A]'
              : 'border border-[#E4DCCE] bg-white text-[#52636A] dark:border-[#213840] dark:bg-[#132329] dark:text-[#9BB0B8]'
          }`}
        >
          {t(`ހުރިހާ ކާޑު (${srsCards.length})`, `All Cards (${srsCards.length})`, lang)}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('known')}
          className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'known'
              ? 'bg-[#0D6E6E] text-white dark:bg-[#2DD4BF] dark:text-[#0B161A]'
              : 'border border-[#E4DCCE] bg-white text-[#52636A] dark:border-[#213840] dark:bg-[#132329] dark:text-[#9BB0B8]'
          }`}
        >
          {t(`އެނގޭ ބަސްތައް (${knownIds.length})`, `Known Words (${knownIds.length})`, lang)}
        </button>
      </div>

      {/* Queue Flashcard */}
      {activeTab === 'queue' && (
        <section>
          {!currentCard || !currentEntry ? (
            <div className="rounded-3xl border border-[#E4DCCE] bg-white p-8 text-center dark:border-[#213840] dark:bg-[#132329]">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="font-display-thaana mt-3 text-xl font-bold text-[#142126] dark:text-[#F1F5F9]">
                {t('މިވަގުތު މުރާޖަޢާ ކުރަންޖެހޭ ބަހެއް ނެތް!', 'All Caught Up!', lang)}
              </h2>
              <p className="mt-1.5 text-sm text-[#52636A] dark:text-[#9BB0B8]">
                {srsCards.length === 0
                  ? t(
                      'ދުވަހުގެ ބަސްތައް ދަސްކުރައްވައިގެން ނުވަތަ ބަސްފޮތުން ބަހެއް FSRS ތާވަލަށް ލައްވާ.',
                      'Schedule words from Daily Words or the Dictionary Explorer to start spaced repetition.',
                      lang
                    )
                  : t(
                      'ތާވަލުގައިވާ ބަސްތައް ދެން ޖެހޭ ވަގުތު އައުމުން މިތަނަށް ފެންނާނެ.',
                      'Your scheduled cards will appear here when they are due.',
                      lang
                    )}
              </p>
              <button
                type="button"
                onClick={onNavigateDaily}
                className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0D6E6E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#095555] dark:bg-[#2DD4BF] dark:text-[#0B161A]"
              >
                <Sparkles className="h-4 w-4" />
                <span>{t('ދުވަހުގެ ބަސްތަކަށް ދޭ', 'Go to Daily Words', lang)}</span>
              </button>
            </div>
          ) : (
            <div className="rounded-3xl border border-[#E4DCCE] bg-white p-6 shadow-sm dark:border-[#213840] dark:bg-[#132329]">
              <div className="flex items-center justify-between text-xs text-[#52636A] dark:text-[#9BB0B8]">
                <span className="flex items-center gap-1.5">
                  <Brain className="h-4 w-4 text-[#0D6E6E] dark:text-[#2DD4BF]" />
                  {t('FSRS މުރާޖަޢާ ކާޑު', 'FSRS Review Card', lang)}
                </span>
                <span>
                  {t('ތަޖުރިބާ:', 'Reps:', lang)} {currentCard.reps}
                </span>
              </div>

              <div className="my-6 text-center">
                <button
                  type="button"
                  dir="rtl"
                  onClick={() => onInspectId(currentEntry.id)}
                  className="font-display-thaana cursor-pointer text-4xl sm:text-5xl font-bold text-[#142126] transition hover:text-[#0D6E6E] dark:text-[#F1F5F9] dark:hover:text-[#2DD4BF]"
                >
                  {currentEntry.headword}
                </button>
                {settings.showRomanization && currentEntry.romanized && (
                  <p
                    className="mt-2 font-mono text-xs text-[#52636A] dark:text-[#9BB0B8]"
                    dir="ltr"
                  >
                    /{currentEntry.romanized}/
                  </p>
                )}
                <div className="mt-3 flex justify-center">
                  <MetadataBadges entry={currentEntry} lang={lang} compact />
                </div>
              </div>

              {!revealed ? (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic('light');
                      setRevealed(true);
                    }}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[#0D6E6E] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#095555] dark:bg-[#2DD4BF] dark:text-[#0B161A]"
                  >
                    <Eye className="h-4 w-4" />
                    <span>{t('މާނަ ދައްކާ', 'Reveal Meaning', lang)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic('medium');
                      onMarkKnown(currentEntry.id);
                    }}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-[#E4DCCE] bg-[#FAF7F2] px-4 py-3 text-xs font-semibold text-[#52636A] hover:border-[#D95D39] dark:border-[#213840] dark:bg-[#182C33] dark:text-[#9BB0B8]"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{t('މި ބަސް އެނގޭ', 'Already Known', lang)}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-5 border-t border-[#E4DCCE]/70 pt-5 dark:border-[#213840]">
                  <EnglishSummary
                    entry={currentEntry}
                    showEnglish={settings.showEnglish}
                    compact
                  />
                  <ol dir="rtl" className="space-y-2.5">
                    {currentEntry.senses.map((sense, idx) => (
                      <li
                        key={idx}
                        className="flex gap-2.5 text-base text-[#142126] dark:text-[#F1F5F9]"
                      >
                        <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F2ECE1] text-[11px] font-bold text-[#0D6E6E] dark:bg-[#182C33] dark:text-[#2DD4BF]">
                          {idx + 1}
                        </span>
                        <SenseText
                          text={sense}
                          currentHeadword={currentEntry.headword}
                          headwordSet={headwordSet}
                          onSelectHeadword={onInspectHeadword}
                        />
                      </li>
                    ))}
                  </ol>

                  <div>
                    <p className="mb-2 text-center text-xs font-medium text-[#52636A] dark:text-[#9BB0B8]">
                      {t('ހަނދާން ހުރި މިންވަރު އިޚްތިޔާރުކުރޭ:', 'Rate your recall:', lang)}
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {previews.map((opt) => (
                        <button
                          key={opt.grade}
                          type="button"
                          onClick={() => {
                            void triggerHaptic('medium');
                            void onRateCard(currentEntry.id, opt.grade);
                          }}
                          className={`cursor-pointer rounded-2xl border p-3 text-center transition active:scale-95 ${
                            GRADE_STYLES[opt.grade] ?? ''
                          }`}
                        >
                          <div className="text-sm font-bold">
                            {lang === 'en' ? opt.labelEn : opt.labelDv}
                          </div>
                          <div className="mt-0.5 text-[11px] opacity-85">
                            {formatInterval(new Date(), opt.nextDue, lang)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* All Scheduled Cards */}
      {activeTab === 'deck' && (
        <section className="space-y-2">
          {srsCards.length === 0 ? (
            <p className="rounded-2xl border border-[#E4DCCE] bg-white p-6 text-center text-sm text-[#52636A] dark:border-[#213840] dark:bg-[#132329] dark:text-[#9BB0B8]">
              {t('އަދި އެއްވެސް ކާޑެއް ތާވަލަކަށް ލެވިފައެއް ނުވެއެވެ.', 'No SRS cards scheduled yet.', lang)}
            </p>
          ) : (
            srsCards.map((c) => {
              const entry = entriesById[c.entryId];
              const isDue = new Date(c.dueAt).getTime() <= now.getTime();
              return (
                <div
                  key={c.entryId}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[#E4DCCE] bg-white p-3.5 dark:border-[#213840] dark:bg-[#132329]"
                >
                  <button
                    type="button"
                    onClick={() => onInspectId(c.entryId)}
                    className="cursor-pointer text-start"
                  >
                    <div className="font-bold text-[#142126] hover:text-[#0D6E6E] dark:text-[#F1F5F9] dark:hover:text-[#2DD4BF]">
                      <span dir="rtl" className="inline-block">
                        {entry?.headword ?? `#${c.entryId}`}
                      </span>
                    </div>
                    <div className="text-xs text-[#52636A] dark:text-[#9BB0B8]">
                      {isDue
                        ? t('މިހާރު މުރާޖަޢާ ކުރަންޖެހޭ', 'Due now', lang)
                        : `${t('ދެން އޮތް މުރާޖަޢާ:', 'Next:', lang)} ${formatInterval(
                            now,
                            new Date(c.dueAt),
                            lang
                          )}`}{' '}
                      · {t('ތަޖުރިބާ:', 'Reps:', lang)} {c.reps}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveSrsCard(c.entryId)}
                    aria-label="Remove card"
                    className="cursor-pointer rounded-xl p-2 text-[#52636A] hover:bg-rose-50 hover:text-rose-600 dark:text-[#9BB0B8] dark:hover:bg-rose-950/30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })
          )}
        </section>
      )}

      {/* Known Words List */}
      {activeTab === 'known' && (
        <section className="space-y-2">
          {knownIds.length === 0 ? (
            <p className="rounded-2xl border border-[#E4DCCE] bg-white p-6 text-center text-sm text-[#52636A] dark:border-[#213840] dark:bg-[#132329] dark:text-[#9BB0B8]">
              {t('އަދި އެނގޭ ބަހެއްގެ ގޮތުގައި ފާހަގަކުރެވިފައެއް ނުވެއެވެ.', 'No words marked as already known yet.', lang)}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {knownIds.map((id) => {
                const entry = entriesById[id];
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between rounded-2xl border border-[#E4DCCE] bg-white p-3.5 dark:border-[#213840] dark:bg-[#132329]"
                  >
                    <button
                      type="button"
                      dir="rtl"
                      onClick={() => onInspectId(id)}
                      className="cursor-pointer text-start font-bold text-[#142126] hover:text-[#0D6E6E] dark:text-[#F1F5F9] dark:hover:text-[#2DD4BF]"
                    >
                      {entry?.headword ?? `#${id}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => onUnmarkKnown(id)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#E4DCCE] px-2.5 py-1 text-xs text-[#52636A] hover:border-[#0D6E6E] hover:text-[#0D6E6E] dark:border-[#213840] dark:text-[#9BB0B8]"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>{t('އަނބުރާ ލާ', 'Restore', lang)}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
