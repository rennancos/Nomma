# Finanças — controle financeiro pessoal (Android)

App Android offline para registrar receitas, gastos, contas fixas, parcelamentos, cartões, investimentos, metas e orçamentos,
e responder na hora: **quanto tenho, quanto gastei, quanto ainda vou gastar, quanto investi e quanto posso gastar por dia.**

## Funcionalidades

- **Início**: saldo disponível, receitas/despesas/investimentos/saldo do mês, % da renda usada, limite diário até o próximo salário, projeção de fim de mês, avisos de orçamento, últimas movimentações.
- **Botão +**: gasto, receita, investimento ou transferência. Gasto rápido: valor → categoria → Salvar.
- **Movimentações**: histórico por mês, agrupado por dia, com pesquisa e filtros (tipo, conta, categoria, valor); editar e excluir.
- **Análises**: fechamento do mês, gastos por categoria, receitas x despesas, investimentos por mês, economia mensal.
- **Mais**: gastos fixos e salário (recorrências), parcelamentos, cartões de crédito (limite, faturas, pagar fatura), investimentos, metas, orçamentos, contas, categorias personalizadas, backup (JSON/CSV) e configurações (nome, tema claro/escuro, dia do salário, dados de demonstração).

## Rodar e testar

```bash
npm install
npm test            # regras financeiras e validações
npm run typecheck   # TypeScript strict
npm run lint        # ESLint (no-console = erro)
npm run build:apk   # gera builds/financas-<versão>.apk (ver ANDROID_BUILD.md)
```

Desenvolvimento com o aparelho conectado: `npm run android` (development build; não usa Expo Go).

## Documentação

| Arquivo | Conteúdo |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Stack, pastas, fluxo de dados, decisões |
| [DATABASE.md](DATABASE.md) | Tabelas, relacionamentos, migrations |
| [FINANCIAL_RULES.md](FINANCIAL_RULES.md) | Todas as regras de cálculo |
| [INSTALACAO.md](INSTALACAO.md) | Instalar no celular (QR Code, USB, arquivo) |
| [ANDROID_BUILD.md](ANDROID_BUILD.md) | Como gerar e instalar o APK |
| [TEST_REPORT.md](TEST_REPORT.md) | O que foi testado e resultados |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | Status atual |
| [CHANGELOG.md](CHANGELOG.md) | Histórico de versões |
