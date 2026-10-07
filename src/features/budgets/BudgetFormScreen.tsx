import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/Controls';
import { FormChips, FormField } from '@/components/Form';
import { Screen } from '@/components/Layout';
import { confirm, useAction, useFinance, useLastFound } from '@/hooks/useFinance';
import { budgetSchema } from '@/schemas';
import { centsToInput } from '@/utils/money';
import { deleteBudget, saveBudget } from './repository';

export default function BudgetFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data } = useFinance();
  const { run, busy } = useAction();
  const existing = useLastFound(data.budgets.find((b) => b.id === id));
  const used = new Set(data.budgets.map((b) => b.categoryId));
  const options = data.categories
    .filter((c) => c.kind === 'EXPENSE' && !c.archived && (!used.has(c.id) || c.id === existing?.categoryId))
    .map((c) => ({ value: c.id, label: c.name }));

  const { control, handleSubmit } = useForm({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      categoryId: existing?.categoryId ?? '',
      limitAmount: existing ? centsToInput(existing.limitAmount) : '',
    },
  });

  const onSubmit = handleSubmit((v) => run((db) => saveBudget(db, v.categoryId, v.limitAmount), () => router.back()));

  return (
    <Screen size="form">
      <Stack.Screen options={{ title: existing ? 'Editar orçamento' : 'Novo orçamento' }} />
      <FormField control={control} name="limitAmount" label="Limite mensal (R$)" keyboardType="decimal-pad" placeholder="300,00" />
      {!existing && <FormChips control={control} name="categoryId" label="Categoria" options={options} />}
      <Button title="Salvar" onPress={onSubmit} loading={busy} />
      {existing && (
        <Button
          title="Excluir orçamento"
          variant="danger"
          onPress={() => confirm('Excluir orçamento?', '', () => run((db) => deleteBudget(db, existing.id), () => router.back()))}
        />
      )}
    </Screen>
  );
}
