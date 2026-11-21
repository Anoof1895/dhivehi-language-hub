import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const ANDROID_RES_DIR = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
const FARUMA_PATH = path.join(PUBLIC_DIR, 'fonts', 'Faruma.ttf');

function buildIconSvg({
  variant = 'rounded', // 'rounded' | 'square' | 'maskable' | 'round' | 'foreground'
} = {}) {
  if (variant === 'foreground') {
    // Android adaptive icon foreground: 108x108 viewBox with inner 66x66 safe zone
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" fill="none">
      <g transform="translate(22, 22) scale(0.5)">
        <circle cx="64" cy="64" r="48" stroke="#FAF7F2" stroke-opacity="0.24" stroke-width="3.5" />
        <path d="M36 68c10-18 28-26 56-22-12 16-24 28-44 32-6 1-10-4-12-10Z" fill="#FAF7F2" fill-opacity="0.95" />
        <circle cx="88" cy="40" r="8.5" fill="#D95D39" />
        <text x="64" y="98" text-anchor="middle" font-family="Faruma" font-size="25" font-weight="700" fill="#FAF7F2">ބަސް</text>
      </g>
    </svg>`;
  }

  if (variant === 'maskable') {
    // Full-bleed #0D6E6E background with emblem comfortably inside 80% maskable safe zone
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
      <rect width="128" height="128" fill="#0D6E6E" />
      <g transform="translate(14.08, 14.08) scale(0.78)">
        <circle cx="64" cy="64" r="46" stroke="#FAF7F2" stroke-opacity="0.24" stroke-width="3.2" />
        <path d="M36 68c10-18 28-26 56-22-12 16-24 28-44 32-6 1-10-4-12-10Z" fill="#FAF7F2" fill-opacity="0.94" />
        <circle cx="88" cy="40" r="8" fill="#D95D39" />
        <text x="64" y="98" text-anchor="middle" font-family="Faruma" font-size="24" font-weight="700" fill="#FAF7F2">ބަސް</text>
      </g>
    </svg>`;
  }

  if (variant === 'round') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
      <circle cx="64" cy="64" r="62" fill="#0D6E6E" />
      <circle cx="64" cy="64" r="46" stroke="#FAF7F2" stroke-opacity="0.22" stroke-width="3" />
      <path d="M36 68c10-18 28-26 56-22-12 16-24 28-44 32-6 1-10-4-12-10Z" fill="#FAF7F2" fill-opacity="0.92" />
      <circle cx="88" cy="40" r="8" fill="#D95D39" />
      <text x="64" y="98" text-anchor="middle" font-family="Faruma" font-size="24" font-weight="700" fill="#FAF7F2">ބަސް</text>
    </svg>`;
  }

  const rx = variant === 'square' ? 0 : 28;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
    <rect width="128" height="128" rx="${rx}" fill="#0D6E6E" />
    <circle cx="64" cy="64" r="46" stroke="#FAF7F2" stroke-opacity="0.22" stroke-width="3" />
    <path d="M36 68c10-18 28-26 56-22-12 16-24 28-44 32-6 1-10-4-12-10Z" fill="#FAF7F2" fill-opacity="0.92" />
    <circle cx="88" cy="40" r="8" fill="#D95D39" />
    <text x="64" y="98" text-anchor="middle" font-family="Faruma" font-size="24" font-weight="700" fill="#FAF7F2">ބަސް</text>
  </svg>`;
}

function buildSplashSvg(width, height) {
  const iconSize = Math.round(Math.min(width, height) * 0.24);
  const cx = Math.round((width - iconSize) / 2);
  const cy = Math.round((height - iconSize) / 2);
  const scale = (iconSize / 128).toFixed(4);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" fill="none">
    <rect width="${width}" height="${height}" fill="#FAF7F2" />
    <g transform="translate(${cx}, ${cy}) scale(${scale})">
      <rect width="128" height="128" rx="28" fill="#0D6E6E" />
      <circle cx="64" cy="64" r="46" stroke="#FAF7F2" stroke-opacity="0.22" stroke-width="3" />
      <path d="M36 68c10-18 28-26 56-22-12 16-24 28-44 32-6 1-10-4-12-10Z" fill="#FAF7F2" fill-opacity="0.92" />
      <circle cx="88" cy="40" r="8" fill="#D95D39" />
      <text x="64" y="98" text-anchor="middle" font-family="Faruma" font-size="24" font-weight="700" fill="#FAF7F2">ބަސް</text>
    </g>
  </svg>`;
}

function renderSvgToPngFile(svgString, targetWidth, outPath) {
  const resvg = new Resvg(svgString, {
    fitTo: {
      mode: 'width',
      value: targetWidth,
    },
    font: {
      fontFiles: fs.existsSync(FARUMA_PATH) ? [FARUMA_PATH] : [],
      loadSystemFonts: false,
      defaultFontFamily: 'Faruma',
    },
  });
  const pngBuffer = resvg.render().asPng();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, pngBuffer);
}

function generatePublicPwaIcons() {
  // iOS Safari expects opaque square icons (iOS masks corners automatically)
  renderSvgToPngFile(
    buildIconSvg({ variant: 'square' }),
    180,
    path.join(PUBLIC_DIR, 'apple-touch-icon.png')
  );
  renderSvgToPngFile(
    buildIconSvg({ variant: 'rounded' }),
    192,
    path.join(PUBLIC_DIR, 'pwa-192x192.png')
  );
  renderSvgToPngFile(
    buildIconSvg({ variant: 'rounded' }),
    512,
    path.join(PUBLIC_DIR, 'pwa-512x512.png')
  );
  renderSvgToPngFile(
    buildIconSvg({ variant: 'maskable' }),
    512,
    path.join(PUBLIC_DIR, 'pwa-maskable-512x512.png')
  );
  console.log('Generated PWA & iPhone icons in public/: apple-touch-icon.png, pwa-192x192.png, pwa-512x512.png, pwa-maskable-512x512.png');
}

function generateAndroidNativeResources() {
  if (!fs.existsSync(ANDROID_RES_DIR)) {
    console.log('android/ directory not present yet; skipping Android res generation.');
    return;
  }

  const mipmapSpecs = [
    { dir: 'mipmap-mdpi', launcher: 48, foreground: 108 },
    { dir: 'mipmap-hdpi', launcher: 72, foreground: 162 },
    { dir: 'mipmap-xhdpi', launcher: 96, foreground: 216 },
    { dir: 'mipmap-xxhdpi', launcher: 144, foreground: 324 },
    { dir: 'mipmap-xxxhdpi', launcher: 192, foreground: 432 },
  ];

  for (const spec of mipmapSpecs) {
    const folder = path.join(ANDROID_RES_DIR, spec.dir);
    renderSvgToPngFile(
      buildIconSvg({ variant: 'rounded' }),
      spec.launcher,
      path.join(folder, 'ic_launcher.png')
    );
    renderSvgToPngFile(
      buildIconSvg({ variant: 'round' }),
      spec.launcher,
      path.join(folder, 'ic_launcher_round.png')
    );
    renderSvgToPngFile(
      buildIconSvg({ variant: 'foreground' }),
      spec.foreground,
      path.join(folder, 'ic_launcher_foreground.png')
    );
  }

  const bgXmlPath = path.join(ANDROID_RES_DIR, 'values', 'ic_launcher_background.xml');
  if (fs.existsSync(path.dirname(bgXmlPath))) {
    fs.writeFileSync(
      bgXmlPath,
      `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0D6E6E</color>\n</resources>\n`,
      'utf8'
    );
  }

  const splashSpecs = [
    { dir: 'drawable', w: 480, h: 800 },
    { dir: 'drawable-port-mdpi', w: 320, h: 480 },
    { dir: 'drawable-port-hdpi', w: 480, h: 800 },
    { dir: 'drawable-port-xhdpi', w: 720, h: 1280 },
    { dir: 'drawable-port-xxhdpi', w: 960, h: 1600 },
    { dir: 'drawable-port-xxxhdpi', w: 1280, h: 1920 },
    { dir: 'drawable-land-mdpi', w: 480, h: 320 },
    { dir: 'drawable-land-hdpi', w: 800, h: 480 },
    { dir: 'drawable-land-xhdpi', w: 1280, h: 720 },
    { dir: 'drawable-land-xxhdpi', w: 1600, h: 960 },
    { dir: 'drawable-land-xxxhdpi', w: 1920, h: 1280 },
  ];

  for (const sp of splashSpecs) {
    const out = path.join(ANDROID_RES_DIR, sp.dir, 'splash.png');
    renderSvgToPngFile(buildSplashSvg(sp.w, sp.h), sp.w, out);
  }

  console.log('Generated Android launcher mipmap icons and splash screens in android/app/src/main/res/');
}

generatePublicPwaIcons();
generateAndroidNativeResources();
