import { Fragment } from 'react';
import { stripThaanaPunctuation } from '../lib/thaana.ts';

interface Props {
  text: string;
  currentHeadword?: string;
  headwordSet: Set<string>;
  onSelectHeadword: (headword: string) => void;
}

export function SenseText({
  text,
  currentHeadword,
  headwordSet,
  onSelectHeadword,
}: Props) {
  // Split preserving whitespace and newlines so multi-paragraph Radheef entries stay faithful
  const parts = text.split(/(\s+)/);

  return (
    <span dir="rtl" className="thaana-reading whitespace-pre-line">
      {parts.map((part, idx) => {
        if (!part || /^\s+$/.test(part)) {
          return <Fragment key={idx}>{part}</Fragment>;
        }

        const clean = stripThaanaPunctuation(part);
        const canLink =
          clean.length >= 2 &&
          clean !== currentHeadword &&
          headwordSet.has(clean);

        if (!canLink) {
          return <Fragment key={idx}>{part}</Fragment>;
        }

        const startIdx = part.indexOf(clean);
        const prefix = part.slice(0, startIdx);
        const suffix = part.slice(startIdx + clean.length);

        return (
          <Fragment key={idx}>
            {prefix}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectHeadword(clean);
              }}
              className="inline cursor-pointer rounded-sm px-0.5 font-medium text-[#0D6E6E] underline decoration-[#0D6E6E]/35 decoration-dotted underline-offset-4 transition-colors hover:bg-[#0D6E6E]/10 hover:decoration-[#0D6E6E] hover:decoration-solid dark:text-[#2DD4BF] dark:decoration-[#2DD4BF]/40 dark:hover:bg-[#2DD4BF]/15"
            >
              {clean}
            </button>
            {suffix}
          </Fragment>
        );
      })}
    </span>
  );
}
