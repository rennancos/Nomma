import { router } from 'expo-router';
import { useMemo } from 'react';
import { BarChart, HBarList } from '@/components/Charts';
import { Button } from '@/components/Controls';
import { Card, EmptyState, Screen, Section, Stat, StatGrid } from '@/components/Layout';
import { AppText, Money } from '@/components/Text';
import { useFinance } from '@/hooks/useFinance';
import { useLookups, usePlan } from '@/hooks/usePlan';
import { useTheme } from '@/hooks/useTheme';
import { monthSummary } from '@/services/finance/balance';
import { formatMonthShort, lastMonths } from '@/utils/date';
import { formatPercent } from '@/utils/money';
import { TransactionRow } from '../transactions/TransactionRow';

export default function InvestmentsScreen() {
  const { data } = useFinance();
  const plan = usePlan();
  const { categoryName } = useLookups();
  const { colors } = useTheme();

  const view = useMemo(() => {
    const aportes = data.transactions.filter((t) => t.type === 'INVESTMENT');
    const byType = new Map<string, number>();
    for (const t of aportes) byType.set(categoryName(t.categoryId), (byType.get(categoryName(t.categoryId)) ?? 0) + t.amount);
    const months = lastMonths(plan.month, 6);
    return {
      aportes,
      total: aportes.reduce((s, t) => s + t.amount, 0),
      byType: [...byType].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
      months,
      series: months.map((m) => [monthSummary(data.transactions, m).investments]),
    };
  }, [data, plan.month, categoryName]);

  return (
    <Screen size="list">
      <StatGrid>
        <Stat label="Total aportado" color={colors.investment}><Money value={view.total} variant="subtitle" color={colors.investment} /></Stat>
        <Stat label="Investido no mês"><Money value={plan.summary.investments} variant="subtitle" /></Stat>
        <Stat label="% da renda no mês"><AppText variant="subtitle">{formatPercent(plan.summary.investedPct)}</AppText></Stat>
        <Stat label="Saldo em contas de investimento"><Money value={plan.invested} variant="subtitle" /></Stat>
      </StatGrid>
      <Button title="Novo aporte" icon="add" onPress={() => router.push({ pathname: '/transaction/new', params: { type: 'INVESTMENT' } })} />

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
