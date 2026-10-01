import { describe, expect, it } from '@jest/globals';
import {
  categoryBreakdown,
  hasData,
  monthlyStats,
  periodMonths,
  periodSummary,
  previousMonths,
  variation,
} from '../analytics';

type T = { type: 'INCOME' | 'EXPENSE' | 'INVESTMENT' | 'TRANSFER'; amount: number; date: string; categoryId: string | null };
const tx = (type: T['type'], amount: number, date: string, categoryId: string | null = null): T => ({ type, amount, date, categoryId });

// Setembro do exemplo da especificação: receita 5.300, despesas 3.420, investimento 1.000.
const sept = [
  tx('INCOME', 530000, '2026-09-05'),
  tx('EXPENSE', 90000, '2026-09-10', 'moradia'),
  tx('EXPENSE', 65000, '2026-09-12', 'alimentacao'),
  tx('EXPENSE', 187000, '2026-09-20', 'outros'),
  tx('INVESTMENT', 100000, '2026-09-06'),
  tx('TRANSFER', 50000, '2026-09-07'), // neutra
];
const aug = [
  tx('INCOME', 530000, '2026-08-05'),
  tx('EXPENSE', 58000, '2026-08-12', 'alimentacao'),
  tx('EXPENSE', 300000, '2026-08-15', 'moradia'),
  tx('INVESTMENT', 535000, '2026-03-01'), // aporte antigo, fora dos períodos
];

describe('periodMonths', () => {
  it('monta os meses de cada período', () => {
    expect(periodMonths('month', '2026-09')).toEqual(['2026-09']);
    expect(periodMonths('3m', '2026-09')).toEqual(['2026-07', '2026-08', '2026-09']);
    expect(periodMonths('6m', '2026-09')).toHaveLength(6);
    expect(periodMonths('12m', '2026-09')[0]).toBe('2025-10');
    expect(periodMonths('year', '2026-09')).toEqual(['2026']);
    expect(periodMonths('3y', '2026-09')).toEqual(['2024', '2025', '2026']);
    expect(periodMonths('5y', '2026-09')).toHaveLength(5);
  });
  it('período anterior tem o mesmo tamanho e vem logo antes', () => {
    expect(previousMonths(['2026-08', '2026-09'])).toEqual(['2026-06', '2026-07']);
    expect(previousMonths(['2026-01'])).toEqual(['2025-12']);
    expect(previousMonths(['2025', '2026'])).toEqual(['2023', '2024']);
  });
});

describe('monthlyStats', () => {
  const [s] = monthlyStats([...sept, ...aug], ['2026-09']);
  it('receitas, despesas e investimentos do mês (transferência é neutra)', () => {
    expect(s?.income).toBe(530000);
    expect(s?.expenses).toBe(342000);
    expect(s?.investments).toBe(100000);
  });
  it('economia = receitas − despesas; investimento não é descontado', () => {
    expect(s?.savings).toBe(188000); // R$ 1.880
    expect(s?.free).toBe(88000); // saldo livre = economia − investido
  });
  it('taxa de economia, renda utilizada e renda investida', () => {
    expect(s?.savingsRate).toBeCloseTo(35.47, 2);
    expect(s?.usedPct).toBeCloseTo(64.53, 2);
    expect(s?.investedPct).toBeCloseTo(18.87, 2);
  });
  it('investido acumulado inclui aportes anteriores ao período', () => {
    expect(s?.investedTotal).toBe(635000); // 5.350 (março) + 1.000 (setembro) = R$ 6.350
  });
  it('acumulado cresce mês a mês', () => {
    const stats = monthlyStats([...sept, ...aug], ['2026-08', '2026-09']);
    expect(stats.map((m) => m.investedTotal)).toEqual([535000, 635000]);
  });
  it('mês sem receita: percentuais indefinidos', () => {
    const [x] = monthlyStats([tx('EXPENSE', 1000, '2026-09-01')], ['2026-09']);
    expect(x?.savingsRate).toBeNull();
    expect(x?.savings).toBe(-1000);
  });
  it('período sem dados', () => {
    const stats = monthlyStats([], ['2026-08', '2026-09']);
    expect(stats.every((m) => !hasData(m))).toBe(true);
    expect(periodSummary(stats).savingsRate).toBeNull();
    expect(periodSummary([]).income).toBe(0);
  });
});

describe('periodSummary', () => {
  it('soma os meses e recalcula a taxa sobre o total', () => {
    const p = periodSummary(monthlyStats([...sept, ...aug], ['2026-08', '2026-09']));
    expect(p.income).toBe(1060000);
    expect(p.expenses).toBe(700000);
    expect(p.savings).toBe(360000);
    expect(p.savingsRate).toBeCloseTo(33.96, 2);
    expect(p.investedTotal).toBe(635000);
  });
});

describe('variation', () => {
  it('compara com o período anterior', () => {
    expect(variation(342000, 358000)).toBeCloseTo(-4.47, 2);
    expect(variation(110, 100)).toBeCloseTo(10, 5);
  });
  it('sem base de comparação: null', () => {
    expect(variation(100, 0)).toBeNull();
  });
  it('base negativa usa o valor absoluto (economia negativa que melhora)', () => {
    expect(variation(500, -1000)).toBeCloseTo(150, 5);
  });
});

describe('categoryBreakdown', () => {
  const cats = categoryBreakdown([...sept, ...aug], ['2026-09'], ['2026-08']);
  it('gastos por categoria, do maior para o menor', () => {
    expect(cats.map((c) => c.categoryId)).toEqual(['outros', 'moradia', 'alimentacao']);
  });
  it('percentual das despesas soma 100%', () => {
    expect(cats.find((c) => c.categoryId === 'alimentacao')?.share).toBeCloseTo(19.01, 2);
    expect(cats.reduce((s, c) => s + c.share, 0)).toBeCloseTo(100, 5);
  });
  it('variação vs. período anterior (Alimentação +12%)', () => {
    expect(cats.find((c) => c.categoryId === 'alimentacao')?.change).toBeCloseTo(12.07, 2);
    expect(cats.find((c) => c.categoryId === 'outros')?.change).toBeNull(); // não houve gasto antes
  });
  it('ignora receitas, investimentos e categorias só do período anterior', () => {
    const only = categoryBreakdown([tx('EXPENSE', 100, '2026-08-01', 'velha'), tx('INCOME', 500, '2026-09-01')], ['2026-09'], ['2026-08']);
    expect(only).toEqual([]);
  });
});

describe('visão anual', () => {
  const txs = [...sept, ...aug, tx('INCOME', 100000, '2025-12-20'), tx('EXPENSE', 40000, '2025-06-01', 'alimentacao')];
  it('soma o ano inteiro num ponto só', () => {
    const [y] = monthlyStats(txs, ['2026']);
    expect(y?.income).toBe(1060000);
    expect(y?.expenses).toBe(700000);
    expect(y?.investments).toBe(635000); // inclui o aporte de março
    expect(y?.savings).toBe(360000);
  });
  it('um ponto por ano e acumulado entre anos', () => {
    const stats = monthlyStats([...txs, tx('INVESTMENT', 1000, '2024-05-01')], ['2025', '2026']);
    expect(stats.map((s) => s.income)).toEqual([100000, 1060000]);
    expect(stats.map((s) => s.investedTotal)).toEqual([1000, 636000]);
  });
  it('categorias comparadas com o ano anterior', () => {
    const [food] = categoryBreakdown(txs, ['2026'], ['2025']).filter((c) => c.categoryId === 'alimentacao');
    expect(food?.total).toBe(123000);
    expect(food?.previous).toBe(40000);
    expect(food?.change).toBeCloseTo(207.5, 5);
  });
});
