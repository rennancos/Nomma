import { router } from 'expo-router';
import { Button } from '@/components/Controls';
import { Card, ListRow, Screen } from '@/components/Layout';
import { Money } from '@/components/Text';
import { ACCOUNT_TYPE_LABELS } from '@/constants/defaults';
import { useFinance } from '@/hooks/useFinance';
import { usePlan } from '@/hooks/usePlan';
import { useTheme } from '@/hooks/useTheme';

export default function AccountsScreen() {
  const { data } = useFinance();
  const { balances } = usePlan();
  const { colors } = useTheme();
  return (
    <Screen>
      <Card>
        {data.accounts.map((a) => {
          const balance = balances.get(a.id) ?? 0;
          return (
            <ListRow
              key={a.id}
              icon={a.type === 'INVESTMENT' ? 'trending-up-outline' : a.type === 'WALLET' ? 'wallet-outline' : 'business-outline'}
              title={a.name}
              subtitle={`${ACCOUNT_TYPE_LABELS[a.type]}${a.archived ? ' · arquivada' : ''}`}
              right={<Money value={balance} weight="600" color={balance < 0 ? colors.danger : colors.text} />}
              onPress={() => router.push({ pathname: '/accounts/form', params: { id: a.id } })}
            />
          );
        })}
      </Card>
      <Button title="Nova conta" icon="add" onPress={() => router.push('/accounts/form')} />
    </Screen>
  );
}
