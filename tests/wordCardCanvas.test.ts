import { describe, expect, it, vi } from 'vitest';
import { hydrateEntry } from '../src/lib/hydrate.ts';
import {
  buildWordCardFilename,
  computeHeadwordFontSize,
  renderWordCardToCanvas,
  wrapTextLines,
} from '../src/lib/wordCardCanvas.ts';

describe('Shareable Word Card Canvas layout helpers', () => {
  it('scales headword font size based on Thaana headword length', () => {
    expect(computeHeadwordFontSize('ލޯބި')).toBe(104);
    expect(computeHeadwordFontSize('ކަޅުބިލަމަސް')).toBe(76);
    expect(computeHeadwordFontSize('ހަށަންފުޅުބެންނެވުން')).toBe(64);
    expect(
      computeHeadwordFontSize('ތުންބުރި ކާޅަށް ވެސް ކާން ލިބޭ ދުވަސް')
    ).toBe(52);
  });

  it('builds a clean slugified PNG filename from romanized headword', () => {
    const entry = hydrateEntry({
      i: 42,
      si: [42],
      h: 'ލޯބި',
      r: 'loabi',
      g: 2,
      s: ['ކުލުނު.'],
    });
    expect(buildWordCardFilename(entry)).toBe('dhivehi-word-loabi.png');
  });

  it('wraps multi-word text within maxWidth and truncates overflow with ellipsis at maxLines', () => {
    const measure = (s: string) => s.length * 10;
    const shortLines = wrapTextLines('Warm affection and tenderness', 180, 3, measure);
    expect(shortLines).toEqual(['Warm affection and', 'tenderness']);

    const longText =
      'A very long traditional Maldivian dictionary definition that exceeds two lines of available space on the card.';
    const clamped = wrapTextLines(longText, 240, 2, measure);
    expect(clamped).toHaveLength(2);
    expect(clamped[1].endsWith('…')).toBe(true);
  });

  it('renders Koshaaru (ކޮށާރު) branding in header and footer watermark on Share Cards', async () => {
    const drawnTexts: string[] = [];
    const fakeCtx = {
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      fillRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arcTo: () => {},
      arc: () => {},
      closePath: () => {},
      fill: () => {},
      stroke: () => {},
      save: () => {},
      restore: () => {},
      clip: () => {},
      measureText: (s: string) => ({ width: s.length * 14 }),
      fillText: (text: string) => {
        drawnTexts.push(text);
      },
    };
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => fakeCtx),
    } as unknown as HTMLCanvasElement;

    const entry = hydrateEntry({
      i: 42,
      si: [42],
      h: 'ލޯބި',
      r: 'loabi',
      g: 2,
      s: ['ކުލުނު.'],
      eg: 'love, affection',
    });

    await renderWordCardToCanvas(fakeCanvas, entry, {
      theme: 'light',
      lang: 'en',
    });

    expect(drawnTexts).toContain('Koshaaru');
    expect(drawnTexts).toContain('ކޮށާރު · Dhivehi Dictionary');
    expect(drawnTexts).toContain('ކޮށާރު');
    expect(drawnTexts).not.toContain('Dhivehi Language Hub');
  });
});
