import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/Layout';
import { AppText } from '@/components/Text';
import { radius, spacing, typeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { TransactionType } from '@/types';

const ACTIONS: { type: TransactionType; label: string; icon: IconName }[] = [
  { type: 'EXPENSE', label: 'Adicionar gasto', icon: 'arrow-up-circle' },
  { type: 'INCOME', label: 'Adicionar receita', icon: 'arrow-down-circle' },
  { type: 'INVESTMENT', label: 'Adicionar investimento', icon: 'investments' },
  { type: 'TRANSFER', label: 'Transferência', icon: 'transactions' },
];

/** Menu do botão "+": escolhe o tipo e abre o cadastro rápido. */
export default function QuickAddSheet() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={() => router.back()}>
      <Pressable
        onPress={() => undefined}
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            paddingBottom: insets.bottom + spacing.lg,
            paddingLeft: spacing.lg + insets.left,
            paddingRight: spacing.lg + insets.right,
          },
        ]}
      >
        {ACTIONS.map((a) => (
          <Pressable
            key={a.type}
            accessibilityRole="button"
            style={({ pressed }) => [styles.action, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => router.replace({ pathname: '/transaction/new', params: { type: a.type } })}
          >
            <Icon name={a.icon} size={30} color={typeColor(colors, a.type)} />
            <AppText variant="subtitle">{a.label}</AppText>
          </Pressable>
        ))}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  // Em tablets o menu não estica: largura máxima, centralizado.
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.xs,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.md },
});
