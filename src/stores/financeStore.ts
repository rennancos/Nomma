import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';
import { listAccounts } from '@/features/accounts/repository';
import { listBudgets } from '@/features/budgets/repository';
import { listCards, listInstallments, listPurchases } from '@/features/cards/repository';
import { listCategories } from '@/features/categories/repository';
import { listGoals } from '@/features/goals/repository';
import { listPostedKeys, listRecurrings, postDueRecurrences } from '@/features/recurring/repository';
import { loadSettings } from '@/features/settings/repository';
import { listTransactions } from '@/features/transactions/repository';

/**
 * Fotografia de todos os dados do app, recarregada após cada escrita.
 * ponytail: carrega tudo em memória; para um usuário pessoal (milhares de registros) é instantâneo.
 * Se passar de ~50 mil transações, trocar por consultas paginadas por mês.
 */
async function loadAll(db: SQLiteDatabase) {
  await postDueRecurrences(db);
  const [accounts, categories, transactions, recurrings, postedKeys, cards, purchases, installments, goals, budgets, settings] =
    await Promise.all([
      listAccounts(db),
      listCategories(db),
      listTransactions(db),
      listRecurrings(db),
      listPostedKeys(db),
      listCards(db),
      listPurchases(db),
      listInstallments(db),
      listGoals(db),
      listBudgets(db),
      loadSettings(db),
    ]);
  return { accounts, categories, transactions, recurrings, postedKeys, cards, purchases, installments, goals, budgets, settings };
}

export type FinanceData = Awaited<ReturnType<typeof loadAll>>;

interface FinanceState {
  data: FinanceData | null;
  status: 'loading' | 'ready' | 'error';
  /** Recarrega tudo. Retorna false em caso de erro (os dados anteriores continuam na tela). */
  load: (db: SQLiteDatabase) => Promise<boolean>;
}

// Só o carregamento mais recente pode publicar dados, evitando que um reload lento sobrescreva um mais novo.
let latestLoad = 0;

export const useFinanceStore = create<FinanceState>((set, get) => ({
  data: null,
  status: 'loading',
  load: async (db) => {
    const id = ++latestLoad;
    try {
      const data = await loadAll(db);
      if (id === latestLoad) set({ data, status: 'ready' });
      return true;
    } catch {
      // Sem log do erro: pode conter valores financeiros.
      if (id === latestLoad && !get().data) set({ status: 'error' });
      return false;
    }
  },
}));
