import type { DictionaryEntry, UiLanguage } from '../types/dictionary.ts';
import {
  DIALECT_LABELS,
  INFERRED_WORDCLASS_LABELS,
  REGISTER_LABELS,
  WORDCLASS_LABELS,
  formatBiLabel,
  formatCount,
  t,
} from '../lib/labels.ts';

interface Props {
  entry: DictionaryEntry;
  lang: UiLanguage;
  compact?: boolean;
}

export function MetadataBadges({ entry, lang, compact = false }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {entry.wordclasses.map((wc) => {
        const label = WORDCLASS_LABELS[wc] ?? { dv: wc, en: wc };
        return (
          <span
            key={wc}
            className="thaana-pill inline-flex items-center rounded-full bg-[#0D6E6E]/12 px-2.5 text-xs font-semibold text-[#0D6E6E] dark:bg-[#2DD4BF]/15 dark:text-[#2DD4BF]"
          >
            {formatBiLabel(label, lang)}
          </span>
        );
      })}

      {entry.wordclasses.length === 0 && entry.inferredWordclass && (
        <span
          className="thaana-pill inline-flex items-center rounded-full border border-dashed border-[#0D6E6E]/40 px-2.5 text-xs text-[#52636A] dark:border-[#2DD4BF]/40 dark:text-[#9BB0B8]"
          title={t('ރަދީފުގައި ބައި ލިޔެފައި ނެތް (ލަފާކުރެވޭ ބައި)', 'Inferred from word structure', lang)}
        >
          {formatBiLabel(INFERRED_WORDCLASS_LABELS[entry.inferredWordclass], lang)}
        </span>
      )}

      {entry.wordclasses.length === 0 && !entry.inferredWordclass && !compact && (
        <span className="thaana-pill inline-flex items-center rounded-full bg-[#F2ECE1] px-2.5 text-xs text-[#52636A] dark:bg-[#182C33] dark:text-[#9BB0B8]">
          {formatBiLabel(WORDCLASS_LABELS.unclassified, lang)}
        </span>
      )}

      {entry.dialects.map((d) => (
        <span
          key={d}
          className="thaana-pill inline-flex items-center rounded-full bg-amber-500/15 px-2.5 text-xs font-medium text-amber-800 dark:bg-amber-400/15 dark:text-amber-300"
        >
          {formatBiLabel(DIALECT_LABELS[d], lang)}
        </span>
      ))}

      {entry.registers.map((r) => (
        <span
          key={r}
          className="thaana-pill inline-flex items-center rounded-full bg-[#D95D39]/14 px-2.5 text-xs font-medium text-[#B84524] dark:bg-[#FB923C]/15 dark:text-[#FB923C]"
        >
          {formatBiLabel(REGISTER_LABELS[r], lang)}
        </span>
      ))}

      {!compact && entry.referencedInCount > 0 && (
        <span className="thaana-pill inline-flex items-center rounded-full bg-slate-500/10 px-2.5 text-xs text-[#52636A] dark:text-[#9BB0B8]">
          {lang === 'en'
            ? formatCount(entry.referencedInCount, 'ref')
            : lang === 'dv-en'
            ? `${entry.referencedInCount.toLocaleString()} މާނައިގައި · \u2066${formatCount(entry.referencedInCount, 'ref')}\u2069`
            : `${entry.referencedInCount.toLocaleString()} މާނައިގައި`}
        </span>
      )}
    </div>
  );
}
