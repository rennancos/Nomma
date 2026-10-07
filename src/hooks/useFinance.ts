import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Platform, ToastAndroid } from 'react-native';
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
  // `busy` só desabilita o botão no próximo render; a ref barra já o segundo toque (sem gravação duplicada).
  const running = useRef(false);
  const run = useCallback(
    async (fn: (db: SQLiteDatabase) => Promise<unknown>, onDone?: () => void) => {
      if (running.current) return;
      running.current = true;
      setBusy(true);
      try {
        await fn(db);
        if (!(await refresh())) throw new Error('reload');
        onDone?.();
      } catch (e) {
        Alert.alert('Não foi possível concluir', friendlyError(e));
      } finally {
        running.current = false;
        setBusy(false);
      }
    },
    [db, refresh],
  );
  return useMemo(() => ({ run, busy }), [run, busy]);
}

/** Confirmação curta de que algo foi salvo: toast no Android, alerta no iOS (que não tem toast nativo). */
export function notify(message: string) {
  if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
  else Alert.alert(message);
}

/** Pede confirmação antes de uma ação destrutiva. */
export function confirm(title: string, message: string, onConfirm: () => void, label = 'Excluir') {
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: label, style: 'destructive', onPress: onConfirm },
  ]);
}
