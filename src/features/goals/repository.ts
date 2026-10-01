import type { SQLiteDatabase } from 'expo-sqlite';
import { newId, nowISO } from '@/database/id';
import type { Goal } from '@/types';

export type GoalInput = Omit<Goal, 'id'>;

export const listGoals = (db: SQLiteDatabase) =>
  db.getAllAsync<Goal>(
    `SELECT id, name, target_amount AS targetAmount, current_amount AS currentAmount, deadline
     FROM financial_goals ORDER BY created_at`,
  );

export async function saveGoal(db: SQLiteDatabase, g: GoalInput, id?: string): Promise<void> {
  const now = nowISO();
  if (id) {
    await db.runAsync(
      'UPDATE financial_goals SET name = ?, target_amount = ?, current_amount = ?, deadline = ?, updated_at = ? WHERE id = ?',
      g.name, g.targetAmount, g.currentAmount, g.deadline, now, id,
    );
  } else {
    await db.runAsync(
      `INSERT INTO financial_goals (id, name, target_amount, current_amount, deadline, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      newId(), g.name, g.targetAmount, g.currentAmount, g.deadline, now, now,
    );
  }
}

export const deleteGoal = (db: SQLiteDatabase, id: string) => db.runAsync('DELETE FROM financial_goals WHERE id = ?', id);
