import { addMonths, differenceInCalendarDays, format, getDaysInMonth, isValid, parse, parseISO } from 'date-fns';
import { enUS, ptBR } from 'date-fns/locale';

/** 'yyyy-MM-dd' — formato de armazenamento (ordenável como texto). */
export type ISODate = string;
/** 'yyyy-MM' */
export type MonthKey = string;

export const toISODate = (d: Date): ISODate => format(d, 'yyyy-MM-dd');
export const todayISO = (): ISODate => toISODate(new Date());
export const formatDateBR = (iso: ISODate): string => format(parseISO(iso), 'dd/MM/yyyy');

/** "30/09/2026" -> "2026-09-30"; datas inexistentes (31/02) retornam null. */
export function parseDateBR(input: string): ISODate | null {
  const s = input.trim();
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return null;
  const d = parse(s, 'dd/MM/yyyy', new Date());
  return isValid(d) ? toISODate(d) : null;
}

export const monthKeyOf = (iso: ISODate): MonthKey => iso.slice(0, 7);
export const dayOf = (iso: ISODate): number => Number(iso.slice(8, 10));

export const addMonthsToKey = (key: MonthKey, n: number): MonthKey =>
  format(addMonths(parseISO(`${key}-01`), n), 'yyyy-MM');

/** Dia do mês limitado ao último dia (dia 31 em fevereiro -> 28/29). */
export function dateInMonth(key: MonthKey, day: number): ISODate {
  const last = getDaysInMonth(parseISO(`${key}-01`));
  return `${key}-${String(Math.min(day, last)).padStart(2, '0')}`;
}

export const monthBounds = (key: MonthKey) => ({ start: `${key}-01`, end: dateInMonth(key, 31) });

export const daysBetween = (from: ISODate, to: ISODate): number =>
  differenceInCalendarDays(parseISO(to), parseISO(from));

/** Últimos n meses terminando em `key` (inclusive), do mais antigo ao mais recente. */
export const lastMonths = (key: MonthKey, n: number): MonthKey[] =>
  Array.from({ length: n }, (_, i) => addMonthsToKey(key, i - n + 1));

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Idioma dos nomes de mês; o app usa português, e as telas traduzidas passam o idioma do i18n. */
export type DateLocale = 'pt-BR' | 'en';

export const formatMonthLabel = (key: MonthKey, locale: DateLocale = 'pt-BR'): string =>
  capitalize(format(parseISO(`${key}-01`), locale === 'en' ? 'MMMM yyyy' : "MMMM 'de' yyyy", { locale: locale === 'en' ? enUS : ptBR }));

export const formatMonthShort = (key: MonthKey, locale: DateLocale = 'pt-BR'): string =>
  format(parseISO(`${key}-01`), 'MMM/yy', { locale: locale === 'en' ? enUS : ptBR });

export function relativeDayLabel(iso: ISODate, today: ISODate): string {
  const diff = daysBetween(iso, today);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  return formatDateBR(iso);
}
