import { useState } from 'react';
import { View } from 'react-native';
import { Button, ChipSelect, TextField } from '@/components/Controls';
import { Card, ListRow, Screen, styles } from '@/components/Layout';
import { AppText } from '@/components/Text';
import { useAction, useFinance } from '@/hooks/useFinance';
import { useTheme } from '@/hooks/useTheme';
import type { CategoryKind } from '@/types';
import { createCategory, setCategoryArchived } from './repository';

const KINDS: { value: CategoryKind; label: string }[] = [
  { value: 'EXPENSE', label: 'Despesas' },
  { value: 'INCOME', label: 'Receitas' },
  { value: 'INVESTMENT', label: 'Investimentos' },
];

export default function CategoriesScreen() {
  const { data } = useFinance();
  const { run, busy } = useAction();
  const { colors } = useTheme();
  const [kind, setKind] = useState<CategoryKind>('EXPENSE');
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();
  const list = data.categories.filter((c) => c.kind === kind);

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 40) return setError('Informe um nome de até 40 caracteres');
    setError(undefined);
    run((db) => createCategory(db, trimmed, kind), () => setName(''));
  };

  return (
    <Screen size="list">
      <ChipSelect options={KINDS} value={kind} onChange={(k) => k && setKind(k)} />
      <View style={[styles.rowBetween, { alignItems: 'flex-start' }]}>
        <View style={styles.fill}>
          <TextField placeholder="Nova categoria" value={name} onChangeText={setName} error={error} maxLength={40} />
        </View>
        <Button title="Adicionar" onPress={add} loading={busy} />
      </View>
      <Card>
        {list.map((c) => (
          <ListRow
            key={c.id}
            title={c.name}
            subtitle={c.archived ? 'Arquivada' : c.isDefault ? 'Padrão' : 'Personalizada'}
            right={
              <AppText variant="small" weight="600" color={colors.primary} onPress={() => run((db) => setCategoryArchived(db, c.id, !c.archived))}>
                {c.archived ? 'Reativar' : 'Arquivar'}
              </AppText>
            }
          />
        ))}
      </Card>
    </Screen>
  );
}
