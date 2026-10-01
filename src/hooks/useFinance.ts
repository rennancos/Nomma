import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
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

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : '';
  if (msg.includes('FOREIGN KEY')) return 'Este item está em uso por outros registros.';
  if (msg.includes('UNIQUE')) return 'Já existe um item com esse nome.';
  return 'Tente novamente. Se persistir, reinicie o aplicativo.';
}

/** Executa uma escrita no banco, recarrega os dados e trata erros sem logar conteúdo financeiro. */
export function useAction() {
  const { db, refresh } = useFinance();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (fn: (db: SQLiteDatabase) => Promise<unknown>, onDone?: () => void) => {
      setBusy(true);
      try {
        await fn(db);
        if (!(await refresh())) throw new Error('reload');
        onDone?.();
      } catch (e) {
        Alert.alert('Não foi possível concluir', friendlyError(e));
      } finally {
        setBusy(false);
      }
    },
    [db, refresh],
  );
  return useMemo(() => ({ run, busy }), [run, busy]);
}

/** Pede confirmação antes de uma ação destrutiva. */
export function confirm(title: string, message: string, onConfirm: () => void, label = 'Excluir') {
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: label, style: 'destructive', onPress: onConfirm },
  ]);
}
