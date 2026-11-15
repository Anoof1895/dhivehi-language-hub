import type { UiLanguage } from '../types/dictionary.ts';

export function getMaleDateKey(date: Date = new Date()): string {
  // Indian/Maldives is UTC+5 year-round; en-CA yields YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Indian/Maldives',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getPreviousDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

export function fnv1aHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatInterval(now: Date, due: Date, lang: UiLanguage): string {
  const diffMs = Math.max(0, due.getTime() - now.getTime());
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) {
    const val = Math.max(1, mins);
    return lang === 'en' ? (val === 1 ? '1 min' : `${val} mins`) : `${val} މިނިޓު`;
  }
  const hours = Math.round(diffMs / 3600000);
  if (hours < 24) {
    return lang === 'en' ? (hours === 1 ? '1 hr' : `${hours} hrs`) : `${hours} ގަޑިއިރު`;
  }
  const days = Math.round(diffMs / 86400000);
  if (days < 30) {
    return lang === 'en' ? (days === 1 ? '1 day' : `${days} days`) : `${days} ދުވަސް`;
  }
  const months = Math.round(days / 30);
  return lang === 'en' ? (months === 1 ? '1 mo' : `${months} mos`) : `${months} މަސް`;
}
