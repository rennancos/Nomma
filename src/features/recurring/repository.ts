import type { SQLiteDatabase } from 'expo-sqlite';
import { newId, nowISO } from '@/database/id';
import { occurrenceKey, recurrenceDate } from '@/services/finance/schedule';
import type { Recurring } from '@/types';
import { monthKeyOf, todayISO, type MonthKey } from '@/utils/date';
import { insertTransaction } from '../transactions/repository';

export type RecurringInput = Omit<Recurring, 'id'>;

export const listRecurrings = (db: SQLiteDatabase) =>
  db.getAllAsync<Recurring>(
    `SELECT id, type, description, amount, category_id AS categoryId, account_id AS accountId,
       day_of_month AS dayOfMonth, start_date AS startDate, auto_post AS autoPost, active
     FROM recurring_transactions ORDER BY type DESC, day_of_month`,
  );

/** Ocorrências já lançadas, como chaves "recorrência|mês". */
export async function listPostedKeys(db: SQLiteDatabase): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ recurringId: string; month: string }>(
    `SELECT recurring_id AS recurringId, occurrence_month AS month
     FROM transactions WHERE recurring_id IS NOT NULL AND occurrence_month IS NOT NULL`,
  );
  return new Set(rows.map((r) => occurrenceKey(r.recurringId, r.month)));
}

export async function saveRecurring(db: SQLiteDatabase, r: RecurringInput, id?: string): Promise<void> {
  const now = nowISO();
  if (id) {
    await db.runAsync(
      `UPDATE recurring_transactions SET type = ?, description = ?, amount = ?, category_id = ?, account_id = ?,
         day_of_month = ?, start_date = ?, auto_post = ?, active = ?, updated_at = ? WHERE id = ?`,
      r.type, r.description, r.amount, r.categoryId, r.accountId, r.dayOfMonth, r.startDate, r.autoPost, r.active, now, id,
    );
  } else {
    await db.runAsync(
      `INSERT INTO recurring_transactions (id, type, description, amount, category_id, account_id, day_of_month,
         start_date, auto_post, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      newId(), r.type, r.description, r.amount, r.categoryId, r.accountId, r.dayOfMonth, r.startDate, r.autoPost, r.active, now, now,
    );
  }
}

/** Lançamentos já feitos continuam no histórico (recurring_id vira NULL). */
export const deleteRecurring = (db: SQLiteDatabase, id: string) =>
  db.runAsync('DELETE FROM recurring_transactions WHERE id = ?', id);

/**
 * Lança a ocorrência do mês como transação real. Pagamento antecipado usa a data de hoje.
 * Idempotente: o índice único (recurring_id, occurrence_month) impede lançar o mesmo mês duas vezes
 * (toque duplo, recarregamentos concorrentes).
 */
export async function postOccurrence(db: SQLiteDatabase, r: Recurring, month: MonthKey, today = todayISO()) {
  const due = recurrenceDate(r, month);
  if (!due) return;
  await insertTransaction(db, {
    type: r.type,
    description: r.description,
    amount: r.amount,
    categoryId: r.categoryId,
    accountId: r.accountId,
    destinationAccountId: null,
    date: due < today ? due : today,
    notes: null,
    paymentMethod: null,
    institution: null,
    recurringId: r.id,
    occurrenceMonth: month,
  }).catch((e: unknown) => {
    if (!(e instanceof Error && e.message.includes('UNIQUE'))) throw e;
  });
}

/**
 * Lança automaticamente as recorrências marcadas como automáticas (ex.: salário) cujo dia já chegou no mês atual.
 * ponytail: só o mês corrente; meses em que o app não foi aberto não são retroativos (o usuário lança manualmente).
 */
export async function postDueRecurrences(db: SQLiteDatabase, today = todayISO()): Promise<void> {
  const month = monthKeyOf(today);
  const [recurrings, posted] = await Promise.all([listRecurrings(db), listPostedKeys(db)]);
  for (const r of recurrings) {
    const due = recurrenceDate(r, month);
    if (r.autoPost && due && due <= today && !posted.has(occurrenceKey(r.id, month))) {
      await postOccurrence(db, r, month, today);
    }
  }
}
