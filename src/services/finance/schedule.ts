import type { CreditCard, InstallmentView, Recurring } from '@/types';
import { addMonthsToKey, dateInMonth, dayOf, monthKeyOf, type ISODate, type MonthKey } from '@/utils/date';
import { splitAmount } from '@/utils/money';

/**
 * Data de vencimento da fatura em que cai uma compra no cartão.
 * Compras a partir do dia de fechamento vão para a fatura seguinte.
 * Se o vencimento é depois do fechamento, vence no mesmo mês do fechamento; senão, no mês seguinte.
 */
export function cardInvoiceDueDate(purchaseDate: ISODate, closingDay: number, dueDay: number): ISODate {
  const month = monthKeyOf(purchaseDate);
  const closingMonth = dayOf(purchaseDate) >= Math.min(closingDay, dayOf(dateInMonth(month, 31)))
    ? addMonthsToKey(month, 1)
    : month;
  const dueMonth = dueDay > closingDay ? closingMonth : addMonthsToKey(closingMonth, 1);
  return dateInMonth(dueMonth, dueDay);
}

/**
 * Gera as parcelas de uma compra. No cartão, a 1ª parcela vence na fatura da data da compra;
 * fora do cartão, `purchaseDate` é a data da 1ª parcela. As demais vencem mês a mês no mesmo dia.
 */
export function buildInstallments(
  totalAmount: number,
  count: number,
  purchaseDate: ISODate,
  card: Pick<CreditCard, 'closingDay' | 'dueDay'> | null,
): { number: number; amount: number; dueDate: ISODate }[] {
  const first = card ? cardInvoiceDueDate(purchaseDate, card.closingDay, card.dueDay) : purchaseDate;
  const day = card ? card.dueDay : dayOf(first);
  return splitAmount(totalAmount, count).map((amount, i) => ({
    number: i + 1,
    amount,
    dueDate: dateInMonth(addMonthsToKey(monthKeyOf(first), i), day),
  }));
}

/** Ocorrência de uma recorrência no mês; null se inativa ou antes do início. */
export function recurrenceDate(
  rec: Pick<Recurring, 'dayOfMonth' | 'startDate' | 'active'>,
  month: MonthKey,
): ISODate | null {
  if (!rec.active) return null;
  const date = dateInMonth(month, rec.dayOfMonth);
  return date >= rec.startDate ? date : null;
}

/** Chave que identifica a ocorrência já lançada de uma recorrência. */
export const occurrenceKey = (recurringId: string, month: MonthKey) => `${recurringId}|${month}`;

export interface ScheduledItem {
  key: string;
  source: 'RECURRING' | 'INSTALLMENT';
  refId: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  amount: number;
  date: ISODate;
  paid: boolean;
  creditCardId: string | null;
}

/** Agenda do mês: ocorrências de recorrências + parcelas que vencem no mês. */
export function monthSchedule(
  month: MonthKey,
  recurrings: Recurring[],
  postedKeys: Set<string>,
  installments: InstallmentView[],
): ScheduledItem[] {
  const items: ScheduledItem[] = [];
  for (const r of recurrings) {
    const date = recurrenceDate(r, month);
    if (!date) continue;
    items.push({
      key: `r:${r.id}:${month}`,
      source: 'RECURRING',
      refId: r.id,
      type: r.type,
      description: r.description,
      amount: r.amount,
      date,
      paid: postedKeys.has(occurrenceKey(r.id, month)),
      creditCardId: null,
    });
  }
  for (const i of installments) {
    if (monthKeyOf(i.dueDate) !== month) continue;
    items.push({
      key: `i:${i.id}`,
      source: 'INSTALLMENT',
      refId: i.id,
      type: 'EXPENSE',
      description: `${i.description} ${i.number}/${i.installmentCount}`,
      amount: i.amount,
      date: i.dueDate,
      paid: i.transactionId !== null,
      creditCardId: i.creditCardId,
    });
  }
  return items.sort((a, b) => a.date.localeCompare(b.date));
}

/** Gastos fixos (recorrências de despesa) do mês: previstos, pagos e pendentes. */
export function fixedExpenseStatus(items: ScheduledItem[]) {
  let expected = 0;
  let paid = 0;
  for (const i of items) {
    if (i.source !== 'RECURRING' || i.type !== 'EXPENSE') continue;
    expected += i.amount;
    if (i.paid) paid += i.amount;
  }
  return { expected, paid, pending: expected - paid };
}

/** Situação do cartão: limite, utilizado (parcelas não pagas), fatura atual e próxima. */
export function cardStatus(
  card: Pick<CreditCard, 'limitAmount' | 'closingDay' | 'dueDay'>,
  installments: Pick<InstallmentView, 'amount' | 'dueDate' | 'transactionId'>[],
  today: ISODate,
) {
  const currentDue = cardInvoiceDueDate(today, card.closingDay, card.dueDay);
  const nextDue = dateInMonth(addMonthsToKey(monthKeyOf(currentDue), 1), card.dueDay);
  let used = 0;
  let currentInvoice = 0;
  let nextInvoice = 0;
  for (const i of installments) {
    if (i.transactionId === null) used += i.amount;
    if (i.dueDate === currentDue) currentInvoice += i.amount;
    if (i.dueDate === nextDue) nextInvoice += i.amount;
  }
  return {
    limit: card.limitAmount,
    used,
    available: card.limitAmount - used,
    currentDue,
    currentInvoice,
    nextDue,
    nextInvoice,
  };
}

/** Faturas do cartão agrupadas por vencimento, com o valor ainda em aberto. */
export function groupInvoices(installments: Pick<InstallmentView, 'amount' | 'dueDate' | 'transactionId'>[]) {
  const map = new Map<ISODate, { dueDate: ISODate; total: number; pending: number }>();
  for (const i of installments) {
    const inv = map.get(i.dueDate) ?? { dueDate: i.dueDate, total: 0, pending: 0 };
    inv.total += i.amount;
    if (i.transactionId === null) inv.pending += i.amount;
    map.set(i.dueDate, inv);
  }
  return [...map.values()].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
