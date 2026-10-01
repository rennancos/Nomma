# Project Status

Atualizado em 01/10/2026 (versão 1.0.9).

## Rebrand e internacionalização (30/09/2026)

Nome visível atualizado para **Nomma**; identificador Android permanece `com.rennancos.financas`. O slogan da tela de abertura é resolvido por `src/i18n` conforme a locale do runtime (`pt-*` → português; demais locales → inglês). Sem dependências novas; moeda, datas salvas, SQLite e navegação não foram alterados.

Validação deste ciclo: TypeScript PASS; lint PASS; Jest 57/57 PASS; integração SQLite 11/11 PASS. Build release PASS e APK instalado/aberto no emulador; nome do launcher `Nomma` e package `com.rennancos.financas` conferidos. Não foi executado o E2E completo do APK após o build.

| Item | Status |
| --- | --- |
| TypeScript | PASS |
| Tests | PASS: Jest 85/85, integração SQLite 11/11 |
| Lint | PASS |
| Expo Doctor | 21/21 PASS |
| Android Build | PASS |
| APK | GENERATED: `builds/nomma-1.0.9.apk` (62,2 MB) |
| Análises (1.0.8) | PASS: resumo, período, 4 gráficos com dados reais (ver ANALYTICS.md); toques não verificados no emulador |
| Visão Mensal/Anual (1.0.9) | PASS no emulador: Mensal (6 meses), Anual (Este ano, 3 anos) com totais por ano |
| APK Installation | PASS (emulador API 36, atualização por cima com dados preservados) |
| Application Launch | PASS (tela de abertura, nome e slogan conferidos) |
| Lembretes | PASS: permissão pedida na abertura; 3 alarmes agendados (9h, 13h, 21h) |
| SQLite | PASS |
| Offline / local-first | PASS (sem dependência de rede; validado em modo avião na 1.0.0) |
| E2E completo (`validate:apk`) | NOT RUN nesta versão |

## Fases

| Fase | Status |
| --- | --- |
| 1: estrutura, SQLite, categorias, contas, receitas, despesas, dashboard, histórico | Concluída |
| 2: recorrências, gastos fixos, parcelamentos, cartões | Concluída |
| 3: investimentos, metas, orçamentos | Concluída |
| 4: análises, projeção, limite diário, fechamento mensal | Concluída |
| 5: backup JSON/CSV, configurações, tema claro/escuro, dados demo | Concluída (importação de backup: pendente) |
| 6: configuração Android, build, APK, validação | Concluída |

## Pendências

- Importar backup JSON (o formato já inclui `schemaVersion`).
- Calendário financeiro mensal (pedido na primeira especificação): hoje, a tela de gastos fixos e as faturas mostram os vencimentos em lista.
- Recorrências não geram lançamentos retroativos de meses em que o app não foi aberto.
- Keystore de release própria, se o app for distribuído além do uso pessoal.
- `npm audit`: 15 alertas moderados em dependências de ferramentas do Expo (ver SECURITY_REVIEW.md); a correção automática rebaixaria o SDK.
- O rótulo da aba "Movimentações" aparece truncado em telas estreitas.
- Testes não executados: listados em TEST_REPORT.md.
- O E2E por `uiautomator` é intermitente (2 de 5 execuções falharam, sem crash do app); endurecer as esperas do script.
