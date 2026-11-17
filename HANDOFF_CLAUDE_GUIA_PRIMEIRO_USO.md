# Incluir o guia de primeiros passos na próxima atualização do Nomma

O usuário pediu um guia de primeira utilização porque usuários de teste estão achando o app pouco intuitivo. O guia já foi implementado no workspace. Inclua essa implementação na próxima atualização, revise a experiência no Android e finalize a entrega seguindo as instruções do repositório.

## O que já está implementado

- Guia de quatro etapas: saldo inicial, registro de gastos/receitas, planejamento de contas e leitura do resumo financeiro.
- Exemplos práticos e caminhos dos menus existentes, incluindo o alerta para não registrar o saldo inicial novamente como receita.
- Exibição automática após carregar o perfil e seus dados, quando o guia ainda não foi concluído ou dispensado.
- Botões Continuar, Voltar, Pular e Começar a usar o Nomma.
- Conclusão ou dispensa salva na tabela `settings`, chave `onboardingCompleted`, por banco/perfil.
- Reabertura em Mais → Guia de primeiros passos e Configurações → Abrir guia.
- Componentes reutilizam os temas e controles do app, com conteúdo rolável e safe area.

## Arquivos envolvidos

Novos:

- `src/features/onboarding/GettingStartedGuide.tsx`: conteúdo e interface das quatro etapas.
- `src/features/onboarding/FirstUseGuide.tsx`: conclusão persistente usando o fluxo de escrita/reload existente.
- `src/features/onboarding/repository.ts`: grava a preferência no SQLite.
- `src/app/getting-started.tsx`: rota para consultar o guia novamente.

Alterados para integrar o guia:

- `src/app/_layout.tsx`: exibição inicial e título da rota.
- `src/features/more/MoreScreen.tsx`: acesso no menu Mais.
- `src/features/settings/SettingsScreen.tsx`: acesso nas configurações.
- `src/features/settings/repository.ts`: leitura da preferência.
- `src/types/index.ts`: campo opcional `Settings.onboardingCompleted`.

## Validação e finalização solicitadas

1. Leia `AGENTS.md` e confira `git status` e o diff. Há outras mudanças em andamento no workspace, incluindo backup/OFX, análises, dados de demonstração e scripts de build. Preserve-as e confira com cuidado o escopo da atualização.
2. O projeto usa Expo SDK 57. Consulte a documentação versionada antes de mudar APIs Expo/React Native, conforme `AGENTS.md`.
3. Revise o guia no Android: primeira abertura com banco novo, perfil existente, voltar/avançar, pular, concluir, fechar/reabrir o app e reabrir o guia pelos dois menus.
4. Perfis existentes sem a preferência também verão o guia uma vez nesta atualização. Confirme esse comportamento na revisão da entrega.
5. Confira troca de perfil, fontes grandes, telas pequenas, tema claro/escuro e botão físico de voltar. O guia deve ser legível, rolável e não impedir o acesso definitivo ao app.
6. Confira os textos contra os rótulos e regras atuais do aplicativo. O guia explica fluxos; ele não cadastra contas nem movimentações automaticamente.
7. Teste o tratamento de falha ao gravar a preferência: deve permitir tentar novamente, sem encerrar o app ou perder dados.
8. Execute `npm run typecheck` e `npm run lint`. Ambos passaram ao implementar o guia; a interface ainda não foi validada em aparelho/emulador nesta sessão. Execute outros testes existentes pertinentes caso ajuste persistência, backup ou regras de domínio.
9. Integre o guia ao fluxo de geração da próxima atualização. Confira como `scripts/build-apk.ps1` atualiza versão e versionCode antes de incrementar manualmente, para evitar incremento duplicado. Não edite projetos nativos gerados manualmente.
10. Inclua nas notas da versão: “Novo guia de primeiros passos para configurar seu saldo, registrar movimentações e entender o resumo financeiro. Consulte novamente pelo menu Mais ou pelas Configurações.”

## Limites da entrega

Este trabalho adiciona orientação inicial. A reclamação de usabilidade também pede uma revisão futura da navegação e dos formulários, que continua pendente. Não apresente o guia como uma reformulação completa do frontend.

Ao concluir, informe os arquivos finais, validações feitas, versão gerada e localização do APK, caso o build faça parte da atualização em andamento. Não publique em loja nem envie alterações a serviços externos sem autorização correspondente.
