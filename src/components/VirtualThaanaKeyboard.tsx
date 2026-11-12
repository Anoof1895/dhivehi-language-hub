import { useState } from 'react';
import { Delete, CornerDownLeft, Space, ChevronDown, ChevronUp } from 'lucide-react';
import {
  THAANA_EXTENDED_CONSONANTS,
  THAANA_FILI,
  THAANA_PRIMARY_CONSONANTS,
} from '../lib/thaana.ts';
import type { TileStatus } from '../lib/wordle.ts';
import type { UiLanguage } from '../types/dictionary.ts';
import { t } from '../lib/labels.ts';

interface Props {
  mode: 'search' | 'wordle';
  lang: UiLanguage;
  keyStates?: Record<string, TileStatus>;
  pendingConsonant?: string | null;
  onChar: (ch: string) => void;
  onFili?: (fili: string) => void;
  onBackspace: () => void;
  onSpace?: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
}

const KEY_ROWS = [
  THAANA_PRIMARY_CONSONANTS.slice(0, 8),
  THAANA_PRIMARY_CONSONANTS.slice(8, 16),
  THAANA_PRIMARY_CONSONANTS.slice(16, 24),
];

function getKeyColorClass(status?: TileStatus): string {
  switch (status) {
    case 'exact':
      return 'bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-500 dark:text-slate-950';
    case 'present':
      return 'bg-amber-500 text-white border-amber-600 dark:bg-amber-400 dark:text-slate-950';
    case 'consonant':
      return 'bg-sky-500/20 text-sky-900 border-sky-500 ring-1 ring-sky-500/50 dark:bg-sky-400/20 dark:text-sky-200 dark:border-sky-400';
    case 'absent':
      return 'bg-slate-300/70 text-slate-500 border-slate-300 dark:bg-slate-800/80 dark:text-slate-500 dark:border-slate-700';
    default:
      return 'bg-white text-[#142126] border-[#E4DCCE] hover:bg-[#F2ECE1] dark:bg-[#182C33] dark:text-[#F1F5F9] dark:border-[#213840] dark:hover:bg-[#213840]';
  }
}

export function VirtualThaanaKeyboard({
  mode,
  lang,
  keyStates = {},
  pendingConsonant,
  onChar,
  onFili,
  onBackspace,
  onSpace,
  onSubmit,
  submitLabel,
}: Props) {
  const [showExtended, setShowExtended] = useState(false);

  return (
    <div
      className="rounded-2xl border border-[#E4DCCE] bg-[#F2ECE1]/75 p-2.5 sm:p-3 dark:border-[#213840] dark:bg-[#0F1E24]"
      dir="rtl"
    >
      {/* Fili row (prominent at top so Consonant -> Fili feels effortless) */}
      <div className="mb-2 flex flex-wrap items-center justify-center gap-1.5">
        {THAANA_FILI.map((f) => {
          const preview = pendingConsonant ? `${pendingConsonant}${f}` : `\u25CC${f}`;
          return (
            <button
              key={f}
              type="button"
              onClick={() => (onFili ? onFili(f) : onChar(f))}
              className="flex h-10 min-w-[2.45rem] cursor-pointer items-center justify-center rounded-xl border border-[#0D6E6E]/25 bg-[#0D6E6E]/10 px-2 text-lg font-semibold text-[#0D6E6E] transition active:scale-95 hover:bg-[#0D6E6E]/20 dark:border-[#2DD4BF]/30 dark:bg-[#2DD4BF]/12 dark:text-[#2DD4BF] dark:hover:bg-[#2DD4BF]/25"
              title={f === 'ް' ? t('ސުކުން', 'Sukun', lang) : undefined}
            >
              {preview}
            </button>
          );
        })}
      </div>

      {/* Primary 24 Thaana consonants */}
      <div className="space-y-1.5">
        {KEY_ROWS.map((row, rIdx) => (
          <div key={rIdx} className="grid grid-cols-8 gap-1 sm:gap-1.5">
            {row.map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => onChar(ch)}
                className={`flex h-10 sm:h-11 cursor-pointer items-center justify-center rounded-xl border text-lg font-semibold transition active:scale-95 ${getKeyColorClass(
                  keyStates[ch]
                )} ${
                  pendingConsonant === ch
                    ? 'ring-2 ring-[#D95D39] dark:ring-[#FB923C]'
                    : ''
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Extended dotted consonants (optional drawer) */}
      {showExtended && (
        <div className="mt-1.5 grid grid-cols-8 gap-1 sm:gap-1.5">
          {THAANA_EXTENDED_CONSONANTS.map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => onChar(ch)}
              className={`flex h-10 cursor-pointer items-center justify-center rounded-xl border text-base font-semibold transition active:scale-95 ${getKeyColorClass(
                keyStates[ch]
              )}`}
            >
              {ch}
            </button>
          ))}
        </div>
      )}

      {/* Control bar */}
      <div className="mt-2 flex items-center justify-between gap-1.5">
        <button
          type="button"
          onClick={() => setShowExtended((v) => !v)}
          className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-xl border border-[#E4DCCE] bg-white px-2.5 text-xs font-medium text-[#52636A] transition hover:bg-[#F2ECE1] dark:border-[#213840] dark:bg-[#182C33] dark:text-[#9BB0B8]"
        >
          {showExtended ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          <span>{t('އިތުރު އަކުރު', 'Dotted', lang)}</span>
        </button>

        {mode === 'search' && onSpace && (
          <button
            type="button"
            onClick={onSpace}
            className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#E4DCCE] bg-white px-3 text-xs font-medium text-[#52636A] transition hover:bg-[#F2ECE1] dark:border-[#213840] dark:bg-[#182C33] dark:text-[#9BB0B8]"
          >
            <Space className="h-4 w-4" />
            <span>{t('ހުސްތަން', 'Space', lang)}</span>
          </button>
        )}

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onBackspace}
            aria-label="Backspace"
            className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-xl border border-[#E4DCCE] bg-white px-3 text-sm font-medium text-[#142126] transition active:scale-95 hover:bg-[#F2ECE1] dark:border-[#213840] dark:bg-[#182C33] dark:text-[#F1F5F9]"
          >
            <Delete className="h-4 w-4" />
            <span className="text-xs">{t('ފޮހެލާ', 'Del', lang)}</span>
          </button>

          {onSubmit && (
            <button
              type="button"
              onClick={onSubmit}
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-[#0D6E6E] px-4 text-sm font-semibold text-white transition active:scale-95 hover:bg-[#095555] dark:bg-[#2DD4BF] dark:text-[#0B161A] dark:hover:bg-[#14B8A6]"
            >
              <CornerDownLeft className="h-4 w-4" />
              <span>{submitLabel ?? t('ހުށަހަޅާ', 'Enter', lang)}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
