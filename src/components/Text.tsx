import { Text, type TextProps } from 'react-native';
import { fontSize } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatMoney } from '@/utils/money';

type Variant = keyof typeof fontSize;
const WEIGHTS: Record<Variant, '400' | '600' | '700'> = {
  hero: '700', title: '700', subtitle: '600', body: '400', small: '400', caption: '400',
};

export interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  muted?: boolean;
  weight?: '400' | '500' | '600' | '700';
}

export function AppText({ variant = 'body', color, muted, weight, style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        { fontSize: fontSize[variant], fontWeight: weight ?? WEIGHTS[variant], color: color ?? (muted ? colors.textMuted : colors.text) },
        style,
      ]}
      {...rest}
    />
  );
}

export function Money({ value, sign, ...rest }: AppTextProps & { value: number; sign?: boolean }) {
  return (
    <AppText {...rest} style={[{ fontVariant: ['tabular-nums'] }, rest.style]}>
      {formatMoney(value, { sign })}
    </AppText>
  );
}
