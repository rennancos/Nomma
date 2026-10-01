import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Button } from '@/components/Controls';
import { Card, EmptyState, ListRow, Screen, Section, Stat, styles } from '@/components/Layout';
import { AppText, Money } from '@/components/Text';
import { useAction, useFinance } from '@/hooks/useFinance';
import { usePlan } from '@/hooks/usePlan';
import { useTheme } from '@/hooks/useTheme';
import { formatDateBR } from '@/utils/date';
import { formatMoney } from '@/utils/money';
import { postOccurrence } from './repository';

/** Gastos fixos e receitas recorrentes: situação do mês + cadastros. */
export default function RecurringScreen() {
  const { data } = useFinance();
  const plan = usePlan();
  const { run, busy } = useAction();
  const { colors } = useTheme();
  const monthItems = plan.items.filter((i) => i.source === 'RECURRING');

  return (
    <Screen>
      <View style={styles.grid}>
        <Stat label="Fixos previstos"><Money value={plan.fixed.expected} variant="subtitle" /></Stat>
        <Stat label="Pagos" color={colors.income}><Money value={plan.fixed.paid} variant="subtitle" color={colors.income} /></Stat>
        <Stat label="Pendentes" color={colors.warning}><Money value={plan.fixed.pending} variant="subtitle" color={colors.warning} /></Stat>
      </View>

      <Section title="Este mês">
        <Card>
          {monthItems.length === 0 ? (
            <EmptyState icon="repeat-outline" title="Nenhuma recorrência neste mês" />
          ) : (
            monthItems.map((i) => {
              const rec = data.recurrings.find((r) => r.id === i.refId);
              return (
                <ListRow
                  key={i.key}
                  icon={i.type === 'INCOME' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
                  iconColor={i.type === 'INCOME' ? colors.income : colors.expense}
                  title={i.description}
                  subtitle={`${formatDateBR(i.date)} · ${formatMoney(i.amount)}`}
                  right={
                    i.paid ? (
                      <Ionicons name="checkmark-circle" size={24} color={colors.income} accessibilityLabel="Pago" />
                    ) : (
                      <AppText
                        weight="600"
                        color={colors.primary}
                        onPress={() => rec && !busy && run((db) => postOccurrence(db, rec, plan.month))}
                      >
                        {i.type === 'INCOME' ? 'Receber' : 'Pagar'}
                      </AppText>
                    )
                  }
                />
              );
            })
          )}
        </Card>
      </Section>

      <Section title="Cadastros">
        <Card>
          {data.recurrings.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="Cadastre salário e contas fixas"
              message="Ex.: Salário todo dia 5, Internet todo dia 5, Telefone todo dia 10."
            />
          ) : (
            data.recurrings.map((r) => (
              <ListRow
                key={r.id}
                title={r.description}
                subtitle={`Todo dia ${r.dayOfMonth}${r.autoPost ? ' · automático' : ''}${r.active ? '' : ' · pausada'}`}
                right={<Money value={r.amount} color={r.type === 'INCOME' ? colors.income : colors.expense} />}
                onPress={() => router.push({ pathname: '/recurring/form', params: { id: r.id } })}
              />
            ))
          )}
        </Card>
      </Section>
      <Button title="Nova recorrência" icon="add" onPress={() => router.push('/recurring/form')} />
    </Screen>
  );
}
