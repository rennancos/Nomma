// Dinheiro é sempre inteiro em centavos. Nada de float em cálculo monetário.

/** 123456 -> "R$ 1.234,56"; negativo -> "- R$ 1.234,56". */
export function formatMoney(cents: number, opts: { sign?: boolean } = {}): string {
  const abs = Math.abs(Math.trunc(cents));
  const reais = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const centavos = (abs % 100).toString().padStart(2, '0');
  const prefix = cents < 0 ? '- ' : opts.sign && cents > 0 ? '+ ' : '';
  return `${prefix}R$ ${reais},${centavos}`;
}

/**
 * Converte texto digitado em centavos, sem passar por float.
 * Aceita "32,90", "1.234,56", "R$ 5.300", "32.90", "5300". Retorna null se inválido.
 */
export function parseMoney(input: string): number | null {
  let s = input.replace(/R\$|\s/g, '');
  if (!s) return null;
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/\.\d{3}$/.test(s) || (s.match(/\./g)?.length ?? 0) > 1) {
    s = s.replace(/\./g, ''); // "5.300" = cinco mil e trezentos
  }
  const m = /^(\d{1,11})(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
}

/** Centavos -> texto editável ("32,90"). */
export function centsToInput(cents: number): string {
  const abs = Math.abs(cents);
  return `${cents < 0 ? '-' : ''}${Math.floor(abs / 100)},${(abs % 100).toString().padStart(2, '0')}`;
}

/** Percentual (0-100+) de part sobre total; null quando não há base. */
export function percent(part: number, total: number): number | null {
  return total > 0 ? (part / total) * 100 : null;
}

/** 47.1698 -> "47,17%"; 32.5 -> "32,5%"; 46 -> "46%". */
export function formatPercent(value: number | null): string {
  if (value === null) return '—';
  return `${value.toFixed(2).replace(/\.?0+$/, '').replace('.', ',')}%`;
}

/** Divide um total em n parcelas inteiras; os centavos restantes vão para as primeiras. */
export function splitAmount(total: number, n: number): number[] {
  if (!Number.isSafeInteger(total) || total < 0 || !Number.isSafeInteger(n) || n <= 0) {
    throw new RangeError('Informe um total inteiro não negativo em centavos e uma quantidade inteira positiva.');
  }
  const base = Math.floor(total / n);
  const rest = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}

export const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0);
