import type { Transaction, TransactionType } from '@/types';
import { monthKeyOf } from '@/utils/date';

export interface TransactionFilter {
  search: string;
  type: TransactionType | null;
  accountId: string | null;
  categoryId: string | null;
  minAmount: number | null;
  maxAmount: number | null;
}

export const emptyFilter: TransactionFilter = {
  search: '',
  type: null,
  accountId: null,
  categoryId: null,
  minAmount: null,
  maxAmount: null,
};

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Filtra por texto (descrição, observação, categoria; sem acento), tipo, conta, categoria e faixa de valor. */
export function filterTransactions<T extends Transaction>(
  txs: T[],
  f: TransactionFilter,
  categoryName: (id: string | null) => string,
): T[] {
  const q = normalize(f.search.trim());
  return txs.filter(
    (t) =>
      (f.type === null || t.type === f.type) &&
      (f.accountId === null || t.accountId === f.accountId || t.destinationAccountId === f.accountId) &&
      (f.categoryId === null || t.categoryId === f.categoryId) &&
      (f.minAmount === null || t.amount >= f.minAmount) &&
      (f.maxAmount === null || t.amount <= f.maxAmount) &&
      (!q || normalize(`${t.description} ${t.notes ?? ''} ${categoryName(t.categoryId)}`).includes(q)),
  );
}

/**
 * Lançamentos de um tipo no mês ('yyyy-MM'), do mais recente ao mais antigo.
 * Mesma regra do resumo do Início (monthSummary): o mês vem do texto da data, sem conversão de fuso.
 */
export function entriesOfMonth<T extends Pick<Transaction, 'type' | 'date' | 'createdAt'>>(
  txs: T[],
  type: TransactionType,
  month: string,
): T[] {
  return txs
    .filter((t) => t.type === type && monthKeyOf(t.date) === month)
    .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
}
