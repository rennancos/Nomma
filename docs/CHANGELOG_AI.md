# Histórico de IA

## 2026-09-30 — Rebrand Nomma e slogan localizado

Nome visível definido como **Nomma**. A tela de abertura usa `branding.name` e `branding.slogan` via `src/i18n`; português (`pt-*`) recebe a tradução pt-BR e idiomas desconhecidos ou locale ausente usam inglês. Nenhuma dependência ou arquivo da plataforma Android foi alterado. Criados testes de resolução de locale e documentação em `docs/BRANDING.md` e `docs/I18N.md`.

Validação: TypeScript PASS; lint PASS; Jest 57/57 PASS; integração SQLite 11/11 PASS. Build release PASS (`builds/nomma-1.0.6.apk`, 62,2 MB); instalado e aberto no emulador com package técnico preservado. O E2E completo do APK não foi repetido nesta versão.

## 2026-09-30

### Alteração

Baseline inicial de projeto em implementação; validação de serviços, banco e configuração. Arquivos surgiram durante a revisão; delta de UI permanece pendente.

### Implementação

Claude é o implementador designado pelo usuário. Autoria dos arquivos locais preexistentes não comprovada por Git; único commit anterior é template e7656ed. Correções abaixo realizadas pelo Codex.

### Revisão

Codex.

### Classificação

FEATURE / BUGFIX / DATABASE / FRONTEND / MOBILE / ANDROID / BUILD / CONFIG / DEPENDENCY / TEST / SECURITY / DOCUMENTATION.

### Arquivos principais

- money.ts, balance.ts e testes: edição negativa, parcelamento inválido e destino de despesa.
- transactions/repository.ts e cards/repository.ts: centavos inteiros e pagamento idempotente contra snapshot antigo.
- backup/export.ts: proteção CSV e CR.
- app.json, package.json e package-lock.json: splash/plugin e módulos compatíveis.
- docs: evidências, baseline e harness SQLite.

### Testes

FAIL no conjunto: Jest 40 PASS; integração 8 PASS/1 FAIL (recorrência). TypeScript/lint PASS; Doctor 21/21 PASS. Evidências limitadas ao conteúdo testado.

### Android Build

NOT RUN.

### APK

NOT GENERATED.

### Resultado

NÃO VALIDADO. Não há aprovação automática para implementações posteriores.

## 2026-10-01 — Nomma 1.0.3 a 1.0.5

### Alteração

Identidade Nomma aplicada: nome, ícone, splash, tela de abertura animada e ícones de funcionalidade.
Também neste ciclo: importação de backup, calendário nos campos de data, "Próximos lançamentos" no início, versionamento automático do APK e instalação automática no emulador.

### Implementação

Claude.

### Classificação

FRONTEND / MOBILE / ANDROID / BUILD / CONFIG / DATABASE (busy_timeout) / DOCUMENTATION.

### Arquivos principais

- `src/components/NommaLaunchScreen.tsx` (novo), `src/app/_layout.tsx`, `src/constants/theme.ts` (`brand`), `app.json` (cor e ícone do splash).
- `src/components/Layout.tsx`: componente `Icon` (ícones Nomma com fallback para Ionicons); ícones aplicados na barra, nos menus e nos estados vazios.
- `src/database/migrations.ts`: `PRAGMA busy_timeout = 5000`.
  É uma correção de falha fora do escopo visual: na 1.0.4, uma abertura logo após instalar mostrou "Não foi possível abrir seus dados" uma vez. Não reproduziu em 6 tentativas.
- `assets/`: `splash-icon.png`, `icons/*.png`, `brand/nexus*.svg`.
- `scripts/build-apk.ps1` (versão automática, nome `nomma-<versão>.apk`, instala no emulador), `scripts/emulator.ps1`, `package.json` (`npm run emulator`).

### Testes

Ver TEST_REPORT.md, seção "Launch screen e 1.0.5".

### Resultado

Aguardando o aceite do usuário após o teste no emulador.

## 2026-10-01 — Nomma 1.0.6 e 1.0.7

### Alteração

Rebrand para **Nomma**; i18n da marca (nome e slogan) pelo Codex; lembretes diários (9h, 13h e 21h) com opção nas Configurações.

### Implementação

Claude (lembretes, rebrand, correções) e Codex (i18n, slogan na abertura). A 1.0.6 foi gerada pelo Codex com os lembretes ainda incompletos.

### Revisão

Claude validou o trabalho do Codex: código, testes e APK no emulador. Correções aplicadas na 1.0.7:
- nome da abertura de volta à caixa alta (`textTransform`);
- `pt` e `pt_BR` reconhecidos como português (antes caíam no inglês);
- lembretes agendados ao abrir o app (antes só ao salvar as Configurações);
- fila no agendamento: chamadas simultâneas não duplicam os lembretes;
- script de build: em caso de falha, restaura só a versão do `app.json` (antes restaurava o arquivo inteiro e desfez a cor do splash);
- cor do splash nativo corrigida para `#0D1E32`.

### Testes

Ver TEST_REPORT.md, seção "Launch screen, lembretes e validação do Codex".

### Resultado

VALIDADO COM RESSALVAS: "N" e ícones provisórios; lembretes inexatos (até 1 h); E2E completo não executado.

## 2026-10-01 — Nomma 1.0.9: Análises mensal ou anual

Seletor Mensal | Anual nas Análises. Na visão anual cada ponto é um ano inteiro (Este ano, 3 anos, 5 anos), e resumo, categorias e comparação usam anos. Mesmas regras; só muda o agrupamento (`yyyy-MM` ou `yyyy`). Implementação: Claude. Validação: Jest 85/85, SQLite 11/11, build e emulador PASS. Ver ANALYTICS.md.

## 2026-10-01 — Nomma 1.0.8: Análises

### Alteração

Tela de Análises refeita: seletor de período (mês, 3, 6, 12 meses, ano), resumo com comparação ao período anterior,
receitas x despesas, gastos por categoria com detalhe, investimentos (aporte + acumulado) e taxa de economia. Ver ANALYTICS.md.

### Implementação

Claude.

### Classificação

FEATURE / FRONTEND / RULES (economia) / I18N / TEST / DOCUMENTATION.

### Arquivos principais

- `src/services/finance/analytics.ts` (novo) e testes: regras de período, economia, acumulado, categorias e variação.
- `src/features/analytics/AnalyticsScreen.tsx` (refeita), `src/components/Charts.tsx` (toque, `TrendChart`, `Legend`).
- `src/services/finance/balance.ts`: `savedPct` = (receitas − despesas) / receitas (regra da economia).
- `src/i18n`: chaves tipadas a partir de en.ts, marcadores `{x}`, textos `analytics.*` em pt-BR e en.
- `src/utils/date.ts`: nomes de mês no idioma da tela.

### Testes

Ver TEST_REPORT.md, seção "Análises".

### Resultado

VALIDADO COM RESSALVAS: toques não verificados no emulador; interface mista em aparelhos em inglês.
