# Revisão do Nomma e plano de melhorias

Este documento registra uma revisão estrutural inicial e delimita uma melhoria pequena para executar. Leia antes de alterar o código. Faça apenas a melhoria do plano; não redesenhe telas nem reorganize o projeto inteiro. Preserve comportamento, nomes públicos usados pelas telas e dados existentes.

## 1. Diagnóstico geral

**Classificação: Boa.** O frontend está organizado por funcionalidade, com rotas do Expo Router funcionando como adaptadores finos, componentes compartilhados para padrões visuais, hooks para coordenação React, serviços para regras financeiras e repositórios por domínio para SQLite.

Escopo lido: configuração e scripts principais, rotas em `src/app/`, organização das features, arquivos centrais de layout/controles/gráficos, dashboard e análises, formulário de movimentação, hooks de finanças, store, repositório de transações, cálculos financeiros e migrations. Foram examinados também os tamanhos dos arquivos TypeScript/TSX e os imports das telas que usam `useFinance`. Não foi feita leitura linha a linha de todas as telas e repositórios nem execução de lint, typecheck ou testes; portanto, esta é uma revisão estrutural inicial, não uma certificação de bugs.

## 2. Estrutura atual

```text
src/
├── app/                  # 31 rotas/layouts do Expo Router
│   ├── (tabs)/           # Navegação principal
│   ├── accounts/ cards/ goals/ budgets/ purchases/ recurring/ transaction/
│   └── telas simples que delegam para features
├── components/           # Layout, controles, formulários, texto, gráficos
├── constants/            # Tema e valores padrão
├── database/             # SQLite, migrations, perfis e IDs
├── features/             # Telas e repositórios agrupados por domínio
├── hooks/                # Acesso ao estado, tema, plano e responsividade
├── i18n/                 # Catálogos pt-BR e en
├── schemas/               # Schemas de validação
├── services/              # Regras financeiras, auth, lembretes e assistente
├── stores/                # Store Zustand
├── types/                 # Tipos compartilhados
└── utils/                 # Datas e valores monetários
```

## 3. O que está bem separado

- As rotas são pequenas e delegam a tela à feature. Exemplo: `src/app/(tabs)/index.tsx` reexporta `DashboardScreen`; `src/app/transaction/new.tsx` delega a `TransactionFormScreen`.
- Features com persistência própria mantêm seus repositórios junto do domínio, por exemplo `src/features/transactions/repository.ts` e `src/features/cards/repository.ts`.
- Regras de saldo, planejamento e análises ficam fora da apresentação, em `src/services/finance/`. `src/hooks/usePlan.ts` combina funções puras desses serviços para entregar dados derivados à interface.
- `src/stores/financeStore.ts` coordena carregamento e estado global, sem misturar SQL de cada entidade no store.
- `src/constants/theme.ts` define paletas e tokens de espaço, raio e tipografia; `src/hooks/useTheme.ts` fornece o tema às telas.
- Componentes de `src/components/Layout.tsx`, `Controls.tsx` e `Charts.tsx` cobrem padrões reais do app. Mantenha-os compartilhados enquanto continuarem coesos.
- `src/database/migrations.ts` centraliza a evolução do schema SQLite e documenta que migrations publicadas não devem ser editadas.

## 4. Problemas encontrados

### 4.1 Módulo de finanças mistura acesso a dados e ações de interface

- **Arquivo:** `src/hooks/useFinance.ts`, aproximadamente linhas 7–76.
- **Problema:** o módulo exporta `useFinance` e `useLastFound`, mas também `useAction`, tratamento de erro com `Alert`, toast Android e confirmação destrutiva com `Alert.alert` (`notify` e `confirm`). Esses últimos cuidam de efeitos de interface e escrita/reload, responsabilidades diferentes do acesso ao estado financeiro.
- **Impacto:** várias features importam funções diferentes do mesmo arquivo, dificultando localizar e testar cada tipo de comportamento e aumentando o acoplamento do hook de leitura com feedback de UI.
- **Severidade:** baixa. Não foi identificado bug confirmado; é um limite de módulo que pode ser melhorado com uma extração pequena.

Não há evidência suficiente nesta revisão para classificar como problema a quantidade de linhas das telas de análises (263) ou dos componentes compartilhados. Os componentes auxiliares de análises são específicos daquela tela e devem ficar co-localizados enquanto não tiverem uso real em outros lugares.

## 5. Arquivos que deveriam ser separados

Dividir somente `src/hooks/useFinance.ts` em dois módulos coesos:

```text
Antes:
src/hooks/useFinance.ts
  useFinance, useLastFound, useAction, notify, confirm e tratamento de erros

Depois:
src/hooks/useFinance.ts
  useFinance e useLastFound (leitura e comportamento ligado ao ciclo dos dados)
src/hooks/useFinanceActions.ts
  useAction, notify, confirm e tratamento de erros de escrita/feedback
```

Atualize os imports consumidores sem alterar APIs, mensagens, ordem de gravação/reload, confirmações, ou comportamento de navegação. `useAction` pode importar `useFinance` do módulo existente. Preserve `useLastFound` no arquivo atual, pois protege a navegação de telas de detalhe durante remoção, conforme o comentário já documenta.

## 6. Arquivos que NÃO deveriam ser separados

- **`src/features/analytics/AnalyticsScreen.tsx`:** `Delta`, `Detail` e `Question` são auxiliares locais da tela; não há evidência de reutilização que justifique torná-los globais.
- **`src/components/Layout.tsx`:** os exports são primitivas de composição de tela, cartões, linhas e estados vazios. O arquivo tem 233 linhas, mas compartilha tema e padrões de layout. Não divida apenas por contagem de linhas.
- **`src/components/Controls.tsx`:** controles de formulário compartilham tema e contratos de interação. Nenhuma duplicação prejudicial foi confirmada.
- **`src/components/Charts.tsx`:** gráficos simples baseados em Views compartilham comportamento e não adicionam dependência nativa; manter juntos é razoável no tamanho atual.
- **`src/features/transactions/TransactionFormScreen.tsx`:** os campos variam a partir do tipo de movimentação e do método de pagamento; manter a composição junto evita fragmentação prematura. Reavaliar apenas se novas regras tornarem o fluxo substancialmente maior.
- **Rotas em `src/app/`:** mantenha-as como adaptadores de navegação e não mova lógica de feature para dentro delas.

## 7. Duplicações

- **Visual:** não foi confirmada duplicação de botões, campos, seletores, cartões ou estados vazios que justifique outro componente compartilhado; os exemplos observados usam `Controls.tsx` e `Layout.tsx`.
- **Lógica financeira:** cálculos observados estão nos serviços puros em `src/services/finance/`; não foi identificada duplicação concreta entre dashboard e análises na inspeção feita.
- **API/backend:** o app usa repositórios SQLite por feature; não foi encontrada repetição de chamadas remotas que justifique um cliente central.
- **Tipos/validação:** há schemas e tipos compartilhados dedicados; esta revisão não confirmou definições duplicadas.
- **Configuração:** tema e valores padrão estão em módulos próprios; nenhuma duplicação de tokens foi confirmada.

Recomendação: **manter separado** o que já está organizado por feature. Não consolidar componentes ou funções sem ocorrências duplicadas verificadas.

## 8. Organização recomendada

Manter a arquitetura atual e aplicar apenas a extração de `useFinanceActions.ts` descrita na seção 5. Não migrar todas as rotas, stores, serviços ou componentes para uma nova estrutura.

Observação de escala: `src/stores/financeStore.ts` carrega as entidades para memória; o próprio arquivo registra a intenção e sugere paginação caso o volume ultrapasse aproximadamente 50 mil transações. Não implemente paginação preventiva. Antes disso, meça o volume e o custo de abertura para confirmar a necessidade.

## 9. Plano de refatoração

- **P0 — crítico:** nenhum achado confirmado.
- **P1 — importante:** nenhum achado confirmado nesta revisão inicial.
- **P2 — melhoria:** extrair ações e feedback de interface de `src/hooks/useFinance.ts` para `src/hooks/useFinanceActions.ts`; atualizar todos os imports. Manter mensagens, chamadas de banco, reload, `busy`, trava contra toque duplo, alertas e callbacks exatamente como estão.
- **P3 — opcional:** considerar uma revisão de acessibilidade e consistência de traduções em uma tarefa própria, com inventário completo antes de editar. Não ampliar esta refatoração para esses temas.

### Critérios de conclusão para o Claude

1. Inspecionar o estado do Git antes de editar e preservar alterações preexistentes.
2. Consultar as instruções do repositório e a documentação versionada do Expo SDK 57 antes de qualquer mudança que use APIs Expo/React Native.
3. Fazer somente a extração indicada, sem alterar comportamento ou adicionar dependências.
4. Atualizar todos os imports encontrados por busca no repositório.
5. Executar `npm run typecheck` e `npm run lint`, conforme `AGENTS.md`; não criar uma nova suíte de testes para esta mudança. Relatar resultados e limitações.
6. Revisar `git diff` e garantir que nenhum arquivo gerado ou configuração local foi incluído por acidente.

## 10. Veredito final

**O código frontend está bem separado?** Sim, em geral. Rotas, features, serviços de domínio, repositórios, estado e componentes compartilhados têm limites claros. O único ajuste estrutural concreto desta revisão é separar ações de escrita e feedback de interface do módulo de acesso ao estado financeiro. Mantenha o restante como está; evite reorganização ampla sem evidência de acoplamento ou duplicação.
