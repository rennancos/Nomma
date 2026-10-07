import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Button, ChipSelect, MonthSwitcher, TextField, Toggle } from '@/components/Controls';
import { Card, EmptyState, Screen, Section, Stat, StatGrid } from '@/components/Layout';
import { HBarList } from '@/components/Charts';
import { AppText, Money } from '@/components/Text';
import { PAYMENT_LABELS } from '@/constants/defaults';
import { spacing } from '@/constants/theme';
import { useFinance } from '@/hooks/useFinance';
import { useFinanceStore } from '@/stores/financeStore';
import { useTheme } from '@/hooks/useTheme';
import { askAssistant, assistantAvailable, assistantConfigured } from '@/services/assistant/client';
import { ACCOUNTING_NOTE, DATA_LIMITS, QUICK_QUESTIONS, buildAssistantReport, quickAnswer, type AssistantFilters, type AssistantReport, type Dimension } from '@/services/finance/assistant';
import { formatDateBR, monthKeyOf, todayISO } from '@/utils/date';
import { formatPercent } from '@/utils/money';
import { TransactionRow } from '@/features/transactions/TransactionRow';

function Conversation({ report }: { report: AssistantReport }) {
  const [question, setQuestion] = useState('');
  const [consent, setConsent] = useState(false);
  const [messages, setMessages] = useState<{ question: string; answer: string; source: string }[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const { colors } = useTheme();
  const available = assistantAvailable();
  useEffect(() => () => pending.current?.abort(), []);
  const send = async () => {
    if (pending.current || !consent) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true); setError('');
    try {
      const answer = await askAssistant(question, report, controller.signal);
      if (!controller.signal.aborted) {
        setMessages(m => [...m.slice(-11), { question, answer, source: 'Resposta da IA · confira os registros' }]);
        setQuestion('');
      }
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Não foi possível consultar a IA.');
    } finally {
      if (!controller.signal.aborted) setBusy(false);
      pending.current = null;
    }
  };
  return (
    <Section title="Pergunte sobre suas finanças">
      <Card>
        <AppText muted>
          {available
            ? 'Cada pergunta usa o período e os filtros selecionados. A conversa é temporária e reinicia ao alterar o recorte.'
            : assistantConfigured()
              ? 'Entre na sua conta para conversar com a IA. As consultas locais abaixo já funcionam, sem enviar seus dados.'
              : 'Conversa com IA indisponível: o serviço ainda não foi configurado neste aplicativo. As consultas locais abaixo já funcionam, sem enviar seus dados.'}
        </AppText>
        {!available && assistantConfigured() && <Button title="Entrar na conta" variant="secondary" icon="person-circle-outline" onPress={() => router.push('/account')} />}
        <AppText weight="600">Consultas locais</AppText>
        {QUICK_QUESTIONS.map(q => <Button key={q} title={q} variant="secondary" onPress={() => setMessages(m => [...m.slice(-11), { question: q, answer: quickAnswer(report, q), source: 'Consulta local · calculada pelos registros' }])} />)}
      </Card>
      {messages.map((m, i) => <Card key={i}><AppText weight="600">{m.question}</AppText><AppText variant="caption" muted>{m.source}</AppText><AppText selectable>{m.answer}</AppText></Card>)}
      {messages.length > 0 && <Button title="Limpar conversa" variant="secondary" onPress={() => setMessages([])} />}
      {available && <Card>
        <Toggle label="Permitir análise por IA" value={consent} onChange={setConsent} hint="Ao enviar, sua pergunta e resumos financeiros (valores, categorias e bancos) serão compartilhados com o serviço de IA. Notas e transações individuais ficam no aparelho." />
        <TextField accessibilityLabel="Pergunta para a IA" label="Sua pergunta" value={question} onChangeText={setQuestion} maxLength={1000} multiline placeholder="Como estão meus gastos neste período?" editable={!busy} />
        {error ? <AppText accessibilityRole="alert" color={colors.danger}>{error}</AppText> : null}
        <Button title={error ? 'Tentar novamente' : 'Enviar pergunta'} onPress={send} loading={busy} disabled={!consent || !question.trim()} />
      </Card>}
    </Section>
  );
}

const DIMENSIONS: { value: Dimension; label: string }[] = [
  { value: 'category', label: 'Categoria' }, { value: 'bank', label: 'Banco' },
  { value: 'payment', label: 'Pagamento' }, { value: 'account', label: 'Conta' },
  { value: 'card', label: 'Cartão' }, { value: 'description', label: 'Descrição' },
];

export default function AssistantScreen() {
  const { data, refresh } = useFinance();
  const loadedAt = useFinanceStore(s => s.loadedAt);
  const [filters, setFilters] = useState<AssistantFilters>({ month: monthKeyOf(todayISO()) });
  const [expanded, setExpanded] = useState(false);
  const [dimension, setDimension] = useState<Dimension>('category');
  const [groupKey, setGroupKey] = useState<string | null>(null);
  const [count, setCount] = useState(20);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const today = todayISO();
  const report = useMemo(() => buildAssistantReport(data, filters, today), [data, filters, today]);
  const update = (patch: Partial<AssistantFilters>) => { setFilters(f => ({ ...f, ...patch })); setGroupKey(null); setCount(20); };
  const groups = report.breakdown[dimension];
  const selected = groups.find(g => g.key === groupKey);
  const evidence = selected ? report.current.filter(t => selected.ids.includes(t.id)) : report.current;
  const reload = async () => {
    if (loading) return;
    setLoading(true);
    try { setLoadError(!(await refresh())); } finally { setLoading(false); }
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
      <Screen>
        <Card>
          <AppText variant="subtitle">Seu panorama financeiro</AppText>
          <AppText muted>Entenda suas receitas, seus gastos e seus aportes a partir dos registros do aplicativo.</AppText>
          <AppText variant="caption" muted>Dados carregados: {loadedAt ? new Date(loadedAt).toLocaleString('pt-BR') : 'Não informado'}</AppText>
          <Button title={loadError ? 'Tentar atualizar novamente' : 'Atualizar dados'} variant="secondary" onPress={reload} loading={loading} />
          {loadError && <AppText accessibilityRole="alert">Não foi possível atualizar. Os dados exibidos são da última carga.</AppText>}
        </Card>
        <MonthSwitcher month={filters.month} onChange={month => update({ month })} />
        <AppText variant="small" muted>{formatDateBR(report.bounds.start)} a {formatDateBR(report.bounds.end)} · realizados até {formatDateBR(today)}</AppText>
        <Button title={expanded ? 'Ocultar filtros' : 'Filtrar resultados'} variant="secondary" onPress={() => setExpanded(!expanded)} />
        {Object.entries(filters).some(([key, value]) => key !== 'month' && value != null) && <AppText variant="small" muted>Filtros ativos: os indicadores mensais e as consultas usam somente o recorte selecionado.</AppText>}
        {expanded && <Card>
          <AppText variant="caption" muted>Toque novamente em uma opção selecionada para remover o filtro.</AppText>
          <ChipSelect label="Banco / instituição" options={report.banks} value={filters.bank ?? null} onChange={bank => update({ bank })} allowNone />
          <ChipSelect label="Conta" options={data.accounts.map(a => ({ value: a.id, label: a.name }))} value={filters.account ?? null} onChange={account => update({ account })} allowNone />
          <ChipSelect label="Cartão" options={data.cards.map(c => ({ value: c.id, label: c.name }))} value={filters.card ?? null} onChange={card => update({ card })} allowNone />
          <ChipSelect label="Categoria" options={data.categories.map(c => ({ value: c.id, label: c.name }))} value={filters.category ?? null} onChange={category => update({ category })} allowNone />
          <ChipSelect label="Pagamento" options={Object.entries(PAYMENT_LABELS).map(([value, label]) => ({ value, label }))} value={filters.payment ?? null} onChange={payment => update({ payment })} allowNone />
          <Button title="Limpar filtros" variant="secondary" onPress={() => { setFilters({ month: filters.month }); setGroupKey(null); setCount(20); }} />
        </Card>}
        <StatGrid>
          <Stat label="Receitas"><Money value={report.summary.income} /></Stat>
          <Stat label="Despesas"><Money value={report.summary.expenses} /></Stat>
          <Stat label="Aportes"><Money value={report.summary.investments} /></Stat>
          <Stat label="Saldo após aportes"><Money value={report.summary.free} /></Stat>
        </StatGrid>
        <Card>
          <AppText>Disponível registrado em todas as contas hoje: <Money value={report.balances.available} /></AppText>
          <AppText>Saldo registrado em contas de investimento: <Money value={report.balances.invested} /></AppText>
          <AppText variant="caption" muted>Esses saldos incluem saldos iniciais e transferências; não seguem os filtros acima e não são cotações de mercado.</AppText>
          <AppText>Despesas no mês anterior: <Money value={report.before.expenses} /> · variação: {report.expenseChange === null ? 'sem base percentual' : formatPercent(report.expenseChange)}</AppText>
          <AppText variant="caption" muted>Comparação com {report.previousMonth} completo, usando os mesmos filtros. O mês atual pode estar parcial.</AppText>
        </Card>
        <Conversation key={JSON.stringify(filters) + loadedAt} report={report} />
        <Section title="Distribuição das despesas">
          <ChipSelect options={DIMENSIONS} value={dimension} onChange={d => { if (d) { setDimension(d); setGroupKey(null); setCount(20); } }} />
          <Card>
            {groups.length ? <HBarList items={groups} selected={groups.findIndex(g => g.key === groupKey)} onSelect={i => { setGroupKey(i == null ? null : groups[i]!.key); setCount(20); }} /> : <EmptyState title="Nenhuma despesa neste recorte" />}
            <AppText variant="caption" muted>Toque em uma barra para filtrar os lançamentos abaixo. Descrições não identificam estabelecimentos com certeza.</AppText>
          </Card>
        </Section>
        {report.largest.length > 0 && <Section title="Maiores despesas"><Card>{report.largest.map(tx => <TransactionRow key={tx.id} tx={tx} showDate />)}</Card></Section>}
        <Section title={`Lançamentos usados${selected ? ` · ${selected.label}` : ''} (${evidence.length})`}>
          <Card>{evidence.length ? evidence.slice(0, count).map(tx => <TransactionRow key={tx.id} tx={tx} showDate />) : <EmptyState title="Nenhum lançamento" message="Ajuste os filtros ou registre movimentações." />}</Card>
          {count < evidence.length && <Button title="Mostrar mais lançamentos" variant="secondary" onPress={() => setCount(n => n + 20)} />}
        </Section>
        <View style={{ gap: spacing.sm }}><AppText variant="small" muted>{ACCOUNTING_NOTE}</AppText><AppText variant="small" muted>{DATA_LIMITS}</AppText></View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
