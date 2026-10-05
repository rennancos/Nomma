import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { BarChart, HBarList, Legend, TrendChart } from '@/components/Charts';
import { ChipSelect } from '@/components/Controls';
import { Card, EmptyState, Screen, Section, Stat, StatGrid, styles } from '@/components/Layout';
import { AppText, Money } from '@/components/Text';
import { spacing } from '@/constants/theme';
import { useFinance } from '@/hooks/useFinance';
import { useLookups } from '@/hooks/usePlan';
import { useTheme } from '@/hooks/useTheme';
import { detectDeviceLocale, t, type TranslationKey } from '@/i18n';
import {
  categoryBreakdown,
  hasData,
  monthlyStats,
  periodMonths,
  periodSummary,
  PERIODS,
  previousMonths,
  variation,
  type PeriodKey,
  type View as AnalyticsView,
} from '@/services/finance/analytics';
import { formatMonthLabel, formatMonthShort, monthKeyOf, todayISO } from '@/utils/date';
import { formatMoney, formatPercent } from '@/utils/money';

// Análises (docs/ANALYTICS.md): cada gráfico responde uma pergunta. Cálculos em services/finance/analytics.ts;
// aqui só a montagem da tela. Tocar num mês em qualquer gráfico seleciona o mesmo mês em todos.

const LOCALE = detectDeviceLocale();
const PERIOD_LABEL: Record<PeriodKey, TranslationKey> = {
  month: 'analytics.periodMonth',
  '3m': 'analytics.period3m',
  '6m': 'analytics.period6m',
  '12m': 'analytics.period12m',
  year: 'analytics.periodYear',
  '3y': 'analytics.period3y',
  '5y': 'analytics.period5y',
};
const DEFAULT_PERIOD: Record<AnalyticsView, PeriodKey> = { monthly: '6m', yearly: 'year' };
const VIEWS: { value: AnalyticsView; label: TranslationKey }[] = [
  { value: 'monthly', label: 'analytics.viewMonthly' },
  { value: 'yearly', label: 'analytics.viewYearly' },
];
/** Chave 'yyyy' (visão anual) já é o rótulo; 'yyyy-MM' vira "set/26" ou "Setembro de 2026". */
const shortLabel = (key: string) => (key.length === 4 ? key : formatMonthShort(key, LOCALE));
const longLabel = (key: string) => (key.length === 4 ? key : formatMonthLabel(key, LOCALE));
const pct = (v: number | null) => formatPercent(v === null ? null : Math.round(v * 10) / 10);

/** "↓ 8% vs. período anterior" — em tom neutro, sem verde/vermelho. */
function Delta({ current, previous, show }: { current: number; previous: number; show: boolean }) {
  const v = show ? variation(current, previous) : null;
  const text =
    v === null
      ? t('analytics.noComparison')
      : t('analytics.vsPrevious', { arrow: v > 0.05 ? '↑' : v < -0.05 ? '↓' : '→', pct: pct(Math.abs(v)) });
  return <AppText variant="caption" muted>{text}</AppText>;
}

/** Detalhe do item tocado: título e pares rótulo/valor. */
function Detail({ title, rows }: { title: string; rows: [string, string][] }) {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: spacing.md, gap: spacing.xs }}>
      <AppText weight="600">{title}</AppText>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.rowBetween}>
          <AppText variant="small" muted>{label}</AppText>
          <AppText variant="small" weight="600">{value}</AppText>
        </View>
      ))}
    </View>
  );
}

function Question({ text }: { text: string }) {
  return <AppText variant="small" muted>{text}</AppText>;
}

export default function AnalyticsScreen() {
  const { data } = useFinance();
  const { categoryName } = useLookups();
  const { colors } = useTheme();
  const [view, setView] = useState<AnalyticsView>('monthly');
  const [period, setPeriod] = useState<PeriodKey>(DEFAULT_PERIOD.monthly);
  const [picked, setPicked] = useState<number | null>(null); // mês tocado (índice no período)
  const [category, setCategory] = useState<number | null>(null);

  const analysis = useMemo(() => {
    const months = periodMonths(period, monthKeyOf(todayISO()));
    const before = previousMonths(months);
    const stats = monthlyStats(data.transactions, months);
    const previousStats = monthlyStats(data.transactions, before);
    return {
      stats,
      summary: periodSummary(stats),
      previous: periodSummary(previousStats),
      hasPrevious: previousStats.some(hasData),
      categories: categoryBreakdown(data.transactions, months, before),
      labels: months.map(shortLabel),
    };
  }, [data.transactions, period]);

  const { stats, summary, previous, hasPrevious, categories, labels } = analysis;
  const index = picked ?? stats.length - 1;
  const month = stats[index];
  const many = stats.length > 1;
  const title = stats.length === 1 ? longLabel(summary.month) : `${labels[0]} – ${labels[labels.length - 1]}`;
  const selectPeriod = (p: PeriodKey | null) => {
    if (!p) return;
    setPeriod(p);
    setPicked(null);
    setCategory(null);
  };
  const selectView = (v: AnalyticsView | null) => {
    if (!v || v === view) return;
    setView(v);
    selectPeriod(DEFAULT_PERIOD[v]);
  };
  const catLabel = (id: string | null) => (id ? categoryName(id) : t('analytics.uncategorized'));
  const selectedCat = category === null ? undefined : categories[category];

  return (
    <Screen>
      <ChipSelect options={VIEWS.map((v) => ({ value: v.value, label: t(v.label) }))} value={view} onChange={selectView} />
      <ChipSelect options={PERIODS[view].map((p) => ({ value: p, label: t(PERIOD_LABEL[p]) }))} value={period} onChange={selectPeriod} />

      <View style={{ gap: spacing.sm }}>
        <AppText variant="subtitle">{title}</AppText>
        <StatGrid>
          <Stat label={t('analytics.income')} color={colors.income}>
            <Money value={summary.income} variant="subtitle" />
            <Delta current={summary.income} previous={previous.income} show={hasPrevious} />
          </Stat>
          <Stat label={t('analytics.expenses')} color={colors.expense}>
            <Money value={summary.expenses} variant="subtitle" />
            <Delta current={summary.expenses} previous={previous.expenses} show={hasPrevious} />
          </Stat>
          <Stat label={t('analytics.investments')} color={colors.investment}>
            <Money value={summary.investments} variant="subtitle" />
            <Delta current={summary.investments} previous={previous.investments} show={hasPrevious} />
          </Stat>
          <Stat label={t('analytics.savings')} color={colors.primary}>
            <Money value={summary.savings} variant="subtitle" />
            <AppText variant="caption" muted>{t('analytics.ofIncome', { pct: pct(summary.savingsRate) })}</AppText>
            <Delta current={summary.savings} previous={previous.savings} show={hasPrevious} />
          </Stat>
        </StatGrid>
      </View>

      {!hasData(summary) || !month ? (
        <Card>
          <EmptyState icon="analytics" title={t('analytics.noDataTitle')} message={t('analytics.noDataMessage')} />
        </Card>
      ) : (
        <>
          <Section title={t('analytics.incomeVsExpensesTitle')}>
            <Card>
              <Question text={t('analytics.incomeVsExpensesQuestion')} />
              <BarChart
                labels={labels}
                series={[{ label: t('analytics.income'), color: colors.income }, { label: t('analytics.expenses'), color: colors.expense }]}
                values={stats.map((s) => [s.income, s.expenses])}
                selected={many ? index : null}
                onSelect={setPicked}
              />
              <Detail
                title={longLabel(month.month)}
                rows={[
                  [t('analytics.income'), formatMoney(month.income)],
                  [t('analytics.expenses'), formatMoney(month.expenses)],
                  [t('analytics.balance'), formatMoney(month.savings)],
                  [t('analytics.incomeUsed'), pct(month.usedPct)],
                ]}
              />
              {many && <AppText variant="caption" muted>{t(view === 'yearly' ? 'analytics.tapYear' : 'analytics.tapMonth')}</AppText>}
            </Card>
          </Section>

          <Section title={t('analytics.categoriesTitle')}>
            <Card>
              {categories.length === 0 ? (
                <AppText muted>{t('analytics.noExpenses')}</AppText>
              ) : (
                <>
                  <HBarList
                    items={categories.map((c) => ({ label: catLabel(c.categoryId), value: c.total }))}
                    selected={category}
                    onSelect={setCategory}
                    detail={
                      selectedCat && (
                        <Detail
                          title={catLabel(selectedCat.categoryId)}
                          rows={[
                            [formatMoney(selectedCat.total), t('analytics.shareOfExpenses', { pct: pct(selectedCat.share) })],
                            [
                              selectedCat.change === null
                                ? t('analytics.noPreviousSpending')
                                : t('analytics.changeVsPrevious', {
                                    change: `${selectedCat.change > 0 ? '+' : ''}${pct(selectedCat.change)}`,
                                  }),
                              '',
                            ],
                          ]}
                        />
                      )
                    }
                  />
                  <AppText variant="caption" muted>{t('analytics.tapCategory')}</AppText>
                </>
              )}
            </Card>
          </Section>

          <Section title={t('analytics.investmentsTitle')}>
            <Card>
              <Question text={t('analytics.investmentsQuestion')} />
              {summary.investedTotal === 0 ? (
                <AppText muted>{t('analytics.noInvestments')}</AppText>
              ) : (
                <>
                  <TrendChart
                    labels={labels}
                    bars={stats.map((s) => s.investments)}
                    barColor={colors.investment}
                    line={stats.map((s) => s.investedTotal)}
                    lineColor={colors.primary}
                    selected={many ? index : null}
                    onSelect={setPicked}
                  />
                  <Legend series={[{ label: t('analytics.contribution'), color: colors.investment }, { label: t('analytics.investedTotal'), color: colors.primary }]} />
                  <Detail
                    title={longLabel(month.month)}
                    rows={[
                      [t('analytics.contribution'), formatMoney(month.investments)],
                      [t('analytics.investedTotal'), formatMoney(month.investedTotal)],
                      [t('analytics.incomeInvested'), pct(month.investedPct)],
                    ]}
                  />
                  <AppText variant="caption" muted>{t('analytics.contributionsNote')}</AppText>
                </>
              )}
            </Card>
          </Section>

          <Section title={t('analytics.savingsTitle')}>
            <Card>
              <Question text={t('analytics.savingsQuestion')} />
              {summary.income === 0 ? (
                <AppText muted>{t('analytics.noIncome')}</AppText>
              ) : (
                <>
                  <TrendChart
                    labels={labels}
                    line={stats.map((s) => s.savingsRate)}
                    lineColor={colors.primary}
                    selected={many ? index : null}
                    onSelect={setPicked}
                  />
                  <Detail
                    title={longLabel(month.month)}
                    rows={[
                      [t('analytics.saved'), formatMoney(month.savings)],
                      [t('analytics.savingsRate'), pct(month.savingsRate)],
                      [t('analytics.invested'), formatMoney(month.investments)],
                      [t('analytics.freeBalance'), formatMoney(month.free)],
                    ]}
                  />
                </>
              )}
            </Card>
          </Section>
        </>
      )}
    </Screen>
  );
}
