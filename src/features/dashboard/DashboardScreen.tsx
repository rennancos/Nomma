import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ProgressBar } from '@/components/Charts';
import { Card, Columns, EmptyState, Line, ListRow, Screen, Section, Stat, StatGrid, styles } from '@/components/Layout';
import { AppText, Money } from '@/components/Text';
import { useFinance } from '@/hooks/useFinance';
import { usePlan } from '@/hooks/usePlan';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { budgetMessage } from '@/services/finance/planning';
import { formatDateBR, formatMonthLabel } from '@/utils/date';
import { formatMoney, formatPercent } from '@/utils/money';
import { TransactionRow } from '../transactions/TransactionRow';

type EntryType = 'INCOME' | 'EXPENSE' | 'INVESTMENT';
const openEntries = (type: EntryType, month: string) => router.push({ pathname: '/entries', params: { type, month } });
const addEntry = (type: EntryType) => router.push({ pathname: '/transaction/new', params: { type } });

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowBetween}>
      <AppText muted>{label}</AppText>
      <AppText weight="600">{value}</AppText>
    </View>
  );
}

export default function DashboardScreen() {
  const { data } = useFinance();
  const plan = usePlan();
  const { colors } = useTheme();
  const { summary, daily } = plan;
  const recent = data.transactions.slice(0, 3);
  const alerts = plan.budgets.filter((b) => b.level !== 'ok');
  const [details, setDetails] = useState(false);

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

      <StatGrid>
        <Stat
          label="Receitas"
          color={colors.income}
          onPress={() => openEntries('INCOME', plan.month)}
          onAdd={() => addEntry('INCOME')}
          addLabel="Adicionar receita"
        >
          <Money value={summary.income} variant="subtitle" color={colors.income} />
        </Stat>
        <Stat
          label="Despesas"
          color={colors.expense}
          onPress={() => openEntries('EXPENSE', plan.month)}
          onAdd={() => addEntry('EXPENSE')}
          addLabel="Adicionar despesa"
        >
          <Money value={summary.expenses} variant="subtitle" color={colors.expense} />
        </Stat>
        {/* Celular: 2 colunas, este estica na linha de baixo. Tablet: os 3 lado a lado. */}
        <Stat
          label="Investimentos"
          color={colors.investment}
          onPress={() => openEntries('INVESTMENT', plan.month)}
          onAdd={() => addEntry('INVESTMENT')}
          addLabel="Adicionar investimento"
        >
          <Money value={summary.investments} variant="subtitle" color={colors.investment} />
        </Stat>
      </StatGrid>

      {/* Tablet (largura expandida): planejamento à esquerda, lançamentos à direita. */}
      <Columns>
        <>
          {/* Um card só para o planejamento; o detalhamento fica recolhido para não poluir o Início. */}
          <Card>
            <AppText variant="subtitle">Este mês</AppText>
            {daily.perDay > 0 ? (
              <View>
                <AppText variant="small" muted>Pode gastar por dia até {formatDateBR(daily.payDate)}</AppText>
                <Money value={daily.perDay} variant="title" color={colors.primary} />
              </View>
            ) : (
              <AppText color={colors.warning}>Contas pendentes já consomem o saldo até o próximo salário.</AppText>
            )}
            <View style={{ gap: spacing.xs }}>
              <ProgressBar
                value={(summary.usedPct ?? 0) / 100}
                color={(summary.usedPct ?? 0) > 90 ? colors.warning : colors.primary}
              />
              <AppText variant="small" muted>
                {summary.usedPct === null
                  ? 'Registre a receita do mês para acompanhar o uso da renda.'
                  : `${formatPercent(Math.round(summary.usedPct))} da renda usada`}
              </AppText>
            </View>
            <Line label="Previsão para o fim do mês" value={plan.projection} color={plan.projection < 0 ? colors.danger : undefined} />
            {details && (
              <>
                <Line label="Contas pendentes" value={daily.pending} />
                <Line label="Saldo livre" value={daily.free} />
                <Line label="Despesas previstas" value={plan.expectedExpenses} color={colors.expense} />
                <Line label="Comprometido no mês" value={plan.committed} />
                <Line label="Gastos fixos pendentes" value={plan.fixed.pending} />
                <Line label="Saldo restante do mês" value={summary.remaining} />
                <Info label="Dias até o salário" value={String(daily.daysLeft)} />
                <Info label="Investido da renda" value={formatPercent(summary.investedPct)} />
                <Info label="Economizado da renda" value={formatPercent(summary.savedPct)} />
                <AppText variant="caption" muted>A previsão considera que você não fará novos gastos além dos já previstos.</AppText>
              </>
            )}
            <AppText
              variant="small"
              weight="600"
              color={colors.primary}
              onPress={() => setDetails((d) => !d)}
              accessibilityRole="button"
              style={{ paddingVertical: spacing.xs }}
            >
              {details ? 'Ocultar detalhes' : 'Ver detalhes'}
            </AppText>
          </Card>

          {alerts.map((b) => (
            <Card key={b.id} style={{ backgroundColor: colors.warningSoft, borderColor: colors.warningSoft }}>
              <AppText>{budgetMessage(b.name, b.pct)}</AppText>
              <ProgressBar value={b.pct / 100} color={colors.warning} />
            </Card>
          ))}
        </>
        <>
          <Section title="Próximos lançamentos">
            <Card>
              {plan.upcoming.length === 0 ? (
                <EmptyState
                  icon="calendar-outline"
                  title="Nada previsto"
                  message="Gastos fixos, salário e parcelas cadastrados aparecem aqui."
                />
              ) : (
                plan.upcoming.slice(0, 3).map((i) => (
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
        </>
      </Columns>
    </Screen>
  );
}
