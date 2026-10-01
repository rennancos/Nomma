import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatMoney } from '@/utils/money';
import { AppText } from './Text';

// Gráficos simples com Views: sem dependência nativa extra, leves e com tema.

export function ProgressBar({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View style={[styles.track, { height, backgroundColor: colors.surfaceAlt }]}>
      <View style={{ width: `${pct * 100}%`, height, borderRadius: radius.pill, backgroundColor: color ?? colors.primary }} />
    </View>
  );
}

/** Barras horizontais ordenadas (ex.: gastos por categoria). Com `onSelect`, os itens ficam tocáveis. */
export function HBarList({ items, color, selected, onSelect, detail }: {
  items: { label: string; value: number }[];
  color?: string;
  /** índice do item aberto */
  selected?: number | null;
  onSelect?: (index: number | null) => void;
  /** conteúdo mostrado embaixo do item selecionado */
  detail?: ReactNode;
}) {
  const { colors } = useTheme();
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <View style={{ gap: spacing.md }}>
      {items.map((i, index) => (
        <Pressable
          key={i.label}
          disabled={!onSelect}
          onPress={() => onSelect?.(selected === index ? null : index)}
          accessibilityRole={onSelect ? 'button' : undefined}
          accessibilityState={{ expanded: selected === index }}
          style={{ gap: spacing.xs, opacity: selected == null || selected === index ? 1 : 0.55 }}
        >
          <View style={styles.rowBetween}>
            <AppText variant="small" numberOfLines={1} style={{ flex: 1 }}>{i.label}</AppText>
            <AppText variant="small" weight="600">{formatMoney(i.value)}</AppText>
            <AppText variant="caption" muted style={styles.pct}>
              {total > 0 ? `${Math.round((i.value / total) * 100)}%` : ''}
            </AppText>
          </View>
          <ProgressBar value={i.value / max} color={color ?? colors.expense} />
          {selected === index && detail}
        </Pressable>
      ))}
    </View>
  );
}

export interface BarSeries {
  label: string;
  color: string;
}

/**
 * Barras verticais agrupadas por período (ex.: receitas x despesas por mês). Valores negativos usam a cor de perigo.
 * Com `onSelect`, tocar num período o destaca.
 */
export function BarChart({ labels, series, values, height = 140, selected, onSelect }: {
  labels: string[];
  series: BarSeries[];
  /** values[período][série], em centavos */
  values: number[][];
  height?: number;
  selected?: number | null;
  onSelect?: (index: number) => void;
}) {
  const { colors } = useTheme();
  const max = Math.max(1, ...values.flat().map(Math.abs));
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={[styles.bars, { height }]}>
        {values.map((group, gi) => (
          <Pressable
            key={labels[gi] ?? gi}
            disabled={!onSelect}
            onPress={() => onSelect?.(gi)}
            accessibilityRole={onSelect ? 'button' : undefined}
            accessibilityLabel={labels[gi]}
            accessibilityState={{ selected: selected === gi }}
            style={[styles.group, { opacity: selected == null || selected === gi ? 1 : 0.4 }]}
          >
            {group.map((v, si) => (
              <View
                key={series[si]?.label ?? si}
                style={{
                  flex: 1,
                  height: Math.max(2, (Math.abs(v) / max) * height),
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  backgroundColor: v < 0 ? colors.danger : (series[si]?.color ?? colors.primary),
                }}
              />
            ))}
          </Pressable>
        ))}
      </View>
      <AxisLabels labels={labels} selected={selected} />
      {series.length > 1 && <Legend series={series} />}
    </View>
  );
}

export function Legend({ series }: { series: BarSeries[] }) {
  return (
    <View style={styles.legend}>
      {series.map((s) => (
        <View key={s.label} style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: s.color }]} />
          <AppText variant="caption" muted>{s.label}</AppText>
        </View>
      ))}
    </View>
  );
}

/** Rótulos dos meses; com mais de 6, mostra um sim, um não (o último sempre), para não sobrepor. */
function AxisLabels({ labels, selected }: { labels: string[]; selected?: number | null }) {
  const n = labels.length;
  return (
    <View style={styles.labels}>
      {labels.map((l, i) => (
        <AppText
          key={l}
          variant="caption"
          muted={selected !== i}
          weight={selected === i ? '600' : undefined}
          style={styles.label}
          numberOfLines={1}
        >
          {n <= 6 || (n - 1 - i) % 2 === 0 || selected === i ? l : ''}
        </AppText>
      ))}
    </View>
  );
}

/**
 * Tendência mês a mês: barras opcionais (ex.: aporte do mês) e uma linha (ex.: total acumulado ou taxa de economia).
 * Barras e linha têm escalas próprias; os valores exatos ficam no detalhe do período tocado.
 * `null` na linha = sem valor naquele mês. Com valores negativos, aparece a linha do zero.
 */
export function TrendChart({ labels, line, lineColor, bars, barColor, height = 140, selected, onSelect }: {
  labels: string[];
  line: (number | null)[];
  lineColor: string;
  bars?: number[];
  barColor?: string;
  height?: number;
  selected?: number | null;
  onSelect?: (index: number) => void;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const slot = labels.length > 0 ? width / labels.length : 0;
  const pts = line.map((v, i) => (v === null ? null : { i, v }));
  const values = line.filter((v): v is number => v !== null);
  const lo = Math.min(0, ...values);
  const hi = Math.max(1, ...values);
  const pad = 8; // o ponto não encosta nas bordas
  const y = (v: number) => pad + (1 - (v - lo) / (hi - lo || 1)) * (height - pad * 2);
  const barMax = Math.max(1, ...(bars ?? []));
  const size = (i: number) => (selected === i ? 12 : 8);
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {bars && (
          <View style={[StyleSheet.absoluteFill, styles.bars]}>
            {bars.map((b, i) => (
              <View key={labels[i] ?? i} style={[styles.group, styles.centered, { opacity: selected == null || selected === i ? 1 : 0.4 }]}>
                <View
                  style={[styles.trendBar, {
                    height: Math.max(b > 0 ? 2 : 0, (b / barMax) * height * 0.7),
                    backgroundColor: barColor ?? colors.investment,
                  }]}
                />
              </View>
            ))}
          </View>
        )}
        {lo < 0 && <View style={[styles.zero, { top: y(0), backgroundColor: colors.border }]} />}
        {width > 0 &&
          pts.map((p, k) => {
            const q = pts[k + 1];
            if (!p || !q) return null;
            // segmento entre dois pontos: uma barra fina girada
            const x1 = (p.i + 0.5) * slot;
            const y1 = y(p.v);
            const x2 = (q.i + 0.5) * slot;
            const y2 = y(q.v);
            const len = Math.hypot(x2 - x1, y2 - y1);
            return (
              <View
                key={'s' + p.i}
                style={[styles.segment, {
                  left: (x1 + x2) / 2 - len / 2,
                  top: (y1 + y2) / 2 - 1,
                  width: len,
                  backgroundColor: lineColor,
                  transform: [{ rotate: Math.atan2(y2 - y1, x2 - x1) + 'rad' }],
                }]}
              />
            );
          })}
        {width > 0 &&
          pts.map((p) =>
            p ? (
              <View
                key={'p' + p.i}
                style={[styles.point, {
                  left: (p.i + 0.5) * slot - size(p.i) / 2,
                  top: y(p.v) - size(p.i) / 2,
                  width: size(p.i),
                  height: size(p.i),
                  backgroundColor: lineColor,
                  borderColor: colors.surface,
                }]}
              />
            ) : null,
          )}
        {onSelect && (
          <View style={[StyleSheet.absoluteFill, styles.hit]}>
            {labels.map((l, i) => (
              <Pressable
                key={l}
                style={styles.fill}
                onPress={() => onSelect(i)}
                accessibilityRole="button"
                accessibilityLabel={l}
                accessibilityState={{ selected: selected === i }}
              />
            ))}
          </View>
        )}
      </View>
      <AxisLabels labels={labels} selected={selected} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: radius.pill, overflow: 'hidden' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pct: { width: 36, textAlign: 'right' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  group: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  centered: { justifyContent: 'center' },
  labels: { flexDirection: 'row', gap: spacing.md },
  label: { flex: 1, textAlign: 'center' },
  legend: { flexDirection: 'row', gap: spacing.lg, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
  zero: { position: 'absolute', left: 0, right: 0, height: 1 },
  segment: { position: 'absolute', height: 2 },
  point: { position: 'absolute', borderRadius: 6, borderWidth: 2 },
  trendBar: { width: '45%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  hit: { flexDirection: 'row' },
  fill: { flex: 1 },
});
