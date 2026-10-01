# Regras financeiras

Implementadas em `src/services/finance/` (funções puras) e testadas em `src/services/finance/__tests__/`.
Todos os valores em centavos inteiros.

## Tipos de movimentação

| Tipo | Conta de origem | Conta de destino | Entra no resumo do mês como |
| --- | --- | --- | --- |
| INCOME (receita) | + valor | — | Receita |
| EXPENSE (despesa) | − valor | — (ignorada mesmo se preenchida) | Despesa |
| INVESTMENT (aporte) | − valor | + valor, se informada | Investimento |
| TRANSFER | − valor | + valor (obrigatória) | Nada — só move saldo |

## Saldo

- **Saldo da conta** = saldo inicial + receitas − saídas + entradas (transferências/aportes recebidos).
- **Saldo disponível** (topo do dashboard) = soma das contas que **não** são do tipo Investimentos.
- **Em investimentos** = soma das contas do tipo Investimentos.
- Uma transferência nunca altera o patrimônio total. Transferir para a conta Investimentos reduz o disponível, mas não conta como aporte do mês; para registrar aporte use "Adicionar investimento".

## Resumo do mês (competência pela data da movimentação)

- Receitas, Despesas, Investimentos = somas por tipo com data no mês.
- **Saldo restante** = receitas − despesas − investimentos.
- **% da renda utilizada** = (despesas + investimentos) / receitas.
- **% investido** = investimentos / receitas.
- **Economia** = receitas − despesas. Investimento não é gasto e não é descontado da economia (regra revista em 01/10/2026; ver ANALYTICS.md).
- **% economizado** = economia / receitas.
- **Saldo livre** = economia − investimentos (é o mesmo valor do saldo restante).
- Sem receita no mês, os percentuais ficam indefinidos ("—").

Exemplo (teste): receita 5.300,00; despesas 2.154,68; investimentos 300,00 → restante 2.845,32; utilizado 46%.

## Recorrências (salário, gastos fixos)

- Ocorrência do mês = dia configurado, limitado ao último dia (dia 31 em fevereiro → 28/29).
- Não gera ocorrências antes da data de início (não retroage).
- Pagar/receber cria a transação real ligada à recorrência. Data = vencimento, ou hoje se pago antes.
- **Lançamento automático** (ex.: salário): ao abrir o app, ocorrências automáticas cujo dia já chegou no mês atual são lançadas. Meses em que o app não foi aberto não são retroativos.
- **Gastos fixos**: previstos = recorrências de despesa do mês; pagos = já lançadas; pendentes = previstos − pagos.

## Parcelamentos

- O total é dividido em parcelas inteiras; os centavos que sobram vão para as primeiras (R$ 1.000 em 3x = 333,34 + 333,33 + 333,33).
- Fora do cartão: a data informada é a da 1ª parcela; as seguintes vencem no mesmo dia dos meses seguintes (ajustado ao fim do mês).
- Parcela paga = vira despesa real na conta escolhida, com a categoria da compra (aparece nas análises no mês do pagamento).

## Cartão de crédito

- **Fatura da compra**: compras antes do dia de fechamento entram na fatura que fecha no mês; a partir do fechamento, na do mês seguinte.
- **Vencimento**: se o dia de vencimento é maior que o de fechamento, vence no mesmo mês do fechamento; senão, no mês seguinte.
  Ex.: Nubank fecha 25, vence 2 → compra em 10/09 vence 02/10; compra em 25/09 vence 02/11.
- Parcela k vence k−1 meses após a fatura da compra.
- **Limite utilizado** = soma das parcelas não pagas. **Disponível** = limite − utilizado.
- **Fatura atual** = parcelas com vencimento na fatura em que uma compra feita hoje cairia. **Próxima fatura** = mês seguinte.
- **Pagar fatura** = cada parcela da fatura vira uma despesa na conta escolhida (regime de caixa: a despesa entra no mês em que é paga, sem contar duas vezes).

## Despesas previstas e comprometido

- **Despesas previstas** = gastos fixos pendentes + parcelas/faturas pendentes com vencimento no mês (inclui atrasadas do mês).
- **Comprometido no mês** = despesas já realizadas + despesas previstas.

## Projeção do mês

> Se você não realizar novos gastos, deverá terminar o mês com aproximadamente R$ X.

X = saldo disponível + receitas recorrentes pendentes no mês − despesas previstas pendentes no mês.

## Limite diário sugerido

1. Próximo salário = próximo dia de pagamento (Configurações) estritamente depois de hoje.
2. Pendentes = despesas previstas não pagas com vencimento antes do próximo salário (deste mês e do seguinte).
3. Saldo livre = saldo disponível − pendentes.
4. Dias restantes = dias até o próximo salário (mínimo 1).
5. Por dia = saldo livre ÷ dias, arredondado para baixo; nunca negativo.

Receitas eventuais antes do salário não entram (visão conservadora).
Exemplo (teste): saldo 1.800, pendentes 600, 20 dias → R$ 60/dia.

## Orçamento por categoria

- Limite mensal por categoria de despesa; utilizado = despesas da categoria no mês.
- Percentual arredondado. ≥ 75% = aviso ("Você já utilizou 77% do orçamento de Delivery."); acima do limite = estourado.
- Sem alertas agressivos: o aviso aparece como card discreto no dashboard e na tela de orçamentos.

## Metas

- Progresso = atual / meta. Valor atual é atualizado manualmente.

## Fechamento do mês (Análises)

Receita, despesas, investimentos, saldo, % economizado, categoria de maior gasto, totais de Alimentação (Alimentação + Delivery + Mercado), Transporte (Transporte + Uber + Combustível), Lazer (Lazer + Viagens + Streaming) e variação das despesas em relação ao mês anterior.
