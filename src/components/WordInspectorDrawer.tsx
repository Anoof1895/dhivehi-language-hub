import { useEffect, useState } from 'react';
import {
  X,
  ArrowLeft,
  ArrowRight,
  BookMarked,
  CheckCircle2,
  GitBranch,
  Languages,
  Link2,
  Sparkles,
  Dices,
  Share2,
} from 'lucide-react';
import type { EntryDetailPayload } from '../hooks/useDictionary.ts';
import type {
  CategoryTag,
  DictionaryEntry,
  UiLanguage,
} from '../types/dictionary.ts';
import { getUiDirection, t } from '../lib/labels.ts';
import { EnglishSummary } from './EnglishSummary.tsx';
import { MetadataBadges } from './MetadataBadges.tsx';
import { SenseText } from './SenseText.tsx';

interface Props {
  open: boolean;
  trail: number[];
  loading: boolean;
  detail: EntryDetailPayload | null;
  headwordSet: Set<string>;
  lang: UiLanguage;
  showRomanization: boolean;
  showEnglish: boolean;
  knownIds: Set<number>;
  srsIds: Set<number>;
  onClose: () => void;
  onJumpToIndex: (index: number) => void;
  onInspectId: (id: number) => void;
  onInspectHeadword: (headword: string) => void;
  onAddToSrs: (id: number) => void;
  onToggleKnown: (id: number) => void;
  onToggleEnglish: (enabled: boolean) => void;
  onNextRandom: () => void;
  onShareEntry: (entry: DictionaryEntry) => void;
  onSelectCategory?: (category: CategoryTag) => void;
}

export function WordInspectorDrawer({
  open,
  trail,
  loading,
  detail,
  headwordSet,
  lang,
  showRomanization,
  showEnglish,
  knownIds,
  srsIds,
  onClose,
  onJumpToIndex,
  onInspectId,
  onInspectHeadword,
  onAddToSrs,
  onToggleKnown,
  onToggleEnglish,
  onNextRandom,
  onShareEntry,
  onSelectCategory,
}: Props) {
  const [trailLabels, setTrailLabels] = useState<Record<number, string>>({});

  useEffect(() => {
    if (detail?.entry) {
      setTrailLabels((prev) => ({
        ...prev,
        [detail.entry.id]: detail.entry.headword,
      }));
    }
  }, [detail]);

  if (!open) return null;

  const entry = detail?.entry;
  const isKnown = entry ? knownIds.has(entry.id) : false;
  const inSrs = entry ? srsIds.has(entry.id) : false;
  const textDir = getUiDirection(lang);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <aside
        className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-[#E4DCCE] bg-[#FAF7F2] shadow-2xl dark:border-[#213840] dark:bg-[#0B161A]"
        dir="ltr"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-[#E4DCCE] bg-white/80 px-4 py-3 backdrop-blur dark:border-[#213840] dark:bg-[#132329]/90">
          <div className="flex items-center gap-2">
            {trail.length > 1 && (
              <button
                type="button"
                onClick={() => onJumpToIndex(trail.length - 2)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#E4DCCE] bg-[#FAF7F2] px-2.5 py-1.5 text-xs font-medium text-[#142126] hover:bg-[#F2ECE1] dark:border-[#213840] dark:bg-[#182C33] dark:text-[#F1F5F9]"
              >
                {lang === 'en' ? (
                  <ArrowLeft className="h-3.5 w-3.5" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
                <span dir={textDir}>{t('ފަހަތަށް', 'Back', lang)}</span>
              </button>
            )}
            <span
              dir={textDir}
              className="text-sm font-semibold text-[#52636A] dark:text-[#9BB0B8]"
            >
              {t('ބަހުގެ ތަފްޞީލު', 'Word Inspector', lang)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onNextRandom}
              disabled={loading}
              title={t('އެހެން ރެންޑަމް ބަހެއް', 'Next Random Word', lang)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#D95D39]/40 bg-[#D95D39]/12 px-2.5 py-1 text-xs font-semibold text-[#B84524] transition hover:bg-[#D95D39]/20 disabled:opacity-50 dark:border-[#FB923C]/40 dark:bg-[#FB923C]/15 dark:text-[#FB923C]"
            >
              <Dices className="h-3.5 w-3.5" />
              <span className="hidden sm:inline" dir={textDir}>
                {t('އެހެން ބަހެއް', 'Next Random', lang)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onToggleEnglish(!showEnglish)}
              className={`inline-flex cursor-pointer items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-medium transition ${
                showEnglish
                  ? 'border-[#0D6E6E]/40 bg-[#0D6E6E]/10 text-[#0D6E6E] dark:border-[#2DD4BF]/40 dark:bg-[#2DD4BF]/15 dark:text-[#2DD4BF]'
                  : 'border-[#E4DCCE] bg-[#FAF7F2] text-[#52636A] hover:border-[#0D6E6E] dark:border-[#213840] dark:bg-[#182C33] dark:text-[#9BB0B8]'
              }`}
            >
              <Languages className="h-3.5 w-3.5" />
              <span>{showEnglish ? 'EN: ON' : 'EN: OFF'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="cursor-pointer rounded-xl p-2 text-[#52636A] hover:bg-[#F2ECE1] dark:text-[#9BB0B8] dark:hover:bg-[#182C33]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Breadcrumb trail */}
        {trail.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[#E4DCCE]/70 bg-[#F2ECE1]/60 px-4 py-2 text-xs dark:border-[#213840] dark:bg-[#132329]/50">
            {trail.map((id, idx) => {
              const isLast = idx === trail.length - 1;
              return (
                <div key={`${id}-${idx}`} className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() => onJumpToIndex(idx)}
                    dir={trailLabels[id] ? 'rtl' : 'ltr'}
                    className={`rounded-lg px-2 py-0.5 transition ${
                      isLast
                        ? 'bg-[#0D6E6E] font-semibold text-white dark:bg-[#2DD4BF] dark:text-[#0B161A]'
                        : 'cursor-pointer text-[#0D6E6E] hover:bg-[#0D6E6E]/10 dark:text-[#2DD4BF]'
                    }`}
                  >
                    {trailLabels[id] ?? `#${id}`}
                  </button>
                  {!isLast && (
                    <span className="text-[#52636A]/60">
                      {lang === 'en' ? '›' : '‹'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading || !detail || !entry ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-10 w-44 rounded-xl bg-[#E4DCCE]/70 dark:bg-[#213840]" />
              <div className="h-24 w-full rounded-2xl bg-[#E4DCCE]/50 dark:bg-[#182C33]" />
              <div className="h-32 w-full rounded-2xl bg-[#E4DCCE]/40 dark:bg-[#182C33]" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Headword Hero */}
              <div className="rounded-2xl border border-[#E4DCCE] bg-white p-5 shadow-xs dark:border-[#213840] dark:bg-[#132329]">
                <div
                  dir="rtl"
                  className="flex flex-wrap items-start justify-between gap-3"
                >
                  <div>
                    <h2
                      dir="rtl"
                      className="font-display-thaana text-right text-3xl font-bold text-[#142126] dark:text-[#F1F5F9]"
                    >
                      {entry.headword}
                    </h2>
                    {showRomanization && entry.romanized && (
                      <div className="mt-1 text-right">
                        <span
                          className="inline-block font-mono text-xs tracking-wide text-[#52636A] dark:text-[#9BB0B8]"
                          dir="ltr"
                        >
                          /{entry.romanized}/
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2" dir="ltr">
                    <button
                      type="button"
                      onClick={() => onAddToSrs(entry.id)}
                      disabled={inSrs}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                        inSrs
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-[#0D6E6E] text-white hover:bg-[#095555] dark:bg-[#2DD4BF] dark:text-[#0B161A]'
                      }`}
                    >
                      <BookMarked className="h-3.5 w-3.5" />
                      <span dir={textDir}>
                        {inSrs
                          ? t('މުރާޖަޢާ ލިސްޓުގައި', 'In Review Queue', lang)
                          : t('މުރާޖަޢާއަށް ލާ', 'Study in FSRS', lang)}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleKnown(entry.id)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                        isKnown
                          ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-800 dark:text-emerald-300'
                          : 'border-[#E4DCCE] bg-[#FAF7F2] text-[#52636A] hover:bg-[#F2ECE1] dark:border-[#213840] dark:bg-[#182C33] dark:text-[#9BB0B8]'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span dir={textDir}>
                        {isKnown
                          ? t('އެނގޭ ބަހެއް (ބަދަލުކުރޭ)', 'Known (Undo)', lang)
                          : t('މި ބަސް އެނގޭ', 'Already Know', lang)}
                      </span>
                    </button>
                  </div>
                </div>

                <div dir="rtl" className="mt-3">
                  <MetadataBadges
                    entry={entry}
                    lang={lang}
                    onSelectCategory={onSelectCategory}
                  />
                </div>

                <EnglishSummary entry={entry} showEnglish={showEnglish} />

                {/* Hyperlinked Definitions */}
                <div className="mt-5 space-y-2.5 border-t border-[#E4DCCE]/70 pt-4 dark:border-[#213840]">
                  <p
                    dir={textDir}
                    className="text-xs font-semibold text-[#52636A] dark:text-[#9BB0B8]"
                  >
                    {t(
                      'މާނަ (ކޮންމެ ބަހަކަށް ކްލިކްކޮށްގެން ހޯދޭނެ)',
                      'Meanings (click any highlighted word)',
                      lang
                    )}
                  </p>
                  <ol dir="rtl" className="space-y-2.5">
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
                </div>
              </div>

              {/* Explicit Base / Honorific Origin */}
              {detail.explicitBaseEntries.length > 0 && (
                <section className="rounded-2xl border border-[#E4DCCE] bg-white p-4 dark:border-[#213840] dark:bg-[#132329]">
                  <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-[#D95D39] dark:text-[#FB923C]">
                    <Sparkles className="h-4 w-4" />
                    <span>
                      {t('އަޞްލު ނުވަތަ ގުޅޭ ބަސް', 'Derived Base / Register Link', lang)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {detail.explicitBaseEntries.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        dir="rtl"
                        onClick={() => onInspectId(b.id)}
                        className="thaana-pill cursor-pointer rounded-xl border border-[#D95D39]/30 bg-[#D95D39]/8 px-3 py-1 text-sm font-semibold text-[#B84524] transition hover:bg-[#D95D39]/15 dark:border-[#FB923C]/30 dark:text-[#FB923C]"
                      >
                        {b.headword}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Root Family */}
              {detail.familyEntries.length > 0 && (
                <section className="rounded-2xl border border-[#E4DCCE] bg-white p-4 dark:border-[#213840] dark:bg-[#132329]">
                  <div className="mb-2.5 flex items-center justify-between text-xs font-semibold text-[#0D6E6E] dark:text-[#2DD4BF]">
                    <span className="flex items-center gap-1.5">
                      <GitBranch className="h-4 w-4" />
                      {t('މޫދު / އާއިލާގެ ބަސްތައް', 'Root Family', lang)}
                    </span>
                    {entry.familyRoot && (
                      <span className="rounded-lg bg-[#F2ECE1] px-2 py-0.5 text-[11px] text-[#52636A] dark:bg-[#182C33] dark:text-[#9BB0B8]">
                        {t('މޫ:', 'Stem:', lang)}{' '}
                        <span dir="rtl" className="inline-block">
                          {entry.familyRoot}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {detail.familyEntries.map((fam) => (
                      <button
                        key={fam.id}
                        type="button"
                        dir="rtl"
                        onClick={() => onInspectId(fam.id)}
                        className="cursor-pointer rounded-xl border border-[#E4DCCE] bg-[#FAF7F2] p-2.5 text-start transition hover:border-[#0D6E6E] dark:border-[#213840] dark:bg-[#182C33] dark:hover:border-[#2DD4BF]"
                      >
                        <div className="font-semibold text-[#142126] dark:text-[#F1F5F9]">
                          {fam.headword}
                        </div>
                        <div className="line-clamp-1 text-xs text-[#52636A] dark:text-[#9BB0B8]">
                          {fam.senses[0]}
                        </div>
                        {showEnglish && fam.enGloss && (
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
                </section>
              )}

              {/* Direct Synonyms */}
              {detail.synonymEntries.length > 0 && (
                <section className="rounded-2xl border border-[#E4DCCE] bg-white p-4 dark:border-[#213840] dark:bg-[#132329]">
                  <div className="mb-2.5 text-xs font-semibold text-[#52636A] dark:text-[#9BB0B8]">
                    {t(
                      'އެއްމާނަ ބަސްތައް (ތެސޯރަސް)',
                      'Synonyms & Cross-References',
                      lang
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {detail.synonymEntries.map((syn) => (
                      <button
                        key={syn.id}
                        type="button"
                        dir="rtl"
                        onClick={() => onInspectId(syn.id)}
                        className="thaana-pill cursor-pointer rounded-xl border border-[#E4DCCE] bg-[#FAF7F2] px-3 py-1 text-sm font-medium text-[#142126] transition hover:border-[#0D6E6E] hover:text-[#0D6E6E] dark:border-[#213840] dark:bg-[#182C33] dark:text-[#F1F5F9] dark:hover:text-[#2DD4BF]"
                      >
                        {syn.headword}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Reverse Dictionary Backlinks */}
              <section className="rounded-2xl border border-[#E4DCCE] bg-white p-4 dark:border-[#213840] dark:bg-[#132329]">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#52636A] dark:text-[#9BB0B8]">
                    <Link2 className="h-4 w-4 text-[#0D6E6E] dark:text-[#2DD4BF]" />
                    {t(
                      'ރިވާސް ޑިކްޝަނަރީ — މި ބަސް ހިމެނޭ މާނަތައް',
                      'Reverse Dictionary — Referenced In',
                      lang
                    )}
                  </span>
                  <span className="rounded-full bg-[#F2ECE1] px-2 py-0.5 text-[11px] font-semibold text-[#52636A] dark:bg-[#182C33] dark:text-[#9BB0B8]">
                    {detail.totalBacklinks.toLocaleString()}
                  </span>
                </div>

                {detail.backlinkEntries.length === 0 ? (
                  <p className="text-xs text-[#52636A] dark:text-[#9BB0B8]">
                    {t(
                      'އެހެން ބަހެއްގެ މާނައިގައި މި ބަސް ބޭނުންކޮށްފައެއް ނުވެއެވެ.',
                      'Not referenced inside other definitions.',
                      lang
                    )}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {detail.backlinkEntries.map((ref) => (
                      <button
                        key={ref.id}
                        type="button"
                        dir="rtl"
                        onClick={() => onInspectId(ref.id)}
                        className="block w-full cursor-pointer rounded-xl border border-[#E4DCCE]/70 bg-[#FAF7F2]/80 p-3 text-start transition hover:border-[#0D6E6E] dark:border-[#213840] dark:bg-[#182C33]/70 dark:hover:border-[#2DD4BF]"
                      >
                        <div className="font-semibold text-[#0D6E6E] dark:text-[#2DD4BF]">
                          {ref.headword}
                        </div>
                        <div className="mt-0.5 line-clamp-2 text-xs text-[#52636A] dark:text-[#9BB0B8]">
                          {ref.senses.find((s) => s.includes(entry.headword)) ??
                            ref.senses[0]}
                        </div>
                        {showEnglish && ref.enGloss && (
                          <div
                            dir="ltr"
                            className="mt-0.5 line-clamp-1 text-left text-[11px] font-medium text-[#0D6E6E] dark:text-[#2DD4BF]"
                          >
                            {ref.enGloss}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>

        {/* Sticky Discovery & Share Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-[#E4DCCE] bg-white/95 px-4 py-3 backdrop-blur dark:border-[#213840] dark:bg-[#132329]/95">
          {entry ? (
            <button
              type="button"
              onClick={() => onShareEntry(entry)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#E4DCCE] bg-[#FAF7F2] px-3.5 py-2 text-xs font-semibold text-[#142126] transition hover:border-[#0D6E6E] hover:text-[#0D6E6E] dark:border-[#213840] dark:bg-[#182C33] dark:text-[#F1F5F9] dark:hover:border-[#2DD4BF] dark:hover:text-[#2DD4BF]"
            >
              <Share2 className="h-4 w-4 text-[#0D6E6E] dark:text-[#2DD4BF]" />
              <span dir={textDir}>
                {t('ބަސް ކާޑު ޙިއްޞާކުރޭ (PNG)', 'Share Card (PNG)', lang)}
              </span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onNextRandom}
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#D95D39] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#B84524] disabled:opacity-50 dark:bg-[#FB923C] dark:text-[#0B161A]"
          >
            <Dices className="h-4 w-4" />
            <span dir={textDir}>
              {t('އެހެން ރެންޑަމް ބަހެއް', 'Next Random Word', lang)}
            </span>
          </button>
        </div>
      </aside>
    </div>
  );
}
