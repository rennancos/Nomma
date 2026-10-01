import type { SQLiteDatabase } from 'expo-sqlite';
import { newId, nowISO } from '@/database/id';
import { buildInstallments } from '@/services/finance/schedule';
import type { CreditCard, InstallmentView, Purchase } from '@/types';

export type CardInput = Omit<CreditCard, 'id' | 'archived'>;
export type PurchaseInput = Omit<Purchase, 'id'>;

export const listCards = (db: SQLiteDatabase) =>
  db.getAllAsync<CreditCard>(
    `SELECT id, name, bank, limit_amount AS limitAmount, closing_day AS closingDay, due_day AS dueDay, archived
     FROM credit_cards ORDER BY archived, created_at`,
  );

export async function saveCard(db: SQLiteDatabase, c: CardInput, id?: string): Promise<void> {
  const now = nowISO();
  if (id) {
    await db.runAsync(
      `UPDATE credit_cards SET name = ?, bank = ?, limit_amount = ?, closing_day = ?, due_day = ?, updated_at = ?
       WHERE id = ?`,
      c.name, c.bank, c.limitAmount, c.closingDay, c.dueDay, now, id,
    );
  } else {
    await db.runAsync(
      `INSERT INTO credit_cards (id, name, bank, limit_amount, closing_day, due_day, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      newId(), c.name, c.bank, c.limitAmount, c.closingDay, c.dueDay, now, now,
    );
  }
}

/** Apaga o cartão e suas compras/parcelas; despesas já pagas permanecem no histórico. */
export const deleteCard = (db: SQLiteDatabase, id: string) => db.runAsync('DELETE FROM credit_cards WHERE id = ?', id);

export const listPurchases = (db: SQLiteDatabase) =>
  db.getAllAsync<Purchase>(
    `SELECT id, credit_card_id AS creditCardId, description, category_id AS categoryId, total_amount AS totalAmount,
       installment_count AS installmentCount, purchase_date AS purchaseDate
     FROM installment_purchases ORDER BY purchase_date DESC`,
  );

export const listInstallments = (db: SQLiteDatabase) =>
  db.getAllAsync<InstallmentView>(
    `SELECT i.id, i.purchase_id AS purchaseId, i.number, i.amount, i.due_date AS dueDate,
       i.transaction_id AS transactionId, p.description, p.installment_count AS installmentCount,
       p.credit_card_id AS creditCardId, p.category_id AS categoryId
     FROM installments i JOIN installment_purchases p ON p.id = i.purchase_id
     ORDER BY i.due_date, p.description`,
  );

export async function createPurchase(
  db: SQLiteDatabase,
  p: PurchaseInput,
  card: Pick<CreditCard, 'closingDay' | 'dueDay'> | null,
): Promise<void> {
  const now = nowISO();
  const purchaseId = newId();
  const parts = buildInstallments(p.totalAmount, p.installmentCount, p.purchaseDate, card);
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `INSERT INTO installment_purchases (id, credit_card_id, description, category_id, total_amount,
         installment_count, purchase_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      purchaseId, p.creditCardId, p.description, p.categoryId, p.totalAmount, p.installmentCount, p.purchaseDate, now, now,
    );
    for (const part of parts) {
      await txn.runAsync(
        'INSERT INTO installments (id, purchase_id, number, amount, due_date) VALUES (?, ?, ?, ?, ?)',
        newId(), purchaseId, part.number, part.amount, part.dueDate,
      );
    }
  });
}

export const deletePurchase = (db: SQLiteDatabase, id: string) =>
  db.runAsync('DELETE FROM installment_purchases WHERE id = ?', id);

/**
 * Paga parcelas (uma parcela avulsa ou a fatura inteira): cada parcela vira uma despesa real
 * na conta escolhida, mantendo a categoria da compra para as análises.
 */
export async function payInstallments(
  db: SQLiteDatabase,
  items: InstallmentView[],
  accountId: string,
  date: string,
): Promise<void> {
  const now = nowISO();
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const i of items) {
      // A tela pode ter um snapshot antigo. Verifique o estado persistido dentro da transação.
      const current = await txn.getFirstAsync<{ transactionId: string | null; amount: number }>(
        'SELECT transaction_id AS transactionId, amount FROM installments WHERE id = ?', i.id,
      );
      if (!current || current.transactionId !== null) continue;
      const txId = newId();
      await txn.runAsync(
        `INSERT INTO transactions (id, type, description, amount, category_id, account_id, date, payment_method,
           created_at, updated_at) VALUES (?, 'EXPENSE', ?, ?, ?, ?, ?, ?, ?, ?)`,
        txId, `${i.description} ${i.number}/${i.installmentCount}`, current.amount, i.categoryId, accountId, date,
        i.creditCardId ? 'CREDIT' : 'BOLETO', now, now,
      );
      await txn.runAsync('UPDATE installments SET transaction_id = ? WHERE id = ?', txId, i.id);
    }
  });
}
