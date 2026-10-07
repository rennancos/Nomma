import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/Controls';
import { FormChips, FormDateField, FormField, FormToggle } from '@/components/Form';
import { Screen } from '@/components/Layout';
import { confirm, useAction, useFinance, useLastFound } from '@/hooks/useFinance';
import { recurringSchema } from '@/schemas';
import { formatDateBR, todayISO } from '@/utils/date';
import { centsToInput } from '@/utils/money';
import { deleteRecurring, saveRecurring } from './repository';

export default function RecurringFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data } = useFinance();
  const { run, busy } = useAction();
  const existing = useLastFound(data.recurrings.find((r) => r.id === id));
  const accounts = data.accounts.filter((a) => !a.archived || a.id === existing?.accountId);

  const { control, handleSubmit } = useForm({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      type: existing?.type ?? 'EXPENSE',
      description: existing?.description ?? '',
      amount: existing ? centsToInput(existing.amount) : '',
      categoryId: existing?.categoryId ?? null,
      accountId: existing?.accountId ?? accounts.find((a) => a.type !== 'INVESTMENT')?.id ?? '',
      dayOfMonth: String(existing?.dayOfMonth ?? data.settings.payday),
      startDate: formatDateBR(existing?.startDate ?? todayISO()),
      autoPost: Boolean(existing?.autoPost ?? false),
      active: Boolean(existing?.active ?? true),
    },
  });
  const type = useWatch({ control, name: 'type' });

  const onSubmit = handleSubmit((v) =>
    run(
      (db) => saveRecurring(db, { ...v, autoPost: v.autoPost ? 1 : 0, active: v.active ? 1 : 0 }, existing?.id),
      () => router.back(),
    ),
  );

  return (
    <Screen size="form">
      <Stack.Screen options={{ title: existing ? 'Editar lançamento fixo' : 'Novo lançamento fixo' }} />
      <FormChips
        control={control}
        name="type"
        options={[{ value: 'EXPENSE', label: 'Gasto fixo' }, { value: 'INCOME', label: 'Receita (ex.: salário)' }]}
      />
      <FormField control={control} name="description" label="Descrição" placeholder={type === 'INCOME' ? 'Salário' : 'Internet'} maxLength={80} />
      <FormField control={control} name="amount" label="Valor (R$)" keyboardType="decimal-pad" placeholder="0,00" />
      <FormField control={control} name="dayOfMonth" label="Todo dia" keyboardType="number-pad" maxLength={2} />
      <FormChips
        control={control}
        name="categoryId"
        label="Categoria"
        allowNone
        options={data.categories.filter((c) => c.kind === type && !c.archived).map((c) => ({ value: c.id, label: c.name }))}
      />
      <FormChips control={control} name="accountId" label="Conta" options={accounts.map((a) => ({ value: a.id, label: a.name }))} />
      <FormDateField control={control} name="startDate" label="A partir de" />
      <FormToggle
        control={control}
        name="autoPost"
        label="Lançar automaticamente"
        hint="No dia do mês, o valor entra no histórico sem precisar confirmar."
      />
      <FormToggle control={control} name="active" label="Ativa" />
      <Button title="Salvar" onPress={onSubmit} loading={busy} />
      {existing && (
        <Button
          title="Excluir"
          variant="danger"
          onPress={() =>
            confirm('Excluir lançamento fixo?', 'Os lançamentos já feitos continuam no histórico.', () =>
              run((db) => deleteRecurring(db, existing.id), () => router.back()),
            )
          }
        />
      )}
    </Screen>
  );
}
