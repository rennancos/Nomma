import type { Transaction } from '@/types';
import { addMonthsToKey, lastMonths, type MonthKey } from '@/utils/date';
import { percent } from '@/utils/money';

// Regras da tela de Análises (docs/ANALYTICS.md). Funções puras: recebem as transações já carregadas do banco.
//
// Economia = receitas − despesas. Investimento NÃO é gasto: sai da economia só para chegar ao saldo livre.
// Saldo livre = economia − investimentos.

type Tx = Pick<Transaction, 'type' | 'amount' | 'date' | 'categoryId'>;

// Visão mensal (um ponto por mês, chave 'yyyy-MM') ou anual (um ponto por ano, chave 'yyyy').
// As demais funções servem às duas: o tamanho da chave diz como agrupar as transações.
export type View = 'monthly' | 'yearly';
export type PeriodKey = 'month' | '3m' | '6m' | '12m' | 'year' | '3y' | '5y';
export const PERIODS: Record<View, PeriodKey[]> = {
  monthly: ['month', '3m', '6m', '12m'],
  yearly: ['year', '3y', '5y'],
};

const lastYears = (year: number, n: number) => Array.from({ length: n }, (_, i) => String(year - n + 1 + i));

/** Chaves do período (meses ou anos), do mais antigo ao atual. */
export function periodMonths(period: PeriodKey, current: MonthKey): MonthKey[] {
  const year = Number(current.slice(0, 4));
  switch (period) {
    case 'month': return [current];
    case '3m': return lastMonths(current, 3);
    case '6m': return lastMonths(current, 6);
    case '12m': return lastMonths(current, 12);
    case 'year': return lastYears(year, 1);
    case '3y': return lastYears(year, 3);
    case '5y': return lastYears(year, 5);
  }
}

/** Período anterior de mesmo tamanho, imediatamente antes (para comparação). */
export const previousMonths = (keys: MonthKey[]): MonthKey[] =>
  keys.map((k) => (k.length === 4 ? String(Number(k) - keys.length) : addMonthsToKey(k, -keys.length)));

/** Mês ('yyyy-MM') ou ano ('yyyy') da data, conforme o tipo de chave do período. */
const bucket = (date: string, keyLength: number) => date.slice(0, keyLength);

export interface MonthStats {
  month: MonthKey;
  income: number;
  expenses: number;
  investments: number;
  /** receitas − despesas */
  savings: number;
  /** economia − investimentos */
  free: number;
  /** economia / receitas (%); null sem receita */
  savingsRate: number | null;
  /** despesas / receitas (%) */
  usedPct: number | null;
  /** investimentos / receitas (%) */
  investedPct: number | null;
  /** soma de todos os aportes até o fim do mês (inclusive meses anteriores ao período) */
  investedTotal: number;
}

const finish = (month: MonthKey, income: number, expenses: number, investments: number, investedTotal: number): MonthStats => {
  const savings = income - expenses;
  return {
    month,
    income,
    expenses,
    investments,
    savings,
    free: savings - investments,
    savingsRate: percent(savings, income),
    usedPct: percent(expenses, income),
    investedPct: percent(investments, income),
    investedTotal,
  };
};

/** Números de cada mês (ou ano) pedido, numa única passada pelas transações. Transferências são neutras. */
export function monthlyStats(txs: Tx[], months: MonthKey[]): MonthStats[] {
  const sums = new Map(months.map((m) => [m, { income: 0, expenses: 0, investments: 0 }]));
  const investedByMonth = new Map<MonthKey, number>();
  for (const t of txs) {
    const m = bucket(t.date, months[0]?.length ?? 7);
    if (t.type === 'INVESTMENT') investedByMonth.set(m, (investedByMonth.get(m) ?? 0) + t.amount);
    const s = sums.get(m);
    if (!s) continue;
    if (t.type === 'INCOME') s.income += t.amount;
    else if (t.type === 'EXPENSE') s.expenses += t.amount;
    else if (t.type === 'INVESTMENT') s.investments += t.amount;
  }
  // Acumulado: aportes de todos os meses até cada mês do período (meses como 'yyyy-MM' ordenam como texto).
  const first = months[0];
  let running = 0;
  for (const [m, v] of investedByMonth) if (first && m < first) running += v;
  return months.map((m) => {
    const s = sums.get(m) ?? { income: 0, expenses: 0, investments: 0 };
    running += s.investments;
    return finish(m, s.income, s.expenses, s.investments, running);
  });
}

/** Totais do período (soma dos meses). O investido acumulado é o do último mês. */
export function periodSummary(stats: MonthStats[]): MonthStats {
  const sum = (k: 'income' | 'expenses' | 'investments') => stats.reduce((acc, s) => acc + s[k], 0);
  const last = stats[stats.length - 1];
  return finish(last?.month ?? '', sum('income'), sum('expenses'), sum('investments'), last?.investedTotal ?? 0);
}

/** Variação percentual em relação ao período anterior; null quando não há base de comparação. */
export const variation = (current: number, previous: number): number | null =>
  previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100;

export const hasData = (s: Pick<MonthStats, 'income' | 'expenses' | 'investments'>) =>
  s.income > 0 || s.expenses > 0 || s.investments > 0;

export interface CategorySpend {
  categoryId: string | null;
  total: number;
  /** participação nas despesas do período (%) */
  share: number;
  /** total no período anterior */
  previous: number;
  /** variação vs. período anterior (%); null se não houve gasto antes */
  change: number | null;
}

/** Despesas por categoria no período, da maior para a menor, com comparação ao período anterior. */
export function categoryBreakdown(txs: Tx[], months: MonthKey[], previous: MonthKey[]): CategorySpend[] {
  const cur = new Set(months);
  const prev = new Set(previous);
  const totals = new Map<string | null, { total: number; previous: number }>();
  let all = 0;
  for (const t of txs) {
    if (t.type !== 'EXPENSE') continue;
    const m = bucket(t.date, months[0]?.length ?? 7);
    const inCur = cur.has(m);
    if (!inCur && !prev.has(m)) continue;
    const e = totals.get(t.categoryId) ?? { total: 0, previous: 0 };
    if (inCur) { e.total += t.amount; all += t.amount; } else e.previous += t.amount;
    totals.set(t.categoryId, e);
  }
  return [...totals]
    .filter(([, e]) => e.total > 0)
    .map(([categoryId, e]) => ({
      categoryId,
      total: e.total,
      share: all > 0 ? (e.total / all) * 100 : 0,
      previous: e.previous,
      change: variation(e.total, e.previous),
    }))
    .sort((a, b) => b.total - a.total);
}
