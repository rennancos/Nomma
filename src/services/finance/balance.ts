import type { Account, Transaction } from '@/types';
import { monthKeyOf, type MonthKey } from '@/utils/date';
import { percent } from '@/utils/money';

type BalanceTx = Pick<Transaction, 'type' | 'amount' | 'accountId' | 'destinationAccountId'>;
type SummaryTx = Pick<Transaction, 'type' | 'amount' | 'date' | 'categoryId'>;

/**
 * Saldo por conta = saldo inicial + receitas − saídas + entradas de transferência/aporte.
 * INCOME credita a conta; EXPENSE/INVESTMENT/TRANSFER debitam a conta de origem
 * e, se houver conta de destino (transferência ou aporte em conta de investimento), creditam o destino.
 */
export function accountBalances(
  accounts: Pick<Account, 'id' | 'initialBalance'>[],
  txs: BalanceTx[],
): Map<string, number> {
  const balances = new Map(accounts.map((a) => [a.id, a.initialBalance]));
  const add = (id: string | null, value: number) => {
    if (id !== null && balances.has(id)) balances.set(id, (balances.get(id) ?? 0) + value);
  };
  for (const t of txs) {
    if (t.type === 'INCOME') {
      add(t.accountId, t.amount);
    } else {
      add(t.accountId, -t.amount);
      if (t.type === 'TRANSFER' || t.type === 'INVESTMENT') add(t.destinationAccountId, t.amount);
    }
  }
  return balances;
}

/** Soma dos saldos por grupo: contas líquidas (disponível) x contas de investimento. */
export function balanceTotals(accounts: Pick<Account, 'id' | 'type'>[], balances: Map<string, number>) {
  let available = 0;
  let invested = 0;
  for (const a of accounts) {
    const value = balances.get(a.id) ?? 0;
    if (a.type === 'INVESTMENT') invested += value;
    else available += value;
  }
  return { available, invested };
}

export interface MonthSummary {
  income: number;
  expenses: number;
  investments: number;
  /** receitas − despesas − investimentos */
  remaining: number;
  /** (despesas + investimentos) / receitas */
  usedPct: number | null;
  investedPct: number | null;
  /** economia / receitas, com economia = receitas − despesas (investimento não é gasto; docs/ANALYTICS.md) */
  savedPct: number | null;
}

/** Resumo do mês. Transferências são neutras: não entram em receita nem despesa. */
export function monthSummary(txs: SummaryTx[], month: MonthKey): MonthSummary {
  let income = 0;
  let expenses = 0;
  let investments = 0;
  for (const t of txs) {
    if (monthKeyOf(t.date) !== month) continue;
    if (t.type === 'INCOME') income += t.amount;
    else if (t.type === 'EXPENSE') expenses += t.amount;
    else if (t.type === 'INVESTMENT') investments += t.amount;
  }
  const remaining = income - expenses - investments;
  return {
    income,
    expenses,
    investments,
    remaining,
    usedPct: percent(expenses + investments, income),
    investedPct: percent(investments, income),
    savedPct: percent(income - expenses, income),
  };
}

/** Totais por categoria para um tipo no mês, do maior para o menor. */
export function totalsByCategory(
  txs: (SummaryTx & Pick<Transaction, 'type'>)[],
  month: MonthKey,
  type: 'EXPENSE' | 'INVESTMENT' | 'INCOME' = 'EXPENSE',
): { categoryId: string | null; total: number }[] {
  const totals = new Map<string | null, number>();
  for (const t of txs) {
    if (t.type !== type || monthKeyOf(t.date) !== month) continue;
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
  }
  return [...totals].map(([categoryId, total]) => ({ categoryId, total })).sort((a, b) => b.total - a.total);
}
