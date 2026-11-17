import type { SQLiteDatabase } from 'expo-sqlite';
import { newId, nowISO } from '@/database/id';
import type { Account, AccountType } from '@/types';

export interface AccountInput {
  name: string;
  type: AccountType;
  initialBalance: number;
}

export const listAccounts = (db: SQLiteDatabase) =>
  db.getAllAsync<Account>(
    `SELECT id, name, type, initial_balance AS initialBalance, yield_amount AS yieldAmount, archived FROM accounts ORDER BY archived, created_at`,
  );

export async function saveAccount(db: SQLiteDatabase, input: AccountInput, id?: string): Promise<void> {
  const now = nowISO();
  if (id) {
    await db.runAsync(
      'UPDATE accounts SET name = ?, type = ?, initial_balance = ?, updated_at = ? WHERE id = ?',
      input.name, input.type, input.initialBalance, now, id,
    );
  } else {
    await db.runAsync(
      'INSERT INTO accounts (id, name, type, initial_balance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      newId(), input.name, input.type, input.initialBalance, now, now,
    );
  }
}

export const setAccountYield = (db: SQLiteDatabase, id: string, yieldAmount: number) =>
  db.runAsync('UPDATE accounts SET yield_amount = ?, updated_at = ? WHERE id = ?', yieldAmount, nowISO(), id);

export const setAccountArchived = (db: SQLiteDatabase, id: string, archived: boolean) =>
  db.runAsync('UPDATE accounts SET archived = ?, updated_at = ? WHERE id = ?', archived ? 1 : 0, nowISO(), id);
