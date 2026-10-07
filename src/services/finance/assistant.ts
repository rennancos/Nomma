import type { FinanceData } from '@/stores/financeStore';
import type { Transaction } from '@/types';
import { PAYMENT_LABELS } from '@/constants/defaults';
import { addMonthsToKey, monthBounds } from '@/utils/date';
import { formatMoney, formatPercent } from '@/utils/money';
import { monthlyStats, variation } from './analytics';
import { accountBalances, balanceTotals } from './balance';

export const UNKNOWN = 'Não informado';
export interface AssistantFilters {
  month: string;
  bank?: string | null;
  account?: string | null;
  card?: string | null;
  category?: string | null;
  payment?: string | null;
}
export type AssistantData = Pick<FinanceData, 'transactions' | 'accounts' | 'categories' | 'cards' | 'installments'>;
export type Dimension = 'category' | 'bank' | 'account' | 'card' | 'payment' | 'description';
export interface SpendGroup { key: string; label: string; value: number; share: number; previous: number; change: number | null; ids: string[] }

export const ACCOUNTING_NOTE = 'Regime de caixa: lançamentos pela data registrada; parcelas entram somente quando pagas, uma única vez. Transferências não são receitas nem despesas. Aportes são separados do consumo. Datas futuras ficam fora dos valores realizados.';
export const DATA_LIMITS = 'Origem: registros locais, sem sincronização bancária. Resgates, rentabilidade, patrimônio de mercado, estornos e reembolsos vinculados não estão modelados. Reembolsos seguem o tipo registrado. Descrições não confirmam estabelecimentos. Pagamentos de fatura lançados manualmente em duplicidade precisam ser revisados.';

export function buildAssistantReport(data: AssistantData, filters: AssistantFilters, today: string) {
  const categories = new Map(data.categories.map(c => [c.id, c.name]));
  const accounts = new Map(data.accounts.map(a => [a.id, a.name]));
  const cards = new Map(data.cards.map(c => [c.id, c]));
  const parts = new Map(data.installments.filter(i => i.transactionId).map(i => [i.transactionId!, i]));
  const dimensions = (t: Transaction): Record<Dimension, { key: string; label: string }> => {
    const part = parts.get(t.id);
    const card = part?.creditCardId ? cards.get(part.creditCardId) : undefined;
    const bank = t.institution?.trim() || card?.bank?.trim() || UNKNOWN;
    return {
      bank: { key: bank.toLocaleLowerCase('pt-BR'), label: bank },
      category: { key: t.categoryId ?? '', label: categories.get(t.categoryId ?? '') ?? UNKNOWN },
      account: { key: t.accountId, label: accounts.get(t.accountId) ?? UNKNOWN },
      card: { key: card?.id ?? '', label: card?.name ?? UNKNOWN },
      payment: { key: t.paymentMethod ?? '', label: t.paymentMethod ? PAYMENT_LABELS[t.paymentMethod] : UNKNOWN },
      description: { key: (part?.description || t.description).trim().toLocaleLowerCase('pt-BR'), label: part?.description || t.description || UNKNOWN },
    };
  };
  const matches = (t: Transaction) => {
    const d = dimensions(t);
    return (['bank', 'account', 'card', 'category', 'payment'] as const)
      .every(k => filters[k] == null || filters[k] === d[k].key);
  };
  const previousMonth = addMonthsToKey(filters.month, -1);
  const selected = data.transactions.filter(t => t.date <= today && matches(t));
  const current = selected.filter(t => t.date.startsWith(filters.month + '-') && t.type !== 'TRANSFER');
  const previous = selected.filter(t => t.date.startsWith(previousMonth + '-') && t.type !== 'TRANSFER');
  const summary = monthlyStats(current, [filters.month])[0]!;
  const before = monthlyStats(previous, [previousMonth])[0]!;
  const expenses = current.filter(t => t.type === 'EXPENSE');
  const group = (dimension: Dimension): SpendGroup[] => {
    const groups = new Map<string, SpendGroup>();
    for (const [txs, isPrevious] of [[previous, true], [expenses, false]] as const) {
      for (const t of txs) {
        if (t.type !== 'EXPENSE') continue;
        const { key, label } = dimensions(t)[dimension];
        const item = groups.get(key) ?? { key, label, value: 0, share: 0, previous: 0, change: null, ids: [] };
        if (isPrevious) item.previous += t.amount;
        else { item.value += t.amount; item.ids.push(t.id); }
        groups.set(key, item);
      }
    }
    return [...groups.values()].map(g => ({ ...g, share: summary.expenses ? g.value / summary.expenses * 100 : 0, change: variation(g.value, g.previous) }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  };
  const breakdown = Object.fromEntries((['category', 'bank', 'account', 'card', 'payment', 'description'] as const).map(d => [d, group(d)])) as Record<Dimension, SpendGroup[]>;
  const balances = balanceTotals(data.accounts, accountBalances(data.accounts, data.transactions.filter(t => t.date <= today)));
  const banks = new Map<string, string>();
  for (const t of data.transactions) { const b = dimensions(t).bank; banks.set(b.key, b.label); }
  return {
    filters, today, bounds: monthBounds(filters.month), previousMonth, summary, before, breakdown, balances,
    current: [...current].sort((a, b) => b.date.localeCompare(a.date)),
    largest: [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5),
    recurring: expenses.filter(t => t.recurringId !== null),
    banks: [...banks].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)),
    expenseChange: variation(summary.expenses, before.expenses),
  };
}
export type AssistantReport = ReturnType<typeof buildAssistantReport>;
export const QUICK_QUESTIONS = ['Resumo do período', 'Onde mais gastei?', 'Qual banco concentrou os gastos?', 'Crédito, débito e Pix', 'Quanto investi?', 'O que mudou nos gastos?', 'Onde posso economizar?'] as const;

/** Respostas determinísticas explicitamente apresentadas como consultas locais, não como IA. */
export function quickAnswer(report: AssistantReport, question: string): string {
  const { summary: s, breakdown: b } = report;
  if (!report.current.length) return 'Nenhum lançamento realizado neste período e nestes filtros.';
  const ranking = (groups: SpendGroup[]) => groups.filter(g => g.value > 0).slice(0, 5)
    .map(g => `${g.label}: ${formatMoney(g.value)} (${formatPercent(g.share)})`).join('\n') || 'Nenhuma despesa registrada.';
  switch (question) {
    case 'Onde mais gastei?': return `Por categoria:\n${ranking(b.category)}\n\nPor descrição (estabelecimento não confirmado):\n${ranking(b.description)}`;
    case 'Qual banco concentrou os gastos?': return ranking(b.bank);
    case 'Crédito, débito e Pix': return ranking(b.payment);
    case 'Quanto investi?': return `Aportes no período: ${formatMoney(s.investments)}. Resgates e rentabilidade não estão disponíveis. Aportes não representam patrimônio de mercado.`;
    case 'O que mudou nos gastos?': return `Despesas: ${formatMoney(s.expenses)}; mês anterior: ${formatMoney(report.before.expenses)}. Variação: ${report.expenseChange === null ? 'sem base percentual' : formatPercent(report.expenseChange)}.\n${b.category.slice().sort((a, c) => (c.value - c.previous) - (a.value - a.previous)).slice(0, 5).map(g => `${g.label}: diferença de ${formatMoney(g.value - g.previous)}.`).join('\n')}\nComparação com o mês anterior completo; o mês atual pode estar parcial.`;
    case 'Onde posso economizar?': {
      const top = b.category.find(g => g.value > 0);
      return top ? `${top.label} concentra ${formatPercent(top.share)} dos gastos (${formatMoney(top.value)}). Revise os lançamentos dessa categoria e identifique despesas ajustáveis. Há ${report.recurring.length} lançamento(s) vinculado(s) a recorrências neste recorte. Não é possível concluir quais despesas são dispensáveis apenas pelos registros.` : 'Registre despesas para identificar oportunidades de economia.';
    }
    default: return `Receitas: ${formatMoney(s.income)}\nDespesas: ${formatMoney(s.expenses)}\nAportes: ${formatMoney(s.investments)}\nReceitas menos despesas: ${formatMoney(s.savings)}\nSaldo do período após aportes: ${formatMoney(s.free)}.`;
  }
}

/** Lista permitida: nunca exporta transações, notas, IDs, descrições ou credenciais. */
export function assistantContext(report: AssistantReport) {
  return {
    period: `${report.bounds.start} a ${report.bounds.end}; realizados até ${report.today}`,
    filtered: Object.entries(report.filters).some(([key, value]) => key !== 'month' && value != null),
    facts: QUICK_QUESTIONS.filter(q => q !== 'Onde mais gastei?').map(question => ({ label: question, value: quickAnswer(report, question) })),
    categories: report.breakdown.category.slice(0, 20).map(g => ({ label: g.label.slice(0, 80), value: `${formatMoney(g.value)}; ${formatPercent(g.share)}; anterior ${formatMoney(g.previous)}` })),
    limitations: `${ACCOUNTING_NOTE} ${DATA_LIMITS}`,
  };
}
