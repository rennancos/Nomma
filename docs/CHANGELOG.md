# Changelog

## 1.0.0 (versionCode 1) — 30/09/2026

Primeira versão (MVP, fases 1 a 6).

- Estrutura Expo SDK 57 / React Native 0.86 / TypeScript strict / Expo Router.
- SQLite com migrations (`user_version`), valores em centavos, chaves estrangeiras e CHECKs.
- Contas, categorias padrão e personalizadas, receitas, despesas, investimentos e transferências.
- Dashboard: saldo disponível, resumo do mês, % da renda, limite diário, projeção, alertas de orçamento.
- Histórico com pesquisa, filtros, edição e exclusão.
- Recorrências (salário automático, gastos fixos previstos/pagos/pendentes).
- Parcelamentos com geração automática de parcelas; cartões com limite, fatura atual/próxima e pagamento de fatura.
- Investimentos (aportes por tipo e instituição), metas e orçamentos por categoria.
- Análises com gráficos e fechamento mensal com comparação ao mês anterior.
- Exportação JSON (backup completo) e CSV (movimentações).
- Configurações: nome, tema claro/escuro/sistema, dia do salário, dados demonstrativos removíveis.
- Build Android local com ambiente isolado em `.android-env` (JDK, SDK, NDK, Gradle e emulador dentro do projeto).
- Idempotência de recorrências (competência + índice único) e CHECKs de centavos inteiros e datas válidas no SQLite.
- Permissões mínimas: INTERNET e armazenamento bloqueados.
- Validação E2E do APK no emulador (`npm run validate:apk`): 7/7.
