import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/Controls';
import { FormChips, FormField } from '@/components/Form';
import { Screen } from '@/components/Layout';
import { AppText } from '@/components/Text';
import { ACCOUNT_TYPE_LABELS } from '@/constants/defaults';
import { useAction, useFinance, useLastFound } from '@/hooks/useFinance';
import { accountSchema } from '@/schemas';
import type { AccountType } from '@/types';
import { centsToInput } from '@/utils/money';
import { saveAccount, setAccountArchived } from './repository';

const TYPES = Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[];

export default function AccountFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data } = useFinance();
  const { run, busy } = useAction();
  const existing = useLastFound(data.accounts.find((a) => a.id === id));

  const { control, handleSubmit } = useForm({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: existing?.name ?? '',
      type: existing?.type ?? 'CHECKING',
      initialBalance: existing ? centsToInput(existing.initialBalance) : '',
    },
  });

  const onSubmit = handleSubmit((v) => run((db) => saveAccount(db, v, existing?.id), () => router.back()));

  return (
    <Screen size="form">
      <Stack.Screen options={{ title: existing ? 'Editar conta' : 'Nova conta' }} />
      <FormField control={control} name="name" label="Nome" placeholder="Nubank, Itaú, Carteira..." maxLength={60} />
      <FormChips control={control} name="type" label="Tipo" options={TYPES.map((t) => ({ value: t, label: ACCOUNT_TYPE_LABELS[t] }))} />
      <FormField control={control} name="initialBalance" label="Saldo inicial (R$)" keyboardType="decimal-pad" placeholder="0,00" />
      <AppText variant="small" muted>
        Contas do tipo Investimentos não entram no saldo disponível.
      </AppText>
      <Button title="Salvar" onPress={onSubmit} loading={busy} />
      {existing && (
        <Button
          title={existing.archived ? 'Reativar conta' : 'Arquivar conta'}
          variant="secondary"
          onPress={() => run((db) => setAccountArchived(db, existing.id, !existing.archived), () => router.back())}
        />
      )}
    </Screen>
  );
}
