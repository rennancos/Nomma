import type { SQLiteDatabase } from 'expo-sqlite';
import { nowISO } from '@/database/id';
import type { Transaction } from '@/types';
import { daysBetween, type ISODate } from '@/utils/date';
import { parseMoney } from '@/utils/money';

// Importação de extrato bancário: OFX (o formato de "extrato para gerenciador financeiro") ou CSV com cabeçalho.

export interface StatementEntry {
  /** identificador do lançamento no banco; vazio no CSV e em alguns OFX */
  fitId: string;
  date: ISODate;
  /** centavos com sinal: negativo = saída */
  amount: number;
  description: string;
}

const DEFAULT_DESCRIPTION = 'Lançamento importado';
const clean = (s: string) => s.replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim().slice(0, 80) || DEFAULT_DESCRIPTION;

/** "-32.90", "R$ 1.234,56", "+150" -> centavos com sinal; null se inválido ou zero. */
function signedCents(raw: string): number | null {
  const s = raw.replace(/R\$|\s/g, '');
  const cents = parseMoney(s.replace(/^[+-]/, ''));
  return cents ? (s.startsWith('-') ? -cents : cents) : null;
}

// OFX 1.x é SGML (tags sem fechamento); 2.x é XML. Ler "até o próximo < ou fim da linha" serve aos dois.
const tag = (block: string, name: string) => new RegExp(`<${name}>([^<\\r\\n]*)`, 'i').exec(block)?.[1]?.trim() ?? '';

function parseOfx(content: string): StatementEntry[] {
  const entries: StatementEntry[] = [];
  for (const block of content.split(/<STMTTRN>/i).slice(1)) {
    const posted = /^(\d{4})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/.exec(tag(block, 'DTPOSTED'));
    const amount = signedCents(tag(block, 'TRNAMT'));
    if (!posted || !amount) continue;
    entries.push({
      fitId: tag(block, 'FITID'),
      date: `${posted[1]}-${posted[2]}-${posted[3]}`,
      amount,
      description: clean(tag(block, 'MEMO') || tag(block, 'NAME')),
    });
  }
  return entries;
}

/** Divide uma linha de CSV respeitando aspas ("a;b" é um campo só; "" é uma aspa). */
function splitCsvLine(line: string, sep: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { cells.push(cell); cell = ''; } else cell += c;
  }
  return [...cells, cell].map((v) => v.trim());
}

/** "05/11/2026", "05-11-2026" ou "2026-11-05" -> ISO; null se não for data. */
function csvDate(raw: string): ISODate | null {
  const br = /^(\d{2})[/-](\d{2})[/-](\d{4})/.exec(raw);
  const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : /^\d{4}-\d{2}-\d{2}/.exec(raw)?.[0];
  return iso && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(iso) ? iso : null;
}

// Nomes de coluna aceitos, em ordem de preferência (minúsculas, sem acento).
const DATE_COLS = ['data', 'date'];
const AMOUNT_COLS = ['valor', 'amount', 'quantia'];
const TEXT_COLS = ['descricao', 'historico', 'lancamento', 'memo', 'title', 'estabelecimento', 'detalhe', 'identificador'];

/**
 * CSV com linha de cabeçalho contendo data e valor (separador ; , ou tab). Valor negativo = saída.
 * ponytail: fatura de cartão em CSV costuma trazer compras com valor positivo e entraria como receita;
 * para cartão, usar o OFX ou adicionar uma opção "inverter sinal".
 */
function parseCsv(content: string): StatementEntry[] {
  const lines = content.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  for (const [h, line] of lines.entries()) {
    const sep = [';', '\t', ','].find((s) => line.includes(s));
    if (!sep) continue;
    const header = splitCsvLine(line, sep).map(norm);
    const col = (names: string[]) => {
      for (const n of names) {
        const i = header.findIndex((c) => c.startsWith(n));
        if (i >= 0) return i;
      }
      return -1;
    };
    const [d, a, t] = [col(DATE_COLS), col(AMOUNT_COLS), col(TEXT_COLS)];
    if (d < 0 || a < 0) continue;
    const entries: StatementEntry[] = [];
    for (const row of lines.slice(h + 1)) {
      const cells = splitCsvLine(row, sep);
      const date = csvDate(cells[d] ?? '');
      const amount = signedCents(cells[a] ?? '');
      if (date && amount) entries.push({ fitId: '', date, amount, description: clean(cells[t] ?? '') });
    }
    return entries;
  }
  return [];
}

/** Lançamentos do extrato (OFX ou CSV). Linhas sem data ou valor válidos são ignoradas; arquivo estranho devolve []. */
export const parseStatement = (content: string): StatementEntry[] =>
  /<STMTTRN>/i.test(content) ? parseOfx(content) : parseCsv(content);

type Existing = Pick<Transaction, 'id' | 'type' | 'amount' | 'categoryId' | 'accountId' | 'destinationAccountId' | 'date' | 'description'>;

/** Quanto a transação mexe no saldo da conta (centavos com sinal; 0 se não a envolve). */
const effectOn = (t: Existing, accountId: string) =>
  t.type === 'INCOME'
    ? (t.accountId === accountId ? t.amount : 0)
    : t.accountId === accountId ? -t.amount : t.destinationAccountId === accountId ? t.amount : 0;

const near = (a: ISODate, b: ISODate) => Math.abs(daysBetween(a, b)) <= 1;
const isImport = (id: string) => id.startsWith('ofx-');

export interface ImportPlan {
  inserts: { id: string; type: 'INCOME' | 'EXPENSE'; description: string; amount: number; date: ISODate; categoryId: string | null }[];
  /** lançamentos importados de outra conta que, com este extrato, se revelam transferências entre contas próprias */
  transfers: { id: string; from: string; to: string }[];
  /** já estavam no app (digitados à mão ou transferência já registrada) */
  manual: number;
  /** já importados deste mesmo extrato antes */
  repeated: number;
}

/**
 * Decide o que fazer com cada lançamento do extrato, sem tocar no banco:
 * 1. já importado antes (mesmo id derivado do banco) -> ignora;
 * 2. já existe no app com mesmo valor e sentido na conta, até 1 dia de diferença -> ignora (digitado à mão);
 * 3. é o outro lado de um lançamento importado de outra conta (valor oposto, até 1 dia) -> vira transferência;
 * 4. senão entra como receita/despesa, com a categoria da última movimentação de mesma descrição.
 * ponytail: casamento por valor e data, sem olhar o texto; duas contas com valores opostos iguais no mesmo dia
 * por coincidência viram transferência. Se acontecer, adicionar uma tela de revisão antes de gravar.
 */
export function planImport(accountId: string, entries: StatementEntry[], existing: Existing[]): ImportPlan {
  const plan: ImportPlan = { inserts: [], transfers: [], manual: 0, repeated: 0 };
  const ids = new Set(existing.map((t) => t.id));
  const used = new Set<string>();
  const seen = new Map<string, number>();
  const categoryOf = new Map<string, string>();
  // `existing` vem da mais recente para a mais antiga: a primeira categoria vista é a mais recente.
  for (const t of existing) {
    const key = `${t.type}|${t.description.toLowerCase()}`;
    if (t.categoryId && !categoryOf.has(key)) categoryOf.set(key, t.categoryId);
  }
  const ownImport = (t: Existing) => t.id.startsWith(`ofx-${accountId}-`);

  for (const e of entries) {
    // Alguns bancos repetem ou omitem o FITID: data e valor entram na chave, e um contador separa lançamentos idênticos.
    const key = `ofx-${accountId}-${e.date}-${e.amount}-${e.fitId}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    const id = `${key}-${n}`;
    if (ids.has(id)) { plan.repeated++; continue; }

    const same = existing.find((t) => !used.has(t.id) && !ownImport(t) && effectOn(t, accountId) === e.amount && near(t.date, e.date));
    if (same) { used.add(same.id); plan.manual++; continue; }

    const other = existing.find((t) =>
      !used.has(t.id) && isImport(t.id) && !ownImport(t) && t.categoryId === null && (t.type === 'INCOME' || t.type === 'EXPENSE') &&
      t.accountId !== accountId && effectOn(t, t.accountId) === -e.amount && near(t.date, e.date));
    if (other) {
      used.add(other.id);
      plan.transfers.push(e.amount > 0 ? { id: other.id, from: other.accountId, to: accountId } : { id: other.id, from: accountId, to: other.accountId });
      continue;
    }

    const type = e.amount < 0 ? 'EXPENSE' : 'INCOME';
    plan.inserts.push({
      id, type, description: e.description, amount: Math.abs(e.amount), date: e.date,
      categoryId: categoryOf.get(`${type}|${e.description.toLowerCase()}`) ?? null,
    });
  }
  return plan;
}

/** Aplica o plano numa transação só: se algo falhar, nada entra. */
export async function importStatement(db: SQLiteDatabase, accountId: string, entries: StatementEntry[]): Promise<ImportPlan> {
  const now = nowISO();
  const existing = await db.getAllAsync<Existing>(
    `SELECT id, type, amount, category_id AS categoryId, account_id AS accountId, destination_account_id AS destinationAccountId,
       date, description FROM transactions ORDER BY date DESC, created_at DESC`,
  );
  const plan = planImport(accountId, entries, existing);
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const t of plan.inserts) {
      await txn.runAsync(
        `INSERT INTO transactions (id, type, description, amount, category_id, account_id, date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        t.id, t.type, t.description, t.amount, t.categoryId, accountId, t.date, now, now,
      );
    }
    for (const t of plan.transfers) {
      await txn.runAsync(
        `UPDATE transactions SET type = 'TRANSFER', account_id = ?, destination_account_id = ?, category_id = NULL, updated_at = ? WHERE id = ?`,
        t.from, t.to, now, t.id,
      );
    }
  });
  return plan;
}
