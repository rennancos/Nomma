# Nomma: o que já foi feito

Situação em 01/10/2026. Versão atual: **1.0.9** (`builds/nomma-1.0.9.apk`).
O identificador Android continua `com.rennancos.financas`, para que as atualizações instalem por cima sem perder dados.

## Versões

| Versão | O que entrou |
| --- | --- |
| 1.0.0–1.0.2 | Lançamentos recorrentes, parcelamentos e investimentos aparecem no Início ("Próximos lançamentos"); calendário nos campos de data; importação de backup; número da versão em Configurações |
| 1.0.3–1.0.4 | Nome "Noma"; ícones recortados das imagens do Gemini (`assets/icons`); ícone e splash novos; correção de travamento do banco (`busy_timeout`) |
| 1.0.5 | Tela de abertura animada (logo, nome, slogan, barra de carregamento); respeita "reduzir movimento" |
| 1.0.6–1.0.7 | Nome **Nomma**; textos em português/inglês conforme o idioma do aparelho; lembretes às 9h, 13h e 21h (ligar/desligar em Configurações) |
| 1.0.8 | Análises refeitas: resumo com comparação, receitas x despesas, categorias, investimentos (aporte + acumulado), taxa de economia |
| 1.0.9 | Análises com visão **Mensal** ou **Anual** |

## Funcionalidades principais

- **Início:** saldo, economizado, próximos lançamentos (recorrentes, parcelas, investimentos).
- **Movimentações:** receitas, despesas, investimentos e transferências; datas escolhidas no calendário.
- **Análises:**
  - visão Mensal (Este mês, 3, 6 ou 12 meses) ou Anual (Este ano, 3 ou 5 anos);
  - toque num mês, ano ou categoria para ver o detalhe.
- **Backup:** exportar e importar arquivo JSON (`nomma-<data>.json`), para recuperar os dados após reinstalar.
- **Lembretes:** notificação "Pagou alguma coisa hoje? lembre de colocar no seu agente de controle de gastos" às 9h, 13h e 21h. O Android pode atrasar até cerca de 1 hora.

## Regras financeiras

- Economia = receitas − despesas. O investimento **não** é descontado.
- Saldo livre = economia − investimentos.
- Detalhes em `FINANCIAL_RULES.md` e `ANALYTICS.md`.

## Como gerar e testar

```bash
npm run build:apk   # gera builds/nomma-<versão>.apk (nunca sobrescreve) e instala no emulador, se aberto
npm run emulator    # abre o emulador, instala a última versão e abre o app
```

Cada build leva de 8 a 10 minutos e aumenta a versão sozinha (1.0.x).

## Validação (1.0.9)

| Item | Resultado |
| --- | --- |
| Testes automáticos | 85/85 |
| Testes do banco | 11/11 |
| Typecheck e lint | sem erros |
| Build e emulador | testados |

## Pendências

- **Ícone "N":** ainda é provisório. Falta definir o vetor final e decidir se os dois símbolos "N" viram um só.
- **Idioma:** num aparelho em inglês, só a tela de abertura e as Análises estão traduzidas; o resto aparece em português.
- **Horário dos lembretes:** para chegar no minuto exato, o app precisaria da permissão de alarme exato.
- **Git:** nada foi salvo no Git desde o commit inicial.
- **Testes manuais:** falta o teste completo de ponta a ponta do APK, e no emulador não foram testados os toques nas Análises nem a chegada real das notificações.

## Documentos

`ANALYTICS.md`, `FINANCIAL_RULES.md`, `I18N.md`, `NOMMA_LAUNCH_SCREEN.md`, `BRANDING.md` e demais guias de marca, `PROJECT_STATUS.md`, `TEST_REPORT.md`, `CHANGELOG_AI.md`.
