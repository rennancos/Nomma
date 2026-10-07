import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/Controls';
import { FormField } from '@/components/Form';
import { Screen } from '@/components/Layout';
import { AppText } from '@/components/Text';
import { confirm, useAction, useFinance, useLastFound } from '@/hooks/useFinance';
import { cardSchema } from '@/schemas';
import { centsToInput } from '@/utils/money';
import { deleteCard, saveCard } from './repository';

export default function CardFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data } = useFinance();
  const { run, busy } = useAction();
  const existing = useLastFound(data.cards.find((c) => c.id === id));

  const { control, handleSubmit } = useForm({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      name: existing?.name ?? '',
      bank: existing?.bank ?? '',
      limitAmount: existing ? centsToInput(existing.limitAmount) : '',
      closingDay: existing ? String(existing.closingDay) : '',
      dueDay: existing ? String(existing.dueDay) : '',
    },
  });

  const onSubmit = handleSubmit((v) => run((db) => saveCard(db, v, existing?.id), () => router.back()));

  return (
    <Screen size="form">
      <Stack.Screen options={{ title: existing ? 'Editar cartão' : 'Novo cartão' }} />
      <FormField control={control} name="name" label="Nome do cartão" placeholder="Nubank" maxLength={40} />
      <FormField control={control} name="bank" label="Banco" placeholder="Opcional" maxLength={40} />
      <FormField control={control} name="limitAmount" label="Limite (R$)" keyboardType="decimal-pad" placeholder="5.000,00" />
      <FormField control={control} name="closingDay" label="Dia de fechamento" keyboardType="number-pad" maxLength={2} />
      <FormField control={control} name="dueDay" label="Dia de vencimento" keyboardType="number-pad" maxLength={2} />
      <AppText variant="small" muted>
        Compras feitas a partir do dia de fechamento entram na fatura seguinte.
      </AppText>
      <Button title="Salvar" onPress={onSubmit} loading={busy} />
      {existing && (
        <Button
          title="Excluir cartão"
          variant="danger"
          onPress={() =>
            confirm('Excluir cartão?', 'As compras e parcelas pendentes do cartão serão removidas. Pagamentos já feitos continuam no histórico.', () =>
              run((db) => deleteCard(db, existing.id), () => router.dismissTo('/cards')),
            )
          }
        />
      )}
    </Screen>
  );
}
