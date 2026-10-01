import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View, type ColorValue, type ViewProps } from 'react-native';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { AppText } from './Text';

// Ícones de funcionalidade da Nomma (image/Gemini_Generated_Image_sgug…jpg, recortados em assets/icons).
// São de uma cor só: o tintColor recolore conforme o tema e o estado (ativo/inativo).
// ponytail: PNGs de ~230px recortados de um JPG; trocar por vetores quando houver o conjunto oficial.
const NOMA_ICONS = {
  home: require('../../assets/icons/home.png'),
  transactions: require('../../assets/icons/transactions.png'),
  cards: require('../../assets/icons/cards.png'),
  investments: require('../../assets/icons/investments.png'),
  profile: require('../../assets/icons/profile.png'),
  add: require('../../assets/icons/add.png'),
  send: require('../../assets/icons/send.png'),
  analytics: require('../../assets/icons/analytics.png'),
  notifications: require('../../assets/icons/notifications.png'),
  search: require('../../assets/icons/search.png'),
  security: require('../../assets/icons/security.png'),
  support: require('../../assets/icons/support.png'),
} as const;

/** Nome de um ícone Nomma ou, se não houver equivalente no conjunto, de um Ionicons. */
export type IconName = keyof typeof NOMA_ICONS | keyof typeof Ionicons.glyphMap;

export function Icon({ name, size, color }: { name: IconName; size: number; color: ColorValue }) {
  const nomma = NOMA_ICONS[name as keyof typeof NOMA_ICONS];
  if (nomma) return <Image source={nomma} style={{ width: size, height: size, tintColor: color }} resizeMode="contain" />;
  return <Ionicons name={name as keyof typeof Ionicons.glyphMap} size={size} color={color} />;
}

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const { colors } = useTheme();
  if (!scroll) return <View style={[styles.fill, { backgroundColor: colors.background }]}>{children}</View>;
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Card({ style, ...rest }: ViewProps) {
  const { colors } = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]} {...rest} />;
}

export function Section({ title, action, onAction, children }: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.rowBetween}>
        <AppText variant="subtitle">{title}</AppText>
        {action && (
          <Pressable onPress={onAction} hitSlop={12} accessibilityRole="button">
            <AppText variant="small" weight="600" color={colors.primary}>{action}</AppText>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

export function ListRow({ title, subtitle, right, icon, iconColor, onPress }: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  icon?: IconName;
  iconColor?: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      {icon && (
        <View style={[styles.iconBubble, { backgroundColor: colors.surfaceAlt }]}>
          <Icon name={icon} size={18} color={iconColor ?? colors.text} />
        </View>
      )}
      <View style={styles.fill}>
        <AppText numberOfLines={1}>{title}</AppText>
        {subtitle ? <AppText variant="small" muted numberOfLines={1}>{subtitle}</AppText> : null}
      </View>
      {right}
    </Pressable>
  );
}

export function Stat({ label, children, color }: { label: string; children: ReactNode; color?: string }) {
  return (
    <Card style={styles.stat}>
      <AppText variant="small" muted>{label}</AppText>
      <View>{children}</View>
      {color && <View style={[styles.statAccent, { backgroundColor: color }]} />}
    </Card>
  );
}

export function EmptyState({ icon = 'leaf-outline', title, message, children }: {
  icon?: IconName;
  title: string;
  message?: string;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <Icon name={icon} size={36} color={colors.textMuted} />
      <AppText variant="subtitle" style={styles.center}>{title}</AppText>
      {message && <AppText muted style={styles.center}>{message}</AppText>}
      {children}
    </View>
  );
}

export const styles = StyleSheet.create({
  fill: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  card: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, borderWidth: StyleSheet.hairlineWidth },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  iconBubble: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { flexBasis: '47%', flexGrow: 1, overflow: 'hidden' },
  statAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
});
