import { Ionicons } from '@expo/vector-icons';
import { Children, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View, type ColorValue, type ViewProps } from 'react-native';
import { radius, spacing } from '@/constants/theme';
import { useContentStyle, useResponsive, type ContentSize } from '@/hooks/useResponsive';
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

/**
 * Tela rolável. `size` limita a largura do conteúdo em telas grandes (centralizado):
 * 'form' para formulários, 'list' para listas, 'content' (padrão) para painéis.
 */
export function Screen({ children, scroll = true, size = 'content' }: {
  children: ReactNode;
  scroll?: boolean;
  size?: ContentSize;
}) {
  const { colors } = useTheme();
  const contentStyle = useContentStyle(size);
  if (!scroll) return <View style={[styles.fill, { backgroundColor: colors.background }]}>{children}</View>;
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

/**
 * Grade de cartões de número (Stat): 2 colunas no celular, 4 a partir da largura expandida (≥ 840 dp).
 * Colunas explícitas: a mesma quantidade por linha em qualquer largura; a última linha incompleta estica.
 */
export function StatGrid({ children }: { children: ReactNode }) {
  const { expanded } = useResponsive();
  const columns = expanded ? 4 : 2;
  return (
    <View style={styles.statGrid}>
      {Children.toArray(children).map((child, i) => (
        <View key={i} style={[styles.statCell, { flexBasis: `${100 / columns}%` }]}>{child}</View>
      ))}
    </View>
  );
}

/**
 * Duas colunas lado a lado na largura expandida; empilhadas (na ordem) abaixo disso.
 * Cada filho é uma coluna.
 */
export function Columns({ children }: { children: [ReactNode, ReactNode] }) {
  const { expanded } = useResponsive();
  if (!expanded) return <>{children}</>;
  return (
    <View style={styles.columns}>
      <View style={styles.column}>{children[0]}</View>
      <View style={styles.column}>{children[1]}</View>
    </View>
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

/**
 * Cartão de número. Com `onPress`, o cartão inteiro é tocável; com `onAdd`, ganha um botão "+" próprio
 * (o toque no "+" não chega ao cartão: o Pressable mais interno fica com o gesto).
 */
export function Stat({ label, children, color, onPress, onAdd, addLabel }: {
  label: string;
  children: ReactNode;
  color?: string;
  onPress?: () => void;
  onAdd?: () => void;
  /** nome acessível do "+" (ex.: "Adicionar receita") */
  addLabel?: string;
}) {
  const { colors } = useTheme();
  const card = (
    <Card style={onPress ? styles.statInner : styles.stat}>
      <View style={styles.rowBetween}>
        <AppText variant="small" muted style={styles.fill} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{label}</AppText>
        {onAdd ? (
          <Pressable
            onPress={onAdd}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={addLabel ?? `Adicionar em ${label}`}
            style={({ pressed }) => [styles.statAdd, { backgroundColor: colors.surfaceAlt, opacity: pressed ? 0.5 : 1 }]}
          >
            <Ionicons name="add" size={18} color={color ?? colors.text} />
          </Pressable>
        ) : (
          onPress && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        )}
      </View>
      <View>{children}</View>
      {color && <View style={[styles.statAccent, { backgroundColor: color }]} />}
    </Card>
  );
  if (!onPress) return card;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Abre a lista do mês"
      style={({ pressed }) => [styles.stat, { opacity: pressed ? 0.6 : 1 }]}
    >
      {card}
    </Pressable>
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
  content: { paddingTop: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  card: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, borderWidth: StyleSheet.hairlineWidth },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  iconBubble: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  // célula da StatGrid: o cartão ocupa a célula inteira (linhas com a mesma altura)
  stat: { flex: 1, overflow: 'hidden' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', margin: -spacing.md / 2 },
  statCell: { flexGrow: 1, padding: spacing.md / 2 },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  column: { flex: 1, gap: spacing.lg },
  statInner: { flex: 1, overflow: 'hidden' },
  statAdd: { width: 28, height: 28, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  statAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
});
