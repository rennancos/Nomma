import type { SQLiteDatabase } from 'expo-sqlite';

export async function completeOnboarding(db: SQLiteDatabase): Promise<void> {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    'onboardingCompleted', '1',
  );
}
