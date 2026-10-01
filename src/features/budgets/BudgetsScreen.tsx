import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { ProgressBar } from '@/components/Charts';
import { Button } from '@/components/Controls';
import { Card, EmptyState, Screen, styles } from '@/components/Layout';
import { AppText } from '@/components/Text';
import { usePlan } from '@/hooks/usePlan';
import { useTheme } from '@/hooks/useTheme';
import { budgetMessage } from '@/services/finance/planning';
import { formatMoney } from '@/utils/money';

export default function BudgetsScreen() {
  const { budgets } = usePlan();
  const { colors } = useTheme();
  const levelColor = { ok: colors.primary, warning: colors.warning, over: colors.danger };

  return (
    <Screen>
      {budgets.length === 0 && (
        <Card><EmptyState icon="pie-chart-outline" title="Nenhum orçamento" message="Defina um limite mensal por categoria. Ex.: Delivery R$ 300." /></Card>
      )}
      {budgets.map((b) => (
        <Pressable key={b.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/budgets/form', params: { id: b.id } })}>
          <Card>
            <View style={styles.rowBetween}>
              <AppText variant="subtitle">{b.name}</AppText>
              <AppText weight="700" color={levelColor[b.level]}>{b.pct}%</AppText>
            </View>
            <ProgressBar value={b.pct / 100} color={levelColor[b.level]} />
            <AppText muted>{formatMoney(b.used)} / {formatMoney(b.limit)}</AppText>
            {b.level !== 'ok' && <AppText variant="small">{budgetMessage(b.name, b.pct)}</AppText>}
          </Card>
        </Pressable>
      ))}
      <Button title="Novo orçamento" icon="add" onPress={() => router.push('/budgets/form')} />
    </Screen>
  );
}
