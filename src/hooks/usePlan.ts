import { useMemo } from 'react';
import { accountBalances, balanceTotals, monthSummary, totalsByCategory } from '@/services/finance/balance';
import { budgetUsage, dailyAllowance, pendingTotal, projectMonthEnd } from '@/services/finance/planning';
import { fixedExpenseStatus, monthSchedule } from '@/services/finance/schedule';
import { addMonthsToKey, monthKeyOf, todayISO } from '@/utils/date';
import { useFinance } from './useFinance';

/** Todos os números do planejamento do mês corrente, derivados das regras em services/finance. */
export function usePlan() {
  const { data } = useFinance();
  return useMemo(() => {
    const today = todayISO();
    const month = monthKeyOf(today);
    const balances = accountBalances(data.accounts, data.transactions);
    const totals = balanceTotals(data.accounts, balances);
    const summary = monthSummary(data.transactions, month);
    const items = monthSchedule(month, data.recurrings, data.postedKeys, data.installments);
    const nextItems = monthSchedule(addMonthsToKey(month, 1), data.recurrings, data.postedKeys, data.installments);
    const expectedExpenses = pendingTotal(items, 'EXPENSE');
    const spent = new Map(totalsByCategory(data.transactions, month).map((c) => [c.categoryId, c.total]));
    const categoryName = new Map(data.categories.map((c) => [c.id, c.name]));
    const budgets = data.budgets.map((b) => ({
      ...b,
      name: categoryName.get(b.categoryId) ?? 'Categoria',
      ...budgetUsage(spent.get(b.categoryId) ?? 0, b.limitAmount),
    }));
    return {
      today,
      month,
      balances,
      ...totals,
      summary,
      items,
      /** Recorrências e parcelas ainda não pagas, deste mês e do próximo. */
      upcoming: [...items, ...nextItems].filter((i) => !i.paid),
      expectedExpenses,
      committed: summary.expenses + expectedExpenses,
      projection: projectMonthEnd(totals.available, items),
      daily: dailyAllowance(totals.available, [...items, ...nextItems], today, data.settings.payday),
      fixed: fixedExpenseStatus(items),
      /** Receitas fixas (ex.: salário): previstas entram no saldo previsto até serem recebidas. */
      fixedIncome: fixedExpenseStatus(items, 'INCOME'),
      budgets,
    };
  }, [data]);
}

/** Nomes de categorias e contas por id. */
export function useLookups() {
  const { data } = useFinance();
  return useMemo(() => {
    const categories = new Map(data.categories.map((c) => [c.id, c]));
    const accounts = new Map(data.accounts.map((a) => [a.id, a]));
    const cards = new Map(data.cards.map((c) => [c.id, c]));
    return {
      categoryName: (id: string | null) => (id ? (categories.get(id)?.name ?? 'Sem categoria') : 'Sem categoria'),
      accountName: (id: string | null) => (id ? (accounts.get(id)?.name ?? 'Conta removida') : ''),
      cardName: (id: string | null) => (id ? (cards.get(id)?.name ?? 'Cartão') : 'Sem cartão'),
    };
  }, [data]);
}
