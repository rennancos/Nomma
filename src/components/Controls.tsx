import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { parseISO } from 'date-fns';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Switch, TextInput, View, type TextInputProps } from 'react-native';
import { fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { addMonthsToKey, formatDateBR, formatMonthLabel, toISODate, type ISODate, type MonthKey } from '@/utils/date';
import { Icon, type IconName } from './Layout';
import { AppText } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

export function Button({ title, onPress, variant = 'primary', loading, disabled, icon }: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
}) {
  const { colors } = useTheme();
  const bg = { primary: colors.primary, secondary: colors.surfaceAlt, danger: 'transparent' }[variant];
  const fg = { primary: colors.onPrimary, secondary: colors.text, danger: colors.danger }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: pressed || disabled ? 0.6 : 1 },
        variant === 'danger' && { borderColor: colors.danger, borderWidth: 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={18} color={fg} />}
          <AppText weight="600" color={fg}>{title}</AppText>
        </>
      )}
    </Pressable>
  );
}

export interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  large?: boolean;
}

export function TextField({ label, error, large, style, ...rest }: TextFieldProps) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      {label && <AppText variant="small" muted>{label}</AppText>}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          { color: colors.text, backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border },
          large && styles.inputLarge,
          style,
        ]}
        {...rest}
      />
      {error && <AppText variant="caption" color={colors.danger}>{error}</AppText>}
    </View>
  );
}

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

export function ChipSelect<T extends string>({ options, value, onChange, label, error, allowNone }: {
  options: ChipOption<T>[];
  value: T | null;
  onChange: (v: T | null) => void;
  label?: string;
  error?: string;
  allowNone?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      {label && <AppText variant="small" muted>{label}</AppText>}
      <View style={styles.chips}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(selected && allowNone ? null : o.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.chip,
                { backgroundColor: selected ? colors.primary : colors.surface, borderColor: selected ? colors.primary : colors.border },
              ]}
            >
              <AppText variant="small" weight={selected ? '600' : '400'} color={selected ? colors.onPrimary : colors.text}>
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {error && <AppText variant="caption" color={colors.danger}>{error}</AppText>}
    </View>
  );
}

export function Toggle({ label, value, onChange, hint }: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.toggle}>
      <View style={{ flex: 1 }}>
        <AppText>{label}</AppText>
        {hint && <AppText variant="caption" muted>{hint}</AppText>}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary }} />
    </View>
  );
}

/** Campo de data com o calendário do sistema: diálogo no Android, calendário embutido no iOS. */
export function DateField({ label, value, onChange, error, placeholder = 'Escolher data', clearable }: {
  label?: string;
  value: ISODate | null;
  onChange: (v: ISODate | null) => void;
  error?: string;
  placeholder?: string;
  clearable?: boolean;
}) {
  const { colors } = useTheme();
  const [iosOpen, setIosOpen] = useState(false);
  const date = value ? parseISO(value) : new Date();
  const pick = (e: DateTimePickerEvent, d?: Date) => {
    if (e.type === 'set' && d) onChange(toISODate(d));
  };
  const open = () =>
    Platform.OS === 'android'
      ? DateTimePickerAndroid.open({ value: date, mode: 'date', onChange: pick })
      : setIosOpen((o) => !o);
  return (
    <View style={{ gap: spacing.xs }}>
      {label && <AppText variant="small" muted>{label}</AppText>}
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[styles.input, styles.dateInput, { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border }]}
      >
        <AppText color={value ? colors.text : colors.textMuted}>{value ? formatDateBR(value) : placeholder}</AppText>
        <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
      </Pressable>
      {iosOpen && <DateTimePicker value={date} mode="date" display="inline" locale="pt-BR" onChange={pick} />}
      {clearable && value && (
        <AppText variant="small" weight="600" color={colors.primary} onPress={() => onChange(null)}>Limpar data</AppText>
      )}
      {error && <AppText variant="caption" color={colors.danger}>{error}</AppText>}
    </View>
  );
}

export function MonthSwitcher({ month, onChange }: { month: MonthKey; onChange: (m: MonthKey) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.month}>
      <Pressable onPress={() => onChange(addMonthsToKey(month, -1))} hitSlop={12} accessibilityLabel="Mês anterior">
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
      <AppText variant="subtitle">{formatMonthLabel(month)}</AppText>
      <Pressable onPress={() => onChange(addMonthsToKey(month, 1))} hitSlop={12} accessibilityLabel="Próximo mês">
        <Ionicons name="chevron-forward" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.body,
  },
  dateInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputLarge: { fontSize: fontSize.hero, fontWeight: '700', paddingVertical: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  month: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
