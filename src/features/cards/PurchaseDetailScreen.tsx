import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, ChipSelect } from '@/components/Controls';
import { Card, EmptyState, ListRow, Screen } from '@/components/Layout';
import { AppText, Money } from '@/components/Text';
import { confirm, useAction, useFinance, useLastFound } from '@/hooks/useFinance';
import { useLookups } from '@/hooks/usePlan';
import { useTheme } from '@/hooks/useTheme';
import { formatDateBR, todayISO } from '@/utils/date';
import { deletePurchase, payInstallments } from './repository';

export default function PurchaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useFinance();
  const { run, busy } = useAction();
  const { colors } = useTheme();
  const { cardName } = useLookups();
  const liquid = data.accounts.filter((a) => !a.archived && a.type !== 'INVESTMENT');
  const [accountId, setAccountId] = useState<string | null>(liquid[0]?.id ?? null);
  const purchase = useLastFound(data.purchases.find((p) => p.id === id));
  if (!purchase) return <EmptyState title="Parcelamento não encontrado" />;
  const installments = data.installments.filter((i) => i.purchaseId === purchase.id);

  return (
    <Screen size="list">
      <Stack.Screen options={{ title: purchase.description }} />
      <Card>
        <Money value={purchase.totalAmount} variant="title" />
        <AppText muted>
          {purchase.installmentCount}x · {cardName(purchase.creditCardId)} · compra em {formatDateBR(purchase.purchaseDate)}
        </AppText>
      </Card>
      <ChipSelect label="Pagar com" options={liquid.map((a) => ({ value: a.id, label: a.name }))} value={accountId} onChange={setAccountId} />
      <Card>
        {installments.map((i) => (
          <ListRow
            key={i.id}
            title={`${i.number}/${i.installmentCount} · ${formatDateBR(i.dueDate)}`}
            subtitle={i.transactionId ? 'Paga' : 'Pendente'}
            right={
              i.transactionId ? (
                <Ionicons name="checkmark-circle" size={24} color={colors.income} accessibilityLabel="Paga" />
              ) : (
                <AppText
                  weight="600"
                  color={colors.primary}
                  onPress={() => accountId && !busy && run((db) => payInstallments(db, [i], accountId, todayISO()))}
                >
                  Pagar <Money value={i.amount} weight="600" color={colors.primary} />
                </AppText>
              )
            }
          />
        ))}
      </Card>
      <Button
        title="Excluir parcelamento"
        variant="danger"
        onPress={() =>
          confirm('Excluir parcelamento?', 'Parcelas pendentes serão removidas. As já pagas continuam no histórico.', () =>
            run((db) => deletePurchase(db, purchase.id), () => router.back()),
          )
        }
      />
    </Screen>
  );
}
