import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { ThemeMode, UiLanguage } from '../types/dictionary.ts';

export const DAILY_REMINDER_NOTIFICATION_ID = 1001;

export type HapticKind = 'light' | 'medium' | 'success' | 'warning';

export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export interface BackButtonState {
  hasShareModal: boolean;
  hasSettingsModal: boolean;
  hasInspectorDrawer: boolean;
  activeTab: 'daily' | 'dictionary' | 'games' | 'review';
}

export type BackButtonAction =
  | 'close-share'
  | 'close-settings'
  | 'close-drawer'
  | 'navigate-daily'
  | 'exit-app';

/**
 * Pure priority resolver for Android hardware Back button presses:
 * 1. Close Share Word Card modal if open
 * 2. Close Settings modal if open
 * 3. Close WordInspectorDrawer if open
 * 4. Navigate back to 'daily' tab if on another tab
 * 5. Exit app if already on 'daily' with no overlays open
 */
export function resolveBackButtonAction(state: BackButtonState): BackButtonAction {
  if (state.hasShareModal) return 'close-share';
  if (state.hasSettingsModal) return 'close-settings';
  if (state.hasInspectorDrawer) return 'close-drawer';
  if (state.activeTab !== 'daily') return 'navigate-daily';
  return 'exit-app';
}

/**
 * Syncs both the HTML <meta name="theme-color"> tag and the native Android
 * status bar background & icon contrast style with Light/Dark mode.
 */
export async function syncNativeStatusBar(theme: ThemeMode): Promise<void> {
  const bgColor = theme === 'dark' ? '#0B161A' : '#FAF7F2';

  if (typeof document !== 'undefined') {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', bgColor);
    }
  }

  if (!isNativePlatform()) return;

  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setBackgroundColor({ color: bgColor });
    await StatusBar.setStyle({
      style: theme === 'dark' ? Style.Dark : Style.Light,
    });
  } catch {
    // Ignore on platforms where StatusBar is unavailable
  }
}

/**
 * Triggers subtle native haptic feedback on Android/iOS Capacitor builds.
 * Safe no-op on web browsers.
 */
export async function triggerHaptic(kind: HapticKind = 'light'): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    switch (kind) {
      case 'light':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'medium':
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'success':
        await Haptics.notification({ type: NotificationType.Success });
        break;
      case 'warning':
        await Haptics.notification({ type: NotificationType.Warning });
        break;
    }
  } catch {
    // Ignore on devices without vibration motor
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to encode blob as base64'));
        return;
      }
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

export function canUseNativeOrWebShare(): boolean {
  if (isNativePlatform()) return true;
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/**
 * Shares a rendered PNG Word Card using @capacitor/filesystem + @capacitor/share
 * on native Android, or Web Share API (navigator.share) on iPhone/mobile web.
 * Returns true if shared, false if unsupported or cancelled so caller can fall back.
 */
export async function shareWordCardFile(
  blob: Blob,
  filename: string,
  title: string,
  text: string
): Promise<boolean> {
  if (isNativePlatform()) {
    try {
      const base64Data = await blobToBase64(blob);
      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_') || 'dhivehi-word-card.png';
      const saved = await Filesystem.writeFile({
        path: safeName,
        data: base64Data,
        directory: Directory.Cache,
      });

      await Share.share({
        title,
        text,
        files: [saved.uri],
        dialogTitle: title,
      });
      return true;
    } catch {
      return false;
    }
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title,
          text,
          files: [file],
        });
        return true;
      } catch {
        return false;
      }
    }
  }

  return false;
}

export function parseReminderTime(timeStr: string): { hour: number; minute: number } {
  const match = /^(\d{1,2}):(\d{2})$/.exec((timeStr || '').trim());
  if (!match) return { hour: 9, minute: 0 };
  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return { hour, minute };
}

export interface ReminderSyncResult {
  ok: boolean;
  messageEn: string;
  messageDv: string;
}

/**
 * Schedules or cancels the daily study reminder notification on native Android
 * using @capacitor/local-notifications.
 */
export async function syncDailyReminderNotification(
  enabled: boolean,
  timeStr: string,
  _lang: UiLanguage
): Promise<ReminderSyncResult> {
  const { hour, minute } = parseReminderTime(timeStr);
  const formattedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  if (!isNativePlatform()) {
    if (!enabled) {
      return {
        ok: true,
        messageEn: 'Daily study reminder turned off.',
        messageDv: 'ދުވަހުގެ ހަނދާންކޮށްދިނުން ނިއްވާލެވިއްޖެ.',
      };
    }
    return {
      ok: true,
      messageEn: `Reminder time saved (${formattedTime}). Native background notifications activate in the Android app.`,
      messageDv: `ހަނދާންކޮށްދޭ ގަޑި (${formattedTime}) ރައްކާކުރެވިއްޖެ. އެންޑްރޮއިޑް އެޕްގައި ނޮޓިފިކޭޝަން ލިބޭނެ.`,
    };
  }

  try {
    // Always cancel any existing scheduled reminder first
    await LocalNotifications.cancel({
      notifications: [{ id: DAILY_REMINDER_NOTIFICATION_ID }],
    }).catch(() => {});

    if (!enabled) {
      return {
        ok: true,
        messageEn: 'Daily study reminder turned off.',
        messageDv: 'ދުވަހުގެ ހަނދާންކޮށްދިނުން ނިއްވާލެވިއްޖެ.',
      };
    }

    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      perm = await LocalNotifications.requestPermissions();
    }

    if (perm.display !== 'granted') {
      return {
        ok: false,
        messageEn: 'Notification permission was not granted. Please enable notifications in Android Settings.',
        messageDv: 'ނޮޓިފިކޭޝަން ހުއްދަ ނުލިބުނު. ފޯނުގެ ސެޓިންގްސްއިން ހުއްދަ ދެއްވާ.',
      };
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: DAILY_REMINDER_NOTIFICATION_ID,
          title: 'ދިވެހި ބަހުގެ މަރުކަޒު · Dhivehi Language Hub',
          body: 'Your Daily Dhivehi Words are ready! · މިއަދުގެ ދިވެހި ބަސްތައް ތައްޔާރު!',
          schedule: {
            on: { hour, minute },
            repeats: true,
            allowWhileIdle: true,
          },
        },
      ],
    });

    return {
      ok: true,
      messageEn: `Daily reminder scheduled for ${formattedTime}.`,
      messageDv: `ކޮންމެ ދުވަހަކު ${formattedTime} އަށް ހަނދާންކޮށްދިނުން ތާވަލުކުރެވިއްޖެ.`,
    };
  } catch (err) {
    return {
      ok: false,
      messageEn: err instanceof Error ? err.message : 'Failed to schedule notification.',
      messageDv: 'ނޮޓިފިކޭޝަން ތާވަލުކުރުމުގައި މައްސަލައެއް ދިމާވެއްޖެ.',
    };
  }
}
