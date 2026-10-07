import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, ChipSelect } from '@/components/Controls';
import { Card, EmptyState, ListRow, Screen, Section, Stat, StatGrid } from '@/components/Layout';
import { AppText, Money } from '@/components/Text';
import { useAction, useFinance, useLastFound } from '@/hooks/useFinance';
import { useTheme } from '@/hooks/useTheme';
import { cardStatus, groupInvoices } from '@/services/finance/schedule';
import { formatDateBR, todayISO } from '@/utils/date';
import { formatMoney } from '@/utils/money';
import { payInstallments } from './repository';

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useFinance();
  const { run, busy } = useAction();
  const { colors } = useTheme();
  const liquid = data.accounts.filter((a) => !a.archived && a.type !== 'INVESTMENT');
  const [accountId, setAccountId] = useState<string | null>(liquid[0]?.id ?? null);
  const card = useLastFound(data.cards.find((c) => c.id === id));
  if (!card) return <EmptyState title="Cartão não encontrado" />;

  const today = todayISO();
  const installments = data.installments.filter((i) => i.creditCardId === card.id);
  const s = cardStatus(card, installments, today);
  const openInvoices = groupInvoices(installments).filter((inv) => inv.pending > 0);
  const purchases = data.purchases.filter((p) => p.creditCardId === card.id);

  const payInvoice = (dueDate: string) =>
    accountId &&
    run((db) => payInstallments(db, installments.filter((i) => i.dueDate === dueDate), accountId, today));

  return (
    <Screen size="list">
      <Stack.Screen
        options={{
          title: card.name,
          headerRight: () => (
            <AppText color={colors.primary} weight="600" onPress={() => router.push({ pathname: '/cards/form', params: { id: card.id } })}>
              Editar
            </AppText>
          ),
        }}
      />
      <StatGrid>
        <Stat label="Limite total"><Money value={s.limit} variant="subtitle" /></Stat>
        <Stat label="Utilizado" color={colors.expense}><Money value={s.used} variant="subtitle" color={colors.expense} /></Stat>
        <Stat label="Disponível" color={colors.income}><Money value={s.available} variant="subtitle" color={colors.income} /></Stat>
        <Stat label={`Fatura atual · ${formatDateBR(s.currentDue)}`}><Money value={s.currentInvoice} variant="subtitle" /></Stat>
        <Stat label={`Próxima fatura · ${formatDateBR(s.nextDue)}`}><Money value={s.nextInvoice} variant="subtitle" /></Stat>
      </StatGrid>

      <Section title="Faturas em aberto">
        <ChipSelect label="Pagar com" options={liquid.map((a) => ({ value: a.id, label: a.name }))} value={accountId} onChange={setAccountId} />
        <Card>
          {openInvoices.length === 0 ? (
            <EmptyState icon="checkmark-done-outline" title="Nenhuma fatura em aberto" />
          ) : (
            openInvoices.map((inv) => (
              <ListRow
                key={inv.dueDate}
                title={`Vence ${formatDateBR(inv.dueDate)}`}
                subtitle={`Em aberto ${formatMoney(inv.pending)}`}
                right={
                  <AppText weight="600" color={colors.primary} onPress={() => !busy && payInvoice(inv.dueDate)}>
                    Pagar fatura
                  </AppText>
                }
              />
            ))
          )}
        </Card>
      </Section>

      <Section title="Compras">
        <Card>
          {purchases.length === 0 ? (
            <EmptyState icon="bag-outline" title="Nenhuma compra neste cartão" />
          ) : (
            purchases.map((p) => (
              <ListRow
                key={p.id}
                title={p.description}
                subtitle={`${p.installmentCount}x · ${formatDateBR(p.purchaseDate)}`}
                right={<Money value={p.totalAmount} />}
                onPress={() => router.push({ pathname: '/purchases/[id]', params: { id: p.id } })}
              />
            ))
          )}
        </Card>
      </Section>
      <Button title="Nova compra no cartão" icon="add" onPress={() => router.push({ pathname: '/purchases/form', params: { cardId: card.id } })} />
    </Screen>
  );
}
