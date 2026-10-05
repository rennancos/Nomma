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

/**
 * Valor em reais. Fica sempre numa linha: se não couber (valor alto, tela estreita, fonte ampliada),
 * a fonte diminui em vez de quebrar o número no meio ("R$ 12.356.27 / 8,90").
 */
export function Money({ value, sign, ...rest }: AppTextProps & { value: number; sign?: boolean }) {
  return (
    <AppText
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.5}
      {...rest}
      style={[{ fontVariant: ['tabular-nums'] }, rest.style]}
    >
      {formatMoney(value, { sign })}
    </AppText>
  );
}
