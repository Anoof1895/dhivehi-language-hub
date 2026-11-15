// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DictionaryEntry, GamePools, UserSettings } from '../src/types/dictionary.ts';

const metaStore = new Map<string, unknown>();

vi.mock('../src/storage/db.ts', () => ({
  DEFAULT_GAME_STATS: {
    played: 0,
    won: 0,
    currentStreak: 0,
    maxStreak: 0,
    lastPlayedDate: null,
  },
  getMetaValue: vi.fn(async (key: string) => metaStore.get(key) ?? null),
  setMetaValue: vi.fn(async (key: string, value: unknown) => {
    metaStore.set(key, value);
  }),
}));

import { GamesView } from '../src/views/GamesView.tsx';

function makeEntry(
  id: number,
  headword: string,
  romanized: string,
  senses: string[] = ['މާނަ 1', 'މާނަ 2', 'މާނަ 3']
): DictionaryEntry {
  return {
    id,
    sourceIds: [id],
    headword,
    romanized,
    graphemeCount: 4,
    wordclasses: ['ނ'],
    rawWordclasses: ['ނ'],
    inferredWordclass: null,
    senses,
    dialects: [],
    registers: [],
    synonymIds: [],
    synonymOfIds: [],
    explicitBaseIds: [],
    familyIds: [],
    familyRoot: null,
    referencedInCount: 0,
    isCuratedDaily: true,
  };
}

const ENTRIES: DictionaryEntry[] = [
  makeEntry(1, 'ހަށަނަރަ', 'hashanara', ['މާނަ 1', 'މާނަ 2', 'މާނަ 3']),
  makeEntry(2, 'ހަށަބަސް', 'hashabas', ['މާނަ 4', 'މާނަ 5']),
  makeEntry(3, 'ކަލަފުށި', 'kalafushi', ['މާނަ 6', 'މާނަ 7']),
  makeEntry(4, 'ލޯބިވެތި', 'loabivethi', ['މާނަ 8', 'މާނަ 9']),
];

const POOLS: GamePools = {
  dailyCuratedIds: [1, 2, 3, 4],
  deckPools: { honorific: [], dialect: [], figurative: [], proverb: [] },
  wordle4AnswerIds: [1, 2, 3, 4],
  wordle4ValidIds: [1, 2, 3, 4],
  clueChallengeIds: [1, 2, 3, 4],
};

const SETTINGS: UserSettings = {
  dailyTarget: 3,
  activeDecks: ['curated'],
  theme: 'light',
  uiLanguage: 'en',
  showRomanization: true,
  showEnglish: false,
  phoneticImeEnabled: true,
};

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function dispatchKey(key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  window.dispatchEvent(event);
  return event;
}

describe('GamesView physical keyboard & shortcuts', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    metaStore.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  async function renderGames(isOverlayOpen = false) {
    const checkWordleGuess = vi.fn(async (word: string) => {
      const entry = ENTRIES.find((e) => e.headword === word) ?? null;
      return { valid: Boolean(entry), entry };
    });

    await act(async () => {
      root.render(
        <GamesView
          settings={SETTINGS}
          gamePools={POOLS}
          getEntries={async (ids) =>
            ids
              .map((id) => ENTRIES.find((e) => e.id === id))
              .filter((e): e is DictionaryEntry => Boolean(e))
          }
          checkWordleGuess={checkWordleGuess}
          autocomplete={async () => []}
          onInspectId={vi.fn()}
          isOverlayOpen={isOverlayOpen}
        />
      );
    });
    await flush();
    return { checkWordleGuess };
  }

  it('supports QWERTY physical keys, Backspace, Enter submission, key flash, and larger glyphs', async () => {
    const { checkWordleGuess } = await renderGames();

    // Virtual keyboard glyphs have larger desktop size
    const hKey = container.querySelector('[data-vk-key="ހ"]');
    expect(hKey?.className).toContain('text-lg');
    expect(hKey?.className).toContain('sm:text-xl');

    // Hint visible
    expect(container.textContent).toContain(
      'Type using Thaana or QWERTY keyboard · Enter to guess'
    );

    // Type ހަށަނަރަ via QWERTY: h a S a n a r a
    await act(async () => {
      dispatchKey('h');
      dispatchKey('a');
      dispatchKey('S');
      dispatchKey('a');
      dispatchKey('n');
      dispatchKey('a');
      dispatchKey('r');
      dispatchKey('a');
    });

    // Matching on-screen key briefly highlighted (last pressed: ަ)
    const abaFiliKey = container.querySelector('[data-vk-key="ަ"]');
    expect(abaFiliKey?.className).toContain('ring-2');

    // Backspace deletes last fili, then type 'i', then Backspace back and 'a'
    await act(async () => {
      dispatchKey('Backspace');
      dispatchKey('i');
      dispatchKey('Backspace');
      dispatchKey('a');
    });

    // Submit with Enter
    await act(async () => {
      dispatchKey('Enter');
    });
    await flush();

    expect(checkWordleGuess).toHaveBeenCalledWith('ހަށަނަރަ');
  });

  it('supports Phonetic mode toggle and direct Thaana Unicode input while ignoring Ctrl/Cmd/Alt & overlays', async () => {
    const { checkWordleGuess } = await renderGames();

    // Ctrl/Cmd/Alt shortcuts ignored
    await act(async () => {
      dispatchKey('h', { ctrlKey: true });
      dispatchKey('a', { metaKey: true });
      dispatchKey('r', { altKey: true });
    });

    // Switch to Phonetic mode
    const phoneticBtn = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent?.trim() === 'Phonetic'
    );
    expect(phoneticBtn).toBeTruthy();
    await act(async () => {
      phoneticBtn!.click();
    });

    // Type "hashabas " (Space adds sukun on ސް)
    await act(async () => {
      for (const ch of ['h', 'a', 's', 'h', 'a', 'b', 'a', 's', ' ']) {
        dispatchKey(ch);
      }
      dispatchKey('Enter');
    });
    await flush();

    expect(checkWordleGuess).toHaveBeenCalledWith('ހަށަބަސް');
  });

  it('ignores Wordle physical keys when overlay is open or an input is focused', async () => {
    const { checkWordleGuess } = await renderGames(true);

    await act(async () => {
      for (const ch of ['h', 'a', 'S', 'a', 'n', 'a', 'r', 'a']) {
        dispatchKey(ch);
      }
      dispatchKey('Enter');
    });
    await flush();

    expect(checkWordleGuess).not.toHaveBeenCalled();

    // Re-render without overlay, focus a temporary input, and verify keystrokes are ignored
    await act(async () => {
      root.render(
        <GamesView
          settings={SETTINGS}
          gamePools={POOLS}
          getEntries={async (ids) =>
            ids
              .map((id) => ENTRIES.find((e) => e.id === id))
              .filter((e): e is DictionaryEntry => Boolean(e))
          }
          checkWordleGuess={checkWordleGuess}
          autocomplete={async () => []}
          onInspectId={vi.fn()}
          isOverlayOpen={false}
        />
      );
    });
    await flush();

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    await act(async () => {
      dispatchKey('h');
      dispatchKey('a');
      dispatchKey('S');
      dispatchKey('a');
      dispatchKey('n');
      dispatchKey('a');
      dispatchKey('r');
      dispatchKey('a');
      dispatchKey('Enter');
    });
    await flush();
    input.remove();

    expect(checkWordleGuess).not.toHaveBeenCalled();
  });

  it('supports Maana Clue shortcuts: H for next hint, 1-4 to pick option, Enter/Space for next round', async () => {
    await renderGames();

    const clueTabBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Maana Clue')
    );
    expect(clueTabBtn).toBeTruthy();

    await act(async () => {
      clueTabBtn!.click();
    });
    await flush();

    // Initially 1 clue visible
    expect(container.textContent).toContain('Reveal another clue');

    // Press H to reveal clue 2
    await act(async () => {
      dispatchKey('h');
    });
    await flush();

    // Press H again to reveal clue 3 (if target has >=3 clues, button disappears or clue 3 shows)
    await act(async () => {
      dispatchKey('H');
    });
    await flush();

    // Pick options 1..4 via number keys until round finishes (won or lost)
    for (const num of ['1', '2', '3', '4']) {
      if (
        container.textContent?.includes('Solved!') ||
        container.textContent?.includes('Correct Answer:')
      ) {
        break;
      }
      await act(async () => {
        dispatchKey(num);
      });
      await flush();
    }

    expect(
      container.textContent?.includes('Solved!') ||
        container.textContent?.includes('Correct Answer:')
    ).toBe(true);

    // Press Enter for next round -> should switch to Practice Mode and start fresh playing round
    await act(async () => {
      dispatchKey('Enter');
    });
    await flush();

    expect(container.textContent).toContain('Back to Daily');
    expect(container.textContent).toContain('Attempts: 0 /');
  });
});
