import { useState } from 'react';
import { Alert } from 'react-native';
import { Button } from '@/components/Controls';
import { Card, Screen } from '@/components/Layout';
import { AppText } from '@/components/Text';
import { confirm, useFinance } from '@/hooks/useFinance';
import { BackupError, buildJsonBackup, buildTransactionsCsv, pickBackupFile, restoreJsonBackup, shareFile } from './export';

export default function BackupScreen() {
  const { db, data, refresh } = useFinance();
  const [busy, setBusy] = useState<'json' | 'csv' | 'import' | null>(null);

  const exportAs = async (ext: 'json' | 'csv') => {
    setBusy(ext);
    try {
      const content =
        ext === 'json' ? await buildJsonBackup(db) : buildTransactionsCsv(data.transactions, data.categories, data.accounts);
      await shareFile(content, ext);
    } catch {
      Alert.alert('Não foi possível exportar', 'Tente novamente.');
    } finally {
      setBusy(null);
    }
  };

  const importBackup = async () => {
    setBusy('import');
    try {
      const content = await pickBackupFile();
      if (content === null) return;
      await restoreJsonBackup(db, content);
      await refresh();
      Alert.alert('Backup importado', 'Seus dados foram restaurados.');
    } catch (e) {
      // Sem log do erro: pode conter valores financeiros. Em caso de falha, nada é alterado.
      Alert.alert('Não foi possível importar', e instanceof BackupError ? e.message : 'O arquivo é inválido ou está danificado. Seus dados atuais não foram alterados.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen size="form">
      <Card>
        <AppText variant="subtitle">Backup completo (JSON)</AppText>
        <AppText muted>Todas as contas, movimentações, cartões, metas e configurações. Guarde fora do celular (Google Drive, e-mail) para poder restaurar se desinstalar o app ou trocar de aparelho.</AppText>
        <Button title="Exportar JSON" icon="download-outline" onPress={() => exportAs('json')} loading={busy === 'json'} />
      </Card>
      <Card>
        <AppText variant="subtitle">Importar backup</AppText>
        <AppText muted>Restaura um backup JSON exportado por este app. Substitui todos os dados atuais.</AppText>
        <Button
          title="Importar JSON"
          icon="cloud-upload-outline"
          variant="secondary"
          loading={busy === 'import'}
          onPress={() =>
            confirm('Importar backup?', 'Todos os dados atuais serão substituídos pelos do arquivo.', importBackup, 'Importar')
          }
        />
      </Card>
      <Card>
        <AppText variant="subtitle">Planilha (CSV)</AppText>
        <AppText muted>Movimentações para abrir no Excel ou Google Planilhas.</AppText>
        <Button title="Exportar CSV" icon="grid-outline" variant="secondary" onPress={() => exportAs('csv')} loading={busy === 'csv'} />
      </Card>
    </Screen>
  );
}
