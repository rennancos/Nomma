import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useFinanceStore } from '@/stores/financeStore';

/** Dados carregados + banco. Só é usado abaixo do AppShell, que garante os dados carregados. */
export function useFinance() {
  const db = useSQLiteContext();
  const data = useFinanceStore((s) => s.data);
  const load = useFinanceStore((s) => s.load);
  const refresh = useCallback(() => load(db), [db, load]);
  if (!data) throw new Error('Dados ainda não carregados');
  return { db, data, refresh };
}

/**
 * Mantém o último registro encontrado. Ao excluir, o store recarrega antes de a tela sair da pilha;
 * se ela re-renderizasse sem o registro, o título do header mudaria numa tela já removida e o
 * react-native-screens derruba o app ("ScreenStackFragment added into a non-stack container").
 */
export function useLastFound<T>(value: T | undefined): T | undefined {
  const [last, setLast] = useState(value);
  if (value !== undefined && value !== last) setLast(value);
  return value ?? last;
}
