import { useCallback, useEffect, useState } from 'react';
import type {
  DictionaryEntry,
  GamePools,
  PipelineReport,
  SearchFilters,
  SearchResultItem,
} from '../types/dictionary.ts';

export interface EntryDetailPayload {
  entry: DictionaryEntry;
  familyEntries: DictionaryEntry[];
  synonymEntries: DictionaryEntry[];
  explicitBaseEntries: DictionaryEntry[];
  backlinkEntries: DictionaryEntry[];
  totalBacklinks: number;
}

export interface SearchResponse {
  total: number;
  items: SearchResultItem[];
  entries: DictionaryEntry[];
}

export interface RandomEntryOptions {
  filters?: SearchFilters;
  excludeIds?: number[];
  preferRich?: boolean;
  seed?: number;
}

interface PendingReq {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
}

let workerInstance: Worker | null = null;
let nextReqId = 1;
const pending = new Map<number, PendingReq>();

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker(
      new URL('../workers/dictionary.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerInstance.onmessage = (ev: MessageEvent) => {
      const { reqId, ok, result, error } = ev.data as {
        reqId: number;
        ok: boolean;
        result?: unknown;
        error?: string;
      };
      const req = pending.get(reqId);
      if (!req) return;
      pending.delete(reqId);
      if (ok) req.resolve(result);
      else req.reject(new Error(error ?? 'Worker error'));
    };
  }
  return workerInstance;
}

function callWorker<T>(action: string, payload?: Record<string, unknown>): Promise<T> {
  const w = getWorker();
  const reqId = nextReqId++;
  return new Promise<T>((resolve, reject) => {
    pending.set(reqId, {
      resolve: resolve as (v: unknown) => void,
      reject,
    });
    w.postMessage({ reqId, action, payload });
  });
}

let sharedInitPromise: Promise<{
  report: PipelineReport;
  gamePools: GamePools;
  headwordSet: Set<string>;
}> | null = null;

function initDictionary() {
  if (!sharedInitPromise) {
    sharedInitPromise = callWorker<{
      report: PipelineReport;
      gamePools: GamePools;
      headwords: string[];
    }>('init').then((res) => ({
      report: res.report,
      gamePools: res.gamePools,
      headwordSet: new Set(res.headwords),
    }));
  }
  return sharedInitPromise;
}

export function useDictionary() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<PipelineReport | null>(null);
  const [gamePools, setGamePools] = useState<GamePools | null>(null);
  const [headwordSet, setHeadwordSet] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let active = true;
    initDictionary()
      .then((res) => {
        if (!active) return;
        setReport(res.report);
        setGamePools(res.gamePools);
        setHeadwordSet(res.headwordSet);
        setReady(true);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      active = false;
    };
  }, []);

  const search = useCallback(
    (filters: SearchFilters, offset = 0, limit = 40) =>
      callWorker<SearchResponse>('search', { filters, offset, limit }),
    []
  );

  const getEntries = useCallback(
    (ids: number[]) => callWorker<DictionaryEntry[]>('getEntries', { ids }),
    []
  );

  const getEntryDetail = useCallback(
    (id: number) => callWorker<EntryDetailPayload | null>('getEntryDetail', { id }),
    []
  );

  const getRandomEntryDetail = useCallback(
    (options: RandomEntryOptions = {}) =>
      callWorker<EntryDetailPayload | null>('getRandomEntryDetail', {
        filters: options.filters,
        excludeIds: options.excludeIds,
        preferRich: options.preferRich,
        seed: options.seed,
      }),
    []
  );

  const getByHeadword = useCallback(
    (headword: string) =>
      callWorker<EntryDetailPayload | null>('getByHeadword', { headword }),
    []
  );

  const checkWordleGuess = useCallback(
    (word: string) =>
      callWorker<{ valid: boolean; entry: DictionaryEntry | null }>(
        'checkWordleGuess',
        { word }
      ),
    []
  );

  const autocomplete = useCallback(
    (query: string, limit = 8) =>
      callWorker<Array<{ id: number; headword: string; romanized: string }>>(
        'autocomplete',
        { query, limit }
      ),
    []
  );

  return {
    ready,
    error,
    report,
    gamePools,
    headwordSet,
    search,
    getEntries,
    getEntryDetail,
    getRandomEntryDetail,
    getByHeadword,
    checkWordleGuess,
    autocomplete,
  };
}
