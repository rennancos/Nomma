import { useState } from 'react';
import { Alert } from 'react-native';
import { Button, TextField } from '@/components/Controls';
import { Card, Screen } from '@/components/Layout';
import { AppText } from '@/components/Text';
import { confirm } from '@/hooks/useFinance';
import { useTheme } from '@/hooks/useTheme';
import { authConfigured, authErrorMessage, currentEmail, resetPassword, signIn, signOut, signUp } from '@/services/auth/firebase';

/** Login opcional: o app funciona offline sem conta; a conta é necessária para o assistente com IA. */
export default function AccountScreen() {
  const { colors } = useTheme();
  const email = currentEmail();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const attempt = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await action(); // ao entrar/sair, o app troca de perfil e volta ao Início
    } catch (e) {
      setError(authErrorMessage(e));
      setBusy(false);
    }
  };

  if (!authConfigured) {
    return (
      <Screen size="form">
        <Card>
          <AppText variant="subtitle">Login indisponível</AppText>
          <AppText muted>Este aplicativo foi gerado sem a configuração do Firebase. O uso offline continua normal.</AppText>
        </Card>
      </Screen>
    );
  }

  if (email) {
    return (
      <Screen size="form">
        <Card>
          <AppText variant="subtitle">Conectado</AppText>
          <AppText>{email}</AppText>
          <AppText variant="small" muted>Seus lançamentos desta conta ficam num banco separado neste aparelho.</AppText>
        </Card>
        <Button
          title="Sair da conta"
          variant="danger"
          onPress={() =>
            confirm('Sair da conta?', 'Os dados da conta continuam salvos neste aparelho e voltam ao entrar de novo.', () => attempt(signOut), 'Sair')
          }
          loading={busy}
        />
        {error ? <AppText accessibilityRole="alert" color={colors.danger}>{error}</AppText> : null}
      </Screen>
    );
  }

  const ready = form.email.trim().length > 3 && form.password.length >= 6;
  return (
    <Screen size="form">
      <AppText muted>Entre para usar o assistente com IA. Sem conta, o app continua funcionando offline.</AppText>
      <TextField
        label="E-mail"
        value={form.email}
        onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        editable={!busy}
      />
      <TextField
        label="Senha"
        value={form.password}
        onChangeText={(v) => setForm((f) => ({ ...f, password: v }))}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        editable={!busy}
      />
      {error ? <AppText accessibilityRole="alert" color={colors.danger}>{error}</AppText> : null}
      <Button title="Entrar" onPress={() => attempt(() => signIn(form.email, form.password))} loading={busy} disabled={!ready} />
      <Button title="Criar conta" variant="secondary" onPress={() => attempt(() => signUp(form.email, form.password))} disabled={!ready || busy} />
      <Button
        title="Esqueci a senha"
        variant="secondary"
        disabled={busy || !form.email.trim()}
        onPress={() =>
          attempt(async () => {
            await resetPassword(form.email);
            setBusy(false);
            Alert.alert('E-mail enviado', 'Se houver uma conta com este e-mail, você receberá o link para criar uma nova senha.');
          })
        }
      />
    </Screen>
  );
}
