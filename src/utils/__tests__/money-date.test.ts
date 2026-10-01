import { addMonthsToKey, dateInMonth, formatDateBR, formatMonthLabel, lastMonths, parseDateBR, relativeDayLabel } from '../date';
import { centsToInput, formatMoney, formatPercent, parseMoney, percent, splitAmount } from '../money';
import { describe, expect, it } from '@jest/globals';

describe('formatMoney', () => {
  it('usa padrão brasileiro', () => {
    expect(formatMoney(123456)).toBe('R$ 1.234,56');
    expect(formatMoney(530000)).toBe('R$ 5.300,00');
    expect(formatMoney(5)).toBe('R$ 0,05');
    expect(formatMoney(0)).toBe('R$ 0,00');
    expect(formatMoney(-3590)).toBe('- R$ 35,90');
    expect(formatMoney(530000, { sign: true })).toBe('+ R$ 5.300,00');
    expect(formatMoney(123456789)).toBe('R$ 1.234.567,89');
  });
});

describe('parseMoney', () => {
  it('converte texto em centavos sem float', () => {
    expect(parseMoney('53,20')).toBe(5320);
    expect(parseMoney('32,9')).toBe(3290);
    expect(parseMoney('R$ 1.294,35')).toBe(129435);
    expect(parseMoney('5300')).toBe(530000);
    expect(parseMoney('5.300')).toBe(530000);
    expect(parseMoney('32.90')).toBe(3290);
    expect(parseMoney('0,10')).toBe(10);
    // 0.1 + 0.2 clássico: nenhum erro de arredondamento
    expect(parseMoney('0,29')).toBe(29);
  });
  it('rejeita entradas inválidas', () => {
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
    expect(parseMoney('1,234,5')).toBeNull();
    expect(parseMoney('10,999')).toBeNull();
    expect(parseMoney('-5')).toBeNull();
  });
  it('ida e volta com centsToInput', () => {
    expect(centsToInput(3290)).toBe('32,90');
    expect(parseMoney(centsToInput(129435))).toBe(129435);
  });
});

describe('percentuais', () => {
  it('calcula e formata', () => {
    expect(formatPercent(percent(250000, 530000))).toBe('47,17%');
    expect(formatPercent(percent(650000, 2000000))).toBe('32,5%');
    expect(formatPercent(46)).toBe('46%');
    expect(percent(100, 0)).toBeNull();
    expect(formatPercent(null)).toBe('—');
  });
});

describe('splitAmount', () => {
  it('divide sem perder centavos', () => {
    expect(splitAmount(400000, 10)).toEqual(Array(10).fill(40000));
    expect(splitAmount(100000, 3)).toEqual([33334, 33333, 33333]);
    expect(splitAmount(100, 3).reduce((a, b) => a + b)).toBe(100);
  });
});

describe('datas', () => {
  it('formata e interpreta DD/MM/YYYY', () => {
    expect(formatDateBR('2026-09-30')).toBe('30/09/2026');
    expect(parseDateBR('30/09/2026')).toBe('2026-09-30');
    expect(parseDateBR('31/02/2026')).toBeNull();
    expect(parseDateBR('2026-09-30')).toBeNull();
  });
  it('limita dia ao fim do mês', () => {
    expect(dateInMonth('2026-02', 31)).toBe('2026-02-28');
    expect(dateInMonth('2028-02', 30)).toBe('2028-02-29');
    expect(dateInMonth('2026-10', 5)).toBe('2026-10-05');
  });
  it('navega meses', () => {
    expect(addMonthsToKey('2026-12', 1)).toBe('2027-01');
    expect(lastMonths('2026-02', 3)).toEqual(['2025-12', '2026-01', '2026-02']);
    expect(formatMonthLabel('2026-09')).toBe('Setembro de 2026');
  });
  it('rótulos relativos', () => {
    expect(relativeDayLabel('2026-09-30', '2026-09-30')).toBe('Hoje');
    expect(relativeDayLabel('2026-09-29', '2026-09-30')).toBe('Ontem');
    expect(relativeDayLabel('2026-09-01', '2026-09-30')).toBe('01/09/2026');
  });
});
