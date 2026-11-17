import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Controls';
import { ProgressBar } from '@/components/Charts';
import { Card, Icon, Screen, type IconName } from '@/components/Layout';
import { AppText } from '@/components/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

const STEPS: { title: string; description: string; icon: IconName; task: string; path: string; example: string; tip: string }[] = [
  {
    title: 'Comece pelo dinheiro que você já tem',
    description: 'Bem-vindo ao Nomma! Organize seu dinheiro aos poucos, começando pelo saldo de hoje.',
    icon: 'wallet-outline',
    task: 'Ajuste o saldo inicial da sua conta',
    path: 'Mais → Contas → Conta corrente',
    example: 'Se hoje há R$ 800 na sua conta, informe R$ 800 como saldo inicial e salve. Você também pode criar outras contas.',
    tip: 'Esse dinheiro já está no saldo inicial. Não registre o mesmo valor como uma nova receita, para evitar contar duas vezes.',
  },
  {
    title: 'Registre o que entra e o que sai',
    description: 'Receita é dinheiro recebido. Despesa é dinheiro gasto. Uma transferência move dinheiro entre suas contas.',
    icon: 'add-circle-outline',
    task: 'Registre seu primeiro gasto',
    path: 'Botão + → Adicionar gasto',
    example: 'Pagou R$ 25 em um almoço? Informe o valor, escolha Alimentação, selecione a conta usada e toque em Salvar.',
    tip: 'Na aba Movimentos você encontra o histórico. Toque em um registro para corrigir informações ou excluí-lo.',
  },
  {
    title: 'Prepare as próximas contas',
    description: 'Organize compromissos que se repetem e compras no cartão para acompanhar o que vem pela frente.',
    icon: 'calendar-outline',
    task: 'Cadastre o que faz parte da sua rotina',
    path: 'Mais → Lançamentos fixos / Cartões de crédito',
    example: 'Use Lançamentos fixos para aluguel e salário. Para uma compra no crédito, cadastre o cartão e depois registre o gasto com a forma de pagamento Crédito.',
    tip: 'Em Mais → Configurações, ajuste o dia do salário. Ele ajuda o Nomma a calcular o valor sugerido para gastar por dia.',
  },
  {
    title: 'Saiba onde olhar no dia a dia',
    description: 'Você já conhece o caminho. Comece com suas contas e registre as movimentações conforme elas acontecem.',
    icon: 'home',
    task: 'Use o Início para acompanhar seu dinheiro',
    path: 'Início → saldo, resumo do mês e próximos lançamentos',
    example: 'Saldo disponível mostra o dinheiro das contas fora de investimentos. O valor por dia é uma estimativa baseada no saldo, nas contas previstas e no dia do salário.',
    tip: 'Análises ajuda a entender seus gastos. Em Mais → Backup e exportação, crie uma cópia dos seus dados. Este guia fica em Mais → Guia de primeiros passos.',
  },
];

/** `standalone`: guia em tela cheia na primeira abertura (sem cabeçalho de navegação por cima). */
export function GettingStartedGuide({ onFinish, busy = false, standalone = false }: {
  onFinish: () => void;
  busy?: boolean;
  standalone?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const { colors } = useTheme();
  const step = STEPS[index]!;
  const last = index === STEPS.length - 1;

  // Voltar do Android retorna ao passo anterior; no primeiro passo segue o padrão (sai da tela ou do app).
  useEffect(() => {
    if (index === 0) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setIndex((i) => Math.max(0, i - 1));
      return true;
    });
    return () => sub.remove();
  }, [index]);

  return (
    // Aberto pelo menu, o cabeçalho da navegação já cobre a área do topo.
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]} edges={standalone ? ['top', 'bottom'] : ['bottom']}>
      <Screen size="form" key={index}>
        <AppText variant="small" muted accessibilityLiveRegion="polite">PRIMEIROS PASSOS · {index + 1} de {STEPS.length}</AppText>
        <ProgressBar value={(index + 1) / STEPS.length} />
        <View style={[styles.illustration, { backgroundColor: colors.primarySoft }]}>
          <Icon name={step.icon} size={48} color={colors.primary} />
        </View>
        <AppText variant="title" accessibilityRole="header">{step.title}</AppText>
        <AppText muted>{step.description}</AppText>
        <Card>
          <AppText variant="subtitle">{step.task}</AppText>
          <AppText weight="600" color={colors.primary}>{step.path}</AppText>
          <AppText>{step.example}</AppText>
        </Card>
        <AppText variant="small" muted>{step.tip}</AppText>
        <Button title={last ? 'Começar a usar o Nomma' : 'Continuar'} loading={busy} onPress={last ? onFinish : () => setIndex(index + 1)} />
        {index > 0 && <Button title="Voltar" variant="secondary" disabled={busy} onPress={() => setIndex(index - 1)} />}
        {!last && <Button title="Pular guia por enquanto" variant="secondary" loading={busy} onPress={onFinish} />}
        <AppText variant="caption" muted>Você pode consultar este guia novamente pelo menu Mais.</AppText>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  illustration: { alignSelf: 'flex-start', padding: spacing.xl, borderRadius: radius.xl },
});
