import { router } from 'expo-router';
import { View } from 'react-native';
import { ProgressBar } from '@/components/Charts';
import { Card, EmptyState, ListRow, Screen, Section, Stat, styles } from '@/components/Layout';
import { AppText, Money } from '@/components/Text';
import { useFinance } from '@/hooks/useFinance';
import { usePlan } from '@/hooks/usePlan';
import { useTheme } from '@/hooks/useTheme';
import { budgetMessage } from '@/services/finance/planning';
import { formatDateBR, formatMonthLabel } from '@/utils/date';
import { formatMoney, formatPercent } from '@/utils/money';
import { TransactionRow } from '../transactions/TransactionRow';

function Line({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View style={styles.rowBetween}>
      <AppText muted>{label}</AppText>
      <Money value={value} weight="600" color={color} />
    </View>
  );
}

export default function DashboardScreen() {
  const { data } = useFinance();
  const plan = usePlan();
  const { colors } = useTheme();
  const { summary, daily } = plan;
  const recent = data.transactions.slice(0, 5);
  const alerts = plan.budgets.filter((b) => b.level !== 'ok');

  return (
    <Screen>
      <View>
        <AppText variant="title">{data.settings.userName ? `Olá, ${data.settings.userName}` : 'Olá!'}</AppText>
        <AppText muted>{formatMonthLabel(plan.month)}</AppText>
      </View>

      <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
        <AppText color={colors.onPrimary}>Saldo disponível</AppText>
        <Money value={plan.available} variant="hero" color={colors.onPrimary} />
        <AppText variant="small" color={colors.onPrimary}>
          Em investimentos: {formatMoney(plan.invested)}
        </AppText>
      </Card>

      <View style={styles.grid}>
        <Stat label="Receitas do mês" color={colors.income}>
          <Money value={summary.income} variant="subtitle" color={colors.income} />
        </Stat>
        <Stat label="Despesas" color={colors.expense}>
          <Money value={summary.expenses} variant="subtitle" color={colors.expense} />
        </Stat>
        <Stat label="Investimentos" color={colors.investment}>
          <Money value={summary.investments} variant="subtitle" color={colors.investment} />
        </Stat>
        <Stat label="Saldo restante" color={colors.primary}>
          <Money value={summary.remaining} variant="subtitle" />
        </Stat>
      </View>

      <Card>
        <AppText>
          {summary.usedPct === null
            ? 'Registre sua receita do mês para acompanhar o uso da renda.'
            : `Você já utilizou ${formatPercent(Math.round(summary.usedPct))} da sua renda neste mês.`}
        </AppText>
        <ProgressBar
          value={(summary.usedPct ?? 0) / 100}
          color={(summary.usedPct ?? 0) > 90 ? colors.warning : colors.primary}
        />
        <View style={styles.rowBetween}>
          <AppText variant="small" muted>Investido: {formatPercent(summary.investedPct)}</AppText>
          <AppText variant="small" muted>Economizado: {formatPercent(summary.savedPct)}</AppText>
        </View>
      </Card>

      <Card>
        <AppText variant="small" muted>Disponível por dia até {formatDateBR(daily.payDate)}</AppText>
        <Money value={daily.perDay} variant="title" color={colors.primary} />
        <AppText variant="small">
          {daily.perDay > 0
            ? `Você pode gastar aproximadamente ${formatMoney(daily.perDay)} por dia e ainda manter seu planejamento atual.`
            : 'Suas contas pendentes já consomem o saldo disponível até o próximo salário.'}
        </AppText>
        <Line label="Contas pendentes" value={daily.pending} />
        <Line label="Saldo livre" value={daily.free} />
        <View style={styles.rowBetween}>
          <AppText muted>Dias restantes</AppText>
          <AppText weight="600">{daily.daysLeft}</AppText>
        </View>
      </Card>

      <Card>
        <AppText variant="subtitle">Projeção do mês</AppText>
        <AppText>
          Se você não realizar novos gastos, deverá terminar o mês com aproximadamente{' '}
          <AppText weight="700" color={plan.projection < 0 ? colors.danger : colors.text}>
            {formatMoney(plan.projection)}
          </AppText>
          .
        </AppText>
        <Line label="Despesas previstas" value={plan.expectedExpenses} color={colors.expense} />
        <Line label="Comprometido no mês" value={plan.committed} />
        <Line label="Gastos fixos pendentes" value={plan.fixed.pending} />
      </Card>

      {alerts.map((b) => (
        <Card key={b.id} style={{ backgroundColor: colors.warningSoft, borderColor: colors.warningSoft }}>
          <AppText>{budgetMessage(b.name, b.pct)}</AppText>
          <ProgressBar value={b.pct / 100} color={colors.warning} />
        </Card>
      ))}

      <Section title="Próximos lançamentos">
        <Card>
          {plan.upcoming.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="Nada previsto"
              message="Gastos fixos, salário e parcelas cadastrados aparecem aqui."
            />
          ) : (
            plan.upcoming.map((i) => (
              <ListRow
                key={i.key}
                icon={i.type === 'INCOME' ? 'arrow-down-circle-outline' : i.source === 'INSTALLMENT' ? 'card-outline' : 'repeat-outline'}
                iconColor={i.type === 'INCOME' ? colors.income : colors.expense}
                title={i.description}
                subtitle={`${formatDateBR(i.date)}${i.date < plan.today ? ' · atrasado' : ''}`}
                right={<Money value={i.amount} color={i.type === 'INCOME' ? colors.income : colors.expense} />}
                onPress={() => router.push(i.source === 'RECURRING' ? '/recurring' : '/purchases')}
              />
            ))
          )}
        </Card>
      </Section>

      <Section title="Últimas movimentações" action="Ver todas" onAction={() => router.navigate('/transactions')}>
        <Card>
          {recent.length === 0 ? (
            <EmptyState icon="add-circle-outline" title="Nada por aqui ainda" message="Toque em + para registrar seu primeiro gasto ou receita." />
          ) : (
            recent.map((t) => <TransactionRow key={t.id} tx={t} />)
          )}
        </Card>
      </Section>
    </Screen>
  );
}
