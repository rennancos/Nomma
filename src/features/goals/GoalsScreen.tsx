import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { ProgressBar } from '@/components/Charts';
import { Button } from '@/components/Controls';
import { Card, EmptyState, Screen, styles } from '@/components/Layout';
import { AppText } from '@/components/Text';
import { useFinance } from '@/hooks/useFinance';
import { useTheme } from '@/hooks/useTheme';
import { formatDateBR } from '@/utils/date';
import { formatMoney, formatPercent, percent } from '@/utils/money';

export default function GoalsScreen() {
  const { data } = useFinance();
  const { colors } = useTheme();
  return (
    <Screen>
      {data.goals.length === 0 && (
        <Card><EmptyState icon="flag-outline" title="Nenhuma meta" message="Ex.: Reserva de emergência de R$ 20.000." /></Card>
      )}
      {data.goals.map((g) => {
        const pct = percent(g.currentAmount, g.targetAmount) ?? 0;
        return (
          <Pressable key={g.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/goals/form', params: { id: g.id } })}>
            <Card>
              <View style={styles.rowBetween}>
                <AppText variant="subtitle">{g.name}</AppText>
                <AppText weight="700" color={colors.primary}>{formatPercent(Math.round(pct * 10) / 10)}</AppText>
              </View>
              <ProgressBar value={pct / 100} height={10} />
              <AppText muted>
                {formatMoney(g.currentAmount)} / {formatMoney(g.targetAmount)}
                {g.deadline ? ` · prazo ${formatDateBR(g.deadline)}` : ''}
              </AppText>
              {g.currentAmount < g.targetAmount && (
                <AppText variant="small" muted>Faltam {formatMoney(g.targetAmount - g.currentAmount)}</AppText>
              )}
            </Card>
          </Pressable>
        );
      })}
      <Button title="Nova meta" icon="add" onPress={() => router.push('/goals/form')} />
    </Screen>
  );
}
