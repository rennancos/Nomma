import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/Controls';
import { FormDateField, FormField } from '@/components/Form';
import { Screen } from '@/components/Layout';
import { confirm, useAction, useFinance } from '@/hooks/useFinance';
import { goalSchema } from '@/schemas';
import { formatDateBR } from '@/utils/date';
import { centsToInput } from '@/utils/money';
import { deleteGoal, saveGoal } from './repository';

export default function GoalFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data } = useFinance();
  const { run, busy } = useAction();
  const existing = data.goals.find((g) => g.id === id);

  const { control, handleSubmit } = useForm({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: existing?.name ?? '',
      targetAmount: existing ? centsToInput(existing.targetAmount) : '',
      currentAmount: existing ? centsToInput(existing.currentAmount) : '',
      deadline: existing?.deadline ? formatDateBR(existing.deadline) : '',
    },
  });

  const onSubmit = handleSubmit((v) => run((db) => saveGoal(db, v, existing?.id), () => router.back()));

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? 'Editar meta' : 'Nova meta' }} />
      <FormField control={control} name="name" label="Meta" placeholder="Reserva de emergência" maxLength={60} />
      <FormField control={control} name="targetAmount" label="Valor da meta (R$)" keyboardType="decimal-pad" placeholder="20.000,00" />
      <FormField control={control} name="currentAmount" label="Valor atual (R$)" keyboardType="decimal-pad" placeholder="0,00" />
      <FormDateField control={control} name="deadline" label="Prazo (opcional)" placeholder="Sem prazo" clearable />
      <Button title="Salvar" onPress={onSubmit} loading={busy} />
      {existing && (
        <Button
          title="Excluir meta"
          variant="danger"
          onPress={() => confirm('Excluir meta?', 'Essa ação não pode ser desfeita.', () => run((db) => deleteGoal(db, existing.id), () => router.back()))}
        />
      )}
    </Screen>
  );
}
