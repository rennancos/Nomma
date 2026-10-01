import { describe, expect, it } from '@jest/globals';
import { centsToInput, splitAmount } from '../money';
import { accountBalances } from '@/services/finance/balance';

describe('regressões da revisão inicial', () => {
  it('formata saldo negativo para edição sem alterar centavos', () => {
    expect(centsToInput(-3590)).toBe('-35,90');
    expect(centsToInput(-5)).toBe('-0,05');
  });

  it('rejeita parcelamentos inválidos em vez de perder dinheiro', () => {
    for (const count of [0, -1, 1.5, NaN, Infinity]) {
      expect(() => splitAmount(100, count)).toThrow(RangeError);
    }
    for (const total of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => splitAmount(total, 2)).toThrow(RangeError);
    }
  });

  it('despesa não credita outra conta mesmo se destino estiver preenchido', () => {
    const result = accountBalances(
      [{ id: 'a', initialBalance: 10000 }, { id: 'b', initialBalance: 0 }],
      [{ type: 'EXPENSE', amount: 1000, accountId: 'a', destinationAccountId: 'b' }],
    );
    expect(result.get('a')).toBe(9000);
    expect(result.get('b')).toBe(0);
  });
});
