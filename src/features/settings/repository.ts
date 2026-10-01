import type { SQLiteDatabase } from 'expo-sqlite';
import { DEFAULT_PAYDAY } from '@/constants/defaults';
import type { Settings, ThemePreference } from '@/types';

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

export async function loadSettings(db: SQLiteDatabase): Promise<Settings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const theme = map.get('theme') as ThemePreference | undefined;
  const payday = Number(map.get('payday'));
  return {
    userName: map.get('userName') ?? '',
    theme: theme && THEMES.includes(theme) ? theme : 'system',
    payday: payday >= 1 && payday <= 31 ? payday : DEFAULT_PAYDAY,
    dailyReminder: map.get('dailyReminder') !== '0', // ligado por padrão
  };
}

export async function saveSettings(db: SQLiteDatabase, s: Settings): Promise<void> {
  const entries: [keyof Settings, string][] = [
    ['userName', s.userName],
    ['theme', s.theme],
    ['payday', String(s.payday)],
    ['dailyReminder', s.dailyReminder ? '1' : '0'],
  ];
  for (const [key, value] of entries) {
    await db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      key, value,
    );
  }
}
