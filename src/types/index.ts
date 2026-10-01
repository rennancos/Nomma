// Tipos de domínio. Valores monetários são sempre centavos (inteiros).
// Datas são strings ISO 'yyyy-MM-dd' (ver utils/date.ts).
// Flags booleanas espelham o SQLite: 0 | 1.

export type TransactionType = 'INCOME' | 'EXPENSE' | 'INVESTMENT' | 'TRANSFER';
export type CategoryKind = 'INCOME' | 'EXPENSE' | 'INVESTMENT';
export type AccountType = 'CHECKING' | 'WALLET' | 'SAVINGS' | 'INVESTMENT';
export type PaymentMethod = 'PIX' | 'DEBIT' | 'CASH' | 'BOLETO' | 'CREDIT' | 'OTHER';
export type Flag = 0 | 1;

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  archived: Flag;
}

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  isDefault: Flag;
  archived: Flag;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  categoryId: string | null;
  accountId: string;
  destinationAccountId: string | null;
  date: string;
  notes: string | null;
  paymentMethod: PaymentMethod | null;
  institution: string | null;
  recurringId: string | null;
  /** Competência 'yyyy-MM' quando a transação é ocorrência de uma recorrência. */
  occurrenceMonth: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Recurring {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  amount: number;
  categoryId: string | null;
  accountId: string;
  dayOfMonth: number;
  startDate: string;
  autoPost: Flag;
  active: Flag;
}

export interface CreditCard {
  id: string;
  name: string;
  bank: string | null;
  limitAmount: number;
  closingDay: number;
  dueDay: number;
  archived: Flag;
}

export interface Purchase {
  id: string;
  creditCardId: string | null;
  description: string;
  categoryId: string | null;
  totalAmount: number;
  installmentCount: number;
  purchaseDate: string;
}

export interface Installment {
  id: string;
  purchaseId: string;
  number: number;
  amount: number;
  dueDate: string;
  transactionId: string | null;
}

/** Parcela com dados da compra, usada em listas e projeções. */
export interface InstallmentView extends Installment {
  description: string;
  installmentCount: number;
  creditCardId: string | null;
  categoryId: string | null;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
}

export interface Budget {
  id: string;
  categoryId: string;
  limitAmount: number;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Settings {
  userName: string;
  theme: ThemePreference;
  payday: number;
  /** Lembretes diários para registrar gastos (9h, 13h e 21h). */
  dailyReminder: boolean;
}
