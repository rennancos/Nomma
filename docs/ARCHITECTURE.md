# Arquitetura

Aplicativo Android offline-first. Todos os dados ficam em um banco SQLite no próprio aparelho.

## Stack

| Camada | Escolha | Motivo |
| --- | --- | --- |
| App | React Native 0.86 + Expo SDK 57 + TypeScript strict | Build Android nativo, sem Expo Go |
| Navegação | Expo Router (arquivos em `src/app`) | Rotas por arquivo, abas + pilha |
| Banco | `expo-sqlite` + SQL puro + migrations por `PRAGMA user_version` | Ver "Por que não Drizzle" |
| Estado | Zustand (um store com a fotografia dos dados) | Simples, sem boilerplate |
| Formulários | React Hook Form + Zod (`@hookform/resolvers`) | Validação única na fronteira |
| Datas | date-fns (locale pt-BR) | |
| Gráficos | Componentes próprios com `View` (`src/components/Charts.tsx`) | Zero dependência nativa extra |
| Ícones | `@expo/vector-icons` (Ionicons) | Já integrado ao Expo |
| Exportação | `expo-file-system` + `expo-sharing` | Menu de compartilhar do Android |

## Estrutura

```
src/
  app/                 Rotas (Expo Router). Arquivos finos: reexportam telas de features/
    (tabs)/            Início, Movimentações, + (Adicionar), Análises, Mais
  features/<domínio>/  Telas e repositório SQL de cada domínio
    transactions/  accounts/  categories/  recurring/  cards/ (cartões, parcelamentos)
    investments/  goals/  budgets/  analytics/  dashboard/  backup/  settings/  more/
  services/finance/    Regras financeiras PURAS (sem React, sem banco) + testes
    balance.ts         saldos por conta, resumo do mês, totais por categoria
    schedule.ts        recorrências, parcelas, faturas de cartão
    planning.ts        projeção do mês, limite diário, orçamento
    filters.ts         filtros do histórico
  database/            migrations, seed demonstrativo, geração de ids
  stores/              financeStore (Zustand)
  hooks/               useFinance/useAction (dados + escrita), usePlan (números do mês), useTheme
  schemas/             Esquemas Zod dos formulários (texto → centavos/datas ISO)
  components/          UI reutilizável (Text, Layout, Controls, Form, Charts)
  constants/           Tokens de design (theme.ts), categorias/contas padrão, rótulos
  types/               Tipos de domínio
  utils/               Dinheiro (centavos) e datas
```

## Fluxo de dados

```
Tela ──(form)──> schema Zod ──> repositório (SQL) ──> SQLite
  ▲                                                     │
  └── usePlan/useFinance ◄── financeStore.load() ◄──────┘  (recarrega após cada escrita)
```

1. `SQLiteProvider` abre `financas.db` e roda `migrate()` (liga `foreign_keys` e WAL).
2. `financeStore.load()` lança recorrências automáticas vencidas e carrega todas as tabelas.
3. Telas leem do store; números derivados vêm de `usePlan()`, que só chama funções de `services/finance`.
4. Toda escrita passa por `useAction().run(fn)`: executa, recarrega o store e mostra erro amigável (sem logar dados).

Carregar tudo em memória é intencional: para uso pessoal (milhares de registros) é instantâneo e elimina cache/invalidação.
Se passar de ~50 mil transações, trocar por consultas paginadas por mês (marcado com `ponytail:` no código).

## Decisões

- **Sem Drizzle ORM.** Drizzle no Expo exige `drizzle-kit`, plugin Babel para importar `.sql` e config extra de Metro.
  O esquema é pequeno; SQL explícito + migrations numeradas é mais simples e estável.
- **Dinheiro em centavos (INTEGER)** em todo lugar; `parseMoney` converte texto sem passar por float.
- **Datas `yyyy-MM-dd` (TEXT)**: ordenáveis como texto, sem fuso horário.
- **IDs UUID** (`expo-crypto`): permitem sincronização futura entre dispositivos sem colisão.
- **Telas em `features/`, rotas finas em `app/`**: organização por domínio; não há pasta `screens/` separada.
- **Módulos nativos opcionais desligados** (`react-native.config.js`): gesture-handler, reanimated, worklets e masked-view vêm com o expo-router, mas só servem ao Drawer e à pilha JS, que o app não usa. Desligá-los evita o limite de caminho do Windows no build C++ e reduz o APK. Para usar `<Drawer>` no futuro, remova-os dessa lista.
- **Regras financeiras isoladas** em `services/finance`: testáveis sem emulador.

## Segurança

- `no-console` como erro no ESLint: nenhum dado financeiro vai para logs. Erros são tratados sem registrar conteúdo.
- Toda entrada do usuário passa por Zod; o banco reforça com `CHECK`, `NOT NULL` e chaves estrangeiras.
- Nenhum segredo no código. APK assinado com a chave de debug (uso pessoal) — ver ANDROID_BUILD.md.
- Dados ficam no armazenamento privado do app (sandbox do Android). `allowBackup` padrão do Expo.

## Preparado para o futuro (não implementado)

- **Login/usuários:** adicionar tabela `users` e coluna `user_id` via nova migration; ids já são UUID.
- **Backend/PostgreSQL/sync:** os repositórios são a única camada que fala com o banco; `updated_at` existe em todas as tabelas.
- **Criptografia:** `expo-sqlite` suporta SQLCipher (`useSQLCipher` no plugin) — basta configurar e guardar a chave em `expo-secure-store`.
- **Importação de backup:** o JSON exportado traz `schemaVersion` e as tabelas cruas.
