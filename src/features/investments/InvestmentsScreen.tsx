import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { BarChart, HBarList } from '@/components/Charts';
import { Button, TextField } from '@/components/Controls';
import { Card, EmptyState, Screen, Section, Stat, StatGrid, styles } from '@/components/Layout';
import { AppText, Money } from '@/components/Text';
import { useFinance } from '@/hooks/useFinance';
import { notify, useAction } from '@/hooks/useFinanceActions';
import { useLookups, usePlan } from '@/hooks/usePlan';
import { useTheme } from '@/hooks/useTheme';
import { monthSummary } from '@/services/finance/balance';
import { formatMonthShort, lastMonths } from '@/utils/date';
import { centsToInput, formatMoney, formatPercent, parseMoney, percent } from '@/utils/money';
import { setAccountYield } from '../accounts/repository';
import { TransactionRow } from '../transactions/TransactionRow';

export default function InvestmentsScreen() {
  const { data } = useFinance();
  const plan = usePlan();
  const { categoryName } = useLookups();
  const { colors } = useTheme();
  const { run, busy } = useAction();
  // Conta cujo valor atual está sendo informado.
  const [editing, setEditing] = useState<{ id: string; text: string; error?: string } | null>(null);

  const view = useMemo(() => {
    const aportes = data.transactions.filter((t) => t.type === 'INVESTMENT');
    const byType = new Map<string, number>();
    for (const t of aportes) byType.set(categoryName(t.categoryId), (byType.get(categoryName(t.categoryId)) ?? 0) + t.amount);
    const months = lastMonths(plan.month, 6);
    const accounts = data.accounts.filter((a) => a.type === 'INVESTMENT' && !a.archived);
    const investIds = new Set(data.accounts.filter((a) => a.type === 'INVESTMENT').map((a) => a.id));
    const yieldTotal = data.accounts.reduce((s, a) => (a.type === 'INVESTMENT' ? s + a.yieldAmount : s), 0);
    return {
      aportes,
      accounts,
      yieldTotal,
      total: aportes.reduce((s, t) => s + t.amount, 0),
      // Resgate = transferência de uma conta de investimento para uma conta comum.
      withdrawn: data.transactions.reduce(
        (s, t) => (t.type === 'TRANSFER' && investIds.has(t.accountId) && !investIds.has(t.destinationAccountId ?? '') ? s + t.amount : s),
        0,
      ),
      byType: [...byType].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
      months,
      series: months.map((m) => [monthSummary(data.transactions, m).investments]),
    };
  }, [data, plan.month, categoryName]);

  const yieldColor = (v: number) => (v < 0 ? colors.danger : colors.investment);
  /** "+ R$ 120,00 (2,4%)": rendimento e percentual sobre o valor aplicado (saldo sem o rendimento). */
  const yieldLabel = (value: number, applied: number) => {
    const pct = percent(Math.abs(value), applied);
    return `${formatMoney(value, { sign: true })}${pct === null ? '' : ` (${value < 0 ? '-' : ''}${formatPercent(Math.round(pct * 100) / 100)})`}`;
  };

  const saveValue = (accountId: string, applied: number) => {
    const value = parseMoney(editing?.text ?? '');
    if (value === null) return setEditing((e) => e && { ...e, error: 'Informe um valor válido.' });
    run((db) => setAccountYield(db, accountId, value - applied), () => {
      setEditing(null);
      notify('Valor atualizado');
    });
  };

  return (
    <Screen size="list">
      <StatGrid>
        <Stat label="Valor atual" color={colors.investment}><Money value={plan.invested} variant="subtitle" color={colors.investment} /></Stat>
        <Stat label="Rendimento">
          <AppText variant="subtitle" color={yieldColor(view.yieldTotal)}>{yieldLabel(view.yieldTotal, plan.invested - view.yieldTotal)}</AppText>
        </Stat>
        <Stat label="Total aportado"><Money value={view.total} variant="subtitle" /></Stat>
        <Stat label="Resgatado"><Money value={view.withdrawn} variant="subtitle" /></Stat>
        <Stat label="Investido no mês"><Money value={plan.summary.investments} variant="subtitle" /></Stat>
        <Stat label="% da renda no mês"><AppText variant="subtitle">{formatPercent(plan.summary.investedPct)}</AppText></Stat>
      </StatGrid>
      <Button title="Novo aporte" icon="add" onPress={() => router.push({ pathname: '/transaction/new', params: { type: 'INVESTMENT' } })} />

      {view.accounts.length > 0 && (
        <Section title="Contas de investimento">
          {view.accounts.map((a) => {
            const value = plan.balances.get(a.id) ?? 0;
            const applied = value - a.yieldAmount;
            const open = editing?.id === a.id;
            return (
              <Card key={a.id}>
                <View style={styles.rowBetween}>
                  <AppText weight="600">{a.name}</AppText>
                  <Money value={value} />
                </View>
                <AppText variant="small" color={yieldColor(a.yieldAmount)}>Rendimento: {yieldLabel(a.yieldAmount, applied)}</AppText>
                {open ? (
                  <>
                    <TextField
                      label="Quanto esta conta vale hoje (R$)"
                      value={editing.text}
                      onChangeText={(text) => setEditing({ id: a.id, text })}
                      error={editing.error}
                      keyboardType="decimal-pad"
                      autoFocus
                    />
                    <Button title="Salvar valor atual" onPress={() => saveValue(a.id, applied)} loading={busy} />
                    <Button title="Cancelar" variant="secondary" onPress={() => setEditing(null)} />
                  </>
                ) : (
                  <View style={styles.rowBetween}>
                    <AppText variant="small" weight="600" color={colors.primary} onPress={() => setEditing({ id: a.id, text: centsToInput(Math.max(0, value)) })}>
                      Atualizar valor atual
                    </AppText>
                    <AppText
                      variant="small"
                      weight="600"
                      color={colors.primary}
                      onPress={() => router.push({ pathname: '/transaction/new', params: { type: 'TRANSFER', accountId: a.id } })}
                    >
                      Resgatar
                    </AppText>
                  </View>
                )}
              </Card>
            );
          })}
        </Section>
      )}

      {view.aportes.length === 0 ? (
        <Card><EmptyState icon="investments" title="Nenhum aporte ainda" message="Registre aportes em CDB, Tesouro, ações e outros." /></Card>
      ) : (
        <>
          <Section title="Evolução dos aportes">
            <Card>
              <BarChart labels={view.months.map((m) => formatMonthShort(m))} series={[{ label: 'Aportes', color: colors.investment }]} values={view.series} />
            </Card>
          </Section>
          <Section title="Por tipo">
            <Card><HBarList items={view.byType} color={colors.investment} /></Card>
          </Section>
          <Section title="Últimos aportes">
            <Card>{view.aportes.slice(0, 10).map((t) => <TransactionRow key={t.id} tx={t} />)}</Card>
          </Section>
        </>
      )}
    </Screen>
  );
}
