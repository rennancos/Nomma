import type { SQLiteDatabase } from 'expo-sqlite';
import { defaultCategoryId as cat } from '@/constants/defaults';
import { buildInstallments } from '@/services/finance/schedule';
import { addMonthsToKey, dateInMonth, monthKeyOf, todayISO } from '@/utils/date';
import { nowISO } from './id';

// Dados demonstrativos. Todo registro usa id com prefixo "demo-", então removê-los é um DELETE por prefixo.
const DEMO = 'demo-';

export async function hasDemoData(db: SQLiteDatabase): Promise<boolean> {
  const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM transactions WHERE id LIKE '${DEMO}%'`);
  return (row?.n ?? 0) > 0;
}

export async function seedDemoData(db: SQLiteDatabase, today = todayISO()): Promise<void> {
  const now = nowISO();
  const month = monthKeyOf(today);
  const day = (d: number) => dateInMonth(month, d);
  const past = (d: number) => (day(d) <= today ? day(d) : today);

  await db.withExclusiveTransactionAsync(async (txn) => {
    const tx = (id: string, type: string, description: string, amount: number, category: string | null, date: string,
      account = 'acc-main', dest: string | null = null, recurring: string | null = null) =>
      txn.runAsync(
        `INSERT INTO transactions (id, type, description, amount, category_id, account_id, destination_account_id,
           date, recurring_id, occurrence_month, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        DEMO + id, type, description, amount, category, account, dest, date, recurring, recurring ? monthKeyOf(date) : null, now, now,
      );
    const rec = (id: string, type: string, description: string, amount: number, category: string, d: number, auto: number) =>
      txn.runAsync(
        `INSERT INTO recurring_transactions (id, type, description, amount, category_id, account_id, day_of_month,
           start_date, auto_post, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'acc-main', ?, ?, ?, 1, ?, ?)`,
        DEMO + id, type, description, amount, category, d, `${addMonthsToKey(month, -2)}-01`, auto, now, now,
      );

    await rec('rec-salario', 'INCOME', 'Salário', 530000, cat('INCOME', 'Salário'), 5, 1);
    await rec('rec-telefone', 'EXPENSE', 'Plano de telefone', 12000, cat('EXPENSE', 'Telefone'), 10, 0);
    await rec('rec-internet', 'EXPENSE', 'Internet', 11000, cat('EXPENSE', 'Internet'), 5, 0);
    await rec('rec-emprestimo', 'EXPENSE', 'Empréstimo', 31300, cat('EXPENSE', 'Empréstimos'), 5, 0);

    // Mês anterior, para comparação e gráficos.
    const prev = addMonthsToKey(month, -1);
    await tx('p-sal', 'INCOME', 'Salário', 530000, cat('INCOME', 'Salário'), `${prev}-05`, 'acc-main', null, DEMO + 'rec-salario');
    await tx('p-merc', 'EXPENSE', 'Mercado', 68000, cat('EXPENSE', 'Mercado'), `${prev}-08`);
    await tx('p-net', 'EXPENSE', 'Internet', 11000, cat('EXPENSE', 'Internet'), `${prev}-05`, 'acc-main', null, DEMO + 'rec-internet');
    await tx('p-lazer', 'EXPENSE', 'Cinema', 9000, cat('EXPENSE', 'Lazer'), `${prev}-15`);
    await tx('p-inv', 'INVESTMENT', 'Aporte CDB', 40000, cat('INVESTMENT', 'CDB'), `${prev}-06`, 'acc-main', 'acc-invest');

    // Mês atual.
    await tx('sal', 'INCOME', 'Salário', 530000, cat('INCOME', 'Salário'), past(5), 'acc-main', null, DEMO + 'rec-salario');
    await tx('net', 'EXPENSE', 'Internet', 11000, cat('EXPENSE', 'Internet'), past(5), 'acc-main', null, DEMO + 'rec-internet');
    await tx('almoco', 'EXPENSE', 'Almoço', 3590, cat('EXPENSE', 'Alimentação'), past(6));
    await tx('uber', 'EXPENSE', 'Uber', 2740, cat('EXPENSE', 'Uber'), past(7), 'acc-wallet');
    await tx('ifood', 'EXPENSE', 'Pizza', 8900, cat('EXPENSE', 'Delivery'), past(8));
    await tx('ifood2', 'EXPENSE', 'Hambúrguer', 14100, cat('EXPENSE', 'Delivery'), past(9));
    await tx('mercado', 'EXPENSE', 'Mercado do mês', 72000, cat('EXPENSE', 'Mercado'), past(9));
    await tx('cdb', 'INVESTMENT', 'Aporte CDB', 50000, cat('INVESTMENT', 'CDB'), past(6), 'acc-main', 'acc-invest');
    await tx('saque', 'TRANSFER', 'Saque', 20000, null, past(7), 'acc-main', 'acc-wallet');

    await txn.runAsync(
      `INSERT INTO credit_cards (id, name, bank, limit_amount, closing_day, due_day, created_at, updated_at)
       VALUES (?, 'Nubank', 'Nubank', 500000, 25, 2, ?, ?)`,
      DEMO + 'card', now, now,
    );
    const card = { closingDay: 25, dueDay: 2 };
    const purchases: [string, string, number, number, string][] = [
      ['notebook', 'Notebook', 400000, 10, cat('EXPENSE', 'Compras')],
      ['cartao', 'Compras no cartão', 129400, 1, cat('EXPENSE', 'Cartão de crédito')],
    ];
    for (const [id, description, total, count, category] of purchases) {
      await txn.runAsync(
        `INSERT INTO installment_purchases (id, credit_card_id, description, category_id, total_amount, installment_count,
           purchase_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        DEMO + id, DEMO + 'card', description, category, total, count, past(3), now, now,
      );
      for (const p of buildInstallments(total, count, past(3), card)) {
        await txn.runAsync(
          'INSERT INTO installments (id, purchase_id, number, amount, due_date) VALUES (?, ?, ?, ?, ?)',
          `${DEMO}${id}-${p.number}`, DEMO + id, p.number, p.amount, p.dueDate,
        );
      }
    }

    await txn.runAsync(
      `INSERT INTO financial_goals (id, name, target_amount, current_amount, deadline, created_at, updated_at)
       VALUES (?, 'Reserva de emergência', 2000000, 650000, NULL, ?, ?), (?, 'Viagem', 500000, 120000, '2027-01-31', ?, ?)`,
      DEMO + 'goal1', now, now, DEMO + 'goal2', now, now,
    );
    await txn.runAsync(
      `INSERT INTO budgets (id, category_id, limit_amount, created_at, updated_at) VALUES (?, ?, 30000, ?, ?)
       ON CONFLICT(category_id) DO NOTHING`,
      DEMO + 'budget', cat('EXPENSE', 'Delivery'), now, now,
    );
  });
}

/** Remove apenas os dados demonstrativos (ordem respeita as chaves estrangeiras). */
export async function removeDemoData(db: SQLiteDatabase): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const table of ['installments', 'installment_purchases', 'transactions', 'recurring_transactions',
      'credit_cards', 'financial_goals', 'budgets']) {
      await txn.runAsync(`DELETE FROM ${table} WHERE id LIKE '${DEMO}%'`);
    }
  });
}
