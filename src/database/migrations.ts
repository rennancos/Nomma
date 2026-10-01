import type { SQLiteDatabase } from 'expo-sqlite';
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, DEFAULT_PAYDAY, defaultCategoryId } from '@/constants/defaults';
import type { CategoryKind } from '@/types';

// Cada migration roda uma única vez, em ordem, controlada por PRAGMA user_version.
// Nunca edite uma migration já publicada: adicione uma nova ao final da lista.

const v1_schema = `
CREATE TABLE accounts (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  type TEXT NOT NULL CHECK (type IN ('CHECKING','WALLET','SAVINGS','INVESTMENT')),
  initial_balance INTEGER NOT NULL DEFAULT 0 CHECK (typeof(initial_balance) = 'integer'),
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
  kind TEXT NOT NULL CHECK (kind IN ('INCOME','EXPENSE','INVESTMENT')),
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0,1)),
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (name, kind)
);

CREATE TABLE recurring_transactions (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('INCOME','EXPENSE')),
  description TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (typeof(amount) = 'integer' AND amount > 0),
  category_id TEXT REFERENCES categories(id),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  start_date TEXT NOT NULL CHECK (date(start_date) IS start_date),
  auto_post INTEGER NOT NULL DEFAULT 0 CHECK (auto_post IN (0,1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('INCOME','EXPENSE','INVESTMENT','TRANSFER')),
  description TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (typeof(amount) = 'integer' AND amount > 0),
  category_id TEXT REFERENCES categories(id),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  destination_account_id TEXT REFERENCES accounts(id),
  date TEXT NOT NULL CHECK (date(date) IS date),
  notes TEXT,
  payment_method TEXT CHECK (payment_method IN ('PIX','DEBIT','CASH','BOLETO','CREDIT','OTHER')),
  institution TEXT,
  recurring_id TEXT REFERENCES recurring_transactions(id) ON DELETE SET NULL,
  -- mês de competência da ocorrência recorrente ('yyyy-MM'); garante um lançamento por recorrência/mês
  occurrence_month TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (CASE type
    WHEN 'TRANSFER' THEN destination_account_id IS NOT NULL
    WHEN 'INVESTMENT' THEN 1
    ELSE destination_account_id IS NULL END),
  CHECK (destination_account_id IS NULL OR destination_account_id <> account_id)
);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE UNIQUE INDEX idx_transactions_occurrence ON transactions(recurring_id, occurrence_month)
  WHERE recurring_id IS NOT NULL;

CREATE TABLE credit_cards (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
  bank TEXT,
  limit_amount INTEGER NOT NULL CHECK (typeof(limit_amount) = 'integer' AND limit_amount >= 0),
  closing_day INTEGER NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Compra parcelada (no cartão quando credit_card_id não é nulo; senão carnê/boleto/empréstimo).
-- Compra à vista no cartão = 1 parcela.
CREATE TABLE installment_purchases (
  id TEXT PRIMARY KEY NOT NULL,
  credit_card_id TEXT REFERENCES credit_cards(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  total_amount INTEGER NOT NULL CHECK (typeof(total_amount) = 'integer' AND total_amount > 0),
  installment_count INTEGER NOT NULL CHECK (installment_count BETWEEN 1 AND 120),
  purchase_date TEXT NOT NULL CHECK (date(purchase_date) IS purchase_date),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Parcela paga = transaction_id preenchido (a despesa real, que debita a conta).
CREATE TABLE installments (
  id TEXT PRIMARY KEY NOT NULL,
  purchase_id TEXT NOT NULL REFERENCES installment_purchases(id) ON DELETE CASCADE,
  number INTEGER NOT NULL CHECK (number >= 1),
  amount INTEGER NOT NULL CHECK (typeof(amount) = 'integer' AND amount > 0),
  due_date TEXT NOT NULL CHECK (date(due_date) IS due_date),
  transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
  UNIQUE (purchase_id, number)
);
CREATE INDEX idx_installments_due ON installments(due_date);

CREATE TABLE financial_goals (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  target_amount INTEGER NOT NULL CHECK (typeof(target_amount) = 'integer' AND target_amount > 0),
  current_amount INTEGER NOT NULL DEFAULT 0 CHECK (typeof(current_amount) = 'integer' AND current_amount >= 0),
  deadline TEXT CHECK (deadline IS NULL OR date(deadline) IS deadline),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE budgets (
  id TEXT PRIMARY KEY NOT NULL,
  category_id TEXT NOT NULL UNIQUE REFERENCES categories(id) ON DELETE CASCADE,
  limit_amount INTEGER NOT NULL CHECK (typeof(limit_amount) = 'integer' AND limit_amount > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;

async function v1(db: SQLiteDatabase) {
  await db.execAsync(v1_schema);
  const now = new Date().toISOString();
  for (const kind of Object.keys(DEFAULT_CATEGORIES) as CategoryKind[]) {
    for (const name of DEFAULT_CATEGORIES[kind]) {
      await db.runAsync(
        'INSERT INTO categories (id, name, kind, is_default, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)',
        defaultCategoryId(kind, name), name, kind, now, now,
      );
    }
  }
  for (const a of DEFAULT_ACCOUNTS) {
    await db.runAsync(
      'INSERT INTO accounts (id, name, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      a.id, a.name, a.type, now, now,
    );
  }
  const settings: [string, string][] = [['userName', ''], ['theme', 'system'], ['payday', String(DEFAULT_PAYDAY)]];
  for (const [key, value] of settings) {
    await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', key, value);
  }
}

const MIGRATIONS: ((db: SQLiteDatabase) => Promise<void>)[] = [v1];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  // busy_timeout: se outro processo do app ainda segura o banco (ex.: reabertura logo após fechar à força),
  // espera até 5 s em vez de falhar na hora com "database is locked".
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (const [index, run] of MIGRATIONS.entries()) {
    if (index < current) continue;
    await db.withExclusiveTransactionAsync(async (txn) => {
      await run(txn);
      await txn.execAsync(`PRAGMA user_version = ${index + 1}`);
    });
  }
}

export const SCHEMA_VERSION = MIGRATIONS.length;
