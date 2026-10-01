import { useMemo, useState } from 'react';
import { SectionList, View } from 'react-native';
import { ChipSelect, MonthSwitcher, TextField } from '@/components/Controls';
import { EmptyState, styles } from '@/components/Layout';
import { AppText, Money } from '@/components/Text';
import { TYPE_LABELS } from '@/constants/defaults';
import { spacing } from '@/constants/theme';
import { useFinance } from '@/hooks/useFinance';
import { useLookups } from '@/hooks/usePlan';
import { useTheme } from '@/hooks/useTheme';
import { emptyFilter, filterTransactions, type TransactionFilter } from '@/services/finance/filters';
import type { Transaction, TransactionType } from '@/types';
import { monthKeyOf, relativeDayLabel, todayISO } from '@/utils/date';
import { parseMoney } from '@/utils/money';
import { TransactionRow } from './TransactionRow';

const TYPE_OPTIONS = (Object.keys(TYPE_LABELS) as TransactionType[]).map((value) => ({ value, label: TYPE_LABELS[value] }));

export default function HistoryScreen() {
  const { data } = useFinance();
  const { categoryName } = useLookups();
  const { colors } = useTheme();
  const today = todayISO();
  const [month, setMonth] = useState(monthKeyOf(today));
  const [filter, setFilter] = useState<TransactionFilter>(emptyFilter);
  const [showMore, setShowMore] = useState(false);
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const set = (patch: Partial<TransactionFilter>) => setFilter((f) => ({ ...f, ...patch }));

  const filtered = useMemo(() => {
    const inMonth = data.transactions.filter((t) => monthKeyOf(t.date) === month);
    return filterTransactions(inMonth, { ...filter, minAmount: parseMoney(min), maxAmount: parseMoney(max) }, categoryName);
  }, [data.transactions, month, filter, min, max, categoryName]);

  const sections = useMemo(() => {
    const byDay = new Map<string, Transaction[]>();
    for (const t of filtered) byDay.set(t.date, [...(byDay.get(t.date) ?? []), t]);
    return [...byDay].map(([date, items]) => ({ title: relativeDayLabel(date, today), data: items }));
  }, [filtered, today]);

  const totalIn = filtered.reduce((s, t) => (t.type === 'INCOME' ? s + t.amount : s), 0);
  const totalOut = filtered.reduce((s, t) => (t.type === 'EXPENSE' || t.type === 'INVESTMENT' ? s + t.amount : s), 0);

  const header = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
      <MonthSwitcher month={month} onChange={setMonth} />
      <TextField placeholder="Pesquisar" value={filter.search} onChangeText={(search) => set({ search })} />
      <ChipSelect options={TYPE_OPTIONS} value={filter.type} onChange={(type) => set({ type })} allowNone />
      <AppText variant="small" weight="600" color={colors.primary} onPress={() => setShowMore((v) => !v)}>
        {showMore ? 'Menos filtros' : 'Mais filtros'}
      </AppText>
      {showMore && (
        <>
          <ChipSelect
            label="Conta"
            options={data.accounts.map((a) => ({ value: a.id, label: a.name }))}
            value={filter.accountId}
            onChange={(accountId) => set({ accountId })}
            allowNone
          />
          <ChipSelect
            label="Categoria"
            options={data.categories.filter((c) => !c.archived).map((c) => ({ value: c.id, label: c.name }))}
            value={filter.categoryId}
            onChange={(categoryId) => set({ categoryId })}
            allowNone
          />
          <View style={[styles.rowBetween, { alignItems: 'flex-start' }]}>
            <View style={styles.fill}>
              <TextField label="Valor mínimo" keyboardType="decimal-pad" value={min} onChangeText={setMin} />
            </View>
            <View style={styles.fill}>
              <TextField label="Valor máximo" keyboardType="decimal-pad" value={max} onChangeText={setMax} />
            </View>
          </View>
        </>
      )}
      <View style={styles.rowBetween}>
        <AppText variant="small" muted>Entradas <Money value={totalIn} variant="small" color={colors.income} /></AppText>
        <AppText variant="small" muted>Saídas <Money value={totalOut} variant="small" color={colors.expense} /></AppText>
      </View>
    </View>
  );

  return (
    <SectionList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl * 2 }}
      keyboardShouldPersistTaps="handled"
      sections={sections}
      keyExtractor={(t) => t.id}
      ListHeaderComponent={header}
      renderSectionHeader={({ section }) => (
        <AppText variant="small" weight="600" muted style={{ paddingTop: spacing.md, backgroundColor: colors.background }}>
          {section.title}
        </AppText>
      )}
      renderItem={({ item }) => <TransactionRow tx={item} />}
      ListEmptyComponent={<EmptyState icon="search" title="Nenhuma movimentação" message="Ajuste os filtros ou troque o mês." />}
    />
  );
}
