import { useEffect, useRef, useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Share2,
  Sun,
  Moon,
} from 'lucide-react';
import type {
  DictionaryEntry,
  ThemeMode,
  UiLanguage,
} from '../types/dictionary.ts';
import { getUiDirection, t } from '../lib/labels.ts';
import {
  buildWordCardFilename,
  canvasToPngBlob,
  renderWordCardToCanvas,
} from '../lib/wordCardCanvas.ts';
import {
  canUseNativeOrWebShare,
  shareWordCardFile,
} from '../lib/native.ts';

interface Props {
  entry: DictionaryEntry | null;
  defaultTheme: ThemeMode;
  lang: UiLanguage;
  onClose: () => void;
}

export function ShareWordCardModal({
  entry,
  defaultTheme,
  lang,
  onClose,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cardTheme, setCardTheme] = useState<ThemeMode>(defaultTheme);
  const [copied, setCopied] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    setCardTheme(defaultTheme);
  }, [defaultTheme, entry?.id]);

  useEffect(() => {
    if (!entry || !canvasRef.current) return;
    let active = true;
    setRendering(true);
    setStatusMsg(null);
    setCopied(false);

    renderWordCardToCanvas(canvasRef.current, entry, {
      theme: cardTheme,
      lang,
    }).finally(() => {
      if (active) setRendering(false);
    });

    return () => {
      active = false;
    };
  }, [entry, cardTheme, lang]);

  if (!entry) return null;

  const textDir = getUiDirection(lang);
  const filename = buildWordCardFilename(entry);
  const canCopyClipboard =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.clipboard?.write) &&
    typeof ClipboardItem !== 'undefined';

  const canNativeShare = canUseNativeOrWebShare();

  const handleDownload = async () => {
    if (!canvasRef.current) return;
    const blob = await canvasToPngBlob(canvasRef.current);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg(
      t('ބަސް ކާޑު ޑައުންލޯޑްވެއްޖެ (PNG)', 'Word card downloaded (PNG)!', lang)
    );
  };

  const handleCopyImage = async () => {
    if (!canvasRef.current || !canCopyClipboard) return;
    try {
      const blob = await canvasToPngBlob(canvasRef.current);
      if (!blob) return;
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      setCopied(true);
      setStatusMsg(
        t('ބަސް ކާޑު ކޮޕީވެއްޖެ!', 'Card copied to clipboard!', lang)
      );
      setTimeout(() => setCopied(false), 2500);
    } catch {
      await handleDownload();
    }
  };

  const handleNativeShare = async () => {
    if (!canvasRef.current) return;
    const blob = await canvasToPngBlob(canvasRef.current);
    if (!blob) return;
    const title = `${entry.headword} — Dhivehi Language Hub`;
    const text = entry.enGloss
      ? `${entry.headword} (${entry.romanized}): ${entry.enGloss}`
      : entry.headword;

    const shared = await shareWordCardFile(blob, filename, title, text);
    if (shared) return;
    await handleDownload();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div
        className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-[#E4DCCE] bg-[#FAF7F2] shadow-2xl dark:border-[#213840] dark:bg-[#0B161A]"
        dir="ltr"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E4DCCE] bg-white/90 px-4 py-3 dark:border-[#213840] dark:bg-[#132329]/90">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-[#0D6E6E] dark:text-[#2DD4BF]" />
            <span
              dir={textDir}
              className="text-sm font-bold text-[#142126] dark:text-[#F1F5F9]"
            >
              {t('ބަސް ކާޑު ޙިއްޞާކުރޭ (PNG)', 'Shareable Word Card (PNG)', lang)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Light / Dark Card Theme Switch */}
            <div className="inline-flex items-center rounded-xl border border-[#E4DCCE] bg-[#FAF7F2] p-0.5 dark:border-[#213840] dark:bg-[#182C33]">
              <button
                type="button"
                onClick={() => setCardTheme('light')}
                aria-label="Alabaster Light card theme"
                className={`inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
                  cardTheme === 'light'
                    ? 'bg-[#0D6E6E] text-white dark:bg-[#2DD4BF] dark:text-[#0B161A]'
                    : 'text-[#52636A] dark:text-[#9BB0B8]'
                }`}
              >
                <Sun className="h-3 w-3" />
                <span>{t('އަލި', 'Light', lang)}</span>
              </button>
              <button
                type="button"
                onClick={() => setCardTheme('dark')}
                aria-label="Reef Dark card theme"
                className={`inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
                  cardTheme === 'dark'
                    ? 'bg-[#0D6E6E] text-white dark:bg-[#2DD4BF] dark:text-[#0B161A]'
                    : 'text-[#52636A] dark:text-[#9BB0B8]'
                }`}
              >
                <Moon className="h-3 w-3" />
                <span>{t('ރޭގަނޑު', 'Dark', lang)}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close share card modal"
              className="cursor-pointer rounded-xl p-1.5 text-[#52636A] hover:bg-[#F2ECE1] dark:text-[#9BB0B8] dark:hover:bg-[#182C33]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Canvas Preview Area */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="relative mx-auto aspect-4/5 w-full max-w-[330px] overflow-hidden rounded-2xl border border-[#E4DCCE] shadow-md dark:border-[#213840]">
            <canvas
              ref={canvasRef}
              className="h-full w-full object-contain"
            />
            {rendering && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                <span className="rounded-xl bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#142126] shadow-xs dark:bg-[#132329]/90 dark:text-[#F1F5F9]">
                  {t('ކާޑު ތައްޔާރުވަނީ...', 'Rendering card...', lang)}
                </span>
              </div>
            )}
          </div>

          {statusMsg && (
            <p
              dir={textDir}
              className="mt-2.5 text-center text-xs font-semibold text-[#0D6E6E] dark:text-[#2DD4BF]"
            >
              {statusMsg}
            </p>
          )}
        </div>

        {/* Actions Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#E4DCCE] bg-white/90 px-4 py-3 dark:border-[#213840] dark:bg-[#132329]/90">
          {canCopyClipboard && (
            <button
              type="button"
              onClick={handleCopyImage}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#E4DCCE] bg-[#FAF7F2] px-3.5 py-2 text-xs font-semibold text-[#142126] transition hover:border-[#0D6E6E] hover:text-[#0D6E6E] dark:border-[#213840] dark:bg-[#182C33] dark:text-[#F1F5F9] dark:hover:border-[#2DD4BF] dark:hover:text-[#2DD4BF]"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span dir={textDir}>
                {copied
                  ? t('ކޮޕީވެއްޖެ', 'Copied', lang)
                  : t('ފޮޓޯ ކޮޕީކުރޭ', 'Copy Image', lang)}
              </span>
            </button>
          )}

          {canNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#E4DCCE] bg-[#FAF7F2] px-3.5 py-2 text-xs font-semibold text-[#142126] transition hover:border-[#0D6E6E] hover:text-[#0D6E6E] dark:border-[#213840] dark:bg-[#182C33] dark:text-[#F1F5F9] dark:hover:border-[#2DD4BF] dark:hover:text-[#2DD4BF]"
            >
              <Share2 className="h-4 w-4" />
              <span dir={textDir}>{t('ޝެއަރ', 'Share', lang)}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0D6E6E] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#095555] dark:bg-[#2DD4BF] dark:text-[#0B161A]"
          >
            <Download className="h-4 w-4" />
            <span dir={textDir}>
              {t('ޑައުންލޯޑް PNG', 'Download PNG', lang)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
