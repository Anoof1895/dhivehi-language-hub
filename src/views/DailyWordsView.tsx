import { useEffect, useState } from 'react';
import {
  Flame,
  RefreshCw,
  CheckCircle2,
  GitBranch,
  Sparkles,
  BookOpenCheck,
} from 'lucide-react';
import type {
  DailyTarget,
  DeckKey,
  DictionaryEntry,
  UserSettings,
} from '../types/dictionary.ts';
import type { DailyProgressState } from '../lib/dailyQueue.ts';
import {
  DECK_LABELS,
  formatBiLabel,
  formatCount,
  getUiDirection,
  t,
} from '../lib/labels.ts';
import { Languages } from 'lucide-react';
import { EnglishSummary } from '../components/EnglishSummary.tsx';
import { MetadataBadges } from '../components/MetadataBadges.tsx';
import { SenseText } from '../components/SenseText.tsx';

interface Props {
  settings: UserSettings;
  progress: DailyProgressState | null;
  dailyEntries: DictionaryEntry[];
  familyLookup: Record<number, DictionaryEntry>;
  headwordSet: Set<string>;
  loading: boolean;
  onChangeTarget: (target: DailyTarget) => void;
  onToggleDeck: (deck: DeckKey) => void;
  onSwapKnown: (entryId: number) => void;
  onCompleteDailyWord: (entryId: number) => void;
  onRefreshUncompleted: () => void;
  onToggleEnglish: (enabled: boolean) => void;
  onInspectId: (id: number) => void;
  onInspectHeadword: (hw: string) => void;
}

const DECK_KEYS: DeckKey[] = ['curated', 'honorific', 'dialect', 'figurative', 'proverb'];

export function DailyWordsView({
  settings,
  progress,
  dailyEntries,
  familyLookup,
  headwordSet,
  loading,
  onChangeTarget,
  onToggleDeck,
  onSwapKnown,
  onCompleteDailyWord,
  onRefreshUncompleted,
  onToggleEnglish,
  onInspectId,
  onInspectHeadword,
}: Props) {
  const lang = settings.uiLanguage;
  const textDir = getUiDirection(lang);
  const [expandedFamilies, setExpandedFamilies] = useState<Record<number, boolean>>({});
  const completedSet = new Set(progress?.completedIds ?? []);
  const completedCount = dailyEntries.filter((e) => completedSet.has(e.id)).length;
  const totalCount = dailyEntries.length || settings.dailyTarget;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const streak = progress?.streakCount ?? 0;

  useEffect(() => {
    // Expand first word family automatically for discovery
    if (dailyEntries.length > 0 && Object.keys(expandedFamilies).length === 0) {
      setExpandedFamilies({ [dailyEntries[0].id]: true });
    }
  }, [dailyEntries, expandedFamilies]);

  return (
    <div className="space-y-6">
      {/* Daily Hero Banner */}
      <section className="rounded-3xl border border-[#E4DCCE] bg-white p-5 sm:p-6 shadow-xs dark:border-[#213840] dark:bg-[#132329]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0D6E6E]/10 px-3 py-1 text-xs font-semibold text-[#0D6E6E] dark:bg-[#2DD4BF]/15 dark:text-[#2DD4BF]">
              <Sparkles className="h-3.5 w-3.5" />
              <span dir={textDir}>{t('މިއަދުގެ ބަސްތައް', "Today's Learning Set", lang)}</span>
            </div>
            <h1 dir={textDir} className="font-display-thaana mt-2 text-2xl sm:text-3xl font-bold text-[#142126] dark:text-[#F1F5F9]">
              {t('ދުވަހުގެ ބަސް ދަސްކުރުން', 'Daily Dhivehi Words', lang)}
            </h1>
            <p dir={textDir} className="mt-1 text-sm text-[#52636A] dark:text-[#9BB0B8]">
              {t(
                'މޫދު އާއިލާތަކާއެކު ދުވާލަކު 1، 3 ނުވަތަ 5 ބަސް ދަސްކުރައްވާ — އެނގޭ ބަހެއް ނަމަ ވަގުތުން ބަދަލުކޮށްލެވޭނެ.',
                'Learn 1, 3, or 5 words daily with root-word bundles. Swap any word you already know.',
                lang
              )}
            </p>
          </div>

          {/* Streak & Quota */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-[#E4DCCE] bg-[#FAF7F2] px-3.5 py-2 dark:border-[#213840] dark:bg-[#182C33]">
              <Flame className="h-5 w-5 text-[#D95D39] dark:text-[#FB923C]" />
              <div>
                <div dir={textDir} className="text-[11px] text-[#52636A] dark:text-[#9BB0B8]">
                  {t('ސްޓްރީކް', 'Streak', lang)}
                </div>
                <div dir={textDir} className="text-sm font-bold text-[#142126] dark:text-[#F1F5F9]">
                  {lang === 'en' ? formatCount(streak, 'day') : `${streak} ދުވަސް`}
                </div>
              </div>
            </div>

            <div className="flex items-center rounded-2xl border border-[#E4DCCE] bg-[#FAF7F2] p-1 dark:border-[#213840] dark:bg-[#182C33]">
              {([1, 3, 5] as DailyTarget[]).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => onChangeTarget(num)}
                  className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    settings.dailyTarget === num
                      ? 'bg-[#0D6E6E] text-white shadow-xs dark:bg-[#2DD4BF] dark:text-[#0B161A]'
                      : 'text-[#52636A] hover:text-[#142126] dark:text-[#9BB0B8] dark:hover:text-[#F1F5F9]'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-[#52636A] dark:text-[#9BB0B8]">
            <span>
              {lang === 'en' ? (
                <span dir="ltr">{`Today's Progress: ${completedCount} / ${totalCount}`}</span>
              ) : (
                <>
                  މިއަދުގެ ކުރިއެރުން:{' '}
                  <span dir="ltr" className="inline-block">
                    {completedCount} / {totalCount}
                  </span>
                </>
              )}
            </span>
            <span dir="ltr">{pct}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F2ECE1] dark:bg-[#182C33]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0D6E6E] to-[#199A9A] transition-all duration-300 dark:from-[#2DD4BF] dark:to-[#14B8A6]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Active Study Decks */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#E4DCCE]/70 pt-3.5 dark:border-[#213840]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-[#52636A] dark:text-[#9BB0B8]">
              {t('ބަސް ނަގާ ބައިތައް:', 'Decks:', lang)}
            </span>
            {DECK_KEYS.map((deck) => {
              const active = settings.activeDecks.includes(deck);
              return (
                <button
                  key={deck}
                  type="button"
                  onClick={() => onToggleDeck(deck)}
                  className={`thaana-pill cursor-pointer rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                    active
                      ? 'border-[#0D6E6E] bg-[#0D6E6E]/12 text-[#0D6E6E] dark:border-[#2DD4BF] dark:bg-[#2DD4BF]/15 dark:text-[#2DD4BF]'
                      : 'border-[#E4DCCE] bg-transparent text-[#52636A] hover:bg-[#F2ECE1] dark:border-[#213840] dark:text-[#9BB0B8]'
                  }`}
                >
                  {formatBiLabel(DECK_LABELS[deck], lang)}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onToggleEnglish(!settings.showEnglish)}
            className={`inline-flex cursor-pointer items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-medium transition ${
              settings.showEnglish
                ? 'border-[#0D6E6E]/40 bg-[#0D6E6E]/10 text-[#0D6E6E] dark:border-[#2DD4BF]/40 dark:bg-[#2DD4BF]/15 dark:text-[#2DD4BF]'
                : 'border-[#E4DCCE] bg-[#FAF7F2] text-[#52636A] hover:border-[#0D6E6E] dark:border-[#213840] dark:bg-[#182C33] dark:text-[#9BB0B8]'
            }`}
          >
            <Languages className="h-3.5 w-3.5" />
            <span>{settings.showEnglish ? 'EN: ON' : 'EN: OFF'}</span>
          </button>
          <button
            type="button"
            onClick={onRefreshUncompleted}
            className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#E4DCCE] bg-[#FAF7F2] px-2.5 py-1 text-xs font-medium text-[#52636A] transition hover:border-[#0D6E6E] hover:text-[#0D6E6E] dark:border-[#213840] dark:bg-[#182C33] dark:text-[#9BB0B8] dark:hover:text-[#2DD4BF]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{t('އައު ބަސްތަކެއް ގެނޭ', 'Shuffle Unstudied', lang)}</span>
          </button>
        </div>
      </section>

      {/* Word Family Cards */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: settings.dailyTarget }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-3xl border border-[#E4DCCE] bg-white/70 dark:border-[#213840] dark:bg-[#132329]/70"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {dailyEntries.map((entry, idx) => {
            const isCompleted = completedSet.has(entry.id);
            const famMembers = entry.familyIds
              .map((id) => familyLookup[id])
              .filter((x): x is DictionaryEntry => Boolean(x))
              .slice(0, 6);
            const famOpen = Boolean(expandedFamilies[entry.id]);

            return (
              <article
                key={entry.id}
                className={`rounded-3xl border p-5 sm:p-6 transition shadow-xs ${
                  isCompleted
                    ? 'border-emerald-500/35 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-950/15'
                    : 'border-[#E4DCCE] bg-white dark:border-[#213840] dark:bg-[#132329]'
                }`}
              >
                {/* Header */}
                <div dir="rtl" className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F2ECE1] text-xs font-bold text-[#0D6E6E] dark:bg-[#182C33] dark:text-[#2DD4BF]">
                        {idx + 1}
                      </span>
                      <button
                        type="button"
                        dir="rtl"
                        onClick={() => onInspectId(entry.id)}
                        className="font-display-thaana cursor-pointer text-right text-2xl sm:text-3xl font-bold text-[#142126] transition hover:text-[#0D6E6E] dark:text-[#F1F5F9] dark:hover:text-[#2DD4BF]"
                      >
                        {entry.headword}
                      </button>
                    </div>
                    {settings.showRomanization && entry.romanized && (
                      <div className="mt-1 ps-9 text-right">
                        <span
                          className="inline-block font-mono text-xs text-[#52636A] dark:text-[#9BB0B8]"
                          dir="ltr"
                        >
                          /{entry.romanized}/
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap items-center gap-2" dir="ltr">
                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => onSwapKnown(entry.id)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#E4DCCE] bg-[#FAF7F2] px-3 py-1.5 text-xs font-semibold text-[#52636A] transition hover:border-[#D95D39] hover:text-[#B84524] dark:border-[#213840] dark:bg-[#182C33] dark:text-[#9BB0B8] dark:hover:border-[#FB923C] dark:hover:text-[#FB923C]"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span dir={textDir}>{t('މި ބަސް އެނގޭ (ބަދަލުކުރޭ)', 'Already know this', lang)}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isCompleted}
                      onClick={() => onCompleteDailyWord(entry.id)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                        isCompleted
                          ? 'bg-emerald-600/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                          : 'bg-[#0D6E6E] text-white hover:bg-[#095555] dark:bg-[#2DD4BF] dark:text-[#0B161A]'
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          <span dir={textDir}>{t('ދަސްވެއްޖެ (FSRS ގައި)', 'Scheduled in FSRS', lang)}</span>
                        </>
                      ) : (
                        <>
                          <BookOpenCheck className="h-4 w-4" />
                          <span dir={textDir}>{t('ދަސްވެއްޖެ — މުރާޖަޢާއަށް ލާ', 'Learn & Schedule', lang)}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Badges */}
                <div dir="rtl" className="mt-3">
                  <MetadataBadges entry={entry} lang={lang} />
                </div>

                <EnglishSummary entry={entry} showEnglish={settings.showEnglish} />

                {/* Hyperlinked Senses */}
                <ol dir="rtl" className="mt-4 space-y-2 border-t border-[#E4DCCE]/60 pt-4 dark:border-[#213840]">
                  {entry.senses.map((sense, sIdx) => (
                    <li
                      key={sIdx}
                      className="flex gap-2.5 text-base text-[#142126] dark:text-[#F1F5F9]"
                    >
                      <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F2ECE1] text-[11px] font-bold text-[#0D6E6E] dark:bg-[#182C33] dark:text-[#2DD4BF]">
                        {sIdx + 1}
                      </span>
                      <SenseText
                        text={sense}
                        currentHeadword={entry.headword}
                        headwordSet={headwordSet}
                        onSelectHeadword={onInspectHeadword}
                      />
                    </li>
                  ))}
                </ol>

                {/* Root-Word Family Bundle */}
                {famMembers.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-[#E4DCCE]/80 bg-[#FAF7F2]/80 p-3.5 dark:border-[#213840] dark:bg-[#0F1E24]">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedFamilies((prev) => ({
                          ...prev,
                          [entry.id]: !prev[entry.id],
                        }))
                      }
                      className="flex w-full cursor-pointer items-center justify-between text-xs font-semibold text-[#0D6E6E] dark:text-[#2DD4BF]"
                    >
                      <span className="flex items-center gap-1.5">
                        <GitBranch className="h-4 w-4" />
                        {t(
                          `މޫދު އާއިލާ (${famMembers.length} ގުޅޭ ބަސް)`,
                          `Root Family Bundle (${famMembers.length} related)`,
                          lang
                        )}
                        {entry.familyRoot && (
                          <span dir="rtl" className="rounded-md bg-white px-2 py-0.5 text-[11px] text-[#52636A] dark:bg-[#182C33] dark:text-[#9BB0B8]">
                            {entry.familyRoot}
                          </span>
                        )}
                      </span>
                      <span>{famOpen ? '▲' : '▼'}</span>
                    </button>

                    {famOpen && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {famMembers.map((fam) => (
                          <button
                            key={fam.id}
                            type="button"
                            dir="rtl"
                            onClick={() => onInspectId(fam.id)}
                            className="cursor-pointer rounded-xl border border-[#E4DCCE] bg-white p-2.5 text-start transition hover:border-[#0D6E6E] dark:border-[#213840] dark:bg-[#132329] dark:hover:border-[#2DD4BF]"
                          >
                            <div className="text-sm font-bold text-[#142126] dark:text-[#F1F5F9]">
                              {fam.headword}
                            </div>
                            <div className="mt-0.5 line-clamp-1 text-xs text-[#52636A] dark:text-[#9BB0B8]">
                              {fam.senses[0]}
                            </div>
                            {settings.showEnglish && fam.enGloss && (
                              <div
                                dir="ltr"
                                className="mt-0.5 line-clamp-1 text-left text-[11px] font-medium text-[#0D6E6E] dark:text-[#2DD4BF]"
                              >
                                {fam.enGloss}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
