import Storage from 'expo-sqlite/kv-store';
import { defaultDatabaseDirectory, deleteDatabaseAsync, openDatabaseAsync } from 'expo-sqlite';

/**
 * Um banco SQLite por perfil. Sem login: o perfil local do aparelho (o banco de sempre).
 * Com login: um banco por usuário do Firebase. Trocar de conta troca de arquivo; nada é compartilhado.
 */
export const LOCAL_DB = 'financas.db';

/** Nome do arquivo do usuário. uid comum do Firebase é alfanumérico; outros viram hex (sem colisão: prefixos distintos). */
export function userDbName(uid: string): string {
  if (/^[A-Za-z0-9]{1,128}$/.test(uid)) return `nomma-u-${uid}.db`;
  return `nomma-h-${[...uid].map((c) => c.codePointAt(0)!.toString(16)).join('-')}.db`;
}

// Marca que o perfil do usuário já foi decidido neste aparelho (usar dados locais ou começar vazio).
const decidedKey = (uid: string) => `profile-decided:${userDbName(uid)}`;

async function localHasData(): Promise<boolean> {
  const db = await openDatabaseAsync(LOCAL_DB);
  try {
    return Boolean((await db.getFirstAsync<{ n: number }>('SELECT EXISTS(SELECT 1 FROM transactions) AS n'))?.n);
  } catch {
    return false; // banco novo, sem tabelas
  } finally {
    await db.closeAsync();
  }
}

/** Banco a abrir para este login, ou `ask` quando o usuário precisa decidir o destino dos dados locais. */
export async function resolveProfile(uid: string | null): Promise<{ name: string } | { ask: true }> {
  if (!uid) return { name: LOCAL_DB };
  if (await Storage.getItem(decidedKey(uid))) return { name: userDbName(uid) };
  if (await localHasData()) return { ask: true };
  await Storage.setItem(decidedKey(uid), 'empty');
  return { name: userDbName(uid) };
}

/**
 * Escolha explícita no primeiro login: `move` leva os dados do perfil local para a conta
 * (cópia consistente com VACUUM INTO e só então apaga o local); `empty` começa a conta vazia e mantém o local.
 * Chamar só com o banco local fechado (SQLiteProvider desmontado).
 */
export async function decideProfile(uid: string, choice: 'move' | 'empty'): Promise<string> {
  const name = userDbName(uid);
  if (choice === 'move') {
    const dir = String(defaultDatabaseDirectory).replace(/^file:\/\//, '');
    const local = await openDatabaseAsync(LOCAL_DB);
    try {
      // Falha se o destino já existir: nunca sobrescreve dados de uma conta.
      await local.execAsync(`VACUUM INTO '${dir}/${name}'`);
    } finally {
      await local.closeAsync();
    }
    // ponytail: se apagar falhar, os dados ficam nos dois perfis (duplicados, não perdidos).
    await deleteDatabaseAsync(LOCAL_DB).catch(() => undefined);
  }
  await Storage.setItem(decidedKey(uid), choice);
  return name;
}
