import type { SQLiteDatabase } from 'expo-sqlite';
import { newId, nowISO } from '@/database/id';
import type { Budget } from '@/types';

export const listBudgets = (db: SQLiteDatabase) =>
  db.getAllAsync<Budget>('SELECT id, category_id AS categoryId, limit_amount AS limitAmount FROM budgets');

/** Um orçamento por categoria: salvar de novo a mesma categoria atualiza o limite. */
export async function saveBudget(db: SQLiteDatabase, categoryId: string, limitAmount: number): Promise<void> {
  const now = nowISO();
  await db.runAsync(
    `INSERT INTO budgets (id, category_id, limit_amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(category_id) DO UPDATE SET limit_amount = excluded.limit_amount, updated_at = excluded.updated_at`,
    newId(), categoryId, limitAmount, now, now,
  );
}

export const deleteBudget = (db: SQLiteDatabase, id: string) => db.runAsync('DELETE FROM budgets WHERE id = ?', id);
