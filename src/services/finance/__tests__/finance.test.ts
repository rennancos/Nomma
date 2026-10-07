import type { Account, InstallmentView, Recurring, Transaction } from '@/types';
import { describe, expect, it } from '@jest/globals';
import { accountBalances, balanceTotals, monthSummary, totalsByCategory } from '../balance';
import { emptyFilter, filterTransactions } from '../filters';
import { budgetMessage, budgetUsage, dailyAllowance, nextPayday, projectMonthEnd } from '../planning';
import {
  buildInstallments,
  cardInvoiceDueDate,
  cardStatus,
  fixedExpenseStatus,
  groupInvoices,
  monthSchedule,
  occurrenceKey,
  recurrenceDate,
} from '../schedule';

let seq = 0;
function tx(p: Partial<Transaction> & Pick<Transaction, 'type' | 'amount'>): Transaction {
  seq += 1;
  return {
    id: `t${seq}`,
    description: p.type,
    categoryId: null,
    accountId: 'corrente',
    destinationAccountId: null,
    date: '2026-09-10',
    notes: null,
    paymentMethod: null,
    institution: null,
    recurringId: null,
    occurrenceMonth: null,
    createdAt: '',
    updatedAt: '',
    ...p,
  };
}

const accounts: Account[] = [
  { id: 'corrente', name: 'Conta corrente', type: 'CHECKING', initialBalance: 100000, archived: 0 },
  { id: 'carteira', name: 'Carteira', type: 'WALLET', initialBalance: 5000, archived: 0 },
  { id: 'invest', name: 'Investimentos', type: 'INVESTMENT', initialBalance: 0, archived: 0 },
];

describe('saldo por conta', () => {
  const txs = [
    tx({ type: 'INCOME', amount: 530000 }), // salário
    tx({ type: 'EXPENSE', amount: 3590 }), // almoço
    tx({ type: 'EXPENSE', amount: 2740, accountId: 'carteira' }), // uber
    tx({ type: 'TRANSFER', amount: 50000, destinationAccountId: 'invest' }),
    tx({ type: 'INVESTMENT', amount: 30000, destinationAccountId: 'invest' }), // aporte CDB
    tx({ type: 'INVESTMENT', amount: 10000 }), // aporte sem conta de destino
  ];
  const b = accountBalances(accounts, txs);

  it('aplica receitas, despesas, transferências e aportes', () => {
    expect(b.get('corrente')).toBe(100000 + 530000 - 3590 - 50000 - 30000 - 10000);
    expect(b.get('carteira')).toBe(5000 - 2740);
    expect(b.get('invest')).toBe(80000);
  });

  it('transferência não altera o patrimônio total', () => {
    const before = accountBalances(accounts, []);
    const after = accountBalances(accounts, [tx({ type: 'TRANSFER', amount: 50000, destinationAccountId: 'carteira' })]);
    const total = (m: Map<string, number>) => [...m.values()].reduce((a, v) => a + v, 0);
    expect(total(after)).toBe(total(before));
    expect(after.get('carteira')).toBe(55000);
  });

  it('separa disponível de investido', () => {
    expect(balanceTotals(accounts, b)).toEqual({ available: 536410 + 2260, invested: 80000 });
  });

  it('ignora contas inexistentes sem quebrar', () => {
    const m = accountBalances(accounts, [tx({ type: 'EXPENSE', amount: 100, accountId: 'apagada' })]);
    expect(m.get('corrente')).toBe(100000);
  });
});

describe('resumo do mês', () => {
  const txs = [
    tx({ type: 'INCOME', amount: 530000, categoryId: 'salario' }),
    tx({ type: 'EXPENSE', amount: 215468, categoryId: 'moradia' }),
    tx({ type: 'INVESTMENT', amount: 30000 }),
    tx({ type: 'TRANSFER', amount: 99900, destinationAccountId: 'invest' }),
    tx({ type: 'EXPENSE', amount: 99999, date: '2026-08-31' }), // outro mês
  ];

  it('bate com o exemplo do dashboard', () => {
    const s = monthSummary(txs, '2026-09');
    expect(s.income).toBe(530000);
    expect(s.expenses).toBe(215468);
    expect(s.investments).toBe(30000);
    expect(s.remaining).toBe(284532); // R$ 2.845,32
    expect(Math.round(s.usedPct ?? 0)).toBe(46);
    expect(s.investedPct).toBeCloseTo(5.66, 2);
  });

  it('economizado = (receitas − despesas) / receitas; investimento não desconta (exemplo 56,60%)', () => {
    const s = monthSummary(
      [tx({ type: 'INCOME', amount: 530000 }), tx({ type: 'EXPENSE', amount: 230000 }), tx({ type: 'INVESTMENT', amount: 50000 })],
      '2026-09',
    );
    expect(s.remaining).toBe(250000); // saldo livre = 5.300 − 2.300 − 500
    expect(s.savedPct).toBeCloseTo(56.6, 2); // 3.000 / 5.300
  });

  it('sem receita, percentuais ficam indefinidos', () => {
    const s = monthSummary([tx({ type: 'EXPENSE', amount: 1000 })], '2026-09');
    expect(s.usedPct).toBeNull();
    expect(s.remaining).toBe(-1000);
  });

  it('totais por categoria em ordem decrescente', () => {
    const r = totalsByCategory(
      [
        tx({ type: 'EXPENSE', amount: 3590, categoryId: 'alim' }),
        tx({ type: 'EXPENSE', amount: 12000, categoryId: 'tel' }),
        tx({ type: 'EXPENSE', amount: 2000, categoryId: 'alim' }),
        tx({ type: 'INCOME', amount: 530000, categoryId: 'sal' }),
      ],
      '2026-09',
    );
    expect(r).toEqual([
      { categoryId: 'tel', total: 12000 },
      { categoryId: 'alim', total: 5590 },
    ]);
  });
});

describe('cartão de crédito', () => {
  const nubank = { limitAmount: 500000, closingDay: 25, dueDay: 2 };

  it('compra antes do fechamento cai na fatura do mês seguinte (vencimento dia 2)', () => {
    expect(cardInvoiceDueDate('2026-09-10', 25, 2)).toBe('2026-10-02');
  });
  it('compra no dia do fechamento ou depois vai para a fatura seguinte', () => {
    expect(cardInvoiceDueDate('2026-09-25', 25, 2)).toBe('2026-11-02');
    expect(cardInvoiceDueDate('2026-09-30', 25, 2)).toBe('2026-11-02');
  });
  it('vencimento depois do fechamento vence no mesmo mês', () => {
    expect(cardInvoiceDueDate('2026-09-01', 5, 15)).toBe('2026-09-15');
    expect(cardInvoiceDueDate('2026-09-06', 5, 15)).toBe('2026-10-15');
  });
  it('fechamento dia 31 em mês de 30 dias', () => {
    expect(cardInvoiceDueDate('2026-09-30', 31, 10)).toBe('2026-11-10');
    expect(cardInvoiceDueDate('2026-09-29', 31, 10)).toBe('2026-10-10');
  });

  it('parcelamento no cartão: notebook 10x de R$ 400', () => {
    const p = buildInstallments(400000, 10, '2026-09-10', nubank);
    expect(p).toHaveLength(10);
    expect(p[0]).toEqual({ number: 1, amount: 40000, dueDate: '2026-10-02' });
    expect(p[9]).toEqual({ number: 10, amount: 40000, dueDate: '2027-07-02' });
  });

  it('parcelamento fora do cartão começa na data informada e respeita fim de mês', () => {
    const p = buildInstallments(100000, 3, '2027-01-31', null);
    expect(p.map((i) => i.dueDate)).toEqual(['2027-01-31', '2027-02-28', '2027-03-31']);
    expect(p.map((i) => i.amount)).toEqual([33334, 33333, 33333]);
  });

  it('limite, fatura atual e próxima fatura', () => {
    const inst = [
      { amount: 40000, dueDate: '2026-10-02', transactionId: null },
      { amount: 40000, dueDate: '2026-11-02', transactionId: null },
      { amount: 12990, dueDate: '2026-10-02', transactionId: null },
      { amount: 5000, dueDate: '2026-09-02', transactionId: 'pago' },
    ];
    const s = cardStatus(nubank, inst, '2026-09-20');
    expect(s.used).toBe(92990);
    expect(s.available).toBe(500000 - 92990);
    expect(s.currentDue).toBe('2026-10-02');
    expect(s.currentInvoice).toBe(52990);
    expect(s.nextDue).toBe('2026-11-02');
    expect(s.nextInvoice).toBe(40000);
    expect(groupInvoices(inst)[0]).toEqual({ dueDate: '2026-09-02', total: 5000, pending: 0 });
  });
});

describe('recorrências e agenda do mês', () => {
  const rec = (p: Partial<Recurring>): Recurring => ({
    id: 'r',
    type: 'EXPENSE',
    description: 'Internet',
    amount: 11000,
    categoryId: null,
    accountId: 'corrente',
    dayOfMonth: 5,
    startDate: '2026-01-01',
    autoPost: 0,
    active: 1,
    ...p,
  });

  it('gera a ocorrência no dia do mês, sem retroagir antes do mês de início', () => {
    expect(recurrenceDate(rec({}), '2026-10')).toBe('2026-10-05');
    // Cadastrado em 20/09 com dia 5: já existe em setembro (vencido, a pagar), não em agosto.
    expect(recurrenceDate(rec({ startDate: '2026-09-20' }), '2026-09')).toBe('2026-09-05');
    expect(recurrenceDate(rec({ startDate: '2026-09-20' }), '2026-08')).toBeNull();
    expect(recurrenceDate(rec({ startDate: '2026-09-20' }), '2026-10')).toBe('2026-10-05');
    expect(recurrenceDate(rec({ active: 0 }), '2026-10')).toBeNull();
    expect(recurrenceDate(rec({ dayOfMonth: 31 }), '2026-02')).toBe('2026-02-28');
  });

  const recurrings = [
    rec({ id: 'tel', description: 'Telefone', amount: 12000, dayOfMonth: 10 }),
    rec({ id: 'net', description: 'Internet', amount: 11000, dayOfMonth: 5 }),
    rec({ id: 'emp', description: 'Empréstimo', amount: 31300, dayOfMonth: 5 }),
    rec({ id: 'sal', type: 'INCOME', description: 'Salário', amount: 530000, dayOfMonth: 5 }),
  ];
  const installments: InstallmentView[] = [
    { id: 'i3', purchaseId: 'p', number: 3, amount: 40000, dueDate: '2026-09-20', transactionId: null, description: 'Notebook', installmentCount: 10, creditCardId: null, categoryId: null },
    { id: 'i4', purchaseId: 'p', number: 4, amount: 40000, dueDate: '2026-10-20', transactionId: null, description: 'Notebook', installmentCount: 10, creditCardId: null, categoryId: null },
  ];
  const posted = new Set([occurrenceKey('net', '2026-09'), occurrenceKey('sal', '2026-09')]);
  const items = monthSchedule('2026-09', recurrings, posted, installments);

  it('lista recorrências e parcelas do mês em ordem de data', () => {
    expect(items.map((i) => i.description)).toEqual(['Internet', 'Empréstimo', 'Salário', 'Telefone', 'Notebook 3/10']);
    expect(items.find((i) => i.refId === 'net')?.paid).toBe(true);
  });

  it('gastos fixos: previstos, pagos e pendentes', () => {
    expect(fixedExpenseStatus(items)).toEqual({ expected: 54300, paid: 11000, pending: 43300 });
    expect(fixedExpenseStatus(items, 'INCOME')).toEqual({ expected: 530000, paid: 530000, pending: 0 });
  });

  it('lançamento fixo cadastrado depois do dia já aparece no mês: gasto pendente, salário previsto', () => {
    const novos = [
      rec({ id: 'agua', description: 'Água', amount: 9000, dayOfMonth: 5, startDate: '2026-10-07' }),
      rec({ id: 'sal2', type: 'INCOME', description: 'Salário', amount: 530000, dayOfMonth: 5, startDate: '2026-10-07' }),
    ];
    const outubro = monthSchedule('2026-10', novos, new Set(), []);
    expect(outubro.map((i) => [i.description, i.date, i.paid])).toEqual([
      ['Água', '2026-10-05', false],
      ['Salário', '2026-10-05', false],
    ]);
    expect(fixedExpenseStatus(outubro)).toEqual({ expected: 9000, paid: 0, pending: 9000 });
    expect(fixedExpenseStatus(outubro, 'INCOME')).toEqual({ expected: 530000, paid: 0, pending: 530000 });
    // Salário a receber entra no saldo previsto; o gasto pendente sai.
    expect(projectMonthEnd(100000, outubro)).toBe(100000 + 530000 - 9000);
    expect(monthSchedule('2026-09', novos, new Set(), [])).toEqual([]);
  });

  it('projeção do mês sem novos gastos', () => {
    // saldo 1.800 + nada a receber − (313 + 120 + 400 pendentes)
    expect(projectMonthEnd(180000, items)).toBe(180000 - 31300 - 12000 - 40000);
  });
});

describe('limite diário', () => {
  it('exemplo da especificação: (1.800 − 600) / 20 dias = R$ 60', () => {
    const items = [{ type: 'EXPENSE' as const, amount: 60000, date: '2026-09-20', paid: false }];
    const r = dailyAllowance(180000, items, '2026-09-15', 5);
    expect(r.payDate).toBe('2026-10-05');
    expect(r.daysLeft).toBe(20);
    expect(r.free).toBe(120000);
    expect(r.perDay).toBe(6000);
  });

  it('ignora despesas pagas e as que vencem depois do salário', () => {
    const items = [
      { type: 'EXPENSE' as const, amount: 10000, date: '2026-09-20', paid: true },
      { type: 'EXPENSE' as const, amount: 50000, date: '2026-10-10', paid: false },
    ];
    expect(dailyAllowance(100000, items, '2026-09-15', 5).pending).toBe(0);
  });

  it('nunca sugere valor negativo e arredonda para baixo', () => {
    const items = [{ type: 'EXPENSE' as const, amount: 90000, date: '2026-09-20', paid: false }];
    expect(dailyAllowance(50000, items, '2026-09-15', 5).perDay).toBe(0);
    expect(dailyAllowance(10000, [], '2026-09-15', 5).perDay).toBe(500);
    expect(dailyAllowance(10001, [], '2026-09-18', 5).perDay).toBe(588); // 17 dias
  });

  it('próximo salário', () => {
    expect(nextPayday('2026-09-04', 5)).toBe('2026-09-05');
    expect(nextPayday('2026-09-05', 5)).toBe('2026-10-05');
    expect(nextPayday('2026-01-31', 30)).toBe('2026-02-28');
  });
});

describe('orçamento por categoria', () => {
  it('Delivery: R$ 230 de R$ 300 = 77% (aviso)', () => {
    const u = budgetUsage(23000, 30000);
    expect(u.pct).toBe(77);
    expect(u.level).toBe('warning');
    expect(u.remaining).toBe(7000);
    expect(budgetMessage('Delivery', u.pct)).toBe('Você já utilizou 77% do orçamento de Delivery.');
  });
  it('níveis ok e estourado', () => {
    expect(budgetUsage(22000, 30000).level).toBe('ok');
    expect(budgetUsage(30001, 30000).level).toBe('over');
    expect(budgetUsage(30000, 30000).level).toBe('warning');
  });
});

describe('filtro de movimentações', () => {
  const txs = [
    tx({ type: 'EXPENSE', amount: 3590, description: 'Almoço', categoryId: 'alim' }),
    tx({ type: 'EXPENSE', amount: 2740, description: 'Uber', accountId: 'carteira' }),
    tx({ type: 'INCOME', amount: 530000, description: 'Salário' }),
    tx({ type: 'TRANSFER', amount: 50000, description: 'Reserva', destinationAccountId: 'invest' }),
  ];
  const names = (id: string | null) => (id === 'alim' ? 'Alimentação' : '');

  it('pesquisa sem acento e por nome da categoria', () => {
    expect(filterTransactions(txs, { ...emptyFilter, search: 'almoco' }, names)).toHaveLength(1);
    expect(filterTransactions(txs, { ...emptyFilter, search: 'aliment' }, names)[0]?.description).toBe('Almoço');
  });
  it('filtra por tipo, conta (origem ou destino) e valor', () => {
    expect(filterTransactions(txs, { ...emptyFilter, type: 'INCOME' }, names)).toHaveLength(1);
    expect(filterTransactions(txs, { ...emptyFilter, accountId: 'invest' }, names)).toHaveLength(1);
    expect(filterTransactions(txs, { ...emptyFilter, minAmount: 3000, maxAmount: 60000 }, names)).toHaveLength(2);
  });
});
