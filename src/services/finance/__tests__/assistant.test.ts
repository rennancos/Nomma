import { expect, test } from '@jest/globals';
import { assistantContext, buildAssistantReport, quickAnswer, type AssistantData } from '../assistant';
import type { Transaction } from '@/types';

const tx = (id: string, type: Transaction['type'], amount: number, patch: Partial<Transaction> = {}): Transaction => ({
  id, type, amount, description: 'Descrição privada', categoryId: 'food', accountId: 'checking',
  destinationAccountId: null, date: '2026-10-05', notes: 'Nota secreta', paymentMethod: null,
  institution: null, recurringId: null, occurrenceMonth: null, createdAt: '', updatedAt: '', ...patch,
});
const fixture = (): AssistantData => ({
  accounts: [{ id: 'checking', name: 'Conta principal', type: 'CHECKING', initialBalance: 10000, archived: 0 }, { id: 'invest', name: 'Investimentos', type: 'INVESTMENT', initialBalance: 0, archived: 0 }],
  categories: [{ id: 'food', name: 'Alimentação', kind: 'EXPENSE', isDefault: 0, archived: 0 }],
  cards: [{ id: 'card', name: 'Meu cartão', bank: 'Banco A', limitAmount: 100000, closingDay: 1, dueDay: 10, archived: 0 }],
  installments: [
    { id: 'part1', purchaseId: 'purchase', number: 1, amount: 10001, dueDate: '2026-10-10', transactionId: 'paid', description: 'Compra privada', installmentCount: 2, creditCardId: 'card', categoryId: 'food' },
    { id: 'part2', purchaseId: 'purchase', number: 2, amount: 10000, dueDate: '2026-11-10', transactionId: null, description: 'Compra privada', installmentCount: 2, creditCardId: 'card', categoryId: 'food' },
  ],
  transactions: [
    tx('income', 'INCOME', 100000),
    tx('paid', 'EXPENSE', 10001, { paymentMethod: 'CREDIT' }),
    tx('pix', 'EXPENSE', 2500, { paymentMethod: 'PIX', institution: 'Banco B' }),
    tx('invested', 'INVESTMENT', 20000, { destinationAccountId: 'invest' }),
    tx('transfer', 'TRANSFER', 5000, { destinationAccountId: 'invest' }),
    tx('previous', 'EXPENSE', 5000, { date: '2026-09-05' }),
    tx('future', 'EXPENSE', 99999, { date: '2026-10-25' }),
  ],
});

test('caixa: não duplica parcelas nem inclui pendências, transferências ou datas futuras', () => {
  const r = buildAssistantReport(fixture(), { month: '2026-10' }, '2026-10-06');
  expect(r.summary).toMatchObject({ income: 100000, expenses: 12501, investments: 20000, savings: 87499, free: 67499 });
  expect(r.balances).toEqual({ available: 67499, invested: 25000 });
  expect(r.current.map(t => t.id)).not.toContain('transfer');
  expect(r.breakdown.bank[0]).toMatchObject({ label: 'Banco A', value: 10001, ids: ['paid'] });
  expect(r.breakdown.payment.map(g => g.label)).toEqual(['Crédito', 'Pix', 'Não informado']);
});

test('filtros combinados preservam conta pagadora, cartão, instituição e categoria', () => {
  const r = buildAssistantReport(fixture(), { month: '2026-10', bank: 'banco a', card: 'card', account: 'checking', payment: 'CREDIT', category: 'food' }, '2026-10-06');
  expect(r.current.map(t => t.id)).toEqual(['paid']);
  expect(r.summary.expenses).toBe(10001);
  expect(r.before.expenses).toBe(0);
  expect(r.expenseChange).toBeNull();
  expect(r.balances.available).toBe(67499);
});

test('sem dados, sem base zero e virada de ano não inventam resultados', () => {
  const r = buildAssistantReport(fixture(), { month: '2027-01' }, '2027-01-06');
  expect(r.previousMonth).toBe('2026-12');
  expect(r.expenseChange).toBeNull();
  expect(quickAnswer(r, 'Quanto investi?')).toContain('Nenhum lançamento');
});

test('contexto remoto omite transações, notas e descrições individuais', () => {
  const r = buildAssistantReport(fixture(), { month: '2026-10' }, '2026-10-06');
  const json = JSON.stringify(assistantContext(r));
  expect(json).not.toContain('Nota secreta');
  expect(json).not.toContain('Descrição privada');
  expect(json).not.toContain('Compra privada');
  expect(json).not.toContain('transactionId');
  expect(assistantContext(r).filtered).toBe(false);
});

test('centavos exatos, bancos ausentes e recorrências explícitas', () => {
  const data = fixture();
  data.transactions = [tx('a', 'EXPENSE', 101, { recurringId: 'r' }), tx('b', 'EXPENSE', 202)];
  const r = buildAssistantReport(data, { month: '2026-10' }, '2026-10-06');
  expect(r.summary.expenses).toBe(303);
  expect(r.breakdown.bank[0]).toMatchObject({ label: 'Não informado', value: 303, share: 100 });
  expect(r.recurring).toHaveLength(1);
  expect(quickAnswer(r, 'Onde posso economizar?')).toContain('1 lançamento(s)');
});
