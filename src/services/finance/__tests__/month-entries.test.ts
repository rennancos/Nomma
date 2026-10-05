import { describe, expect, it } from '@jest/globals';
import type { TransactionType } from '@/types';
import { addMonthsToKey } from '@/utils/date';
import { monthSummary } from '../balance';
import { entriesOfMonth } from '../filters';

// Lista mensal aberta pelos cartões do Início (MonthEntriesScreen).

const t = (id: string, type: TransactionType, date: string, amount = 100, createdAt = `${date}T12:00:00.000Z`) => ({
  id, type, date, amount, createdAt, categoryId: null,
});

const txs = [
  t('a', 'INCOME', '2026-12-31', 500),
  t('b', 'INCOME', '2027-01-01', 300),
  t('c', 'EXPENSE', '2027-01-15', 200),
  t('d', 'INCOME', '2027-01-20', 700),
  t('e', 'INVESTMENT', '2027-01-05', 1000),
  t('f', 'TRANSFER', '2027-01-06', 50),
  t('g', 'INCOME', '2027-01-20', 10, '2027-01-20T08:00:00.000Z'),
];

describe('entriesOfMonth', () => {
  it('filtra pelo tipo e pelo mês/ano completos, sem pegar o mesmo mês de outro ano', () => {
    expect(entriesOfMonth(txs, 'INCOME', '2027-01').map((x) => x.id)).toEqual(['d', 'g', 'b']);
    expect(entriesOfMonth(txs, 'INCOME', '2026-12').map((x) => x.id)).toEqual(['a']);
    expect(entriesOfMonth(txs, 'INCOME', '2026-01')).toEqual([]);
  });

  it('ordena da data mais recente para a mais antiga; no mesmo dia, o cadastrado por último primeiro', () => {
    const ids = entriesOfMonth(txs, 'INCOME', '2027-01').map((x) => x.id);
    expect(ids).toEqual(['d', 'g', 'b']);
  });

  it('31/12 e 01/01 ficam cada um no seu mês (data em texto, sem fuso)', () => {
    expect(entriesOfMonth(txs, 'INCOME', '2026-12').map((x) => x.date)).toEqual(['2026-12-31']);
    expect(entriesOfMonth(txs, 'INCOME', '2027-01').at(-1)?.date).toBe('2027-01-01');
  });

  it('a navegação de meses atravessa a virada de ano', () => {
    expect(addMonthsToKey('2027-01', -1)).toBe('2026-12');
    expect(addMonthsToKey('2026-12', 1)).toBe('2027-01');
  });

  it('o total da lista é igual ao valor do cartão do Início para cada tipo', () => {
    const summary = monthSummary(txs, '2027-01');
    const total = (type: TransactionType) => entriesOfMonth(txs, type, '2027-01').reduce((s, x) => s + x.amount, 0);
    expect(total('INCOME')).toBe(summary.income);
    expect(total('EXPENSE')).toBe(summary.expenses);
    // investimentos = aportes do mês, não patrimônio; transferência não entra em nenhum dos três
    expect(total('INVESTMENT')).toBe(summary.investments);
    expect(summary.investments).toBe(1000);
  });
});
