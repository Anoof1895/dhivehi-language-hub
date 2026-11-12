# Dhivehi Language Hub (ދިވެހި ބަހުގެ މަރުކަޒު)

An offline-first Progressive Web App (PWA) for exploring the Dhivehi language, built around a hyperlinked **Radheef** dictionary, FSRS spaced repetition, daily vocabulary decks, and Thaana word games.

## Features

- **Hyperlinked Reverse Dictionary (`DictionaryView`)**
  - Web Worker-backed search across 38,719 canonical entries and 56,583 senses (`dictionary.worker.ts`), supporting Thaana script, romanized Latin queries, and prefix/autocomplete suggestions.
  - Inline clickable cross-links (`SenseText`) and a slide-over **Word Inspector Drawer** (`WordInspectorDrawer`) showing synonyms, reverse references (*referenced in*), explicit base words, morphological word families, dialects, registers, and grammatical classes.
- **Daily Words & Curated Decks (`DailyWordsView`)**
  - Daily word queue anchored to Malé local date (`Asia/Maldives`), with deck filters for general curated vocabulary, **Honorific** (`honorific`), **Dialect** (`dialect`), **Figurative** (`figurative`), and **Proverb** (`proverb`) pools.
- **FSRS Spaced Repetition (`ReviewView`)**
  - Powered by `ts-fsrs` with local persistence in IndexedDB (`idb`) for SRS cards, known words, daily progress, and user settings.
- **Thaana Word Games (`GamesView`)**
  - **4-Grapheme Thaana Wordle** (`wordle.ts`): validates guesses against 8,547 4-grapheme words with 6,117 curated answer candidates.
  - **Clue Challenge** (`clueGame.ts`): multi-sense word guessing game drawn from 1,469 entries with 4+ senses.
  - **Virtual Thaana Keyboard** (`VirtualThaanaKeyboard`) for direct Thaana input on any device.
- **Bilingual & RTL-First UI**
  - Supports Dhivehi (RTL) and English UI switching, dark/light theme, `Faruma` and `Noto Sans Thaana` typography, and full offline caching via `vite-plugin-pwa` + Workbox.

## Data Pipeline

The offline dictionary and game datasets are generated from `radheef.json` by `scripts/build-dictionary.mjs` and validated by `scripts/verify-pipeline.mjs`.

1. **Source Normalization & Deduplication**
   - Reads raw entries (`38,778` raw -> `38,719` canonical entries, merging `59` duplicate groups).
   - Cleans sense text (repaired leading parentheses, whitespace normalization, empty sense removal).
2. **Grammar, Dialect & Register Extraction**
   - Normalizes word-class typos and repairs malformed parentheses.
   - Maps dialect codes (`addu`, `fuvahmulah`, `huvadhoo`, `laamu`, `lhaviyani`, `haa`, `archaic`) and detects registers (`honorific`, `proverb`, `figurative`).
   - Infers word classes for unclassified entries (`phrase_proverb`, `verbal_masdhar`, `abstract_kan`).
3. **Grapheme Segmentation & Romanization**
   - Uses `src/lib/thaanaCore.js` to segment Thaana base-consonant + diacritic (*fili*) graphemes and generate romanized search keys.
4. **Graph & Morphological Linking**
   - Extracts synonym links (`12,665`), explicit base-word links (`754`), morphological word families (`20,821` entries), and reverse cross-links (`108,999` across `10,574` entries).
5. **Game Pool Generation & Compact Output**
   - Outputs compact JSON artifacts to `public/data/`:
     - `dictionary-core.json` — compact entry records with short keys
     - `dictionary-links.json` — reverse cross-reference index
     - `game-pools.json` — curated daily IDs, themed deck pools, Wordle valid/answer pools, and Clue Challenge IDs
     - `pipeline-report.json` — summary statistics from the latest build

## Development & Scripts

```bash
# Install dependencies
npm install

# Rebuild dictionary & game datasets from radheef.json
npm run build:data

# Verify pipeline outputs
npm run verify:data

# Start Vite dev server
npm run dev

# Run unit tests (Vitest)
npm test

# Type-check and build production PWA
npm run build
```

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide icons
- **Build & PWA:** Vite 8, `vite-plugin-pwa` (Workbox)
- **Storage & SRS:** `idb` (IndexedDB), `ts-fsrs`
- **Testing:** Vitest, `jsdom`
