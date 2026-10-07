import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Button } from '@/components/Controls';
import { AppText } from '@/components/Text';
import { spacing } from '@/constants/theme';
import { decideProfile } from '@/database/profiles';
import { useTheme } from '@/hooks/useTheme';

/** Primeiro login no aparelho com dados locais: o usuário decide; nada é vinculado à conta sem pedir. */
export function ProfileChoice({ uid, onDone }: { uid: string; onDone: (dbName: string) => void }) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const choose = async (choice: 'move' | 'empty') => {
    setBusy(true);
    try {
      onDone(await decideProfile(uid, choice));
    } catch {
      Alert.alert('Não foi possível concluir', 'Seus dados continuam no aparelho. Tente novamente.');
      setBusy(false);
    }
  };
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background }}>
      <AppText variant="title">Dados deste aparelho</AppText>
      <AppText>
        Este aparelho já tem lançamentos feitos sem login. Você pode levá-los para a sua conta ou começar a conta sem dados.
      </AppText>
      <AppText variant="small" muted>
        Levar para a conta: os dados passam a aparecer só quando você estiver conectado. Começar vazia: eles continuam
        disponíveis sem login, e a conta começa sem lançamentos.
      </AppText>
      <Button title="Levar dados para a minha conta" onPress={() => choose('move')} loading={busy} />
      <Button title="Começar a conta vazia" variant="secondary" onPress={() => choose('empty')} disabled={busy} />
    </View>
  );
}
