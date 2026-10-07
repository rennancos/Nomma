import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';
import { Button, ChipSelect } from '@/components/Controls';
import { FormChips, FormDateField, FormField } from '@/components/Form';
import { Screen, styles } from '@/components/Layout';
import { AppText } from '@/components/Text';
import { PAYMENT_LABELS, TYPE_LABELS } from '@/constants/defaults';
import { spacing } from '@/constants/theme';
import { confirm, notify, useAction, useFinance, useLastFound } from '@/hooks/useFinance';
import { useTheme } from '@/hooks/useTheme';
import { transactionSchema } from '@/schemas';
import type { PaymentMethod, TransactionType } from '@/types';
import { formatDateBR, toISODate, todayISO } from '@/utils/date';
import { centsToInput } from '@/utils/money';
import { createPurchase } from '../cards/repository';
import { deleteTransaction, insertTransaction, updateTransaction } from './repository';

const TYPES = Object.keys(TYPE_LABELS) as TransactionType[];
const PAYMENTS: PaymentMethod[] = ['PIX', 'DEBIT', 'CREDIT', 'CASH', 'BOLETO', 'OTHER'];
const SAVED: Record<TransactionType, string> = {
  EXPENSE: 'Gasto registrado',
  INCOME: 'Receita registrada',
  INVESTMENT: 'Investimento registrado',
  TRANSFER: 'Transferência registrada',
};
const TITLES: Record<TransactionType, string> = {
  EXPENSE: 'Novo gasto',
  INCOME: 'Nova receita',
  INVESTMENT: 'Novo investimento',
  TRANSFER: 'Transferência',
};

export default function TransactionFormScreen() {
  const params = useLocalSearchParams<{ id?: string; type?: string }>();
  const { data } = useFinance();
  const { run, busy } = useAction();
  const { colors } = useTheme();
  const existing = useLastFound(params.id ? data.transactions.find((t) => t.id === params.id) : undefined);
  const initialType: TransactionType =
    existing?.type ?? (TYPES.includes(params.type as TransactionType) ? (params.type as TransactionType) : 'EXPENSE');

  const activeAccounts = data.accounts.filter((a) => !a.archived || a.id === existing?.accountId);
  const liquid = activeAccounts.filter((a) => a.type !== 'INVESTMENT');
  const investAccount = activeAccounts.find((a) => a.type === 'INVESTMENT');
  const [showNotes, setShowNotes] = useState(Boolean(existing?.notes));

  const { control, handleSubmit, setValue } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: initialType,
      amount: existing ? centsToInput(existing.amount) : '',
      description: existing?.description ?? '',
      categoryId: existing?.categoryId ?? null,
      accountId: existing?.accountId ?? liquid[0]?.id ?? activeAccounts[0]?.id ?? '',
      destinationAccountId:
        existing?.destinationAccountId ?? (initialType === 'INVESTMENT' ? (investAccount?.id ?? null) : null),
      date: formatDateBR(existing?.date ?? todayISO()),
      paymentMethod: existing?.paymentMethod ?? null,
      cardId: data.cards[0]?.id ?? null,
      installments: '1',
      institution: existing?.institution ?? '',
      notes: existing?.notes ?? '',
    },
  });
  const [type, paymentMethod, accountId] = useWatch({ control, name: ['type', 'paymentMethod', 'accountId'] });
  const isCardPurchase = !existing && type === 'EXPENSE' && paymentMethod === 'CREDIT';

  const categoryOptions = data.categories
    .filter((c) => c.kind === type && (!c.archived || c.id === existing?.categoryId))
    .map((c) => ({ value: c.id, label: c.name }));
  const accountOptions = activeAccounts.map((a) => ({ value: a.id, label: a.name }));

  const onSubmit = handleSubmit((v) => {
    const categoryName = data.categories.find((c) => c.id === v.categoryId)?.name;
    const description = v.description ?? categoryName ?? TYPE_LABELS[v.type];
    const categoryId = v.type === 'TRANSFER' ? null : v.categoryId;
    run(async (db) => {
      if (isCardPurchase && v.cardId) {
        const card = data.cards.find((c) => c.id === v.cardId) ?? null;
        await createPurchase(db, {
          creditCardId: v.cardId,
          description,
          categoryId,
          totalAmount: v.amount,
          installmentCount: v.installments,
          purchaseDate: v.date,
        }, card);
        return;
      }
      const input = {
        type: v.type,
        description,
        amount: v.amount,
        categoryId,
        accountId: v.accountId,
        destinationAccountId: v.type === 'TRANSFER' || v.type === 'INVESTMENT' ? v.destinationAccountId : null,
        date: v.date,
        notes: v.notes,
        paymentMethod: v.type === 'EXPENSE' ? v.paymentMethod : null,
        institution: v.type !== 'TRANSFER' ? v.institution : null,
        recurringId: existing?.recurringId ?? null,
      };
      if (existing) await updateTransaction(db, existing.id, input);
      else await insertTransaction(db, input);
    }, () => {
      router.back();
      notify(existing ? 'Alterações salvas' : isCardPurchase ? 'Compra no cartão registrada' : SAVED[v.type]);
    });
  });

  const onDelete = () =>
    existing &&
    confirm(
      'Excluir movimentação?',
      // Recorrência automática relança o mês ausente na próxima carga (postDueRecurrences).
      data.recurrings.find((r) => r.id === existing.recurringId)?.autoPost
        ? 'Este lançamento é de uma recorrência automática e será lançado de novo. Para parar, edite ou exclua a recorrência em Mais → Gastos fixos e salário.'
        : 'Essa ação não pode ser desfeita.',
      () => run((db) => deleteTransaction(db, existing.id), () => router.back()),
    );

  return (
    <Screen size="form">
      <Stack.Screen options={{ title: existing ? 'Editar movimentação' : TITLES[type] }} />
      <ChipSelect
        options={TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
        value={type}
        onChange={(t) => {
          if (!t) return;
          setValue('type', t);
          setValue('categoryId', null);
          setValue('destinationAccountId', t === 'INVESTMENT' ? (investAccount?.id ?? null) : null);
        }}
      />
      <FormField control={control} name="amount" label="Valor (R$)" placeholder="0,00" keyboardType="decimal-pad" large autoFocus={!existing} />
      {type !== 'TRANSFER' && (
        <FormChips control={control} name="categoryId" label={type === 'INVESTMENT' ? 'Tipo' : 'Categoria'} options={categoryOptions} allowNone />
      )}
      <FormField control={control} name="description" label="Descrição" placeholder="Opcional" maxLength={80} />

      {type === 'EXPENSE' && (
        <FormChips
          control={control}
          name="paymentMethod"
          label="Forma de pagamento"
          options={PAYMENTS.filter((p) => p !== 'CREDIT' || !existing).map((p) => ({ value: p, label: PAYMENT_LABELS[p] }))}
          allowNone
        />
      )}

      {isCardPurchase ? (
        data.cards.length === 0 ? (
          <AppText color={colors.warning}>Cadastre um cartão em Mais → Cartões de crédito.</AppText>
        ) : (
          <>
            <FormChips control={control} name="cardId" label="Cartão" options={data.cards.map((c) => ({ value: c.id, label: c.name }))} />
            <FormField control={control} name="installments" label="Parcelas" keyboardType="number-pad" maxLength={3} />
          </>
        )
      ) : (
        <FormChips control={control} name="accountId" label={type === 'TRANSFER' ? 'De' : 'Conta'} options={accountOptions} />
      )}

      {(type === 'TRANSFER' || type === 'INVESTMENT') && (
        <FormChips
          control={control}
          name="destinationAccountId"
          label={type === 'TRANSFER' ? 'Para' : 'Conta de investimento (opcional)'}
          options={accountOptions.filter((a) => a.value !== accountId)}
          allowNone={type === 'INVESTMENT'}
        />
      )}
      {type !== 'TRANSFER' && !isCardPurchase && (
        <FormField control={control} name="institution" label="Banco / instituição (opcional)" placeholder="Ex.: Nubank, XP" maxLength={60} />
      )}

      <View style={{ gap: spacing.sm }}>
        <FormDateField control={control} name="date" label={isCardPurchase ? 'Data da compra' : 'Data'} />
        <View style={styles.rowBetween}>
          <AppText variant="small" weight="600" color={colors.primary} onPress={() => setValue('date', formatDateBR(todayISO()))}>Hoje</AppText>
          <AppText
            variant="small"
            weight="600"
            color={colors.primary}
            onPress={() => setValue('date', formatDateBR(toISODate(new Date(Date.now() - 86_400_000))))}
          >
            Ontem
          </AppText>
          <AppText variant="small" weight="600" color={colors.primary} onPress={() => setShowNotes((s) => !s)}>
            {showNotes ? 'Ocultar observação' : 'Adicionar observação'}
          </AppText>
        </View>
      </View>
      {showNotes && <FormField control={control} name="notes" label="Observação" multiline maxLength={300} />}

      <Button title="Salvar" onPress={onSubmit} loading={busy} />
      {existing && <Button title="Excluir" variant="danger" onPress={onDelete} />}
    </Screen>
  );
}
