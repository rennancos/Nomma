# Dívida técnica e bloqueios concretos

## TD-001 — recorrência sem idempotência/competência persistida

Descrição: postOccurrence insere sem checar uma chave única de ocorrência. Duas chamadas produzem duas transações; integração real reproduziu 2 em vez de 1. listPostedKeys deriva mês da data de pagamento; antecipação de outro mês perde competência.
Impacto: receitas/despesas e saldos duplicados, autopost incorreto.
Prioridade: alta, bloqueia validação.
Arquivos: src/features/recurring/repository.ts; src/database/migrations.ts.
Possível solução: persistir competência explícita e unicidade por recorrência/mês, escrita transacional, migration que trate dados existentes sem apagá-los; testar repetição, concorrência, antecipação, exclusão e edição. Não aplicada nesta revisão: afeta contrato de schema e reconciliação de lançamentos existentes enquanto implementação está sendo escrita. Teste vermelho preservado.

## TD-002 — carregamento pode sinalizar sucesso após erro

Descrição: financeStore.load captura erro e resolve Promise; useAction aguarda refresh e executa onDone, mesmo com status error. Reloads simultâneos não têm ordenação.
Impacto: feedback de sucesso com dados antigos e risco de autopost concorrente.
Prioridade: média.
Arquivos: src/stores/financeStore.ts; src/hooks/useFinance.ts.
Possível solução: resultado explícito ou propagação de erro e serialização apropriada; testar integração com UI quando concluída. Achado estático, NOT TESTED em runtime.

## TD-003 — integridade monetária incompleta nas fronteiras

Descrição: SQLite aceita REAL em coluna INTEGER sem STRICT/checagem typeof. Inserção de transação com 1.5 foi aceita antes da correção no repositório. Outras tabelas/repositórios ainda dependem do schema de formulário. Datas GLOB validam formato, não calendário.
Impacto: entradas fora da UI podem persistir valores/data inválidos.
Prioridade: média.
Arquivos: src/database/migrations.ts; src/features/*/repository.ts.
Possível solução: validadores compartilhados de domínio e/ou migration com constraints; cobertura para todos os repositórios. Insert/update de transação corrigidos nesta revisão; demais caminhos pendentes.

## TD-004 — estratégia release e dependências

Descrição: script build:apk local difere de orientação EAS de AGENTS.md; falta perfil EAS e evidência de assinatura release. npm reportou conflito peer opcional react-native-worklets 0.13.0 com faixa de expo-modules-core até 0.10.x; Doctor final passa.
Impacto: reprodutibilidade e compatibilidade nativa ainda desconhecidas.
Prioridade: média.
Arquivos: package.json; package-lock.json; AGENTS.md.
Possível solução: explicitar estratégia com implementador, validar resolução em instalação limpa e build; não aplicar downgrade automático.

## Atualização de 30/09/2026 (após a revisão)

| Item | Estado | O que foi feito |
| --- | --- | --- |
| TD-001 | RESOLVIDO | `transactions.occurrence_month` + índice único `(recurring_id, occurrence_month)`; `postOccurrence` é idempotente; `listPostedKeys` usa a competência, não a data de pagamento. Como o banco v1 ainda não tinha sido publicado, as mudanças entraram na própria migration v1. Teste de integração "recorrência lançada duas vezes" PASS. |
| TD-002 | RESOLVIDO | `financeStore.load` publica só o carregamento mais recente e retorna `false` em caso de erro; `useAction` mostra o erro em vez de sucesso. |
| TD-003 | RESOLVIDO no banco | `CHECK (typeof(col) = 'integer')` em todas as colunas monetárias; `CHECK (date(col) IS col)` nas datas (rejeita 31/02). |
| TD-004 | DECIDIDO | Build local reprodutível (`npm run build:apk`, ambiente isolado em `.android-env`), APK gerado e validado no emulador. EAS não foi usado porque exige login em conta Expo. O aviso de peer do `react-native-worklets` deixou de afetar o app: o módulo não é linkado (`react-native.config.js`). |
