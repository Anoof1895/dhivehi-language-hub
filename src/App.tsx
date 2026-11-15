import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Search,
  Gamepad2,
  Brain,
  Settings,
  Sun,
  Moon,
  Languages,
} from 'lucide-react';
import type {
  DailyTarget,
  DeckKey,
  DictionaryEntry,
  UserSettings,
} from './types/dictionary.ts';
import {
  useDictionary,
  type EntryDetailPayload,
} from './hooks/useDictionary.ts';
import {
  DEFAULT_SETTINGS,
  deleteSrsCard,
  getAllKnownWords,
  getAllSrsCards,
  getDailyProgress,
  getSettings,
  markWordKnown,
  putSrsCard,
  saveDailyProgress,
  saveSettings,
  unmarkWordKnown,
} from './storage/db.ts';
import {
  applySrsRating,
  createNewSrsCard,
  type Grade,
  type StoredSrsCard,
} from './lib/fsrs.ts';
import {
  buildActiveCandidatePool,
  ensureDailyAssignments,
  pickReplacementWordId,
  type DailyProgressState,
} from './lib/dailyQueue.ts';
import { getMaleDateKey, getPreviousDateKey } from './lib/date.ts';
import {
  UI_LANGUAGE_OPTIONS,
  getUiDirection,
  nextUiLanguage,
  t,
} from './lib/labels.ts';
import { DailyWordsView } from './views/DailyWordsView.tsx';
import { DictionaryView } from './views/DictionaryView.tsx';
import { GamesView } from './views/GamesView.tsx';
import { ReviewView } from './views/ReviewView.tsx';
import { WordInspectorDrawer } from './components/WordInspectorDrawer.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';

type NavTab = 'daily' | 'dictionary' | 'games' | 'review';

export function App() {
  const {
    ready,
    error,
    report,
    gamePools,
    headwordSet,
    search,
    getEntries,
    getEntryDetail,
    getByHeadword,
    checkWordleGuess,
    autocomplete,
  } = useDictionary();

  const [tab, setTab] = useState<NavTab>('daily');
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [srsCards, setSrsCards] = useState<StoredSrsCard[]>([]);
  const [knownIds, setKnownIds] = useState<number[]>([]);
  const [dailyProgress, setDailyProgress] = useState<DailyProgressState | null>(null);
  const [dailyEntries, setDailyEntries] = useState<DictionaryEntry[]>([]);
  const [entriesById, setEntriesById] = useState<Record<number, DictionaryEntry>>({});
  const [userDataLoaded, setUserDataLoaded] = useState(false);

  // Inspector Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [inspectorTrail, setInspectorTrail] = useState<number[]>([]);
  const [inspectorLoading, setInspectorLoading] = useState(false);
  const [inspectorDetail, setInspectorDetail] = useState<EntryDetailPayload | null>(null);

  // Settings Modal state
  const [settingsOpen, setSettingsOpen] = useState(false);

  const lang = settings.uiLanguage;
  const dateKey = getMaleDateKey();

  const loadUserPersistence = useCallback(async () => {
    const [loadedSettings, loadedCards, loadedKnown, loadedDaily] = await Promise.all([
      getSettings(),
      getAllSrsCards(),
      getAllKnownWords(),
      getDailyProgress(),
    ]);
    setSettings(loadedSettings);
    setSrsCards(loadedCards);
    setKnownIds(loadedKnown.map((k) => k.entryId));
    setDailyProgress(loadedDaily);
    setUserDataLoaded(true);
  }, []);

  useEffect(() => {
    loadUserPersistence();
  }, [loadUserPersistence]);

  // Apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [settings.theme]);

  // Keep document shell direction stationary (ltr) while updating lang and title
  useEffect(() => {
    const root = document.documentElement;
    root.dir = 'ltr';
    root.lang = lang === 'en' ? 'en' : 'dv';
    document.title = lang === 'en' ? 'Dhivehi Language Hub' : 'ދިވެހި ބަހުގެ މަރުކަޒު';
  }, [lang]);

  const knownSet = useMemo(() => new Set(knownIds), [knownIds]);
  const srsSet = useMemo(() => new Set(srsCards.map((c) => c.entryId)), [srsCards]);

  // Ensure daily assignments & hydrate daily + SRS + known entry metadata
  useEffect(() => {
    if (!ready || !gamePools || !userDataLoaded) return;

    const pool = buildActiveCandidatePool(gamePools, settings.activeDecks);
    const updated = ensureDailyAssignments(
      dailyProgress,
      dateKey,
      settings.dailyTarget,
      pool,
      knownSet,
      srsSet
    );

    const changed =
      !dailyProgress ||
      dailyProgress.dateKey !== updated.dateKey ||
      dailyProgress.assignedIds.join(',') !== updated.assignedIds.join(',');

    if (changed) {
      setDailyProgress(updated);
      saveDailyProgress(updated);
    }

    const visibleIds = updated.assignedIds.slice(0, settings.dailyTarget);
    const allNeededIds = Array.from(
      new Set([
        ...visibleIds,
        ...srsCards.map((c) => c.entryId),
        ...knownIds.slice(0, 120),
      ])
    );

    if (allNeededIds.length === 0) {
      setDailyEntries([]);
      return;
    }

    getEntries(allNeededIds).then(async (loaded) => {
      const map: Record<number, DictionaryEntry> = {};
      for (const e of loaded) map[e.id] = e;

      const visibleDaily = visibleIds
        .map((id) => map[id])
        .filter((x): x is DictionaryEntry => Boolean(x));

      // Also resolve family IDs for visible daily cards
      const famIds = new Set<number>();
      for (const d of visibleDaily) {
        for (const fId of d.familyIds.slice(0, 6)) {
          if (!map[fId]) famIds.add(fId);
        }
      }
      if (famIds.size > 0) {
        const famLoaded = await getEntries(Array.from(famIds));
        for (const f of famLoaded) map[f.id] = f;
      }

      setEntriesById((prev) => ({ ...prev, ...map }));
      setDailyEntries(visibleDaily);
    });
  }, [
    ready,
    gamePools,
    userDataLoaded,
    dateKey,
    settings.dailyTarget,
    settings.activeDecks,
    knownSet,
    srsSet,
    dailyProgress?.dateKey,
    dailyProgress?.assignedIds.join(','),
    getEntries,
    srsCards,
    knownIds,
  ]);

  const updateSettings = async (next: UserSettings) => {
    setSettings(next);
    await saveSettings(next);
  };

  const inspectId = async (id: number) => {
    setDrawerOpen(true);
    setInspectorLoading(true);
    setInspectorTrail((prev) =>
      prev[prev.length - 1] === id ? prev : [...prev, id]
    );
    const detail = await getEntryDetail(id);
    setInspectorDetail(detail);
    setInspectorLoading(false);
  };

  const inspectHeadword = async (hw: string) => {
    setDrawerOpen(true);
    setInspectorLoading(true);
    const detail = await getByHeadword(hw);
    if (detail) {
      setInspectorTrail((prev) =>
        prev[prev.length - 1] === detail.entry.id
          ? prev
          : [...prev, detail.entry.id]
      );
      setInspectorDetail(detail);
    }
    setInspectorLoading(false);
  };

  const jumpTrailIndex = async (idx: number) => {
    if (idx < 0 || idx >= inspectorTrail.length) return;
    const targetId = inspectorTrail[idx];
    setInspectorTrail((prev) => prev.slice(0, idx + 1));
    setInspectorLoading(true);
    const detail = await getEntryDetail(targetId);
    setInspectorDetail(detail);
    setInspectorLoading(false);
  };

  const handleSwapKnown = async (entryId: number) => {
    if (!gamePools || !dailyProgress) return;
    await markWordKnown(entryId);
    const nextKnownIds = Array.from(new Set([...knownIds, entryId]));
    setKnownIds(nextKnownIds);
    setSrsCards((prev) => prev.filter((c) => c.entryId !== entryId));

    const pool = buildActiveCandidatePool(gamePools, settings.activeDecks);
    const excluded = new Set<number>([
      ...nextKnownIds,
      ...dailyProgress.assignedIds,
      ...dailyProgress.swappedIds,
      entryId,
      ...srsCards.map((c) => c.entryId),
    ]);

    const replacement = pickReplacementWordId(
      pool,
      excluded,
      dateKey,
      dailyProgress.swappedIds.length + 50
    );

    const nextAssigned = dailyProgress.assignedIds.filter((id) => id !== entryId);
    if (replacement !== null) nextAssigned.push(replacement);

    const nextProgress: DailyProgressState = {
      ...dailyProgress,
      assignedIds: nextAssigned,
      swappedIds: [...dailyProgress.swappedIds, entryId],
    };
    setDailyProgress(nextProgress);
    await saveDailyProgress(nextProgress);
  };

  const handleCompleteDailyWord = async (entryId: number) => {
    if (!dailyProgress) return;
    if (!srsSet.has(entryId)) {
      const card = await createNewSrsCard(entryId, new Date());
      await putSrsCard(card);
      setSrsCards((prev) => [...prev, card]);
    }

    const completedIds = Array.from(new Set([...dailyProgress.completedIds, entryId]));
    const prevDay = getPreviousDateKey(dateKey);
    const shouldBumpStreak = dailyProgress.lastStreakDate !== dateKey;
    const nextStreak = shouldBumpStreak
      ? dailyProgress.lastStreakDate === prevDay
        ? dailyProgress.streakCount + 1
        : 1
      : dailyProgress.streakCount;

    const nextProgress: DailyProgressState = {
      ...dailyProgress,
      completedIds,
      streakCount: nextStreak,
      lastStreakDate: dateKey,
    };
    setDailyProgress(nextProgress);
    await saveDailyProgress(nextProgress);
  };

  const handleRefreshUncompleted = async () => {
    if (!gamePools || !dailyProgress) return;
    const completedSet = new Set(dailyProgress.completedIds);
    const kept = dailyProgress.assignedIds.filter((id) => completedSet.has(id));
    const skipped = dailyProgress.assignedIds.filter((id) => !completedSet.has(id));

    const pool = buildActiveCandidatePool(gamePools, settings.activeDecks);
    const excluded = new Set<number>([
      ...knownIds,
      ...kept,
      ...skipped,
      ...dailyProgress.swappedIds,
      ...srsCards.map((c) => c.entryId),
    ]);

    const nextAssigned = [...kept];
    let salt = dailyProgress.swappedIds.length + skipped.length + Date.now() % 10000;
    while (nextAssigned.length < settings.dailyTarget) {
      const pick = pickReplacementWordId(pool, excluded, dateKey, salt++);
      if (pick === null) break;
      excluded.add(pick);
      nextAssigned.push(pick);
    }

    const nextProgress: DailyProgressState = {
      ...dailyProgress,
      assignedIds: nextAssigned,
      swappedIds: [...dailyProgress.swappedIds, ...skipped],
    };
    setDailyProgress(nextProgress);
    await saveDailyProgress(nextProgress);
  };

  const handleAddToSrs = async (entryId: number) => {
    if (srsSet.has(entryId)) return;
    if (knownSet.has(entryId)) {
      await unmarkWordKnown(entryId);
      setKnownIds((prev) => prev.filter((id) => id !== entryId));
    }
    const card = await createNewSrsCard(entryId, new Date());
    await putSrsCard(card);
    setSrsCards((prev) => [...prev, card]);
  };

  const handleToggleKnownFromDrawer = async (entryId: number) => {
    if (knownSet.has(entryId)) {
      await unmarkWordKnown(entryId);
      setKnownIds((prev) => prev.filter((id) => id !== entryId));
    } else {
      await markWordKnown(entryId);
      setKnownIds((prev) => [...prev, entryId]);
      setSrsCards((prev) => prev.filter((c) => c.entryId !== entryId));
    }
  };

  const handleRateCard = async (entryId: number, grade: Grade) => {
    const existing = srsCards.find((c) => c.entryId === entryId);
    if (!existing) return;
    const updated = await applySrsRating(existing, grade, new Date());
    await putSrsCard(updated);
    setSrsCards((prev) => prev.map((c) => (c.entryId === entryId ? updated : c)));
  };

  const dueCount = useMemo(() => {
    const nowMs = Date.now();
    return srsCards.filter((c) => new Date(c.dueAt).getTime() <= nowMs).length;
  }, [srsCards]);

  const navItems: Array<{
    key: NavTab;
    dv: string;
    en: string;
    icon: typeof BookOpen;
    badge?: number;
  }> = [
    { key: 'daily', dv: 'ދުވަހުގެ ބަސް', en: 'Daily', icon: BookOpen },
    { key: 'dictionary', dv: 'ބަސްފޮތް', en: 'Dictionary', icon: Search },
    { key: 'games', dv: 'ކުޅިވަރު', en: 'Games', icon: Gamepad2 },
    { key: 'review', dv: 'މުރާޖަޢާ', en: 'Review', icon: Brain, badge: dueCount },
  ];

  const activeLangOption =
    UI_LANGUAGE_OPTIONS.find((opt) => opt.key === lang) ?? UI_LANGUAGE_OPTIONS[0];

  const textDir = getUiDirection(lang);

  return (
    <div
      className="min-h-screen bg-[#FAF7F2] text-[#142126] dark:bg-[#0B161A] dark:text-[#F1F5F9]"
      dir="ltr"
    >
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-[#E4DCCE] bg-[#FAF7F2]/90 backdrop-blur-md dark:border-[#213840] dark:bg-[#0B161A]/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/icon.svg" alt="" className="h-9 w-9 shrink-0 rounded-xl shadow-xs" />
            <div className="min-w-0 text-left">
              <div
                dir={textDir}
                className="font-display-thaana min-h-7 truncate text-left text-lg font-bold leading-7 text-[#142126] dark:text-[#F1F5F9]"
              >
                {t('ދިވެހި ބަހުގެ މަރުކަޒު', 'Dhivehi Language Hub', lang)}
              </div>
              <div
                dir={textDir}
                className="min-h-4 text-left text-[11px] leading-4 text-[#52636A] dark:text-[#9BB0B8]"
              >
                {report
                  ? lang === 'en'
                    ? `${report.canonicalEntryCount.toLocaleString()} words · Radheef`
                    : `${report.canonicalEntryCount.toLocaleString()} ލަފުޒު · ރަދީފު`
                  : t('ރަދީފު ލޯޑުވަނީ...', 'Loading Radheef...', lang)}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* 2-way Segmented Language Switcher (Desktop/Tablet) */}
            <div
              role="group"
              aria-label="UI Language"
              dir="ltr"
              className="hidden items-center rounded-xl border border-[#E4DCCE] bg-white p-0.5 dark:border-[#213840] dark:bg-[#132329] sm:inline-flex"
            >
              {UI_LANGUAGE_OPTIONS.map((opt) => {
                const active = lang === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      updateSettings({
                        ...settings,
                        uiLanguage: opt.key,
                      })
                    }
                    className={`min-w-[3.5rem] cursor-pointer rounded-[10px] px-2.5 py-1.5 text-center text-xs font-semibold transition ${
                      active
                        ? 'bg-[#0D6E6E] text-white shadow-xs dark:bg-[#2DD4BF] dark:text-[#0B161A]'
                        : 'text-[#52636A] hover:text-[#142126] dark:text-[#9BB0B8] dark:hover:text-[#F1F5F9]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Compact Toggle Language Button (Mobile < sm) */}
            <button
              type="button"
              onClick={() =>
                updateSettings({
                  ...settings,
                  uiLanguage: nextUiLanguage(settings.uiLanguage),
                })
              }
              aria-label="Switch UI language"
              className="inline-flex min-w-[4.75rem] cursor-pointer items-center justify-center gap-1 rounded-xl border border-[#E4DCCE] bg-white px-2.5 py-2 text-xs font-semibold text-[#142126] transition hover:bg-[#F2ECE1] sm:hidden dark:border-[#213840] dark:bg-[#132329] dark:text-[#F1F5F9]"
            >
              <Languages className="h-4 w-4 shrink-0 text-[#0D6E6E] dark:text-[#2DD4BF]" />
              <span>{activeLangOption.shortLabel}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                updateSettings({
                  ...settings,
                  theme: settings.theme === 'light' ? 'dark' : 'light',
                })
              }
              aria-label="Toggle theme"
              className="cursor-pointer rounded-xl border border-[#E4DCCE] bg-white p-2 text-[#142126] transition hover:bg-[#F2ECE1] dark:border-[#213840] dark:bg-[#132329] dark:text-[#F1F5F9]"
            >
              {settings.theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4 text-amber-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings and backup"
              className="cursor-pointer rounded-xl border border-[#E4DCCE] bg-white p-2 text-[#142126] transition hover:bg-[#F2ECE1] dark:border-[#213840] dark:bg-[#132329] dark:text-[#F1F5F9]"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout (Desktop RTL Sidebar + Content) */}
      <div className="mx-auto flex max-w-6xl gap-6 px-4 pb-24 pt-5 sm:px-6 md:pb-10">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="sticky top-22 space-y-1.5 rounded-3xl border border-[#E4DCCE] bg-white p-2.5 shadow-xs dark:border-[#213840] dark:bg-[#132329]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`flex min-h-[42px] w-full cursor-pointer items-center justify-between rounded-2xl px-3.5 py-2 text-sm font-semibold transition ${
                    active
                      ? 'bg-[#0D6E6E] text-white dark:bg-[#2DD4BF] dark:text-[#0B161A]'
                      : 'text-[#52636A] hover:bg-[#F2ECE1] hover:text-[#142126] dark:text-[#9BB0B8] dark:hover:bg-[#182C33] dark:hover:text-[#F1F5F9]'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span dir={textDir} className="truncate leading-normal">{t(item.dv, item.en, lang)}</span>
                  </span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        active
                          ? 'bg-white/20 text-white dark:bg-[#0B161A]/20 dark:text-[#0B161A]'
                          : 'bg-[#D95D39] text-white dark:bg-[#FB923C] dark:text-[#0B161A]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main View Canvas */}
        <main className="min-w-0 flex-1">
          {error ? (
            <div className="rounded-3xl border border-rose-300 bg-rose-50 p-6 text-sm text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/30 dark:text-rose-200">
              {error}
            </div>
          ) : !ready ? (
            <div className="space-y-4">
              <div className="h-40 animate-pulse rounded-3xl border border-[#E4DCCE] bg-white/80 dark:border-[#213840] dark:bg-[#132329]/80" />
              <div className="h-64 animate-pulse rounded-3xl border border-[#E4DCCE] bg-white/60 dark:border-[#213840] dark:bg-[#132329]/60" />
            </div>
          ) : (
            <>
              {tab === 'daily' && (
                <DailyWordsView
                  settings={settings}
                  progress={dailyProgress}
                  dailyEntries={dailyEntries}
                  familyLookup={entriesById}
                  headwordSet={headwordSet}
                  loading={dailyEntries.length === 0 && !userDataLoaded}
                  onChangeTarget={(dailyTarget: DailyTarget) =>
                    updateSettings({ ...settings, dailyTarget })
                  }
                  onToggleDeck={(deck: DeckKey) => {
                    const exists = settings.activeDecks.includes(deck);
                    let next = exists
                      ? settings.activeDecks.filter((d) => d !== deck)
                      : [...settings.activeDecks, deck];
                    if (next.length === 0) next = ['curated'];
                    updateSettings({ ...settings, activeDecks: next });
                  }}
                  onSwapKnown={handleSwapKnown}
                  onCompleteDailyWord={handleCompleteDailyWord}
                  onRefreshUncompleted={handleRefreshUncompleted}
                  onToggleEnglish={(enabled) =>
                    updateSettings({ ...settings, showEnglish: enabled })
                  }
                  onInspectId={inspectId}
                  onInspectHeadword={inspectHeadword}
                />
              )}

              {tab === 'dictionary' && (
                <DictionaryView
                  settings={settings}
                  headwordSet={headwordSet}
                  searchFn={search}
                  onToggleIme={(enabled) =>
                    updateSettings({ ...settings, phoneticImeEnabled: enabled })
                  }
                  onToggleEnglish={(enabled) =>
                    updateSettings({ ...settings, showEnglish: enabled })
                  }
                  onInspectId={inspectId}
                  onInspectHeadword={inspectHeadword}
                />
              )}

              {tab === 'games' && gamePools && (
                <GamesView
                  settings={settings}
                  gamePools={gamePools}
                  getEntries={getEntries}
                  checkWordleGuess={checkWordleGuess}
                  autocomplete={autocomplete}
                  onInspectId={inspectId}
                />
              )}

              {tab === 'review' && (
                <ReviewView
                  settings={settings}
                  srsCards={srsCards}
                  knownIds={knownIds}
                  entriesById={entriesById}
                  headwordSet={headwordSet}
                  onRateCard={handleRateCard}
                  onMarkKnown={async (id) => {
                    await markWordKnown(id);
                    setKnownIds((prev) => Array.from(new Set([...prev, id])));
                    setSrsCards((prev) => prev.filter((c) => c.entryId !== id));
                  }}
                  onUnmarkKnown={async (id) => {
                    await unmarkWordKnown(id);
                    setKnownIds((prev) => prev.filter((x) => x !== id));
                  }}
                  onRemoveSrsCard={async (id) => {
                    await deleteSrsCard(id);
                    setSrsCards((prev) => prev.filter((c) => c.entryId !== id));
                  }}
                  onInspectId={inspectId}
                  onInspectHeadword={inspectHeadword}
                  onNavigateDaily={() => setTab('daily')}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E4DCCE] bg-white/95 px-2 py-1.5 backdrop-blur-md md:hidden dark:border-[#213840] dark:bg-[#132329]/95">
        <div className="grid grid-cols-4 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`relative flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-[11px] font-semibold transition ${
                  active
                    ? 'bg-[#0D6E6E]/12 text-[#0D6E6E] dark:bg-[#2DD4BF]/15 dark:text-[#2DD4BF]'
                    : 'text-[#52636A] dark:text-[#9BB0B8]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span dir={textDir}>{lang === 'dv' ? item.dv : item.en}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute top-1.5 right-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#D95D39] px-1 text-[10px] font-bold text-white dark:bg-[#FB923C] dark:text-[#0B161A]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Slide-Over Word Inspector Drawer */}
      <WordInspectorDrawer
        open={drawerOpen}
        trail={inspectorTrail}
        loading={inspectorLoading}
        detail={inspectorDetail}
        headwordSet={headwordSet}
        lang={lang}
        showRomanization={settings.showRomanization}
        showEnglish={settings.showEnglish}
        onToggleEnglish={(enabled) =>
          updateSettings({ ...settings, showEnglish: enabled })
        }
        knownIds={knownSet}
        srsIds={srsSet}
        onClose={() => {
          setDrawerOpen(false);
          setInspectorTrail([]);
        }}
        onJumpToIndex={jumpTrailIndex}
        onInspectId={inspectId}
        onInspectHeadword={inspectHeadword}
        onAddToSrs={handleAddToSrs}
        onToggleKnown={handleToggleKnownFromDrawer}
      />

      {/* Settings & Backup Modal */}
      <SettingsModal
        open={settingsOpen}
        settings={settings}
        report={report}
        onClose={() => setSettingsOpen(false)}
        onUpdateSettings={updateSettings}
        onImported={loadUserPersistence}
      />
    </div>
  );
}

export default App;
