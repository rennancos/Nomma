# Análises

Tela de Análises (aba "Análises"). Cada bloco responde uma pergunta financeira.
Os números vêm das transações salvas no SQLite; nada é fictício. A tela não consulta o banco por conta própria: usa os dados já carregados pelo `financeStore`.

## Camadas

| Camada | Arquivo | Papel |
| --- | --- | --- |
| Consulta | `src/stores/financeStore.ts` | Carrega as transações do SQLite (uma vez por escrita) |
| Regras | `src/services/finance/analytics.ts` | Funções puras: períodos, totais, economia, acumulado, categorias, variação |
| Transformação | `AnalyticsScreen` → `useMemo` | Aplica as regras ao período escolhido; recalcula só quando mudam as transações ou o período |
| Renderização | `src/components/Charts.tsx` | `BarChart`, `TrendChart` (barras + linha), `HBarList`, `Legend` — Views nativas, sem dependência de gráficos |

## Visões e períodos

Duas visões, escolhidas no topo da tela:

| Visão | Cada ponto dos gráficos é | Períodos |
| --- | --- | --- |
| **Mensal** (padrão) | um mês | Este mês, 3 meses, 6 meses (padrão), 12 meses |
| **Anual** | um ano inteiro (soma de jan a dez; o ano atual, até hoje) | Este ano (padrão), 3 anos, 5 anos |

Quem quer a análise anual vê os totais por ano, e não os meses do ano; quem quer a mensal vê mês a mês.
O período escolhido vale para o resumo e para todos os gráficos.
O **período anterior**, usado nas comparações, tem o mesmo tamanho e vem imediatamente antes.
Exemplos: 3 meses jul–set → anterior abr–jun; Este ano 2026 → anterior 2025; 3 anos 2024–2026 → anterior 2021–2023.

As mesmas regras valem nas duas visões: as funções só mudam o agrupamento (chave `yyyy-MM` ou `yyyy`).

## Fórmulas

| Métrica | Fórmula |
| --- | --- |
| Receitas | soma das transações `INCOME` |
| Despesas | soma das transações `EXPENSE` (inclui parcelas e faturas pagas, que viram despesas reais) |
| Investimentos (aporte) | soma das transações `INVESTMENT` |
| **Economia** | **receitas − despesas** |
| Taxa de economia | economia / receitas |
| Saldo livre | economia − investimentos |
| Renda utilizada | despesas / receitas |
| Renda investida | investimentos / receitas |
| Total investido (acumulado) | soma de **todos** os aportes até o fim do mês, inclusive os de antes do período |
| Variação | (atual − anterior) / \|anterior\| |

Transferências são neutras: não entram em receita, despesa nem investimento.
Sem receita no período, as porcentagens sobre a renda ficam indefinidas ("—"), em vez de dividir por zero.
Sem dados no período anterior, a comparação mostra "Sem período anterior para comparar".

### Investimento não é gasto

O investimento **não** é descontado da economia. Ele é o destino de parte dela.

Exemplo: receita R$ 5.300, despesas R$ 3.400 e aporte de R$ 1.000 →
**economia R$ 1.900** (35,8%), **investido R$ 1.000**, **saldo livre R$ 900**.

Essa regra vale para o app inteiro desde 01/10/2026. O "Economizado" do Início também passou a usar economia / receitas (antes descontava os investimentos).
O "Saldo restante" do Início continua igual, porque já era o saldo livre.

O total investido é o **valor aportado**. Rentabilidade não é calculada.

## Blocos da tela

| Bloco | Pergunta | Visualização | Toque mostra |
| --- | --- | --- | --- |
| Resumo do período | Quanto entrou, saiu, investi e economizei? | 4 cartões com variação vs. período anterior | — |
| Receitas x despesas | Entrou mais do que saiu? | Barras lado a lado por mês | mês, receitas, despesas, saldo, renda utilizada |
| Onde meu dinheiro foi parar? | Onde estou gastando mais? | Barras horizontais por categoria, da maior para a menor | valor, % das despesas, variação vs. período anterior |
| Investimentos | Quanto aportei e quanto já acumulei? | Barras = aporte do mês; linha = total acumulado | aporte, total investido, renda investida |
| Economia mensal | Estou economizando mais ou menos? | Linha da taxa de economia (com linha do zero se negativa) | economizado, taxa, investido, saldo livre |

Tocar num mês (ou ano) em qualquer gráfico seleciona o mesmo em todos. Sem toque, fica selecionado o último do período.
Com mais de 6 meses, os rótulos do eixo aparecem alternados para não se sobrepor.
No gráfico de investimentos, barras e linha têm escalas próprias; os valores exatos aparecem no detalhe.

As variações aparecem em tom neutro (↑ ↓ →), sem verde ou vermelho.

## Estados sem dados

- Período sem nenhuma movimentação: um único aviso ("Ainda não há dados suficientes para gerar esta análise. Comece registrando suas movimentações."), sem gráficos vazios.
- Sem despesas, sem aportes ou sem receitas: o bloco correspondente explica o que falta, em vez de mostrar um gráfico vazio.

## Categorias

Agrupadas pela categoria da despesa. Despesas sem categoria aparecem como "Sem categoria". Os nomes são os cadastrados pelo usuário e não são traduzidos.
O percentual é a participação nas despesas do período. As categorias somam 100%.

## Idioma

Todos os textos da tela vêm do i18n (`analytics.*` em `src/i18n/locales/`), em português e inglês, conforme o idioma do aparelho. Os nomes dos meses seguem o mesmo idioma.
Valores continuam em reais (R$), em qualquer idioma.

**Ressalva:** só a marca e esta tela estão traduzidas. Num aparelho em inglês, as Análises aparecem em inglês e as outras telas, em português.

## Testes

`src/services/finance/__tests__/analytics.test.ts`: períodos e período anterior; receitas, despesas e investimentos; economia e saldo livre; taxa de economia, renda utilizada e renda investida; acumulado (com aporte anterior ao período); totais do período; variação, inclusive sem base e com base negativa; categorias (ordem, % que soma 100, variação, categoria sem histórico); períodos sem dados.
`src/i18n/__tests__/index.test.ts`: marcadores nos textos e as mesmas chaves nos dois idiomas.
