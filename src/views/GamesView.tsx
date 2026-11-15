import { useEffect, useState } from 'react';
import {
  Gamepad2,
  Share2,
  RotateCcw,
  Lightbulb,
  Trophy,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import type { DictionaryEntry, GamePools, UserSettings } from '../types/dictionary.ts';
import type { GameStats, WordleGameRecord, ClueGameRecord } from '../storage/db.ts';
import {
  buildWordleShareText,
  evaluateThaanaWordleGuess,
  getConsonantKeyStates,
  pickDailyWordleId,
  type TileStatus,
} from '../lib/wordle.ts';
import {
  buildClueShareText,
  pickClueDistractorIds,
  pickDailyClueId,
  redactHeadwordInClue,
} from '../lib/clueGame.ts';
import { getMaleDateKey, getPreviousDateKey } from '../lib/date.ts';
import {
  composeSyllable,
  latinToThaanaPhonetic,
  segmentGraphemes,
  splitGrapheme,
} from '../lib/thaana.ts';
import { formatCount, t } from '../lib/labels.ts';
import { VirtualThaanaKeyboard } from '../components/VirtualThaanaKeyboard.tsx';
import { MetadataBadges } from '../components/MetadataBadges.tsx';
import {
  DEFAULT_GAME_STATS,
  getMetaValue,
  setMetaValue,
} from '../storage/db.ts';

interface Props {
  settings: UserSettings;
  gamePools: GamePools;
  getEntries: (ids: number[]) => Promise<DictionaryEntry[]>;
  checkWordleGuess: (
    word: string
  ) => Promise<{ valid: boolean; entry: DictionaryEntry | null }>;
  autocomplete: (
    query: string,
    limit?: number
  ) => Promise<Array<{ id: number; headword: string; romanized: string }>>;
  onInspectId: (id: number) => void;
}

function tileClasses(status?: TileStatus, filled?: boolean): string {
  switch (status) {
    case 'exact':
      return 'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-slate-950';
    case 'present':
      return 'border-amber-500 bg-amber-500 text-white dark:border-amber-400 dark:bg-amber-400 dark:text-slate-950';
    case 'consonant':
      return 'border-sky-500 bg-sky-500/18 text-sky-900 ring-2 ring-sky-500/50 dark:border-sky-400 dark:bg-sky-400/20 dark:text-sky-100';
    case 'absent':
      return 'border-slate-300 bg-slate-200 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400';
    default:
      return filled
        ? 'border-[#0D6E6E] bg-white text-[#142126] dark:border-[#2DD4BF] dark:bg-[#132329] dark:text-[#F1F5F9]'
        : 'border-[#E4DCCE] bg-[#FAF7F2] text-[#52636A] dark:border-[#213840] dark:bg-[#0F1E24] dark:text-[#9BB0B8]';
  }
}

export function GamesView({
  settings,
  gamePools,
  getEntries,
  checkWordleGuess,
  autocomplete,
  onInspectId,
}: Props) {
  const lang = settings.uiLanguage;
  const dateKey = getMaleDateKey();

  const [gameTab, setGameTab] = useState<'wordle' | 'clue'>('wordle');
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  // ---------------- WORDLE STATE ----------------
  const [wordlePractice, setWordlePractice] = useState(false);
  const [wordleTarget, setWordleTarget] = useState<DictionaryEntry | null>(null);
  const [wordleTiles, setWordleTiles] = useState<string[]>([]);
  const [pendingIdx, setPendingIdx] = useState<number | null>(null);
  const [wordleGuesses, setWordleGuesses] = useState<string[]>([]);
  const [wordleEvals, setWordleEvals] = useState<TileStatus[][]>([]);
  const [wordleStatus, setWordleStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [wordleErr, setWordleErr] = useState<string | null>(null);
  const [wordleStats, setWordleStats] = useState<GameStats>(DEFAULT_GAME_STATS);

  // ---------------- CLUE CHALLENGE STATE ----------------
  const [cluePractice, setCluePractice] = useState(false);
  const [clueTarget, setClueTarget] = useState<DictionaryEntry | null>(null);
  const [clueChoices, setClueChoices] = useState<DictionaryEntry[]>([]);
  const [showChoices, setShowChoices] = useState(true);
  const [clueInput, setClueInput] = useState('');
  const [clueAc, setClueAc] = useState<
    Array<{ id: number; headword: string; romanized: string }>
  >([]);
  const [clueGuesses, setClueGuesses] = useState<DictionaryEntry[]>([]);
  const [revealedClues, setRevealedClues] = useState(1);
  const [clueStatus, setClueStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [clueStats, setClueStats] = useState<GameStats>(DEFAULT_GAME_STATS);

  const loadWordlePuzzle = async (practice: boolean) => {
    setWordleErr(null);
    setWordleTiles([]);
    setPendingIdx(null);

    const savedStats = await getMetaValue<GameStats>('wordle_stats');
    if (savedStats) setWordleStats(savedStats);

    if (!practice) {
      const dailyId = pickDailyWordleId(gamePools.wordle4AnswerIds, dateKey);
      const [target] = await getEntries([dailyId]);
      setWordleTarget(target ?? null);

      const saved = await getMetaValue<WordleGameRecord>(
        `daily_game_wordle_${dateKey}`
      );
      if (saved && saved.targetId === dailyId) {
        setWordleGuesses(saved.guesses);
        setWordleEvals(saved.evaluations);
        setWordleStatus(saved.status);
        return;
      }
      setWordleGuesses([]);
      setWordleEvals([]);
      setWordleStatus('playing');
    } else {
      const randId =
        gamePools.wordle4AnswerIds[
          Math.floor(Math.random() * gamePools.wordle4AnswerIds.length)
        ];
      const [target] = await getEntries([randId]);
      setWordleTarget(target ?? null);
      setWordleGuesses([]);
      setWordleEvals([]);
      setWordleStatus('playing');
    }
  };

  const loadCluePuzzle = async (practice: boolean) => {
    setClueInput('');
    setClueAc([]);

    const savedStats = await getMetaValue<GameStats>('clue_stats');
    if (savedStats) setClueStats(savedStats);

    const targetId = practice
      ? gamePools.clueChallengeIds[
          Math.floor(Math.random() * gamePools.clueChallengeIds.length)
        ]
      : pickDailyClueId(gamePools.clueChallengeIds, dateKey);

    const seedKey = practice ? `p-${targetId}-${Date.now()}` : dateKey;
    const distractorIds = pickClueDistractorIds(
      gamePools.clueChallengeIds,
      targetId,
      seedKey,
      3
    );
    const loaded = await getEntries([targetId, ...distractorIds]);
    const target = loaded[0] ?? null;
    setClueTarget(target);

    // Deterministic order of 4 choices
    const shuffled = [...loaded].sort((a, b) =>
      ((a.id * 2654435761) >>> 0) - ((b.id * 2654435761) >>> 0)
    );
    setClueChoices(shuffled);

    if (!practice) {
      const saved = await getMetaValue<ClueGameRecord>(`daily_game_clue_${dateKey}`);
      if (saved && saved.targetId === targetId) {
        const gEntries = saved.guesses.length ? await getEntries(saved.guesses) : [];
        setClueGuesses(gEntries);
        setRevealedClues(saved.revealedClues);
        setClueStatus(saved.status);
        return;
      }
    }

    setClueGuesses([]);
    setRevealedClues(1);
    setClueStatus('playing');
  };

  useEffect(() => {
    loadWordlePuzzle(wordlePractice);
  }, [wordlePractice, dateKey]);

  useEffect(() => {
    loadCluePuzzle(cluePractice);
  }, [cluePractice, dateKey]);

  // Autocomplete for Clue Challenge
  useEffect(() => {
    const q = clueInput.trim();
    if (!q || clueStatus !== 'playing') {
      setClueAc([]);
      return;
    }
    let active = true;
    autocomplete(q, 6).then((res) => {
      if (active) setClueAc(res);
    });
    return () => {
      active = false;
    };
  }, [clueInput, clueStatus, autocomplete]);

  // Wordle Keyboard Handlers
  const handleWordleConsonant = (ch: string) => {
    if (wordleStatus !== 'playing') return;
    setWordleErr(null);
    setWordleTiles((prev) => {
      if (prev.length >= 4) return prev;
      const next = [...prev, ch];
      setPendingIdx(next.length - 1);
      return next;
    });
  };

  const handleWordleFili = (fili: string) => {
    if (wordleStatus !== 'playing') return;
    setWordleErr(null);
    setWordleTiles((prev) => {
      if (prev.length === 0) return prev;
      const targetSlot = pendingIdx !== null ? pendingIdx : prev.length - 1;
      const cur = prev[targetSlot];
      if (!cur) return prev;
      const { base } = splitGrapheme(cur);
      const next = [...prev];
      next[targetSlot] = composeSyllable(base || cur, fili);
      setPendingIdx(null);
      return next;
    });
  };

  const handleWordleBackspace = () => {
    if (wordleStatus !== 'playing') return;
    setWordleErr(null);
    setWordleTiles((prev) => {
      if (prev.length === 0) return prev;
      const lastIdx = prev.length - 1;
      const { base, fili } = splitGrapheme(prev[lastIdx]);
      if (fili) {
        const next = [...prev];
        next[lastIdx] = base;
        setPendingIdx(lastIdx);
        return next;
      }
      setPendingIdx(null);
      return prev.slice(0, -1);
    });
  };

  const updateStatsRecord = async (
    key: 'wordle_stats' | 'clue_stats',
    won: boolean,
    isPractice: boolean
  ) => {
    if (isPractice) return;
    const prev =
      (await getMetaValue<GameStats>(key)) ?? { ...DEFAULT_GAME_STATS };
    if (prev.lastPlayedDate === dateKey) return;
    const prevDay = getPreviousDateKey(dateKey);
    const nextStreak = won
      ? prev.lastPlayedDate === prevDay
        ? prev.currentStreak + 1
        : 1
      : 0;
    const updated: GameStats = {
      played: prev.played + 1,
      won: prev.won + (won ? 1 : 0),
      currentStreak: nextStreak,
      maxStreak: Math.max(prev.maxStreak, nextStreak),
      lastPlayedDate: dateKey,
    };
    await setMetaValue(key, updated);
    if (key === 'wordle_stats') setWordleStats(updated);
    else setClueStats(updated);
  };

  const handleWordleSubmit = async () => {
    if (wordleStatus !== 'playing' || !wordleTarget) return;
    if (wordleTiles.length !== 4) {
      setWordleErr(t('4 އަކުރު (ސިލަބަލް) ހަމަކުރޭ', 'Enter all 4 Thaana syllables', lang));
      return;
    }
    const guessWord = wordleTiles.join('');
    const check = await checkWordleGuess(guessWord);
    if (!check.valid) {
      setWordleErr(
        t('ރަދީފުގައި މި ލަފުޒެއް ނެތް (ފިލި ޗެކްކޮށްލާ)', 'Word not found in 4-syllable Radheef list', lang)
      );
      return;
    }

    const evalRow = evaluateThaanaWordleGuess(guessWord, wordleTarget.headword);
    const nextGuesses = [...wordleGuesses, guessWord];
    const nextEvals = [...wordleEvals, evalRow];
    const won = evalRow.every((s) => s === 'exact');
    const lost = !won && nextGuesses.length >= 6;
    const nextStatus: 'playing' | 'won' | 'lost' = won
      ? 'won'
      : lost
      ? 'lost'
      : 'playing';

    setWordleGuesses(nextGuesses);
    setWordleEvals(nextEvals);
    setWordleTiles([]);
    setPendingIdx(null);
    setWordleStatus(nextStatus);

    if (!wordlePractice) {
      await setMetaValue(`daily_game_wordle_${dateKey}`, {
        dateKey,
        targetId: wordleTarget.id,
        guesses: nextGuesses,
        evaluations: nextEvals,
        status: nextStatus,
      } satisfies WordleGameRecord);
      if (nextStatus !== 'playing') {
        await updateStatsRecord('wordle_stats', won, false);
      }
    }
  };

  // Clue Challenge handlers
  const handleClueGuess = async (entryId: number) => {
    if (clueStatus !== 'playing' || !clueTarget) return;
    if (clueGuesses.some((g) => g.id === entryId)) return;

    const [guessed] = await getEntries([entryId]);
    if (!guessed) return;

    const nextGuesses = [...clueGuesses, guessed];
    const won = guessed.id === clueTarget.id;
    const maxAttempts = Math.min(5, clueTarget.senses.length);
    const lost = !won && nextGuesses.length >= maxAttempts;
    const nextStatus: 'playing' | 'won' | 'lost' = won
      ? 'won'
      : lost
      ? 'lost'
      : 'playing';
    const nextClues =
      nextStatus === 'playing'
        ? Math.min(clueTarget.senses.length, revealedClues + 1)
        : clueTarget.senses.length;

    setClueGuesses(nextGuesses);
    setRevealedClues(nextClues);
    setClueStatus(nextStatus);
    setClueInput('');
    setClueAc([]);

    if (!cluePractice) {
      await setMetaValue(`daily_game_clue_${dateKey}`, {
        dateKey,
        targetId: clueTarget.id,
        guesses: nextGuesses.map((g) => g.id),
        revealedClues: nextClues,
        status: nextStatus,
      } satisfies ClueGameRecord);
      if (nextStatus !== 'playing') {
        await updateStatsRecord('clue_stats', won, false);
      }
    }
  };

  const handleShare = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShareMsg(t('ނަތީޖާ ކޮޕީވެއްޖެ!', 'Result copied to clipboard!', lang));
      setTimeout(() => setShareMsg(null), 2500);
    } catch {
      setShareMsg(text);
    }
  };

  const consonantKeyStates = getConsonantKeyStates(wordleGuesses, wordleEvals);
  const pendingConsonant =
    pendingIdx !== null && wordleTiles[pendingIdx]
      ? splitGrapheme(wordleTiles[pendingIdx]).base
      : null;

  return (
    <div className="space-y-6">
      {/* Header + Game Switcher */}
      <section className="rounded-3xl border border-[#E4DCCE] bg-white p-5 shadow-xs dark:border-[#213840] dark:bg-[#132329]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#D95D39]/12 px-3 py-1 text-xs font-semibold text-[#B84524] dark:bg-[#FB923C]/15 dark:text-[#FB923C]">
              <Gamepad2 className="h-3.5 w-3.5" />
              <span>{t('ދުވަހުގެ ކުޅިވަރުތައް', 'Daily Dhivehi Games', lang)}</span>
            </div>
            <h1 className="font-display-thaana mt-2 text-2xl font-bold text-[#142126] dark:text-[#F1F5F9]">
              {gameTab === 'wordle'
                ? t('ބަސްލީ — 4 އަކުރުގެ ވާރޑްލް', 'Basle — 4-Syllable Thaana Wordle', lang)
                : t('މާނަ ކުޅި — ރަދީފު ޗެލެންޖު', 'Maana Kulhi — Radheef Clue Challenge', lang)}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setGameTab('wordle')}
              className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-bold transition ${
                gameTab === 'wordle'
                  ? 'bg-[#0D6E6E] text-white dark:bg-[#2DD4BF] dark:text-[#0B161A]'
                  : 'border border-[#E4DCCE] bg-[#FAF7F2] text-[#52636A] dark:border-[#213840] dark:bg-[#182C33] dark:text-[#9BB0B8]'
              }`}
            >
              {t('ބަސްލީ (Wordle)', 'Basle Wordle', lang)}
            </button>
            <button
              type="button"
              onClick={() => setGameTab('clue')}
              className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-bold transition ${
                gameTab === 'clue'
                  ? 'bg-[#0D6E6E] text-white dark:bg-[#2DD4BF] dark:text-[#0B161A]'
                  : 'border border-[#E4DCCE] bg-[#FAF7F2] text-[#52636A] dark:border-[#213840] dark:bg-[#182C33] dark:text-[#9BB0B8]'
              }`}
            >
              {t('މާނަ ކުޅި (Clue Match)', 'Maana Clue', lang)}
            </button>
          </div>
        </div>
      </section>

      {/* GAME 1: 4-GRAPHEME THAANA WORDLE */}
      {gameTab === 'wordle' && (
        <section className="rounded-3xl border border-[#E4DCCE] bg-white p-4 sm:p-6 shadow-xs dark:border-[#213840] dark:bg-[#132329]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3 text-[#52636A] dark:text-[#9BB0B8]">
              <span className="inline-flex items-center gap-1 font-semibold text-[#142126] dark:text-[#F1F5F9]">
                <Trophy className="h-4 w-4 text-amber-500" />
                {t('ކުޅުނު:', 'Played:', lang)} {wordleStats.played} ·{' '}
                {t('މޮޅުވި:', 'Won:', lang)} {wordleStats.won} ·{' '}
                {t('ސްޓްރީކް:', 'Streak:', lang)} {wordleStats.currentStreak}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWordlePractice((v) => !v)}
                className={`cursor-pointer rounded-xl border px-3 py-1.5 font-semibold transition ${
                  wordlePractice
                    ? 'border-[#D95D39] bg-[#D95D39]/12 text-[#B84524] dark:border-[#FB923C] dark:text-[#FB923C]'
                    : 'border-[#E4DCCE] bg-[#FAF7F2] text-[#52636A] dark:border-[#213840] dark:bg-[#182C33] dark:text-[#9BB0B8]'
                }`}
              >
                {wordlePractice
                  ? t('ދުވަހުގެ ޕަޒަލްއަށް ދޭ', 'Back to Daily', lang)
                  : t('ތަމްރީނު މޯޑު', 'Practice Mode', lang)}
              </button>
              {wordlePractice && (
                <button
                  type="button"
                  onClick={() => loadWordlePuzzle(true)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#E4DCCE] bg-[#FAF7F2] px-2.5 py-1.5 font-semibold text-[#142126] dark:border-[#213840] dark:bg-[#182C33] dark:text-[#F1F5F9]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{t('އައު ލަފުޒެއް', 'New Word', lang)}</span>
                </button>
              )}
            </div>
          </div>

          {/* Color Legend */}
          <div className="mb-4 flex flex-wrap justify-center gap-2 text-[11px] text-[#52636A] dark:text-[#9BB0B8]">
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-emerald-600" />
              {t('އަކުރާއި ފިލި ރަނގަޅު', 'Exact syllable', lang)}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-amber-500" />
              {t('އެހެން ތަނެއްގައި', 'Wrong spot', lang)}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded border border-sky-500 bg-sky-500/25" />
              {t('އަކުރު ރަނގަޅު، ފިލި ބަދަލު', 'Right consonant, wrong fili', lang)}
            </span>
          </div>

          {/* 6x4 Grid (RTL: first syllable on the right!) */}
          <div className="mx-auto mb-5 grid max-w-xs gap-2" dir="rtl">
            {Array.from({ length: 6 }).map((_, rIdx) => {
              const submittedWord = wordleGuesses[rIdx];
              const isActiveRow =
                rIdx === wordleGuesses.length && wordleStatus === 'playing';
              const rowGraphemes = submittedWord
                ? segmentGraphemes(submittedWord)
                : isActiveRow
                ? wordleTiles
                : [];
              const evalRow = wordleEvals[rIdx];

              return (
                <div key={rIdx} className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 4 }).map((__, cIdx) => {
                    const tileText = rowGraphemes[cIdx] ?? '';
                    const status = evalRow ? evalRow[cIdx] : undefined;
                    const isPending = isActiveRow && pendingIdx === cIdx;
                    return (
                      <div
                        key={cIdx}
                        className={`flex h-15 sm:h-16 items-center justify-center rounded-2xl border-2 text-2xl font-bold transition ${tileClasses(
                          status,
                          Boolean(tileText)
                        )} ${isPending ? 'ring-2 ring-[#D95D39] dark:ring-[#FB923C]' : ''}`}
                      >
                        {tileText}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {wordleErr && (
            <p className="mb-3 text-center text-xs font-semibold text-rose-600 dark:text-rose-400">
              {wordleErr}
            </p>
          )}

          {/* Post-Game Result Banner */}
          {wordleStatus !== 'playing' && wordleTarget && (
            <div className="mb-5 rounded-2xl border border-[#E4DCCE] bg-[#FAF7F2] p-4 text-center dark:border-[#213840] dark:bg-[#0F1E24]">
              <div className="text-sm font-bold text-[#142126] dark:text-[#F1F5F9]">
                {wordleStatus === 'won'
                  ? t('މަރުޙަބާ! ލަފުޒު ހޯދައިފި!', 'Brilliant! You solved it!', lang)
                  : t('ޖަވާބަކީ:', 'Answer:', lang)}
              </div>
              <button
                type="button"
                dir="rtl"
                onClick={() => onInspectId(wordleTarget.id)}
                className="font-display-thaana mt-1 cursor-pointer text-2xl font-bold text-[#0D6E6E] hover:underline dark:text-[#2DD4BF]"
              >
                {wordleTarget.headword}
              </button>
              <p dir="rtl" className="mt-1 text-xs text-[#52636A] dark:text-[#9BB0B8]">
                {wordleTarget.senses[0]}
              </p>
              {settings.showEnglish && wordleTarget.enGloss && (
                <p dir="ltr" className="mt-1 text-xs font-medium text-[#0D6E6E] dark:text-[#2DD4BF]">
                  {wordleTarget.enGloss}
                </p>
              )}

              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleShare(
                      buildWordleShareText(
                        dateKey,
                        wordleEvals,
                        wordleStatus === 'won',
                        wordlePractice
                      )
                    )
                  }
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0D6E6E] px-4 py-2 text-xs font-semibold text-white dark:bg-[#2DD4BF] dark:text-[#0B161A]"
                >
                  <Share2 className="h-4 w-4" />
                  <span>{t('ނަތީޖާ ޝެއަރކުރޭ', 'Share Result', lang)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onInspectId(wordleTarget.id)}
                  className="cursor-pointer rounded-xl border border-[#E4DCCE] bg-white px-4 py-2 text-xs font-semibold text-[#142126] dark:border-[#213840] dark:bg-[#132329] dark:text-[#F1F5F9]"
                >
                  {t('ބަސްފޮތުން ބަލާ', 'Inspect Word', lang)}
                </button>
              </div>
              {shareMsg && (
                <p className="mt-2 text-xs font-medium text-[#0D6E6E] dark:text-[#2DD4BF]">
                  {shareMsg}
                </p>
              )}
            </div>
          )}

          {/* Thaana Wordle Virtual Keyboard */}
          <VirtualThaanaKeyboard
            mode="wordle"
            lang={lang}
            keyStates={consonantKeyStates}
            pendingConsonant={pendingConsonant}
            onChar={handleWordleConsonant}
            onFili={handleWordleFili}
            onBackspace={handleWordleBackspace}
            onSubmit={handleWordleSubmit}
            submitLabel={t('ޗެކްކުރޭ', 'Guess', lang)}
          />
        </section>
      )}

      {/* GAME 2: MAANA KULHI (RADHEEF CLUE & SYNONYM CHALLENGE) */}
      {gameTab === 'clue' && clueTarget && (
        <section className="rounded-3xl border border-[#E4DCCE] bg-white p-5 sm:p-6 shadow-xs dark:border-[#213840] dark:bg-[#132329]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-semibold text-[#142126] dark:text-[#F1F5F9]">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span>
                {t('ކުޅުނު:', 'Played:', lang)} {clueStats.played} ·{' '}
                {t('މޮޅުވި:', 'Won:', lang)} {clueStats.won} ·{' '}
                {t('ސްޓްރީކް:', 'Streak:', lang)} {clueStats.currentStreak}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCluePractice((v) => !v)}
                className={`cursor-pointer rounded-xl border px-3 py-1.5 font-semibold transition ${
                  cluePractice
                    ? 'border-[#D95D39] bg-[#D95D39]/12 text-[#B84524] dark:border-[#FB923C] dark:text-[#FB923C]'
                    : 'border-[#E4DCCE] bg-[#FAF7F2] text-[#52636A] dark:border-[#213840] dark:bg-[#182C33] dark:text-[#9BB0B8]'
                }`}
              >
                {cluePractice
                  ? t('ދުވަހުގެ ޕަޒަލްއަށް ދޭ', 'Back to Daily', lang)
                  : t('ތަމްރީނު މޯޑު', 'Practice Mode', lang)}
              </button>
              {cluePractice && (
                <button
                  type="button"
                  onClick={() => loadCluePuzzle(true)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#E4DCCE] bg-[#FAF7F2] px-2.5 py-1.5 font-semibold text-[#142126] dark:border-[#213840] dark:bg-[#182C33] dark:text-[#F1F5F9]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{t('އައު ޕަޒަލްއެއް', 'New Puzzle', lang)}</span>
                </button>
              )}
            </div>
          </div>

          {/* Hints & Metadata */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#E4DCCE] bg-[#FAF7F2] p-3.5 dark:border-[#213840] dark:bg-[#0F1E24]">
            <div className="flex flex-wrap items-center gap-2">
              <MetadataBadges entry={clueTarget} lang={lang} compact />
              <span className="rounded-full bg-[#0D6E6E]/12 px-2.5 py-0.5 text-xs font-semibold text-[#0D6E6E] dark:bg-[#2DD4BF]/15 dark:text-[#2DD4BF]">
                {lang === 'en'
                  ? formatCount(clueTarget.graphemeCount, 'syllable')
                  : `${clueTarget.graphemeCount} އަކުރު (ސިލަބަލް)`}
              </span>
            </div>
            <span className="text-xs font-semibold text-[#52636A] dark:text-[#9BB0B8]">
              {t('ފުރުޞަތު:', 'Attempts:', lang)}{' '}
              <span dir="ltr" className="inline-block">
                {clueGuesses.length} / {Math.min(5, clueTarget.senses.length)}
              </span>
            </span>
          </div>

          {/* Progressive Clues */}
          <div className="mb-5 space-y-2.5">
            {clueTarget.senses.slice(0, revealedClues).map((sense, idx) => (
              <div
                key={idx}
                dir="rtl"
                className="flex items-start gap-2.5 rounded-2xl border border-[#E4DCCE]/80 bg-[#FAF7F2]/60 p-3.5 text-sm sm:text-base text-[#142126] dark:border-[#213840] dark:bg-[#182C33]/60 dark:text-[#F1F5F9]"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0D6E6E] text-xs font-bold text-white dark:bg-[#2DD4BF] dark:text-[#0B161A]">
                  {idx + 1}
                </span>
                <span className="thaana-reading">
                  {redactHeadwordInClue(sense, clueTarget.headword)}
                </span>
              </div>
            ))}

            {clueStatus === 'playing' && revealedClues < clueTarget.senses.length && (
              <button
                type="button"
                onClick={() =>
                  setRevealedClues((c) => Math.min(clueTarget.senses.length, c + 1))
                }
                className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#0D6E6E] hover:underline dark:text-[#2DD4BF]"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                <span>{t('އިތުރު މާނައެއް (ހިންޓް) ދައްކާ', 'Reveal another clue', lang)}</span>
              </button>
            )}
          </div>

          {/* Guess Mode: Multiple Choice OR Direct Autocomplete */}
          {clueStatus === 'playing' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#52636A] dark:text-[#9BB0B8]">
                  {t('މި މާނަތަކާ ގުޅޭ ލަފުޒަކީ ކޮބާ؟', 'Which word matches these Radheef senses?', lang)}
                </span>
                <button
                  type="button"
                  onClick={() => setShowChoices((v) => !v)}
                  className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-[#0D6E6E] hover:underline dark:text-[#2DD4BF]"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>
                    {showChoices
                      ? t('އަމިއްލައަށް ލިޔެގެން ޖަވާބުދޭ', 'Type Answer Instead', lang)
                      : t('4 އިޚްތިޔާރު ދައްކާ', 'Show 4 Choices', lang)}
                  </span>
                </button>
              </div>

              {showChoices ? (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {clueChoices.map((choice) => {
                    const alreadyGuessed = clueGuesses.some((g) => g.id === choice.id);
                    return (
                      <button
                        key={choice.id}
                        type="button"
                        disabled={alreadyGuessed}
                        onClick={() => handleClueGuess(choice.id)}
                        className={`cursor-pointer rounded-2xl border p-3.5 text-start transition ${
                          alreadyGuessed
                            ? 'border-rose-300 bg-rose-50/70 text-rose-700 opacity-60 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-300'
                            : 'border-[#E4DCCE] bg-[#FAF7F2] hover:border-[#0D6E6E] hover:bg-white dark:border-[#213840] dark:bg-[#182C33] dark:hover:border-[#2DD4BF]'
                        }`}
                      >
                        <div className="text-lg font-bold text-[#142126] dark:text-[#F1F5F9]">
                          <span dir="rtl" className="inline-block">
                            {choice.headword}
                          </span>
                        </div>
                        {settings.showRomanization && (
                          <div className="font-mono text-xs text-[#52636A] dark:text-[#9BB0B8]" dir="ltr">
                            /{choice.romanized}/
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    dir="auto"
                    value={clueInput}
                    onChange={(e) =>
                      setClueInput(
                        settings.phoneticImeEnabled
                          ? latinToThaanaPhonetic(e.target.value)
                          : e.target.value
                      )
                    }
                    placeholder={t(
                      'ތާނަ ނުވަތަ ލެޓިންއިން ލަފުޒު ލިޔޭ...',
                      'Type candidate word in Thaana or Latin...',
                      lang
                    )}
                    className="w-full rounded-2xl border border-[#E4DCCE] bg-[#FAF7F2] px-4 py-3 text-base text-[#142126] focus:border-[#0D6E6E] focus:outline-none dark:border-[#213840] dark:bg-[#0B161A] dark:text-[#F1F5F9]"
                  />
                  {clueAc.length > 0 && (
                    <div className="mt-1.5 divide-y divide-[#E4DCCE]/60 overflow-hidden rounded-2xl border border-[#E4DCCE] bg-white shadow-md dark:divide-[#213840] dark:border-[#213840] dark:bg-[#182C33]">
                      {clueAc.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleClueGuess(opt.id)}
                          className="flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-start hover:bg-[#F2ECE1] dark:hover:bg-[#213840]"
                        >
                          <span dir="rtl" className="font-bold text-[#142126] dark:text-[#F1F5F9]">
                            {opt.headword}
                          </span>
                          <span className="font-mono text-xs text-[#52636A] dark:text-[#9BB0B8]" dir="ltr">
                            /{opt.romanized}/
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Wrong Guesses Trail */}
          {clueGuesses.length > 0 && clueStatus === 'playing' && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {clueGuesses.map((g) => (
                <span
                  key={g.id}
                  dir="rtl"
                  className="rounded-lg bg-rose-500/12 px-2.5 py-1 text-xs font-medium text-rose-700 line-through dark:text-rose-300"
                >
                  {g.headword}
                </span>
              ))}
            </div>
          )}

          {/* Post-Game Result */}
          {clueStatus !== 'playing' && (
            <div className="mt-4 rounded-2xl border border-[#E4DCCE] bg-[#FAF7F2] p-4 text-center dark:border-[#213840] dark:bg-[#0F1E24]">
              <div className="inline-flex items-center gap-1.5 text-sm font-bold text-[#142126] dark:text-[#F1F5F9]">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>
                  {clueStatus === 'won'
                    ? t('ރަނގަޅު ޖަވާބު ހޯދައިފި!', 'Solved!', lang)
                    : t('ރަނގަޅު ޖަވާބަކީ:', 'Correct Answer:', lang)}
                </span>
              </div>
              <div>
                <button
                  type="button"
                  dir="rtl"
                  onClick={() => onInspectId(clueTarget.id)}
                  className="font-display-thaana mt-1 cursor-pointer text-2xl font-bold text-[#0D6E6E] hover:underline dark:text-[#2DD4BF]"
                >
                  {clueTarget.headword}
                </button>
                {settings.showEnglish && clueTarget.enGloss && (
                  <p dir="ltr" className="mt-1 text-xs font-medium text-[#52636A] dark:text-[#9BB0B8]">
                    {clueTarget.enGloss}
                  </p>
                )}
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleShare(
                      buildClueShareText(
                        dateKey,
                        clueGuesses.length,
                        Math.min(5, clueTarget.senses.length),
                        clueStatus === 'won',
                        cluePractice
                      )
                    )
                  }
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0D6E6E] px-4 py-2 text-xs font-semibold text-white dark:bg-[#2DD4BF] dark:text-[#0B161A]"
                >
                  <Share2 className="h-4 w-4" />
                  <span>{t('ނަތީޖާ ޝެއަރކުރޭ', 'Share Result', lang)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onInspectId(clueTarget.id)}
                  className="cursor-pointer rounded-xl border border-[#E4DCCE] bg-white px-4 py-2 text-xs font-semibold text-[#142126] dark:border-[#213840] dark:bg-[#132329] dark:text-[#F1F5F9]"
                >
                  {t('ބަސްފޮތުން ބަލާ', 'Inspect Word', lang)}
                </button>
              </div>
              {shareMsg && (
                <p className="mt-2 text-xs font-medium text-[#0D6E6E] dark:text-[#2DD4BF]">
                  {shareMsg}
                </p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
