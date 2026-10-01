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
import { useTheme } from '@/hooks/useTheme';
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

export default function RootLayout() {
  // Pronto = banco aberto, migrations aplicadas e dados (inclusive tema e configurações) carregados — ou erro a mostrar.
  const ready = useFinanceStore((s) => s.status !== 'loading');
  const [launchDone, setLaunchDone] = useState(false);
  const finishLaunch = useCallback(() => setLaunchDone(true), []);
  return (
    <View style={{ flex: 1, backgroundColor: brand.deep }}>
      <SQLiteProvider databaseName="financas.db" onInit={migrate}>
        <AppShell />
      </SQLiteProvider>
      {!launchDone && <NommaLaunchScreen ready={ready} onFinish={finishLaunch} />}
    </View>
  );
}
