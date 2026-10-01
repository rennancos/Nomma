import type { SQLiteDatabase } from 'expo-sqlite';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { SCHEMA_VERSION } from '@/database/migrations';
import type { Account, Category, Transaction } from '@/types';
import { formatDateBR, todayISO } from '@/utils/date';
import { centsToInput } from '@/utils/money';

const TABLES = [
  'accounts', 'categories', 'transactions', 'recurring_transactions', 'credit_cards',
  'installment_purchases', 'installments', 'financial_goals', 'budgets', 'settings',
] as const;

/**
 * Backup completo, restaurável por restoreJsonBackup:
 * { app, schemaVersion, exportedAt, tables: { <tabela>: linhas cruas do SQLite } }.
 * Valores monetários permanecem em centavos.
 */
export async function buildJsonBackup(db: SQLiteDatabase): Promise<string> {
  const tables: Record<string, unknown[]> = {};
  for (const t of TABLES) tables[t] = await db.getAllAsync(`SELECT * FROM ${t}`);
  return JSON.stringify({ app: 'financas', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), tables }, null, 2);
}

// "financas" é o identificador interno do formato (nome antigo do app); mantido para aceitar backups já exportados.
// Ordem de inserção respeitando as chaves estrangeiras (recorrências antes das transações que as citam,
// transações antes das parcelas pagas). A exclusão usa a ordem inversa.
const RESTORE_ORDER = [
  'accounts', 'categories', 'recurring_transactions', 'credit_cards', 'installment_purchases',
  'transactions', 'installments', 'financial_goals', 'budgets', 'settings',
] as const;

/** Erro de arquivo inválido, com mensagem pronta para o usuário. */
export class BackupError extends Error {}

/**
 * Restaura um backup JSON, substituindo todos os dados atuais.
 * O arquivo vem de fora do app: tabelas e colunas são conferidas contra o banco e só entram textos,
 * números e nulos; os CHECK/FOREIGN KEY do esquema validam o resto. Qualquer falha desfaz tudo.
 */
export async function restoreJsonBackup(db: SQLiteDatabase, content: string): Promise<void> {
  let backup: { app?: unknown; schemaVersion?: unknown; tables?: Record<string, unknown> };
  try {
    backup = JSON.parse(content);
  } catch {
    throw new BackupError('O arquivo não é um backup JSON válido.');
  }
  if (backup?.app !== 'financas' || typeof backup.tables !== 'object' || backup.tables === null) {
    throw new BackupError('Este arquivo não é um backup do Nomma.');
  }
  // ponytail: só existe a versão 1 do banco; backups antigos precisarão de conversão quando surgir a v2.
  if (backup.schemaVersion !== SCHEMA_VERSION) {
    throw new BackupError('Este backup é de outra versão do app e não pode ser importado.');
  }
  const tables = backup.tables;
  for (const t of RESTORE_ORDER) {
    if (!Array.isArray(tables[t])) throw new BackupError('Backup incompleto ou corrompido.');
  }

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const t of [...RESTORE_ORDER].reverse()) await txn.runAsync(`DELETE FROM ${t}`);
    for (const t of RESTORE_ORDER) {
      const columns = new Set((await txn.getAllAsync<{ name: string }>(`PRAGMA table_info(${t})`)).map((c) => c.name));
      for (const row of tables[t] as unknown[]) {
        if (typeof row !== 'object' || row === null || Array.isArray(row)) throw new BackupError('Backup corrompido.');
        const entries = Object.entries(row);
        if (entries.some(([k, v]) => !columns.has(k) || (v !== null && typeof v !== 'string' && typeof v !== 'number'))) {
          throw new BackupError('Backup corrompido.');
        }
        await txn.runAsync(
          `INSERT INTO ${t} (${entries.map(([k]) => k).join(', ')}) VALUES (${entries.map(() => '?').join(', ')})`,
          ...entries.map(([, v]) => v as string | number | null),
        );
      }
    }
  });
}

/** Abre o seletor de arquivos do sistema; null se o usuário cancelar. */
export async function pickBackupFile(): Promise<string | null> {
  const picked = await File.pickFileAsync();
  return picked.canceled ? null : picked.result.text();
}

const csvCell =(value: string, text: boolean) => {
  // Aspas CSV não impedem execução de fórmulas por planilhas.
  const v = text && /^[\s]*[=+\-@\t\r\n]/.test(value) ? `'${value}` : value;
  return /[";\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};

/** CSV de movimentações para planilhas (separador ";" e vírgula decimal, padrão Excel pt-BR). */
export function buildTransactionsCsv(txs: Transaction[], categories: Category[], accounts: Account[]): string {
  const cat = new Map(categories.map((c) => [c.id, c.name]));
  const acc = new Map(accounts.map((a) => [a.id, a.name]));
  const header = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Conta', 'Conta destino', 'Valor', 'Observação'];
  const rows = txs.map((t) => [
    formatDateBR(t.date),
    t.type,
    t.description,
    cat.get(t.categoryId ?? '') ?? '',
    acc.get(t.accountId) ?? '',
    acc.get(t.destinationAccountId ?? '') ?? '',
    centsToInput(t.type === 'INCOME' ? t.amount : -t.amount),
    t.notes ?? '',
  ]);
  return [header, ...rows].map((r) => r.map((v, index) => csvCell(v, index !== 6)).join(';')).join('\n');
}

/** Grava o conteúdo no cache do app e abre o menu de compartilhamento do Android. */
export async function shareFile(content: string, ext: 'json' | 'csv'): Promise<void> {
  const file = new File(Paths.cache, `nomma-${todayISO()}.${ext}`);
  if (file.exists) file.delete();
  file.create();
  file.write(ext === 'csv' ? `﻿${content}` : content); // BOM para acentos no Excel
  await Sharing.shareAsync(file.uri, {
    mimeType: ext === 'json' ? 'application/json' : 'text/csv',
    dialogTitle: 'Exportar dados',
  });
}
