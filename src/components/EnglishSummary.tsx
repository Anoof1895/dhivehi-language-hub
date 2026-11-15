import type { DictionaryEntry } from '../types/dictionary.ts';

interface Props {
  entry: DictionaryEntry;
  showEnglish: boolean;
  compact?: boolean;
}

function normalizeForCompare(str: string): string {
  return str.toLowerCase().replace(/[.!?\s]+$/g, '').trim();
}

export function EnglishSummary({ entry, showEnglish, compact = false }: Props) {
  if (!showEnglish) return null;

  const gloss = entry.enGloss?.trim() ?? '';
  const meaning = entry.enMeaning?.trim() ?? '';
  if (!gloss && !meaning) return null;

  const showMeaning =
    Boolean(meaning) &&
    (!gloss || normalizeForCompare(meaning) !== normalizeForCompare(gloss));

  return (
    <div
      dir="ltr"
      className={
        compact
          ? 'mt-2.5 rounded-xl border border-[#E4DCCE]/80 bg-[#FAF7F2]/80 px-3 py-2 text-left dark:border-[#213840] dark:bg-[#0F1E24]/80'
          : 'mt-3.5 rounded-2xl border border-[#E4DCCE] bg-[#FAF7F2] px-3.5 py-2.5 text-left dark:border-[#213840] dark:bg-[#0F1E24]'
      }
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0 rounded-md bg-[#0D6E6E]/12 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-[#0D6E6E] uppercase dark:bg-[#2DD4BF]/15 dark:text-[#2DD4BF]">
          EN
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          {gloss && (
            <div className="text-xs sm:text-sm font-semibold text-[#142126] dark:text-[#F1F5F9]">
              {gloss}
            </div>
          )}
          {showMeaning && (
            <p className="text-xs leading-relaxed text-[#52636A] dark:text-[#9BB0B8]">
              {meaning}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
