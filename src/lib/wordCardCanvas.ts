import type {
  DictionaryEntry,
  ThemeMode,
  UiLanguage,
} from '../types/dictionary.ts';
import {
  CATEGORY_META,
  DIALECT_LABELS,
  INFERRED_WORDCLASS_LABELS,
  REGISTER_LABELS,
  WORDCLASS_LABELS,
  formatBiLabel,
} from './labels.ts';

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

export function computeHeadwordFontSize(headword: string): number {
  const len = headword.trim().length;
  if (len <= 6) return 104;
  if (len <= 10) return 90;
  if (len <= 15) return 76;
  if (len <= 22) return 64;
  return 52;
}

export function buildWordCardFilename(entry: DictionaryEntry): string {
  const romSlug = (entry.romanized || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);
  const suffix = romSlug || `id-${entry.id}`;
  return `dhivehi-word-${suffix}.png`;
}

/**
 * Wraps text into at most `maxLines` lines using either a pixel-width `measureWidth` callback
 * or a character-length fallback when no canvas context is available.
 */
export function wrapTextLines(
  rawText: string,
  maxWidth: number,
  maxLines: number,
  measureWidth: (str: string) => number = (s) => s.length * 14
): string[] {
  const text = rawText.replace(/\s+/g, ' ').trim();
  if (!text || maxLines <= 0) return [];

  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const candidate = current ? `${current} ${word}` : word;
    if (!current || measureWidth(candidate) <= maxWidth) {
      current = candidate;
    } else {
      if (lines.length === maxLines - 1) {
        const remaining = [current, ...words.slice(i)].join(' ');
        lines.push(truncateWithEllipsis(remaining, maxWidth, measureWidth));
        return lines;
      }
      lines.push(current);
      current = word;
    }
  }

  if (current) {
    if (lines.length === maxLines - 1 && measureWidth(current) > maxWidth) {
      lines.push(truncateWithEllipsis(current, maxWidth, measureWidth));
    } else if (lines.length < maxLines) {
      lines.push(current);
    }
  }

  return lines;
}

function truncateWithEllipsis(
  str: string,
  maxWidth: number,
  measureWidth: (s: string) => number
): string {
  if (measureWidth(str) <= maxWidth) return str;
  const words = str.split(' ');
  let acc = '';
  for (const w of words) {
    const next = acc ? `${acc} ${w}` : w;
    if (measureWidth(`${next}…`) <= maxWidth) {
      acc = next;
    } else {
      break;
    }
  }
  if (acc) return `${acc}…`;
  let chars = str;
  while (chars.length > 1 && measureWidth(`${chars}…`) > maxWidth) {
    chars = chars.slice(0, -1);
  }
  return `${chars}…`;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function ensureFarumaFontLoaded(sampleText: string): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  try {
    await Promise.all([
      document.fonts.load('700 84px "Faruma"', sampleText),
      document.fonts.load('400 34px "Faruma"', sampleText),
    ]);
    await document.fonts.ready;
  } catch {
    // Ignore font preloading errors in older browsers
  }
}

function buildMetadataChips(entry: DictionaryEntry, lang: UiLanguage): string[] {
  const chips: string[] = [];

  for (const wc of entry.wordclasses.slice(0, 2)) {
    const label = WORDCLASS_LABELS[wc];
    if (label) chips.push(formatBiLabel(label, lang));
  }
  if (chips.length === 0 && entry.inferredWordclass) {
    const inf = INFERRED_WORDCLASS_LABELS[entry.inferredWordclass];
    if (inf) chips.push(formatBiLabel(inf, lang));
  }
  for (const cat of (entry.categories ?? []).slice(0, 2)) {
    const meta = CATEGORY_META[cat];
    if (meta) chips.push(formatBiLabel(meta.shortLabel, lang));
  }
  for (const d of entry.dialects.slice(0, 1)) {
    chips.push(formatBiLabel(DIALECT_LABELS[d], lang));
  }
  for (const r of entry.registers.slice(0, 1)) {
    chips.push(formatBiLabel(REGISTER_LABELS[r], lang));
  }

  return chips.slice(0, 4);
}

export async function renderWordCardToCanvas(
  canvas: HTMLCanvasElement,
  entry: DictionaryEntry,
  options: { theme: ThemeMode; lang: UiLanguage }
): Promise<void> {
  await ensureFarumaFontLoaded(`${entry.headword} ${entry.senses[0] ?? ''}`);

  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const isDark = options.theme === 'dark';
  const palette = isDark
    ? {
        bgStart: '#0B161A',
        bgEnd: '#102229',
        cardBg: '#132329',
        innerBg: '#0E1C21',
        sandBg: '#182C33',
        border: '#243E47',
        ink: '#F1F5F9',
        muted: '#9BB0B8',
        lagoon: '#2DD4BF',
        lagoonSoft: 'rgba(45, 212, 191, 0.14)',
        coral: '#FB923C',
        coralSoft: 'rgba(251, 146, 60, 0.16)',
      }
    : {
        bgStart: '#FAF7F2',
        bgEnd: '#EFE7DA',
        cardBg: '#FFFFFF',
        innerBg: '#FAF7F2',
        sandBg: '#F2ECE1',
        border: '#E4DCCE',
        ink: '#142126',
        muted: '#52636A',
        lagoon: '#0D6E6E',
        lagoonSoft: 'rgba(13, 110, 110, 0.11)',
        coral: '#D95D39',
        coralSoft: 'rgba(217, 93, 57, 0.13)',
      };

  const fontStack =
    '"Faruma", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const monoStack =
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

  // 1. Canvas Background Gradient + Decorative Lagoon/Coral Glow
  const bgGrad = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  bgGrad.addColorStop(0, palette.bgStart);
  bgGrad.addColorStop(1, palette.bgEnd);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const glow = ctx.createRadialGradient(
    CARD_WIDTH - 140,
    140,
    20,
    CARD_WIDTH - 140,
    140,
    460
  );
  glow.addColorStop(0, palette.lagoonSoft);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // 2. Main Editorial Card Frame
  const frameX = 56;
  const frameY = 56;
  const frameW = CARD_WIDTH - 112;
  const frameH = CARD_HEIGHT - 112;

  drawRoundedRect(ctx, frameX, frameY, frameW, frameH, 44);
  ctx.fillStyle = palette.cardBg;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = palette.border;
  ctx.stroke();

  // Top Accent Bar inside frame
  ctx.save();
  drawRoundedRect(ctx, frameX, frameY, frameW, frameH, 44);
  ctx.clip();
  const topBarGrad = ctx.createLinearGradient(frameX, 0, frameX + frameW, 0);
  topBarGrad.addColorStop(0, palette.lagoon);
  topBarGrad.addColorStop(0.72, palette.lagoon);
  topBarGrad.addColorStop(1, palette.coral);
  ctx.fillStyle = topBarGrad;
  ctx.fillRect(frameX, frameY, frameW, 12);
  ctx.restore();

  const padX = frameX + 64;
  const contentW = frameW - 128;

  // 3. Top Brand Header
  let cursorY = frameY + 62;
  drawRoundedRect(ctx, padX, cursorY - 26, 48, 48, 14);
  ctx.fillStyle = palette.lagoon;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(padX + 35, cursorY - 12, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = palette.coral;
  ctx.fill();

  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.font = `700 18px ${fontStack}`;
  ctx.fillStyle = '#FAF7F2';
  ctx.fillText('ބަސް', padX + 24, cursorY + 4);

  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.font = `700 24px ${fontStack}`;
  ctx.fillStyle = palette.ink;
  ctx.fillText('Dhivehi Language Hub', padX + 64, cursorY - 2);

  ctx.font = `500 18px ${fontStack}`;
  ctx.fillStyle = palette.muted;
  ctx.fillText('ދިވެހި ބަހުގެ މަރުކަޒު · Radheef Dictionary', padX + 64, cursorY + 23);

  // 4. Metadata Chips Row (Wordclass, Topic Categories, Dialect/Register)
  cursorY += 68;
  const chips = buildMetadataChips(entry, options.lang);
  if (chips.length > 0) {
    let chipX = padX + contentW;
    ctx.font = `600 21px ${fontStack}`;
    for (const chipText of chips) {
      const textW = ctx.measureText(chipText).width;
      const pillW = textW + 34;
      if (chipX - pillW < padX) break;
      drawRoundedRect(ctx, chipX - pillW, cursorY, pillW, 42, 21);
      ctx.fillStyle = palette.lagoonSoft;
      ctx.fill();

      ctx.direction = /[\u0780-\u07BF]/.test(chipText) ? 'rtl' : 'ltr';
      ctx.textAlign = 'center';
      ctx.fillStyle = palette.lagoon;
      ctx.fillText(chipText, chipX - pillW / 2, cursorY + 28);
      chipX -= pillW + 12;
    }
    cursorY += 66;
  } else {
    cursorY += 16;
  }

  // 5. Hero Faruma Headword + Phonetic Romanization
  const hwSize = computeHeadwordFontSize(entry.headword);
  ctx.font = `700 ${hwSize}px ${fontStack}`;
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = palette.ink;

  const hwLines = wrapTextLines(entry.headword, contentW, 2, (s) => ctx.measureText(s).width);
  const hwLineHeight = Math.round(hwSize * 1.48);
  for (const line of hwLines) {
    cursorY += hwLineHeight;
    ctx.fillText(line, padX + contentW, cursorY - Math.round(hwSize * 0.22));
  }

  if (entry.romanized) {
    cursorY += 18;
    const romText = `/${entry.romanized}/`;
    ctx.font = `600 26px ${monoStack}`;
    const romW = Math.min(contentW, ctx.measureText(romText).width + 38);
    drawRoundedRect(ctx, padX + contentW - romW, cursorY, romW, 48, 14);
    ctx.fillStyle = palette.sandBg;
    ctx.fill();

    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.fillStyle = palette.muted;
    ctx.fillText(romText, padX + contentW - romW / 2, cursorY + 32);
    cursorY += 74;
  } else {
    cursorY += 32;
  }

  // 6. English Gloss & Meaning Block
  const gloss = (entry.enGloss ?? '').trim();
  const meaning = (entry.enMeaning ?? '').trim();
  if (gloss || meaning) {
    const showSeparateMeaning =
      Boolean(meaning) &&
      (!gloss ||
        meaning.toLowerCase().replace(/[.!?\s]+$/g, '') !==
          gloss.toLowerCase().replace(/[.!?\s]+$/g, ''));

    const innerTextW = contentW - 80;
    ctx.font = `700 32px ${fontStack}`;
    const glossLines = gloss
      ? wrapTextLines(gloss, innerTextW - 68, 2, (s) => ctx.measureText(s).width)
      : [];

    ctx.font = `400 26px ${fontStack}`;
    const meaningLines = showSeparateMeaning
      ? wrapTextLines(meaning, innerTextW, 3, (s) => ctx.measureText(s).width)
      : [];

    const boxH =
      52 +
      glossLines.length * 44 +
      (glossLines.length > 0 && meaningLines.length > 0 ? 12 : 0) +
      meaningLines.length * 38;

    drawRoundedRect(ctx, padX, cursorY, contentW, boxH, 28);
    ctx.fillStyle = palette.innerBg;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = palette.border;
    ctx.stroke();

    // EN Badge
    drawRoundedRect(ctx, padX + 34, cursorY + 26, 52, 34, 10);
    ctx.fillStyle = palette.lagoonSoft;
    ctx.fill();
    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.font = `700 18px ${fontStack}`;
    ctx.fillStyle = palette.lagoon;
    ctx.fillText('EN', padX + 60, cursorY + 49);

    let textY = cursorY + 52;
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';

    if (glossLines.length > 0) {
      ctx.font = `700 32px ${fontStack}`;
      ctx.fillStyle = palette.ink;
      for (let i = 0; i < glossLines.length; i++) {
        const xOffset = i === 0 ? padX + 102 : padX + 38;
        ctx.fillText(glossLines[i], xOffset, textY);
        textY += 44;
      }
    }

    if (meaningLines.length > 0) {
      if (glossLines.length > 0) textY += 6;
      ctx.font = `400 26px ${fontStack}`;
      ctx.fillStyle = palette.muted;
      for (let i = 0; i < meaningLines.length; i++) {
        const xOffset = glossLines.length === 0 && i === 0 ? padX + 102 : padX + 38;
        ctx.fillText(meaningLines[i], xOffset, textY);
        textY += 38;
      }
    }

    cursorY += boxH + 30;
  }

  // 7. Radheef Dhivehi Sense Block (RTL Faruma)
  const footerTopY = frameY + frameH - 96;
  const availableSenseH = Math.max(180, footerTopY - cursorY - 24);
  const maxSenseLines = Math.max(2, Math.min(5, Math.floor((availableSenseH - 72) / 56)));

  ctx.font = `400 31px ${fontStack}`;
  const sensesToRender = entry.senses.slice(0, 2);
  const formattedSenses =
    sensesToRender.length > 1
      ? sensesToRender.map((s, idx) => `${idx + 1}. ${s}`).join('   ')
      : sensesToRender[0] ?? '';

  const senseLines = wrapTextLines(
    formattedSenses,
    contentW - 76,
    maxSenseLines,
    (s) => ctx.measureText(s).width
  );

  const senseBoxH = Math.min(availableSenseH, 74 + senseLines.length * 56);
  drawRoundedRect(ctx, padX, cursorY, contentW, senseBoxH, 28);
  ctx.fillStyle = palette.sandBg;
  ctx.fill();

  // Subtle right accent stripe for RTL sense card
  drawRoundedRect(ctx, padX + contentW - 10, cursorY + 24, 10, senseBoxH - 48, 5);
  ctx.fillStyle = palette.coral;
  ctx.fill();

  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.font = `600 20px ${fontStack}`;
  ctx.fillStyle = palette.coral;
  ctx.fillText('ރަދީފުގެ މާނަ · Radheef Definition', padX + contentW - 36, cursorY + 42);

  ctx.font = `400 31px ${fontStack}`;
  ctx.fillStyle = palette.ink;
  let senseY = cursorY + 94;
  for (const line of senseLines) {
    ctx.fillText(line, padX + contentW - 36, senseY);
    senseY += 56;
  }

  // 8. Footer Divider & Watermark
  ctx.beginPath();
  ctx.moveTo(padX, footerTopY);
  ctx.lineTo(padX + contentW, footerTopY);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = palette.border;
  ctx.stroke();

  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.font = `600 20px ${fontStack}`;
  ctx.fillStyle = palette.muted;
  ctx.fillText('Dhivehi Language Hub', padX, footerTopY + 42);

  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.font = `600 22px ${fontStack}`;
  ctx.fillStyle = palette.lagoon;
  ctx.fillText('ދިވެހި ބަހުގެ މަރުކަޒު', padX + contentW, footerTopY + 42);
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}
