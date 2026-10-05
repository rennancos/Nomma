import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button, MonthSwitcher } from '@/components/Controls';
import { Card, EmptyState, Screen, styles } from '@/components/Layout';
import { AppText, Money } from '@/components/Text';
import { typeColor } from '@/constants/theme';
import { useFinance } from '@/hooks/useFinance';
import { useTheme } from '@/hooks/useTheme';
import { entriesOfMonth } from '@/services/finance/filters';
import type { TransactionType } from '@/types';
import { monthKeyOf, todayISO } from '@/utils/date';
import { TransactionRow } from './TransactionRow';

type EntryType = Exclude<TransactionType, 'TRANSFER'>;

// Investimentos: o total é o que foi aportado no mês, não o patrimônio acumulado (esse fica em "Em investimentos").
const COPY: Record<EntryType, { title: string; total: string; add: string; empty: string }> = {
  INCOME: { title: 'Receitas do mês', total: 'Total de receitas', add: 'Adicionar receita', empty: 'Nenhuma receita neste mês' },
  EXPENSE: { title: 'Despesas do mês', total: 'Total de despesas', add: 'Adicionar despesa', empty: 'Nenhuma despesa neste mês' },
  INVESTMENT: {
    title: 'Investimentos do mês',
    total: 'Total aportado no mês',
    add: 'Adicionar investimento',
    empty: 'Nenhum aporte neste mês',
  },
};

const isMonthKey = (s: string | undefined): s is string => !!s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

/** Lançamentos de um tipo no mês (aberto pelos cartões do Início), com atalho para adicionar outro. */
export default function MonthEntriesScreen() {
  const params = useLocalSearchParams<{ type?: string; month?: string }>();
  const type: EntryType = params.type === 'INCOME' || params.type === 'INVESTMENT' ? params.type : 'EXPENSE';
  const { data } = useFinance();
  const { colors } = useTheme();
  // Mês vindo do Início; sem ele (ou inválido), o mês atual.
  const [month, setMonth] = useState(isMonthKey(params.month) ? params.month : monthKeyOf(todayISO()));
  const copy = COPY[type];
  const color = typeColor(colors, type);

  // Lê da fotografia do banco: depois de salvar, o store recarrega e a lista e o total se atualizam sozinhos.
  const entries = useMemo(() => entriesOfMonth(data.transactions, type, month), [data.transactions, type, month]);
  const total = entries.reduce((s, t) => s + t.amount, 0);
  const add = () => router.push({ pathname: '/transaction/new', params: { type } });

  return (
    <Screen size="list">
      <Stack.Screen options={{ title: copy.title }} />
      <MonthSwitcher month={month} onChange={setMonth} />
      <Card>
        <View style={styles.rowBetween}>
          <AppText muted>{copy.total}</AppText>
          <AppText variant="small" muted>
            {entries.length} {entries.length === 1 ? 'lançamento' : 'lançamentos'}
          </AppText>
        </View>
        <Money value={total} variant="title" color={color} />
      </Card>
      {entries.length > 0 && <Button title={copy.add} icon="add" onPress={add} />}
      <Card>
        {entries.length === 0 ? (
          <EmptyState icon="calendar-outline" title={copy.empty} message="Registre o primeiro lançamento deste tipo.">
            <Button title={copy.add} icon="add" onPress={add} />
          </EmptyState>
        ) : (
          entries.map((t) => <TransactionRow key={t.id} tx={t} showDate />)
        )}
      </Card>
    </Screen>
  );
}
