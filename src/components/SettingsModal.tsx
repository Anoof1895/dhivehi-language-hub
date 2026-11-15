import { useRef, useState } from 'react';
import { X, Download, Upload, Sun, Moon, Languages, Database } from 'lucide-react';
import type {
  DailyTarget,
  DeckKey,
  PipelineReport,
  UserSettings,
} from '../types/dictionary.ts';
import {
  DECK_LABELS,
  UI_LANGUAGE_OPTIONS,
  formatBiLabel,
  formatCount,
  getUiDirection,
  t,
} from '../lib/labels.ts';
import { exportAllProgress, importAllProgress } from '../storage/db.ts';

interface Props {
  open: boolean;
  settings: UserSettings;
  report: PipelineReport | null;
  onClose: () => void;
  onUpdateSettings: (next: UserSettings) => void;
  onImported: () => void;
}

const DECK_OPTIONS: DeckKey[] = [
  'curated',
  'honorific',
  'dialect',
  'figurative',
  'proverb',
];

export function SettingsModal({
  open,
  settings,
  report,
  onClose,
  onUpdateSettings,
  onImported,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const lang = settings.uiLanguage;

  if (!open) return null;

  const toggleDeck = (deck: DeckKey) => {
    const exists = settings.activeDecks.includes(deck);
    let next = exists
      ? settings.activeDecks.filter((d) => d !== deck)
      : [...settings.activeDecks, deck];
    if (next.length === 0) next = ['curated'];
    onUpdateSettings({ ...settings, activeDecks: next });
  };

  const handleExport = async () => {
    const payload = await exportAllProgress();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dhivehi-hub-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg(t('ބެކަޕް ފައިލް ޑައުންލޯޑްވެއްޖެ', 'Backup downloaded!', lang));
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await importAllProgress(parsed);
      setStatusMsg(t('ބެކަޕް ކާމިޔާބުކަމާއެކު ރީސްޓޯ ކުރެވިއްޖެ', 'Backup restored successfully!', lang));
      onImported();
    } catch (err) {
      setStatusMsg(
        err instanceof Error ? err.message : t('ފައިލް ކިޔުމުގައި މައްސަލައެއް', 'Invalid backup file', lang)
      );
    }
  };

  const textDir = getUiDirection(lang);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#E4DCCE] bg-[#FAF7F2] p-5 sm:p-6 shadow-2xl dark:border-[#213840] dark:bg-[#0B161A]"
        dir="ltr"
      >
        <div className="flex items-center justify-between border-b border-[#E4DCCE] pb-3 dark:border-[#213840]">
          <h2 dir={textDir} className="font-display-thaana text-xl font-bold text-[#142126] dark:text-[#F1F5F9]">
            {t('ސެޓިންގްސް އަދި ބެކަޕް', 'Settings & Backup', lang)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="cursor-pointer rounded-xl p-1.5 text-[#52636A] hover:bg-[#F2ECE1] dark:text-[#9BB0B8] dark:hover:bg-[#182C33]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Daily Target */}
          <div>
            <label className="block text-sm font-semibold text-[#142126] dark:text-[#F1F5F9]">
              {t('ދުވާލަކު ދަސްކުރާ ބަހުގެ އަދަދު', 'Daily Words Target', lang)}
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([1, 3, 5] as DailyTarget[]).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, dailyTarget: num })}
                  className={`cursor-pointer rounded-xl border py-2.5 text-sm font-bold transition ${
                    settings.dailyTarget === num
                      ? 'border-[#0D6E6E] bg-[#0D6E6E] text-white dark:border-[#2DD4BF] dark:bg-[#2DD4BF] dark:text-[#0B161A]'
                      : 'border-[#E4DCCE] bg-white text-[#142126] hover:bg-[#F2ECE1] dark:border-[#213840] dark:bg-[#132329] dark:text-[#F1F5F9]'
                  }`}
                >
                  {lang === 'en' ? formatCount(num, 'word') : `${num} ބަސް`}
                </button>
              ))}
            </div>
          </div>

          {/* Study Decks */}
          <div>
            <label className="block text-sm font-semibold text-[#142126] dark:text-[#F1F5F9]">
              {t('ދުވަހުގެ ބަސް ނެގޭނެ ބައިތައް', 'Active Study Decks', lang)}
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {DECK_OPTIONS.map((deck) => {
                const active = settings.activeDecks.includes(deck);
                return (
                  <button
                    key={deck}
                    type="button"
                    onClick={() => toggleDeck(deck)}
                    className={`thaana-pill cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'border-[#0D6E6E] bg-[#0D6E6E]/12 text-[#0D6E6E] dark:border-[#2DD4BF] dark:bg-[#2DD4BF]/15 dark:text-[#2DD4BF]'
                        : 'border-[#E4DCCE] bg-white text-[#52636A] dark:border-[#213840] dark:bg-[#132329] dark:text-[#9BB0B8]'
                    }`}
                  >
                    {formatBiLabel(DECK_LABELS[deck], lang)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Appearance & Language */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  ...settings,
                  theme: settings.theme === 'light' ? 'dark' : 'light',
                })
              }
              className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-[#E4DCCE] bg-white p-3.5 text-start transition hover:bg-[#F2ECE1]/60 dark:border-[#213840] dark:bg-[#132329]"
            >
              <div>
                <div className="text-xs text-[#52636A] dark:text-[#9BB0B8]">
                  {t('ކުލަ މޯޑު', 'Theme', lang)}
                </div>
                <div className="text-sm font-semibold text-[#142126] dark:text-[#F1F5F9]">
                  {settings.theme === 'light'
                    ? t('އަލި މޯޑު', 'Alabaster Light', lang)
                    : t('ރޭގަނޑު މޯޑު', 'Reef Dark', lang)}
                </div>
              </div>
              {settings.theme === 'light' ? (
                <Sun className="h-5 w-5 text-amber-500" />
              ) : (
                <Moon className="h-5 w-5 text-[#2DD4BF]" />
              )}
            </button>

            <div className="rounded-2xl border border-[#E4DCCE] bg-white p-3.5 dark:border-[#213840] dark:bg-[#132329]">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-[#52636A] dark:text-[#9BB0B8]">
                  {t('ބަސް / ލޭބަލް', 'UI Language', lang)}
                </span>
                <Languages className="h-4 w-4 text-[#0D6E6E] dark:text-[#2DD4BF]" />
              </div>
              <div className="grid grid-cols-2 gap-2" dir="ltr">
                {UI_LANGUAGE_OPTIONS.map((opt) => {
                  const active = settings.uiLanguage === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        onUpdateSettings({
                          ...settings,
                          uiLanguage: opt.key,
                        })
                      }
                      className={`cursor-pointer rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                        active
                          ? 'border-[#0D6E6E] bg-[#0D6E6E] text-white dark:border-[#2DD4BF] dark:bg-[#2DD4BF] dark:text-[#0B161A]'
                          : 'border-[#E4DCCE] bg-[#FAF7F2] text-[#142126] hover:bg-[#F2ECE1] dark:border-[#213840] dark:bg-[#182C33] dark:text-[#F1F5F9]'
                      }`}
                    >
                      {opt.settingsLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-[#E4DCCE] bg-white p-3.5 dark:border-[#213840] dark:bg-[#132329]">
            <span className="text-sm font-medium text-[#142126] dark:text-[#F1F5F9]">
              {t('ލެޓިން ކިޔާގޮތް ދައްކާ', 'Show Romanized Pronunciation Hints', lang)}
            </span>
            <input
              type="checkbox"
              checked={settings.showRomanization}
              onChange={(e) =>
                onUpdateSettings({ ...settings, showRomanization: e.target.checked })
              }
              className="h-4 w-4 accent-[#0D6E6E]"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-[#E4DCCE] bg-white p-3.5 dark:border-[#213840] dark:bg-[#132329]">
            <span className="text-sm font-medium text-[#142126] dark:text-[#F1F5F9]">
              {t('އިނގިރޭސި މާނަ ދައްކާ', 'Show English word translations', lang)}
            </span>
            <input
              type="checkbox"
              checked={settings.showEnglish}
              onChange={(e) =>
                onUpdateSettings({ ...settings, showEnglish: e.target.checked })
              }
              className="h-4 w-4 accent-[#0D6E6E]"
            />
          </label>

          {/* JSON Backup */}
          <div className="rounded-2xl border border-[#E4DCCE] bg-white p-4 dark:border-[#213840] dark:bg-[#132329]">
            <div className="text-sm font-semibold text-[#142126] dark:text-[#F1F5F9]">
              {t('ޕްރޮގްރެސް ބެކަޕް (JSON)', 'Progress Backup & Restore', lang)}
            </div>
            <p className="mt-1 text-xs text-[#52636A] dark:text-[#9BB0B8]">
              {t(
                'ތިބާގެ FSRS މުރާޖަޢާ ތާވަލާއި، އެނގޭ ބަސްތަކާއި ކުޅިވަރުގެ ރެކޯޑު ރައްކާކުރޭ.',
                'Export or restore your FSRS review history, known words, streaks, and game stats.',
                lang
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0D6E6E] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#095555] dark:bg-[#2DD4BF] dark:text-[#0B161A]"
              >
                <Download className="h-4 w-4" />
                <span>{t('ބެކަޕް ޑައުންލޯޑް', 'Export JSON', lang)}</span>
              </button>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#E4DCCE] bg-[#FAF7F2] px-3.5 py-2 text-xs font-semibold text-[#142126] hover:bg-[#F2ECE1] dark:border-[#213840] dark:bg-[#182C33] dark:text-[#F1F5F9]"
              >
                <Upload className="h-4 w-4" />
                <span>{t('ބެކަޕް އަޕްލޯޑް', 'Import JSON', lang)}</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                }}
              />
            </div>
            {statusMsg && (
              <p className="mt-2 text-xs font-medium text-[#0D6E6E] dark:text-[#2DD4BF]">
                {statusMsg}
              </p>
            )}
          </div>

          {/* Dataset Pipeline Audit */}
          {report && (
            <div className="rounded-2xl border border-[#E4DCCE] bg-[#F2ECE1]/60 p-4 text-xs dark:border-[#213840] dark:bg-[#132329]/70">
              <div className="mb-2 flex items-center gap-1.5 font-semibold text-[#142126] dark:text-[#F1F5F9]">
                <Database className="h-4 w-4 text-[#0D6E6E] dark:text-[#2DD4BF]" />
                <span>{t('ރަދީފު ޑޭޓާބޭސް ތަފާސްހިސާބު', 'Radheef Corpus Stats', lang)}</span>
              </div>
              <div className="grid grid-cols-2 gap-y-1 text-[#52636A] dark:text-[#9BB0B8]">
                <span>{t('ޖުމްލަ ބަސް:', 'Canonical words:', lang)}</span>
                <span dir="ltr" className="font-mono font-semibold text-[#142126] dark:text-[#F1F5F9]">
                  {report.canonicalEntryCount.toLocaleString()}
                </span>
                <span>{t('މާނަ ލިންކު:', 'Cross-links:', lang)}</span>
                <span dir="ltr" className="font-mono font-semibold text-[#142126] dark:text-[#F1F5F9]">
                  {report.totalCrossLinks.toLocaleString()}
                </span>
                <span>{t('އާއިލާ ގްރޫޕް:', 'Root families:', lang)}</span>
                <span dir="ltr" className="font-mono font-semibold text-[#142126] dark:text-[#F1F5F9]">
                  {report.entriesWithFamily.toLocaleString()}
                </span>
                <span>{t('ބަސްލީ ލަފުޒު:', '4-syllable Wordle:', lang)}</span>
                <span dir="ltr" className="font-mono font-semibold text-[#142126] dark:text-[#F1F5F9]">
                  {report.wordle4ValidCount.toLocaleString()}
                </span>
                {typeof report.englishTranslatedCount === 'number' && (
                  <>
                    <span>{t('އިނގިރޭސި މާނަ:', 'English coverage:', lang)}</span>
                    <span dir="ltr" className="font-mono font-semibold text-[#142126] dark:text-[#F1F5F9]">
                      {report.englishTranslatedCount.toLocaleString()}
                      {typeof report.englishCoveragePct === 'number'
                        ? ` (${report.englishCoveragePct}%)`
                        : ''}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
