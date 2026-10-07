import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, ChipSelect, MonthSwitcher, TextField, Toggle } from '@/components/Controls';
import { Card, EmptyState, Icon, Line, Screen, Section, Stat, StatGrid } from '@/components/Layout';
import { HBarList } from '@/components/Charts';
import { AppText, Money } from '@/components/Text';
import { PAYMENT_LABELS } from '@/constants/defaults';
import { radius, spacing } from '@/constants/theme';
import { useFinance } from '@/hooks/useFinance';
import { useFinanceStore } from '@/stores/financeStore';
import { useTheme } from '@/hooks/useTheme';
import { askAssistant, assistantAvailable, assistantConfigured } from '@/services/assistant/client';
import { ACCOUNTING_NOTE, DATA_LIMITS, QUICK_QUESTIONS, buildAssistantReport, quickAnswer, type AssistantFilters, type AssistantReport, type Dimension } from '@/services/finance/assistant';
import { formatDateBR, formatMonthLabel, monthKeyOf, todayISO } from '@/utils/date';
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
        setMessages(m => [...m.slice(-11), { question, answer, source: 'Resposta da IA' }]);
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
      <ChipSelect
        options={QUICK_QUESTIONS.map(q => ({ value: q, label: q }))}
        value={messages.at(-1)?.question ?? null}
        onChange={q => { if (q) setMessages(m => [...m.slice(-11), { question: q, answer: quickAnswer(report, q), source: 'Consulta local' }]); }}
      />
      {messages.map((m, i) => <Card key={i}>
        <AppText variant="subtitle">{m.question}</AppText>
        <AppText variant="caption" color={colors.primary}>{m.source}</AppText>
        <AppText selectable>{m.answer.replace(/R\$[ \u00a0]+/g, 'R$\u00a0')}</AppText>
      </Card>)}
      {messages.length > 0 && <Pressable accessibilityRole="button" style={styles.action} onPress={() => setMessages([])}><AppText variant="small" color={colors.primary}>Limpar conversa</AppText></Pressable>}
      {!available && <View style={{ gap: spacing.xs }}>
        <View style={styles.inline}>
          <Icon name="information-circle-outline" size={18} color={colors.textMuted} />
          <AppText variant="small" muted style={{ flex: 1 }}>{assistantConfigured() ? 'Entre na conta para usar a IA' : 'IA indisponível neste app'}</AppText>
        </View>
        {assistantConfigured() && <Button title="Entrar na conta" variant="secondary" icon="person-circle-outline" onPress={() => router.push('/account')} />}
      </View>}
      {available && <Card>
        <AppText variant="caption" muted>A conversa reinicia ao mudar o mês, os filtros ou os dados. Confira as respostas nos registros.</AppText>
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
  const [entriesOpen, setEntriesOpen] = useState(false);
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const { colors } = useTheme();
  const [dimension, setDimension] = useState<Dimension>('category');
  const [groupKey, setGroupKey] = useState<string | null>(null);
  const [count, setCount] = useState(20);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const today = todayISO();
  const report = useMemo(() => buildAssistantReport(data, filters, today), [data, filters, today]);
  const update = (patch: Partial<AssistantFilters>) => { setFilters(f => ({ ...f, ...patch })); setGroupKey(null); setCount(20); setEntriesOpen(false); };
  const groups = report.breakdown[dimension].filter(g => g.value > 0);
  const selected = groups.find(g => g.key === groupKey);
  const evidence = selected ? report.current.filter(t => selected.ids.includes(t.id)) : report.current;
  const reload = async () => {
    if (loading) return;
    setLoading(true);
    try { setLoadError(!(await refresh())); } finally { setLoading(false); }
  };
  const filterOptions = [
    { key: 'bank', label: 'Banco', options: report.banks },
    { key: 'account', label: 'Conta', options: data.accounts.map(a => ({ value: a.id, label: a.name })) },
    { key: 'card', label: 'Cartão', options: data.cards.map(c => ({ value: c.id, label: c.name })) },
    { key: 'category', label: 'Categoria', options: data.categories.map(c => ({ value: c.id, label: c.name })) },
    { key: 'payment', label: 'Pagamento', options: Object.entries(PAYMENT_LABELS).map(([value, label]) => ({ value, label })) },
  ] as const;
  const activeFilters = filterOptions.filter(f => filters[f.key] != null);
  const clearFilters = () => update({ bank: null, account: null, card: null, category: null, payment: null });
  const changeColor = report.expenseChange === null || report.expenseChange === 0 ? colors.textMuted : report.expenseChange < 0 ? colors.income : colors.expense;
  return (
    <>
      {/* O Screen já encolhe a tela com o teclado (useKeyboardInset). */}
      <Screen size="list">
        <View style={{ gap: spacing.xs }}>
          <MonthSwitcher month={filters.month} onChange={month => update({ month })} />
          <View style={styles.toolbar}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded }} style={styles.action} onPress={() => setExpanded(!expanded)}>
              <Icon name="options-outline" size={18} color={colors.primary} />
              <AppText variant="small" color={colors.primary}>Filtros{activeFilters.length ? ` (${activeFilters.length})` : ''}</AppText>
            </Pressable>
            <View style={styles.inline}>
              <AppText variant="caption" muted>{loadedAt ? `Atualizado às ${new Date(loadedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Sem atualização'}</AppText>
              <Pressable accessibilityRole="button" accessibilityLabel={loadError ? 'Tentar atualizar novamente' : 'Atualizar dados'} accessibilityState={{ disabled: loading, busy: loading }} disabled={loading} style={styles.action} onPress={reload}>
                <Icon name="refresh-outline" size={20} color={loading ? colors.textMuted : colors.primary} />
              </Pressable>
            </View>
          </View>
          {loadError && <AppText accessibilityRole="alert" color={colors.danger}>Não foi possível atualizar. Os dados exibidos são da última carga.</AppText>}
          <AppText variant="caption" muted>{formatDateBR(report.bounds.start)} a {formatDateBR(report.bounds.end)} · realizados até {formatDateBR(today)}</AppText>
          {activeFilters.length > 0 && <View style={styles.chips}>
            {activeFilters.map(f => <Pressable key={f.key} accessibilityRole="button" accessibilityLabel={`Remover filtro ${f.label}: ${f.options.find(o => o.value === filters[f.key])?.label ?? filters[f.key]}`} style={[styles.filterChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]} onPress={() => update({ [f.key]: null })}>
              <AppText variant="small" style={{ flexShrink: 1 }}>{f.label}: {f.options.find(o => o.value === filters[f.key])?.label ?? filters[f.key]}</AppText>
              <Icon name="close" size={16} color={colors.textMuted} />
            </Pressable>)}
            <Pressable accessibilityRole="button" accessibilityLabel="Limpar filtros" style={styles.action} onPress={clearFilters}><AppText variant="small" color={colors.primary}>Limpar</AppText></Pressable>
          </View>}
        </View>
        {expanded && <Card>
          <AppText variant="caption" muted>Toque novamente em uma opção selecionada para remover o filtro.</AppText>
          <ChipSelect label="Banco / instituição" options={report.banks} value={filters.bank ?? null} onChange={bank => update({ bank })} allowNone />
          <ChipSelect label="Conta" options={data.accounts.map(a => ({ value: a.id, label: a.name }))} value={filters.account ?? null} onChange={account => update({ account })} allowNone />
          <ChipSelect label="Cartão" options={data.cards.map(c => ({ value: c.id, label: c.name }))} value={filters.card ?? null} onChange={card => update({ card })} allowNone />
          <ChipSelect label="Categoria" options={data.categories.map(c => ({ value: c.id, label: c.name }))} value={filters.category ?? null} onChange={category => update({ category })} allowNone />
          <ChipSelect label="Pagamento" options={Object.entries(PAYMENT_LABELS).map(([value, label]) => ({ value, label }))} value={filters.payment ?? null} onChange={payment => update({ payment })} allowNone />
          <Button title="Limpar filtros" variant="secondary" onPress={clearFilters} />
        </Card>}
        <StatGrid>
          <Stat label="Receitas" color={colors.income}><Money value={report.summary.income} variant="subtitle" color={colors.income} /></Stat>
          <Stat label="Despesas" color={colors.expense}><Money value={report.summary.expenses} variant="subtitle" color={colors.expense} /></Stat>
          <Stat label="Aportes" color={colors.investment}><Money value={report.summary.investments} variant="subtitle" color={colors.investment} /></Stat>
          <Stat label="Saldo após aportes" color={colors.primary}><Money value={report.summary.free} variant="subtitle" color={colors.primary} /></Stat>
        </StatGrid>
        <Conversation key={JSON.stringify(filters) + loadedAt} report={report} />
        <Section title="Distribuição das despesas">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xs }}>
            <ChipSelect options={DIMENSIONS} value={dimension} onChange={d => { if (d) { setDimension(d); setGroupKey(null); setCount(20); setEntriesOpen(false); } }} />
          </ScrollView>
          <Card>
            {groups.length ? <HBarList items={groups} selected={selected ? groups.indexOf(selected) : null} onSelect={i => { setGroupKey(i == null ? null : groups[i]!.key); setCount(20); setEntriesOpen(i != null); }} /> : <EmptyState title="Nenhuma despesa neste recorte" />}
            <AppText variant="caption" muted>Toque em uma barra para filtrar os lançamentos abaixo. Descrições não identificam estabelecimentos com certeza.</AppText>
          </Card>
        </Section>
        {report.largest.length > 0 && <Section title="Maiores despesas"><Card>{report.largest.slice(0, 5).map(tx => <TransactionRow key={tx.id} tx={tx} showDate />)}</Card></Section>}
        <Section title="Saldos e comparação">
          <Card>
            <Line label="Disponível nas contas" value={report.balances.available} />
            <Line label="Em contas de investimento" value={report.balances.invested} color={colors.investment} />
            <AppText variant="caption" muted>Saldos de hoje, com valores iniciais e transferências. Não seguem os filtros e não são cotações de mercado.</AppText>
            <Line label="Despesas do mês anterior" value={report.before.expenses} />
            <View style={styles.toolbar}>
              <AppText variant="small" muted>Variação das despesas</AppText>
              <AppText variant="small" weight="600" color={changeColor}>
                {report.expenseChange === null ? 'sem base percentual' : `${report.expenseChange < 0 ? '↓ ' : report.expenseChange > 0 ? '↑ ' : ''}${formatPercent(report.expenseChange)}`}
              </AppText>
            </View>
            <AppText variant="caption" muted>Comparação com {formatMonthLabel(report.previousMonth).toLocaleLowerCase('pt-BR')} completo, com os mesmos filtros. O mês atual pode estar parcial.</AppText>
          </Card>
        </Section>
        <Card>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: entriesOpen }} style={styles.disclosure} onPress={() => setEntriesOpen(!entriesOpen)}>
            <AppText weight="600" style={{ flex: 1 }}>{entriesOpen ? 'Ocultar' : 'Ver os'} {evidence.length} lançamentos usados{selected ? ` · ${selected.label}` : ''}</AppText>
            <Icon name={entriesOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
          </Pressable>
          {entriesOpen && <>
            {evidence.length ? evidence.slice(0, count).map(tx => <TransactionRow key={tx.id} tx={tx} showDate />) : <EmptyState title="Nenhum lançamento" message="Ajuste os filtros ou registre movimentações." />}
            {count < evidence.length && <Button title="Mostrar mais lançamentos" variant="secondary" onPress={() => setCount(n => n + 20)} />}
          </>}
        </Card>
        <Card>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: criteriaOpen }} style={styles.disclosure} onPress={() => setCriteriaOpen(!criteriaOpen)}>
            <AppText weight="600" style={{ flex: 1 }}>Como os valores são calculados</AppText>
            <Icon name={criteriaOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
          </Pressable>
          {criteriaOpen && <><AppText variant="caption" muted>{ACCOUNTING_NOTE}</AppText><AppText variant="caption" muted>{DATA_LIMITS}</AppText></>}
        </Card>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.xs },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  action: { minWidth: 44, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, alignSelf: 'flex-start' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filterChip: { minHeight: 44, maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderWidth: 1, borderRadius: radius.pill },
  disclosure: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
