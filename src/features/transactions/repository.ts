import type { SQLiteDatabase } from 'expo-sqlite';
import { newId, nowISO } from '@/database/id';
import type { Transaction } from '@/types';

export type TransactionInput = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'occurrenceMonth'> & {
  occurrenceMonth?: string | null;
};

function validateAmount(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new RangeError('O valor deve ser um inteiro positivo em centavos.');
  }
}

const TX_COLUMNS = `id, type, description, amount, category_id AS categoryId, account_id AS accountId,
  destination_account_id AS destinationAccountId, date, notes, payment_method AS paymentMethod,
  institution, recurring_id AS recurringId, occurrence_month AS occurrenceMonth, created_at AS createdAt, updated_at AS updatedAt`;

export const listTransactions = (db: SQLiteDatabase) =>
  db.getAllAsync<Transaction>(`SELECT ${TX_COLUMNS} FROM transactions ORDER BY date DESC, created_at DESC`);

export async function insertTransaction(db: SQLiteDatabase, t: TransactionInput): Promise<string> {
  validateAmount(t.amount);
  const id = newId();
  const now = nowISO();
  await db.runAsync(
    `INSERT INTO transactions (id, type, description, amount, category_id, account_id, destination_account_id,
      date, notes, payment_method, institution, recurring_id, occurrence_month, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, t.type, t.description, t.amount, t.categoryId, t.accountId, t.destinationAccountId,
    t.date, t.notes, t.paymentMethod, t.institution, t.recurringId, t.occurrenceMonth ?? null, now, now,
  );
  return id;
}

export async function updateTransaction(db: SQLiteDatabase, id: string, t: TransactionInput): Promise<void> {
  validateAmount(t.amount);
  await db.runAsync(
    `UPDATE transactions SET type = ?, description = ?, amount = ?, category_id = ?, account_id = ?,
      destination_account_id = ?, date = ?, notes = ?, payment_method = ?, institution = ?, updated_at = ?
     WHERE id = ?`,
    t.type, t.description, t.amount, t.categoryId, t.accountId, t.destinationAccountId,
    t.date, t.notes, t.paymentMethod, t.institution, nowISO(), id,
  );
}

/** Excluir uma despesa de parcela devolve a parcela para "pendente" (FK ON DELETE SET NULL). */
export async function deleteTransaction(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
}
