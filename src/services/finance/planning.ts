import { addMonthsToKey, dateInMonth, daysBetween, dayOf, monthKeyOf, type ISODate } from '@/utils/date';
import type { ScheduledItem } from './schedule';

type PlanItem = Pick<ScheduledItem, 'type' | 'amount' | 'date' | 'paid'>;

/** Soma dos itens ainda não pagos de um tipo. */
export const pendingTotal = (items: PlanItem[], type: 'INCOME' | 'EXPENSE') =>
  items.reduce((s, i) => (!i.paid && i.type === type ? s + i.amount : s), 0);

/**
 * Projeção de fim de mês sem novos gastos:
 * saldo disponível + receitas previstas pendentes − despesas previstas pendentes (fixas, parcelas, faturas).
 */
export const projectMonthEnd = (available: number, monthItems: PlanItem[]): number =>
  available + pendingTotal(monthItems, 'INCOME') - pendingTotal(monthItems, 'EXPENSE');

/** Próximo dia de salário estritamente depois de hoje. */
export function nextPayday(today: ISODate, payday: number): ISODate {
  const month = monthKeyOf(today);
  const thisMonth = dateInMonth(month, payday);
  return dayOf(today) < dayOf(thisMonth) ? thisMonth : dateInMonth(addMonthsToKey(month, 1), payday);
}

/**
 * Limite diário sugerido até o próximo salário:
 * (saldo disponível − despesas pendentes com vencimento antes do salário) / dias restantes.
 * Receitas eventuais antes do salário não entram (visão conservadora).
 */
export function dailyAllowance(available: number, items: PlanItem[], today: ISODate, payday: number) {
  const payDate = nextPayday(today, payday);
  const daysLeft = Math.max(1, daysBetween(today, payDate));
  const pending = pendingTotal(items.filter((i) => i.date < payDate), 'EXPENSE');
  const free = available - pending;
  return { payDate, daysLeft, pending, free, perDay: free > 0 ? Math.floor(free / daysLeft) : 0 };
}

export type BudgetLevel = 'ok' | 'warning' | 'over';

/** Uso do orçamento: >= 75% é aviso, acima do limite é estouro. */
export function budgetUsage(used: number, limit: number) {
  const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
  const level: BudgetLevel = used > limit ? 'over' : pct >= 75 ? 'warning' : 'ok';
  return { used, limit, pct, level, remaining: limit - used };
}

export const budgetMessage = (categoryName: string, pct: number) =>
  `Você já utilizou ${pct}% do orçamento de ${categoryName}.`;
