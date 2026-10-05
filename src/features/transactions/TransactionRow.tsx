import { router } from 'expo-router';
import { ListRow, type IconName } from '@/components/Layout';
import { Money } from '@/components/Text';
import { typeColor } from '@/constants/theme';
import { useLookups } from '@/hooks/usePlan';
import { useTheme } from '@/hooks/useTheme';
import type { Transaction, TransactionType } from '@/types';
import { formatDateBR } from '@/utils/date';

const ICONS: Record<TransactionType, IconName> = {
  INCOME: 'arrow-down-circle-outline',
  EXPENSE: 'arrow-up-circle-outline',
  INVESTMENT: 'trending-up-outline',
  TRANSFER: 'swap-horizontal-outline',
};

/** `showDate`: inclui a data no subtítulo (listas que não agrupam por dia). */
export function TransactionRow({ tx, showDate }: { tx: Transaction; showDate?: boolean }) {
  const { colors } = useTheme();
  const { categoryName, accountName } = useLookups();
  const color = typeColor(colors, tx.type);
  const detail =
    tx.type === 'TRANSFER'
      ? `${accountName(tx.accountId)} → ${accountName(tx.destinationAccountId)}`
      : `${categoryName(tx.categoryId)} · ${accountName(tx.accountId)}`;
  const subtitle = showDate ? `${formatDateBR(tx.date)} · ${detail}` : detail;
  return (
    <ListRow
      icon={ICONS[tx.type]}
      iconColor={color}
      title={tx.description}
      subtitle={subtitle}
      onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: tx.id } })}
      right={
        <Money
          value={tx.type === 'INCOME' || tx.type === 'TRANSFER' ? tx.amount : -tx.amount}
          sign={tx.type === 'INCOME'}
          weight="600"
          color={tx.type === 'TRANSFER' ? colors.textMuted : color}
        />
      }
    />
  );
}
