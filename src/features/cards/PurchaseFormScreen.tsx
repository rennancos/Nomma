import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/Controls';
import { FormChips, FormDateField, FormField } from '@/components/Form';
import { Card, Screen } from '@/components/Layout';
import { AppText } from '@/components/Text';
import { useAction, useFinance } from '@/hooks/useFinance';
import { purchaseSchema } from '@/schemas';
import { buildInstallments } from '@/services/finance/schedule';
import { formatDateBR, parseDateBR, todayISO } from '@/utils/date';
import { formatMoney, parseMoney } from '@/utils/money';
import { createPurchase } from './repository';

export default function PurchaseFormScreen() {
  const { cardId } = useLocalSearchParams<{ cardId?: string }>();
  const { data } = useFinance();
  const { run, busy } = useAction();
  const cards = data.cards.filter((c) => !c.archived);

  const { control, handleSubmit } = useForm({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      description: '',
      totalAmount: '',
      installmentCount: '10',
      categoryId: null,
      creditCardId: cardId ?? null,
      purchaseDate: formatDateBR(todayISO()),
    },
  });
  const [total, count, creditCardId, date] = useWatch({
    control,
    name: ['totalAmount', 'installmentCount', 'creditCardId', 'purchaseDate'],
  });
  const card = cards.find((c) => c.id === creditCardId) ?? null;

  // Prévia ao vivo: "10x de R$ 400,00 · 1ª parcela em 02/10/2026".
  const cents = parseMoney(total);
  const n = Number(count);
  const iso = parseDateBR(date);
  const preview = cents && iso && Number.isInteger(n) && n >= 1 && n <= 120 ? buildInstallments(cents, n, iso, card) : null;

  const onSubmit = handleSubmit((v) => run((db) => createPurchase(db, v, card), () => router.back()));

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Novo parcelamento' }} />
      <FormField control={control} name="description" label="Compra" placeholder="Notebook" maxLength={80} />
      <FormField control={control} name="totalAmount" label="Valor total (R$)" keyboardType="decimal-pad" placeholder="0,00" />
      <FormField control={control} name="installmentCount" label="Parcelas" keyboardType="number-pad" maxLength={3} />
      <FormChips
        control={control}
        name="creditCardId"
        label="Cartão"
        allowNone
        options={cards.map((c) => ({ value: c.id, label: c.name }))}
      />
      <FormDateField control={control} name="purchaseDate" label={card ? 'Data da compra' : 'Data da 1ª parcela'} />
      <FormChips
        control={control}
        name="categoryId"
        label="Categoria"
        allowNone
        options={data.categories.filter((c) => c.kind === 'EXPENSE' && !c.archived).map((c) => ({ value: c.id, label: c.name }))}
      />
      {preview && preview[0] && (
        <Card>
          <AppText weight="600">
            {n}x de {formatMoney(preview[0].amount)}
          </AppText>
          <AppText muted>
            1ª parcela em {formatDateBR(preview[0].dueDate)} · última em {formatDateBR(preview[preview.length - 1]?.dueDate ?? preview[0].dueDate)}
          </AppText>
        </Card>
      )}
      <Button title="Salvar" onPress={onSubmit} loading={busy} />
    </Screen>
  );
}
