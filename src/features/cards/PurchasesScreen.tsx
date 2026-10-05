import { router } from 'expo-router';
import { Button } from '@/components/Controls';
import { Card, EmptyState, ListRow, Screen } from '@/components/Layout';
import { AppText } from '@/components/Text';
import { useFinance } from '@/hooks/useFinance';
import { useLookups } from '@/hooks/usePlan';
import { formatMoney } from '@/utils/money';

/** Lista de compras parceladas (cartão, carnê, empréstimo). */
export default function PurchasesScreen() {
  const { data } = useFinance();
  const { cardName } = useLookups();
  const paidCount = (purchaseId: string) =>
    data.installments.filter((i) => i.purchaseId === purchaseId && i.transactionId !== null).length;

  return (
    <Screen size="list">
      <Card>
        {data.purchases.length === 0 ? (
          <EmptyState icon="layers-outline" title="Nenhum parcelamento" message="Ex.: Notebook, R$ 4.000 em 10x." />
        ) : (
          data.purchases.map((p) => (
            <ListRow
              key={p.id}
              icon="layers-outline"
              title={p.description}
              subtitle={`${cardName(p.creditCardId)} · ${p.installmentCount}x de ${formatMoney(Math.floor(p.totalAmount / p.installmentCount))}`}
              right={<AppText weight="600">{paidCount(p.id)}/{p.installmentCount}</AppText>}
              onPress={() => router.push({ pathname: '/purchases/[id]', params: { id: p.id } })}
            />
          ))
        )}
      </Card>
      <Button title="Novo parcelamento" icon="add" onPress={() => router.push('/purchases/form')} />
    </Screen>
  );
}
