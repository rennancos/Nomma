import { zodResolver } from '@hookform/resolvers/zod';
import Constants from 'expo-constants';
import { useForm } from 'react-hook-form';
import { Alert } from 'react-native';
import { Button } from '@/components/Controls';
import { FormChips, FormField, FormToggle } from '@/components/Form';
import { Card, Screen } from '@/components/Layout';
import { AppText } from '@/components/Text';
import { hasDemoData, removeDemoData, seedDemoData } from '@/database/seed';
import { confirm, useAction, useFinance } from '@/hooks/useFinance';
import { settingsSchema } from '@/schemas';
import { syncReminders } from '@/services/reminders';
import { saveSettings } from './repository';

export default function SettingsScreen() {
  const { data } = useFinance();
  const { run, busy } = useAction();
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      userName: data.settings.userName,
      theme: data.settings.theme,
      payday: String(data.settings.payday),
      dailyReminder: data.settings.dailyReminder,
    },
  });

  const onSubmit = handleSubmit((v) =>
    run(
      (db) => saveSettings(db, v),
      async () => {
        const allowed = await syncReminders(v.dailyReminder).catch(() => false);
        Alert.alert(
          'Configurações salvas',
          allowed ? undefined : 'Os lembretes estão ligados, mas as notificações do app estão bloqueadas. Libere nas configurações do Android.',
        );
      },
    ),
  );

  // Idempotente: se os exemplos já existem, não duplica.
  const loadDemo = () =>
    run(async (db) => {
      if (!(await hasDemoData(db))) await seedDemoData(db);
    });

  return (
    <Screen>
      <FormField control={control} name="userName" label="Seu nome" placeholder="Opcional" maxLength={40} />
      <FormField control={control} name="payday" label="Dia do salário" keyboardType="number-pad" maxLength={2} />
      <AppText variant="small" muted>Usado para calcular quanto você pode gastar por dia até o próximo salário.</AppText>
      <FormChips
        control={control}
        name="theme"
        label="Tema"
        options={[{ value: 'system', label: 'Sistema' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Escuro' }]}
      />
      <FormToggle
        control={control}
        name="dailyReminder"
        label="Lembretes de gastos"
        hint="Às 9h, 13h e 21h: um aviso para registrar o que você pagou."
      />
      <AppText variant="small" muted>Moeda: Real brasileiro (R$)</AppText>
      <Button title="Salvar" onPress={onSubmit} loading={busy} />

      <Card>
        <AppText variant="subtitle">Dados de demonstração</AppText>
        <AppText muted>Carrega exemplos (salário, contas fixas, cartão, parcelamento, metas) para conhecer o app. Podem ser removidos a qualquer momento.</AppText>
        <Button title="Carregar exemplos" variant="secondary" onPress={loadDemo} />
        <Button
          title="Remover exemplos"
          variant="danger"
          onPress={() => confirm('Remover dados de demonstração?', 'Seus próprios registros não serão afetados.', () => run(removeDemoData), 'Remover')}
        />
      </Card>
      <AppText variant="caption" muted>Versão {Constants.expoConfig?.version ?? ''}</AppText>
    </Screen>
  );
}
