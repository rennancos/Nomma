# Test Report

Última execução: 30/09/2026. Todos os resultados abaixo vieram de comandos executados neste ciclo.

## Visão Mensal/Anual (1.0.9, 01/10/2026)

| Verificação | Resultado |
| --- | --- |
| `npm run typecheck` / `npm run lint` | PASS / PASS |
| `npm test` | **85/85 PASS** (3 novos: visão anual) |
| `npm run test:sqlite` | 11/11 PASS |
| `npm run build:apk` | PASS: `nomma-1.0.9.apk` (BUILD SUCCESSFUL em 9m8s), instalada no emulador |
| Tela no emulador (pt-BR) | PASS: Mensal 6 meses (mai–out/26); Anual "Este ano" (2026) e "3 anos" (2024–2026), um ponto por ano |

## Análises (1.0.8, 01/10/2026)

| Verificação | Resultado |
| --- | --- |
| `npm run typecheck` / `npm run lint` | PASS / PASS |
| `npm test -- --runInBand` | **82/82 PASS** (20 novos: regras de análise e i18n) |
| `npm run test:sqlite` | 11/11 PASS |
| `npx expo-doctor` | 21/21 PASS |
| `npm run build:apk` | PASS: `nomma-1.0.8.apk` (BUILD SUCCESSFUL em 8m56s), instalada no emulador |
| Tela no emulador | PASS: seletor de período, resumo com valores reais do banco, "sem período anterior", barras receitas x despesas, categorias, investimentos (barras + linha acumulada), economia (linha) |
| Toques (mês e categoria) | NÃO VERIFICADO no emulador (o emulador estava em uso); lógica de seleção sem teste automatizado |
| Idioma | Emulador em en-US: a tela aparece em inglês, como previsto pelo i18n |

**Defeito pego pelos testes antes do build:** a substituição de marcadores do i18n (`{pct}`) não funcionava; a tela mostraria "{arrow} {pct}". Corrigido.

**Regra alterada:** "Economizado" do Início passou a ser (receitas − despesas) / receitas; teste atualizado (47,17% → 56,60% no exemplo).

## Launch screen, lembretes e validação do Codex (1.0.5 a 1.0.7, 01/10/2026)

| Verificação | Resultado |
| --- | --- |
| `npm run typecheck` / `npm run lint` | PASS / PASS |
| `npm test -- --runInBand` | **62/62 PASS** (inclui i18n e lembretes) |
| `npm run test:sqlite` | **11/11 PASS** (inclui importação de backup) |
| `npx expo-doctor` | 21/21 PASS |
| `npm run build:apk` | PASS: `nomma-1.0.7.apk`, instalada no emulador pelo próprio script |
| Tela de abertura (1.0.5) | PASS: entrada, brilho, linha, 5 indicadores, saída para o Início sem tela branca |
| "Remover animações" ligado (1.0.5) | PASS: tela estática (5 pontos acesos, sem varredura) e saída normal |
| Splash nativo sem fade (1.0.4) | PASS: o "N" pequeno não aparece mais por trás da tela animada |
| Ícones Nomma (1.0.4) | PASS: barra inferior, menu "+", menu Mais |
| Lembretes (1.0.7) | PASS: permissão pedida na abertura; `dumpsys alarm` mostra 3 alarmes (9h, 13h, 21h) |
| Lembretes sem duplicar | PASS (teste unitário; falha se a fila for removida) |
| i18n `pt` / `pt_BR` | PASS (teste unitário; antes da correção caíam no inglês) |

**Falha observada:** na 1.0.4, uma abertura logo após instalar mostrou "Não foi possível abrir seus dados" uma vez. Não reproduziu em 6 tentativas.
Correção preventiva: `PRAGMA busy_timeout = 5000` (espera o banco em vez de falhar se outro processo do app ainda o segura).

**Não testado nesta rodada:** a notificação disparando no horário (os alarmes foram conferidos agendados, não disparados), celular físico, E2E completo.

## Rebrand Nomma e i18n

Baseline antes da implementação: `npm run typecheck` PASS, `npm run lint` PASS, Jest 47/47 PASS.

| Verificação pós-alteração | Comando | Resultado |
| --- | --- | --- |
| TypeScript | `npm run typecheck` | PASS |
| Lint | `npm run lint` | PASS |
| Jest | `npm test -- --runInBand` | **57/57 PASS** (5 suítes; inclui 10 casos de locale e branding) |
| Integração SQLite | `npm run test:sqlite` | **11/11 PASS** |
| Build Android | `npm run build:apk` | PASS (`BUILD SUCCESSFUL`, APK `builds/nomma-1.0.6.apk`, 62,2 MB) |
| Instalação e abertura | script de build / emulador | PASS; launcher `Nomma`, package `com.rennancos.financas` |
| E2E completo no APK novo | `npm run validate:apk` | NOT RUN após o build |

Casos de locale: `pt-BR`, `pt-PT`, `en-US`, `en-GB`, `fr-FR`, ausente, vazio e inválido. A busca nas telas não encontrou as duas frases do slogan hardcoded; aparecem em `src/i18n/locales/` e nos testes. O APK foi instalado e aberto; a automação E2E completa não foi repetida nesta versão.

## Resumo

| Verificação | Comando | Resultado |
| --- | --- | --- |
| TypeScript (strict, noUncheckedIndexedAccess) | `npm run typecheck` | PASS |
| Lint (ESLint Expo + `no-console`) | `npm run lint` | PASS |
| Testes unitários (Jest) | `npm test` | **47/47 PASS** (4 suítes) |
| Integração SQLite (migrations e repositórios reais, `node:sqlite`) | `npm run test:sqlite` | **9/9 PASS** |
| Expo Doctor | `npx expo-doctor` | 21/21 PASS |
| Build Android | `npm run build:apk` | PASS (`BUILD SUCCESSFUL`) |
| E2E no emulador (APK de release) | `npm run validate:apk` | **7/7 PASS** |

## Unitários (`src/**/__tests__`)

- **money-date**: formatação R$ 1.234,56; conversão de texto para centavos sem float; percentuais; divisão de parcelas sem perder centavos; datas DD/MM/AAAA; fim de mês; rótulos Hoje/Ontem.
- **finance**: saldo por conta (receita, despesa, transferência, aporte com e sem destino); transferência neutra no patrimônio; disponível x investido; resumo do mês (exemplo 2.845,32 / 46%); economizado 47,17%; totais por categoria; cartão (fechamento, vencimento, fechamento no dia 31); parcelamento 10x de R$ 400; parcelas no fim do mês; limite, fatura atual e próxima; recorrências (início, inativa, dia 31); agenda do mês; gastos fixos previstos/pagos/pendentes; projeção do mês; limite diário (exemplo R$ 60/dia, arredondamento, nunca negativo); próximo salário; orçamento (77% Delivery, níveis); filtros (busca sem acento, conta de origem/destino, faixa de valor).
- **review-regressions** (criado pela revisão): saldo negativo editável; parcelamento inválido lança erro; despesa não credita a conta de destino.
- **schemas**: formulário → centavos/datas ISO; rejeição de zero, texto e data inexistente; transferência exige destino diferente; compra no crédito exige cartão; saldo inicial negativo; dias do cartão; 1–120 parcelas.

## Integração SQLite (`docs/tests/sqlite-review.cjs`)

Migration em banco limpo e reexecução; CRUD e persistência após fechar/reabrir o banco; FK e rollback de compra inválida; seed e remoção preservando dados do usuário;
rejeição de centavos fracionários; backup JSON com centavos e acentos; CSV neutralizando fórmulas; pagamento repetido de parcela sem duplicar; **recorrência lançada duas vezes é idempotente**.

## E2E no emulador (`scripts/validate-apk.cjs`)

Emulador: AVD "Financas" (Android 16 / API 36, x86_64). APK: `builds/financas-1.0.0.apk` (release).

| Passo | Resultado |
| --- | --- |
| Instalação limpa (`adb install`) | PASS |
| App abre e o SQLite inicializa (dashboard mostra "Saldo disponível") | PASS |
| Cadastro de receita pela UI (+ → Adicionar receita → 5300 → Salvar); saldo R$ 5.300,00 | PASS |
| Cadastro de gasto pela UI (32,90); saldo atualiza para R$ 5.267,10 | PASS |
| Fechar (`force-stop`) e reabrir: saldo R$ 5.267,10 mantido | PASS |
| Navegação por Movimentações, Análises e as 10 telas do menu Mais | PASS |
| Sem crash do app no `logcat -b crash` | PASS |

Captura: [screenshots/dashboard.png](screenshots/dashboard.png). O limite diário exibido (R$ 1.053,42 = 5.267,10 ÷ 5 dias até 05/10) confere com a regra.

## Falhas encontradas e correções neste ciclo

| Falha | Correção |
| --- | --- |
| Recorrência lançada duas vezes gerava 2 transações (teste da revisão) | Coluna `occurrence_month` + índice único `(recurring_id, occurrence_month)`; `postOccurrence` ignora a duplicata |
| Pagamento de parcela com lista desatualizada duplicava despesa | Releitura dentro da transação (corrigido pela revisão; teste PASS) |
| SQLite aceitava REAL em colunas de centavos e datas inexistentes | `CHECK (typeof(x) = 'integer')` em todas as colunas monetárias; `CHECK (date(x) IS x)` nas datas |
| Recarregamentos concorrentes podiam sobrescrever dados novos; erro de recarga exibia sucesso | Store publica só o carregamento mais recente; `load` retorna false e `useAction` mostra o erro |
| Saldo inicial negativo não podia ser editado | Schema de conta aceita valor negativo |
| Script E2E: saída do adb com `\r\n` e botão Salvar abaixo da dobra | Parse de CRLF corrigido; o script rola a tela para encontrar o botão |

## Itens não testados

- Instalação em celular físico (só emulador).
- Exportação JSON/CSV até o menu de compartilhar (a geração do conteúdo foi testada; o compartilhamento nativo não).
- Tema escuro no aparelho (tokens definidos; não houve captura visual).
- Fluxos de cartão, parcelamento, metas e orçamento pela UI (a navegação foi testada; as regras, por testes unitários e de integração).
- Upgrade de versão com dados existentes (só existe a versão 1).
- Leitores de tela e acessibilidade.
- Abertura do CSV no Excel.

## Verificação offline / local-first (30/09/2026, 19:30–19:55)

Baseline antes: TypeScript PASS, Lint PASS, Jest 47/47, SQLite 9/9, Expo Doctor 21/21, APK de 19:12:35 (SHA-256 `65813a80…a6fc`).

**Análise (sem alteração de código do app):** nenhum `fetch`/`axios`/URL em `src/`; nenhuma dependência de rede, `expo-dev-client` ou `expo-updates`;
bundle JS embutido no APK (`assets/index.android.bundle`, 4,6 MB, Hermes); manifest sem `INTERNET`. Portanto o app não depende de rede, do computador, do Metro nem do Expo Go.

**Única mudança:** `scripts/validate-apk.cjs` agora liga o modo avião, desliga Wi-Fi e dados, remove todo `adb reverse` e confirma isso antes de instalar o app. Também salva capturas de tela quando algo falha.

| Gate | Resultado |
| --- | --- |
| Typecheck / Lint | PASS / PASS |
| Jest `--runInBand` | 47/47 PASS |
| Integração SQLite | 9/9 PASS |
| Expo Doctor | 21/21 PASS |
| `npm run build:apk` | PASS; APK reempacotado às 19:38:52, SHA-256 idêntico ao anterior (build determinística), versionCode 1 |
| `package-lock.json` | inalterado (hash conferido antes e depois) |
| E2E em modo avião | 8/8 PASS em 3 de 5 execuções |

**Intermitência da automação:** 2 das 5 execuções E2E falharam, cada uma em um ponto diferente (checagem inicial do painel; toque em "Metas").
Na primeira, a captura mostra o app aberto, correto e em modo avião, e os passos seguintes passaram; em nenhuma execução houve crash no `logcat`.
O comportamento é compatível com o `uiautomator dump` lendo a tela durante transições. Não foi observada falha do app, mas a causa exata da intermitência não foi isolada.

**Incidente durante a verificação:** apagar à mão o APK de saída do Gradle fez `:app:packageRelease` falhar uma vez (estado incremental do AGP).
A execução seguinte se recuperou sozinha. Causa: ação manual, não código. Não apague `android/app/build/outputs` entre builds.
