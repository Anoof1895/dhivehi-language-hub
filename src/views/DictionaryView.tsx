import { useEffect, useState } from 'react';
import {
  Search,
  Keyboard,
  SlidersHorizontal,
  X,
  Link2,
  GitBranch,
  Sparkles,
} from 'lucide-react';
import type {
  DialectTag,
  DictionaryEntry,
  RegisterTag,
  SearchFilters,
  SearchResultItem,
  UserSettings,
} from '../types/dictionary.ts';
import type { SearchResponse } from '../hooks/useDictionary.ts';
import {
  DIALECT_LABELS,
  REGISTER_LABELS,
  WORDCLASS_LABELS,
  formatBiLabel,
  formatCount,
  getUiDirection,
  t,
} from '../lib/labels.ts';
import { latinToThaanaPhonetic } from '../lib/thaana.ts';
import { MetadataBadges } from '../components/MetadataBadges.tsx';
import { SenseText } from '../components/SenseText.tsx';
import { VirtualThaanaKeyboard } from '../components/VirtualThaanaKeyboard.tsx';

interface Props {
  settings: UserSettings;
  headwordSet: Set<string>;
  searchFn: (filters: SearchFilters, offset?: number, limit?: number) => Promise<SearchResponse>;
  onToggleIme: (enabled: boolean) => void;
  onInspectId: (id: number) => void;
  onInspectHeadword: (hw: string) => void;
}

const WORDCLASS_FILTER_KEYS = ['ނ', 'މ', 'ނއ', 'ނއނ', 'އ', 'ކއ', 'ގބ', 'އކ', 'އތ', 'unclassified'];
const DIALECT_FILTER_KEYS: DialectTag[] = [
  'addu',
  'fuvahmulah',
  'huvadhoo',
  'archaic',
  'laamu',
  'lhaviyani',
  'haa',
];
const REGISTER_FILTER_KEYS: RegisterTag[] = ['honorific', 'figurative', 'proverb'];

export function DictionaryView({
  settings,
  headwordSet,
  searchFn,
  onToggleIme,
  onInspectId,
  onInspectHeadword,
}: Props) {
  const lang = settings.uiLanguage;
  const [rawInput, setRawInput] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<Omit<SearchFilters, 'query'>>({
    wordclass: '',
    dialect: '',
    register: '',
    hasFamily: false,
    hasSynonyms: false,
    searchInDefinitions: true,
  });

  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<SearchResultItem[]>([]);
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const effectiveQuery = settings.phoneticImeEnabled
    ? latinToThaanaPhonetic(rawInput)
    : rawInput;

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      searchFn({ ...filters, query: effectiveQuery }, 0, 30)
        .then((res) => {
          if (!active) return;
          setTotal(res.total);
          setItems(res.items);
          setEntries(res.entries);
          setLoading(false);
        })
        .catch(() => {
          if (active) setLoading(false);
        });
    }, 80);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [effectiveQuery, filters, searchFn]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await searchFn(
        { ...filters, query: effectiveQuery },
        entries.length,
        30
      );
      setItems((prev) => [...prev, ...res.items]);
      setEntries((prev) => [...prev, ...res.entries]);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleInputChange = (val: string) => {
    if (settings.phoneticImeEnabled) {
      setRawInput(latinToThaanaPhonetic(val));
    } else {
      setRawInput(val);
    }
  };

  const activeFilterCount =
    (filters.wordclass ? 1 : 0) +
    (filters.dialect ? 1 : 0) +
    (filters.register ? 1 : 0) +
    (filters.hasFamily ? 1 : 0) +
    (filters.hasSynonyms ? 1 : 0);

  const textDir = getUiDirection(lang);
  const hasThaanaInput = /[\u0780-\u07BF]/.test(rawInput);
  const hasLatinInput = /[A-Za-z0-9]/.test(rawInput);
  const searchInputDir: 'ltr' | 'rtl' = hasThaanaInput
    ? 'rtl'
    : hasLatinInput || lang === 'en'
    ? 'ltr'
    : 'rtl';

  return (
    <div className="space-y-5">
      {/* Search Console */}
      <section className="rounded-3xl border border-[#E4DCCE] bg-white p-4 sm:p-5 shadow-xs dark:border-[#213840] dark:bg-[#132329]">
        <div className="flex flex-col gap-3">
          <div
            dir="ltr"
            className="flex items-center gap-2 rounded-2xl border border-[#E4DCCE] bg-[#FAF7F2] px-3.5 py-1.5 focus-within:border-[#0D6E6E] dark:border-[#213840] dark:bg-[#0B161A] dark:focus-within:border-[#2DD4BF]"
          >
            <Search className="h-5 w-5 shrink-0 text-[#52636A] dark:text-[#9BB0B8]" />
            <input
              type="text"
              dir={searchInputDir}
              value={rawInput}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={t(
                '\u2067ތާނަ ނުވަތަ ލެޓިންއިން ބަސް ހޯދާ (މިސާލު: ލޯބި / \u2066loabi\u2069 / \u2066fathihondheli\u2069)...\u2069',
                'Search in Thaana or Latin (e.g. \u2067ލޯބި\u2069, loabi, haharu)...',
                lang
              )}
              className={`flex-1 min-w-0 bg-transparent py-1.5 text-base text-[#142126] placeholder:text-[#52636A]/70 focus:outline-none dark:text-[#F1F5F9] ${
                searchInputDir === 'rtl' ? 'text-right' : 'text-left'
              }`}
            />
            {rawInput && (
              <button
                type="button"
                onClick={() => setRawInput('')}
                aria-label="Clear search"
                className="shrink-0 cursor-pointer rounded-xl p-1.5 text-[#52636A] hover:bg-[#E4DCCE]/50 dark:text-[#9BB0B8]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowKeyboard((v) => !v)}
              aria-label="Toggle Thaana keyboard"
              className={`shrink-0 cursor-pointer rounded-xl p-2 transition ${
                showKeyboard
                  ? 'bg-[#0D6E6E] text-white dark:bg-[#2DD4BF] dark:text-[#0B161A]'
                  : 'text-[#52636A] hover:bg-[#F2ECE1] dark:text-[#9BB0B8] dark:hover:bg-[#182C33]'
              }`}
            >
              <Keyboard className="h-4 w-4" />
            </button>
          </div>

          {/* Search Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleIme(!settings.phoneticImeEnabled)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  settings.phoneticImeEnabled
                    ? 'border-[#0D6E6E] bg-[#0D6E6E]/12 text-[#0D6E6E] dark:border-[#2DD4BF] dark:bg-[#2DD4BF]/15 dark:text-[#2DD4BF]'
                    : 'border-[#E4DCCE] bg-[#FAF7F2] text-[#52636A] dark:border-[#213840] dark:bg-[#182C33] dark:text-[#9BB0B8]'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span dir={textDir}>{t('ލެޓިން → ތާނަ IME', 'Live Phonetic IME', lang)}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  showFilters || activeFilterCount > 0
                    ? 'border-[#D95D39] bg-[#D95D39]/10 text-[#B84524] dark:border-[#FB923C] dark:text-[#FB923C]'
                    : 'border-[#E4DCCE] bg-[#FAF7F2] text-[#52636A] dark:border-[#213840] dark:bg-[#182C33] dark:text-[#9BB0B8]'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span dir={textDir}>
                  {t('ފިލްޓަރު', 'Filters', lang)}
                  {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                </span>
              </button>

              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#E4DCCE] bg-[#FAF7F2] px-3 py-1.5 text-xs font-medium text-[#52636A] dark:border-[#213840] dark:bg-[#182C33] dark:text-[#9BB0B8]">
                <input
                  type="checkbox"
                  checked={filters.searchInDefinitions}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, searchInDefinitions: e.target.checked }))
                  }
                  className="accent-[#0D6E6E]"
                />
                <span dir={textDir}>{t('މާނައިގެ ތެރެއިން ހޯދާ', 'Search in Definitions', lang)}</span>
              </label>
            </div>

            <div dir={textDir} className="text-xs font-medium text-[#52636A] dark:text-[#9BB0B8]">
              {loading
                ? t('ހޯދަނީ...', 'Searching...', lang)
                : lang === 'en'
                ? formatCount(total, 'result')
                : lang === 'dv-en'
                ? `${total.toLocaleString()} ނަތީޖާ · \u2066${formatCount(total, 'result')}\u2069`
                : `${total.toLocaleString()} ނަތީޖާ`}
            </div>
          </div>

          {/* Facet Filters Panel */}
          {showFilters && (
            <div className="grid gap-3 rounded-2xl border border-[#E4DCCE] bg-[#FAF7F2] p-3.5 sm:grid-cols-3 dark:border-[#213840] dark:bg-[#0F1E24]">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#52636A] dark:text-[#9BB0B8]">
                  {t('ބަހުގެ ބައި', 'Wordclass', lang)}
                </label>
                <select
                  value={filters.wordclass}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, wordclass: e.target.value }))
                  }
                  className="w-full rounded-xl border border-[#E4DCCE] bg-white px-2.5 py-2 text-xs text-[#142126] dark:border-[#213840] dark:bg-[#132329] dark:text-[#F1F5F9]"
                >
                  <option value="">{t('ހުރިހާ ބައިތައް', 'All Wordclasses', lang)}</option>
                  {WORDCLASS_FILTER_KEYS.map((wc) => (
                    <option key={wc} value={wc}>
                      {formatBiLabel(WORDCLASS_LABELS[wc], lang)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#52636A] dark:text-[#9BB0B8]">
                  {t('ބަހުރުވަ / އަޞްލު', 'Dialect / Origin', lang)}
                </label>
                <select
                  value={filters.dialect}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      dialect: e.target.value as DialectTag | '',
                    }))
                  }
                  className="w-full rounded-xl border border-[#E4DCCE] bg-white px-2.5 py-2 text-xs text-[#142126] dark:border-[#213840] dark:bg-[#132329] dark:text-[#F1F5F9]"
                >
                  <option value="">{t('ހުރިހާ ބަހުރުވަ', 'All Dialects', lang)}</option>
                  {DIALECT_FILTER_KEYS.map((d) => (
                    <option key={d} value={d}>
                      {formatBiLabel(DIALECT_LABELS[d], lang)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#52636A] dark:text-[#9BB0B8]">
                  {t('ބަސްމަގު / ސްޓައިލް', 'Register', lang)}
                </label>
                <select
                  value={filters.register}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      register: e.target.value as RegisterTag | '',
                    }))
                  }
                  className="w-full rounded-xl border border-[#E4DCCE] bg-white px-2.5 py-2 text-xs text-[#142126] dark:border-[#213840] dark:bg-[#132329] dark:text-[#F1F5F9]"
                >
                  <option value="">{t('ހުރިހާ ސްޓައިލެއް', 'All Registers', lang)}</option>
                  {REGISTER_FILTER_KEYS.map((r) => (
                    <option key={r} value={r}>
                      {formatBiLabel(REGISTER_LABELS[r], lang)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-[#142126] dark:text-[#F1F5F9]">
                  <input
                    type="checkbox"
                    checked={filters.hasFamily}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, hasFamily: e.target.checked }))
                    }
                    className="accent-[#0D6E6E]"
                  />
                  <span>{t('މޫދު އާއިލާ ހުރި ބަސްތައް', 'Has Root Family', lang)}</span>
                </label>

                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-[#142126] dark:text-[#F1F5F9]">
                  <input
                    type="checkbox"
                    checked={filters.hasSynonyms}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, hasSynonyms: e.target.checked }))
                    }
                    className="accent-[#0D6E6E]"
                  />
                  <span>{t('އެއްމާނަ ބަސް ހުރި', 'Has Synonyms', lang)}</span>
                </label>

                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        wordclass: '',
                        dialect: '',
                        register: '',
                        hasFamily: false,
                        hasSynonyms: false,
                      }))
                    }
                    className="ms-auto cursor-pointer text-xs font-semibold text-[#D95D39] hover:underline dark:text-[#FB923C]"
                  >
                    {t('ފިލްޓަރުތައް ފޮހެލާ', 'Reset Filters', lang)}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Collapsible Virtual Thaana Keyboard */}
          {showKeyboard && (
            <VirtualThaanaKeyboard
              mode="search"
              lang={lang}
              onChar={(ch) => setRawInput((prev) => prev + ch)}
              onSpace={() => setRawInput((prev) => prev + ' ')}
              onBackspace={() => setRawInput((prev) => prev.slice(0, -1))}
            />
          )}
        </div>
      </section>

      {/* Results List */}
      <section className="space-y-3">
        {!loading && entries.length === 0 ? (
          <div className="rounded-3xl border border-[#E4DCCE] bg-white p-8 text-center dark:border-[#213840] dark:bg-[#132329]">
            <p className="text-sm font-medium text-[#52636A] dark:text-[#9BB0B8]">
              {t('ތިޔަ ހޯއްދެވި ބަހެއް ނުފެނުނު. އެހެން އިބާރާތެއް ނުވަތަ ފިލްޓަރު ބަދަލުކޮށްލައްވާ.', 'No matching entries found. Try adjusting your query or filters.', lang)}
            </p>
          </div>
        ) : (
          entries.map((entry, idx) => {
            const matchMeta = items[idx];
            return (
              <article
                key={entry.id}
                className="rounded-2xl border border-[#E4DCCE] bg-white p-4 sm:p-5 transition hover:border-[#0D6E6E]/45 dark:border-[#213840] dark:bg-[#132329] dark:hover:border-[#2DD4BF]/45"
              >
                <div dir="rtl" className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <button
                      type="button"
                      dir="rtl"
                      onClick={() => onInspectId(entry.id)}
                      className="font-display-thaana cursor-pointer text-right text-xl sm:text-2xl font-bold text-[#142126] transition hover:text-[#0D6E6E] dark:text-[#F1F5F9] dark:hover:text-[#2DD4BF]"
                    >
                      {entry.headword}
                    </button>
                    {settings.showRomanization && entry.romanized && (
                      <span
                        className="font-mono text-xs text-[#52636A] dark:text-[#9BB0B8]"
                        dir="ltr"
                      >
                        /{entry.romanized}/
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2" dir="ltr">
                    {entry.familyIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onInspectId(entry.id)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[#0D6E6E]/10 px-2 py-0.5 text-[11px] font-semibold text-[#0D6E6E] dark:bg-[#2DD4BF]/15 dark:text-[#2DD4BF]"
                      >
                        <GitBranch className="h-3 w-3" />
                        <span>{entry.familyIds.length}</span>
                      </button>
                    )}
                    {entry.referencedInCount > 0 && (
                      <button
                        type="button"
                        onClick={() => onInspectId(entry.id)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[#F2ECE1] px-2 py-0.5 text-[11px] font-semibold text-[#52636A] hover:text-[#0D6E6E] dark:bg-[#182C33] dark:text-[#9BB0B8] dark:hover:text-[#2DD4BF]"
                      >
                        <Link2 className="h-3 w-3" />
                        <span>{entry.referencedInCount}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div dir="rtl" className="mt-2">
                  <MetadataBadges entry={entry} lang={lang} compact />
                </div>

                <ol dir="rtl" className="mt-3 space-y-1.5">
                  {entry.senses.slice(0, 3).map((sense, sIdx) => (
                    <li
                      key={sIdx}
                      className="flex gap-2 text-sm sm:text-base text-[#142126] dark:text-[#F1F5F9]"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0D6E6E]/60 dark:bg-[#2DD4BF]/60" />
                      <SenseText
                        text={sense}
                        currentHeadword={entry.headword}
                        headwordSet={headwordSet}
                        onSelectHeadword={onInspectHeadword}
                      />
                    </li>
                  ))}
                </ol>

                {entry.senses.length > 3 && (
                  <div dir="rtl" className="mt-2">
                    <button
                      type="button"
                      dir={textDir}
                      onClick={() => onInspectId(entry.id)}
                      className="cursor-pointer text-xs font-semibold text-[#0D6E6E] hover:underline dark:text-[#2DD4BF]"
                    >
                      {t(
                        `އިތުރު ${entry.senses.length - 3} މާނަ ދައްކާ...`,
                        entry.senses.length - 3 === 1
                          ? 'Show 1 more sense...'
                          : `Show ${entry.senses.length - 3} more senses...`,
                        lang
                      )}
                    </button>
                  </div>
                )}

                {matchMeta?.matchType === 'definition' && matchMeta.snippet && (
                  <p
                    dir={textDir}
                    className="mt-2 rounded-lg bg-[#F2ECE1]/60 px-2.5 py-1 text-xs text-[#52636A] dark:bg-[#182C33] dark:text-[#9BB0B8]"
                  >
                    {t('މާނައިން ފެނުނު:', 'Matched in sense:', lang)}{' '}
                    <span dir="rtl" className="inline-block">
                      {matchMeta.snippet}
                    </span>
                  </p>
                )}
              </article>
            );
          })
        )}

        {entries.length < total && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="cursor-pointer rounded-2xl border border-[#E4DCCE] bg-white px-6 py-2.5 text-sm font-semibold text-[#142126] transition hover:border-[#0D6E6E] hover:text-[#0D6E6E] disabled:opacity-50 dark:border-[#213840] dark:bg-[#132329] dark:text-[#F1F5F9]"
            >
              {loadingMore
                ? t('ލޯޑުވަނީ...', 'Loading...', lang)
                : t(
                    `އިތުރު ބަސްތައް (${(total - entries.length).toLocaleString()} ބާކީ)`,
                    `Load More (${(total - entries.length).toLocaleString()} left)`,
                    lang
                  )}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
