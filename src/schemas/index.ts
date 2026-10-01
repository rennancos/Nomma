import { z } from 'zod';
import { parseDateBR } from '@/utils/date';
import { parseMoney } from '@/utils/money';

// Esquemas dos formulários: recebem texto digitado e produzem valores de domínio já validados
// (centavos inteiros, datas ISO). São a fronteira de validação de toda entrada do usuário.

const money = (opts: { allowZero?: boolean; signed?: boolean } = {}) =>
  z.string().transform((s, ctx) => {
    const negative = opts.signed === true && s.trim().startsWith('-');
    const parsed = s.trim() === '' && opts.allowZero ? 0 : parseMoney(negative ? s.trim().slice(1) : s);
    const v = parsed !== null && negative ? -parsed : parsed;
    if (v === null || (!opts.allowZero && !opts.signed && v <= 0)) {
      ctx.addIssue({ code: 'custom', message: 'Informe um valor válido' });
      return z.NEVER;
    }
    return v;
  });

const date = z.string().transform((s, ctx) => {
  const v = parseDateBR(s);
  if (!v) {
    ctx.addIssue({ code: 'custom', message: 'Data inválida (DD/MM/AAAA)' });
    return z.NEVER;
  }
  return v;
});

const optionalDate = z.string().transform((s, ctx) => {
  if (!s.trim()) return null;
  const v = parseDateBR(s);
  if (!v) {
    ctx.addIssue({ code: 'custom', message: 'Data inválida (DD/MM/AAAA)' });
    return z.NEVER;
  }
  return v;
});

const intRange = (min: number, max: number, message: string) =>
  z.string().transform((s, ctx) => {
    const n = Number(s.trim());
    if (!/^\d+$/.test(s.trim()) || n < min || n > max) {
      ctx.addIssue({ code: 'custom', message });
      return z.NEVER;
    }
    return n;
  });

const day = intRange(1, 31, 'Dia entre 1 e 31');
const name = (max: number) => z.string().trim().min(1, 'Obrigatório').max(max, `Máximo de ${max} caracteres`);
const optionalText = (max: number) =>
  z.string().trim().max(max, `Máximo de ${max} caracteres`).transform((s) => s || null);

export const transactionSchema = z
  .object({
    type: z.enum(['INCOME', 'EXPENSE', 'INVESTMENT', 'TRANSFER']),
    amount: money(),
    description: optionalText(80),
    categoryId: z.string().nullable(),
    accountId: z.string().min(1, 'Escolha a conta'),
    destinationAccountId: z.string().nullable(),
    date,
    paymentMethod: z.enum(['PIX', 'DEBIT', 'CASH', 'BOLETO', 'CREDIT', 'OTHER']).nullable(),
    cardId: z.string().nullable(),
    installments: intRange(1, 120, 'Entre 1 e 120 parcelas'),
    institution: optionalText(60),
    notes: optionalText(300),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'TRANSFER' && !v.destinationAccountId) {
      ctx.addIssue({ code: 'custom', path: ['destinationAccountId'], message: 'Escolha a conta de destino' });
    }
    if (v.destinationAccountId && v.destinationAccountId === v.accountId) {
      ctx.addIssue({ code: 'custom', path: ['destinationAccountId'], message: 'Escolha uma conta diferente da origem' });
    }
    if (v.type === 'EXPENSE' && v.paymentMethod === 'CREDIT' && !v.cardId) {
      ctx.addIssue({ code: 'custom', path: ['cardId'], message: 'Escolha o cartão' });
    }
  });

export const accountSchema = z.object({
  name: name(60),
  type: z.enum(['CHECKING', 'WALLET', 'SAVINGS', 'INVESTMENT']),
  initialBalance: money({ allowZero: true, signed: true }),
});

export const recurringSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  description: name(80),
  amount: money(),
  categoryId: z.string().nullable(),
  accountId: z.string().min(1, 'Escolha a conta'),
  dayOfMonth: day,
  startDate: date,
  autoPost: z.boolean(),
  active: z.boolean(),
});

export const cardSchema = z
  .object({
    name: name(40),
    bank: optionalText(40),
    limitAmount: money({ allowZero: true }),
    closingDay: day,
    dueDay: day,
  })
  .refine((v) => v.closingDay !== v.dueDay, { path: ['dueDay'], message: 'Vencimento deve ser diferente do fechamento' });

export const purchaseSchema = z.object({
  description: name(80),
  totalAmount: money(),
  installmentCount: intRange(1, 120, 'Entre 1 e 120 parcelas'),
  categoryId: z.string().nullable(),
  creditCardId: z.string().nullable(),
  purchaseDate: date,
});

export const goalSchema = z.object({
  name: name(60),
  targetAmount: money(),
  currentAmount: money({ allowZero: true }),
  deadline: optionalDate,
});

export const budgetSchema = z.object({
  categoryId: z.string().min(1, 'Escolha a categoria'),
  limitAmount: money(),
});

export const settingsSchema = z.object({
  userName: optionalText(40).transform((s) => s ?? ''),
  theme: z.enum(['system', 'light', 'dark']),
  payday: day,
  dailyReminder: z.boolean(),
});
