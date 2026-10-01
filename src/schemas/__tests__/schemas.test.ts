import { describe, expect, it } from '@jest/globals';
import { accountSchema, cardSchema, purchaseSchema, transactionSchema } from '..';

const baseTx = {
  type: 'EXPENSE' as const,
  amount: '32,90',
  description: 'Almoço',
  categoryId: null,
  accountId: 'acc-main',
  destinationAccountId: null,
  date: '30/09/2026',
  paymentMethod: null,
  cardId: null,
  installments: '1',
  institution: '',
  notes: '',
};

describe('transactionSchema', () => {
  it('converte o formulário em valores de domínio', () => {
    const r = transactionSchema.parse(baseTx);
    expect(r.amount).toBe(3290);
    expect(r.date).toBe('2026-09-30');
    expect(r.notes).toBeNull();
  });
  it('rejeita valor zero, texto e data inválida', () => {
    expect(transactionSchema.safeParse({ ...baseTx, amount: '0' }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...baseTx, amount: 'abc' }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...baseTx, date: '31/02/2026' }).success).toBe(false);
  });
  it('transferência exige destino diferente da origem', () => {
    expect(transactionSchema.safeParse({ ...baseTx, type: 'TRANSFER' }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...baseTx, type: 'TRANSFER', destinationAccountId: 'acc-main' }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...baseTx, type: 'TRANSFER', destinationAccountId: 'acc-invest' }).success).toBe(true);
  });
  it('compra no crédito exige cartão', () => {
    expect(transactionSchema.safeParse({ ...baseTx, paymentMethod: 'CREDIT' }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...baseTx, paymentMethod: 'CREDIT', cardId: 'c1' }).success).toBe(true);
  });
});

describe('outros esquemas', () => {
  it('saldo inicial de conta aceita negativo e vazio', () => {
    expect(accountSchema.parse({ name: 'Itaú', type: 'CHECKING', initialBalance: '-35,90' }).initialBalance).toBe(-3590);
    expect(accountSchema.parse({ name: 'Itaú', type: 'CHECKING', initialBalance: '' }).initialBalance).toBe(0);
  });
  it('cartão valida dias', () => {
    const card = { name: 'Nubank', bank: '', limitAmount: '5.000', closingDay: '25', dueDay: '2' };
    expect(cardSchema.parse(card).limitAmount).toBe(500000);
    expect(cardSchema.safeParse({ ...card, dueDay: '32' }).success).toBe(false);
  });
  it('parcelamento limita parcelas entre 1 e 120', () => {
    const p = { description: 'Notebook', totalAmount: '4000', installmentCount: '10', categoryId: null, creditCardId: null, purchaseDate: '10/10/2026' };
    expect(purchaseSchema.parse(p).totalAmount).toBe(400000);
    expect(purchaseSchema.safeParse({ ...p, installmentCount: '0' }).success).toBe(false);
    expect(purchaseSchema.safeParse({ ...p, installmentCount: '1.5' }).success).toBe(false);
  });
});
