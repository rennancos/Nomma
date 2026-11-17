import { useState } from 'react';
import { Alert } from 'react-native';
import { Button, ChipSelect } from '@/components/Controls';
import { Card, Screen } from '@/components/Layout';
import { AppText } from '@/components/Text';
import { useFinance } from '@/hooks/useFinance';
import { confirm } from '@/hooks/useFinanceActions';
import { BackupError, buildJsonBackup, buildTransactionsCsv, pickBackupFile, pickStatementFile, restoreJsonBackup, shareFile } from './export';
import { importStatement, parseStatement } from './statement';

export default function BackupScreen() {
  const { db, data, refresh } = useFinance();
  const [busy, setBusy] = useState<'json' | 'csv' | 'import' | 'ofx' | null>(null);
  const accounts = data.accounts.filter((a) => !a.archived);
  const [ofxAccount, setOfxAccount] = useState<string | null>(accounts.find((a) => a.type !== 'INVESTMENT')?.id ?? null);

  const importBankStatement = async () => {
    if (!ofxAccount) return;
    setBusy('ofx');
    try {
      const content = await pickStatementFile();
      if (content === null) return;
      const entries = parseStatement(content);
      if (entries.length === 0) {
        Alert.alert('Nenhum lançamento encontrado', 'Escolha um extrato em OFX ou CSV, exportado pelo site ou app do seu banco.');
        return;
      }
      const plan = await importStatement(db, ofxAccount, entries);
      await refresh();
      const lines = [
        `${plan.inserts.length} lançamento(s) novo(s)`,
        plan.transfers.length > 0 && `${plan.transfers.length} transferência(s) entre suas contas reconhecida(s)`,
        plan.manual > 0 && `${plan.manual} já estavam lançados e foram ignorados`,
        plan.repeated > 0 && `${plan.repeated} já importados antes`,
      ];
      Alert.alert('Extrato importado', lines.filter(Boolean).join('\n'));
    } catch {
      // Sem log do erro: pode conter valores financeiros. A gravação é uma transação só: em caso de falha, nada entra.
      Alert.alert('Não foi possível importar', 'O arquivo é inválido ou está danificado. Nenhum lançamento foi adicionado.');
    } finally {
      setBusy(null);
    }
  };

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
        <AppText variant="subtitle">Importar extrato do banco</AppText>
        <AppText muted>Adiciona os lançamentos de um extrato OFX ou CSV à conta escolhida. Não repete o que já foi importado ou digitado, reconhece transferências entre suas contas e reaproveita a categoria de lançamentos com a mesma descrição.</AppText>
        <ChipSelect label="Conta" options={accounts.map((a) => ({ value: a.id, label: a.name }))} value={ofxAccount} onChange={(v) => v && setOfxAccount(v)} />
        <Button title="Importar extrato" icon="cloud-upload-outline" onPress={importBankStatement} loading={busy === 'ofx'} disabled={!ofxAccount} />
      </Card>
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
