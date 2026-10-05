import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { ProgressBar } from '@/components/Charts';
import { Button } from '@/components/Controls';
import { Card, EmptyState, Screen, styles } from '@/components/Layout';
import { AppText, Money } from '@/components/Text';
import { useFinance } from '@/hooks/useFinance';
import { useTheme } from '@/hooks/useTheme';
import { cardStatus } from '@/services/finance/schedule';
import { formatDateBR, todayISO } from '@/utils/date';

export default function CardsScreen() {
  const { data } = useFinance();
  const { colors } = useTheme();
  const today = todayISO();

  return (
    <Screen size="list">
      {data.cards.length === 0 && (
        <Card>
          <EmptyState icon="cards" title="Nenhum cartão" message="Cadastre seu cartão para acompanhar limite e faturas." />
        </Card>
      )}
      {data.cards.map((card) => {
        const s = cardStatus(card, data.installments.filter((i) => i.creditCardId === card.id), today);
        return (
          <Pressable key={card.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/cards/[id]', params: { id: card.id } })}>
          <Card>
            <View style={styles.rowBetween}>
              <AppText variant="subtitle">{card.name}</AppText>
              <AppText variant="small" muted>{card.bank ?? ''}</AppText>
            </View>
            <ProgressBar value={s.limit > 0 ? s.used / s.limit : 0} color={colors.expense} />
            <View style={styles.rowBetween}>
              <AppText variant="small" muted>Disponível <Money value={s.available} variant="small" weight="600" /></AppText>
              <AppText variant="small" muted>Limite <Money value={s.limit} variant="small" /></AppText>
            </View>
            <AppText variant="small">
              Fatura atual <Money value={s.currentInvoice} variant="small" weight="700" /> · vence {formatDateBR(s.currentDue)}
            </AppText>
          </Card>
          </Pressable>
        );
      })}
      <Button title="Novo cartão" icon="add" onPress={() => router.push('/cards/form')} />
    </Screen>
  );
}
