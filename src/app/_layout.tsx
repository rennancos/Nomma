import { Stack } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/Controls';
import { EmptyState } from '@/components/Layout';
import { NommaLaunchScreen } from '@/components/NommaLaunchScreen';
import { brand } from '@/constants/theme';
import { migrate } from '@/database/migrations';
import { LOCAL_DB, resolveProfile, userDbName } from '@/database/profiles';
import { ProfileChoice } from '@/features/account/ProfileChoice';
import { useTheme } from '@/hooks/useTheme';
import { useAuthUser } from '@/services/auth/firebase';
import { syncReminders } from '@/services/reminders';
import { useFinanceStore } from '@/stores/financeStore';

// O splash nativo fica até a tela da marca (NommaLaunchScreen) estar desenhada; ela o esconde.
SplashScreen.preventAutoHideAsync().catch(() => undefined);
// Sem fade: a tela da marca já está por baixo com o mesmo fundo; o fade deixava o "N" nativo aparecendo por cima dela.
SplashScreen.setOptions({ fade: false });

const TITLES: Record<string, string> = {
  'recurring/index': 'Gastos fixos e salário',
  'recurring/form': 'Recorrência',
  'purchases/index': 'Parcelamentos',
  'purchases/form': 'Parcelamento',
  'purchases/[id]': 'Parcelamento',
  'cards/index': 'Cartões de crédito',
  'cards/form': 'Cartão',
  'cards/[id]': 'Cartão',
  investments: 'Investimentos',
  assistant: 'Assistente financeiro',
  account: 'Conta',
  'goals/index': 'Metas',
  'goals/form': 'Meta',
  'budgets/index': 'Orçamentos',
  'budgets/form': 'Orçamento',
  'accounts/index': 'Contas',
  'accounts/form': 'Conta',
  categories: 'Categorias',
  backup: 'Backup',
  settings: 'Configurações',
  'transaction/new': 'Nova movimentação',
  'transaction/[id]': 'Movimentação',
  entries: 'Lançamentos do mês',
};

function AppShell() {
  const db = useSQLiteContext();
  const status = useFinanceStore((s) => s.status);
  const load = useFinanceStore((s) => s.load);
  const { colors, scheme } = useTheme();

  useEffect(() => {
    load(db);
  }, [db, load]);

  // Com os dados prontos, agenda (ou cancela) os lembretes conforme a configuração. Uma vez por abertura do app.
  const reminderOn = useFinanceStore((s) => s.data?.settings.dailyReminder);
  useEffect(() => {
    if (reminderOn !== undefined) syncReminders(reminderOn).catch(() => undefined);
  }, [reminderOn]);

  if (status === 'loading') return null; // a NommaLaunchScreen cobre a tela até os dados chegarem
  if (status === 'error') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background }}>
        <EmptyState icon="alert-circle-outline" title="Não foi possível abrir seus dados" message="Tente novamente." />
        <Button title="Tentar novamente" onPress={() => load(db)} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={({ route }) => ({
          title: TITLES[route.name] ?? '',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        })}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="quick-add" options={{ presentation: 'transparentModal', headerShown: false, animation: 'fade' }} />
      </Stack>
    </>
  );
}

type Profile = { uid: string | null; name: string | null; ask?: boolean };

export default function RootLayout() {
  // Perfil = banco do login atual (ver database/profiles). `undefined`: sessão salva ainda sendo restaurada.
  const user = useAuthUser();
  const uid = user === undefined ? undefined : (user?.uid ?? null);
  const [profile, setProfile] = useState<Profile | null>(null);
  // Resultado de outro login é ignorado: troca de conta nunca abre o banco anterior.
  const current = profile && profile.uid === uid ? profile : null;
  useEffect(() => {
    if (uid === undefined) return;
    let active = true;
    useFinanceStore.getState().reset();
    resolveProfile(uid).then(
      (r) => active && setProfile('ask' in r ? { uid, name: null, ask: true } : { uid, name: r.name }),
      () => active && setProfile({ uid, name: uid ? userDbName(uid) : LOCAL_DB }), // começa vazio; o perfil local fica intacto
    );
    return () => {
      active = false;
    };
  }, [uid]);

  // Pronto = banco aberto, migrations aplicadas e dados (inclusive tema e configurações) carregados — ou erro a mostrar.
  const ready = useFinanceStore((s) => s.status !== 'loading') || Boolean(current?.ask);
  const [launchDone, setLaunchDone] = useState(false);
  const finishLaunch = useCallback(() => setLaunchDone(true), []);
  return (
    <View style={{ flex: 1, backgroundColor: brand.deep }}>
      {current?.ask && current.uid ? (
        <ProfileChoice uid={current.uid} onDone={(name) => setProfile({ uid: current.uid, name })} />
      ) : current?.name ? (
        <SQLiteProvider key={current.name} databaseName={current.name} onInit={migrate}>
          <AppShell />
        </SQLiteProvider>
      ) : null}
      {!launchDone && <NommaLaunchScreen ready={ready} onFinish={finishLaunch} />}
    </View>
  );
}
