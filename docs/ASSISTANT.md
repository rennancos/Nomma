# Assistente financeiro

Acesse **Mais → Assistente financeiro**. A tela funciona com o SQLite existente, sem novos pacotes ou migração. Consultas locais são determinísticas e identificadas como tal. A conversa com IA permanece indisponível enquanto não houver backend e integração de login, conforme a escolha de ainda não contratar/configurar serviços.

## Critérios financeiros

- Valores inteiros em centavos. Receitas, despesas e aportes separados; saldo do período = receitas − despesas − aportes.
- Regime de caixa: parcelas pagas são as transações criadas por `payInstallments`; as parcelas e compras não são somadas novamente. Pendências e datas futuras não são realizadas. Transferências ficam fora dos totais de receita/despesa/aporte.
- Comparação com o mês anterior completo, com os mesmos filtros; mês atual pode ser parcial. Base zero não produz percentual.
- Banco vem da instituição explícita da transação ou do banco do cartão vinculado à parcela paga. Nome da conta não é inferido como banco. O formulário de movimentações agora permite instituição em receitas e despesas. Registros antigos sem informação permanecem “Não informado”.
- Conta é a conta pagadora, cartão é o cartão vinculado e forma de pagamento é o campo registrado. Excluir cartões/compras remove vínculos históricos no modelo existente, podendo deixar banco/cartão desconhecidos.
- Aportes e saldo contábil em contas de investimento não são patrimônio a mercado. Não há modelo de resgates, cotações, rendimentos, estornos ou vínculo de reembolso. Reembolsos seguem o tipo que o usuário registrou. Duplicatas manuais de fatura não podem ser reconhecidas com segurança.
- Recorrências são apenas despesas com `recurringId`; não inferimos assinaturas pela descrição. Descrições são agrupadas, mas não tratadas como estabelecimentos confirmados.
- Saldos de contas incluem o histórico até hoje e saldos iniciais, independentes dos filtros. Resultados mensais permitem abrir cada lançamento. Mudança de filtro/atualização limpa a conversa para evitar respostas de um recorte antigo.

## Ativação futura da IA

1. Escolha um provedor OAuth com introspecção RFC 7662 e implemente login no app. Configure o cliente confidencial do backend e a audiência `nomma-assistant`. O adaptador exige `active`, `sub`, `aud` e `exp` na resposta; adapte-o se o serviço escolhido utilizar outro protocolo.
2. Na integração de sessão do aplicativo, chame `configureAssistantSession(async () => tokenDeAcessoAtual)` de `src/services/assistant/client.ts`. A função deve renovar/retornar a sessão do usuário. No logout, use `configureAssistantSession(null)` e desmonte as telas privadas. Nunca coloque token fixo no bundle. O SQLite atual é um perfil local único: antes de disponibilizar troca de usuários, implemente bancos locais isolados por conta e descarte dados/conversas do usuário anterior.
3. Configure as variáveis de `server/.env.example` somente no servidor. O adaptador opcional implementado usa OpenAI Responses; `OPENAI_MODEL` precisa ser um modelo habilitado na sua conta. Não há modelo contratado ou escolhido automaticamente.
4. Execute, a partir da raiz, `node --env-file=server/.env server/assistant.mjs` (Node 22.13+). Publique o processo atrás de HTTPS. Não foi realizado deploy. Para contêineres, configure HOST conforme o ambiente; o padrão é loopback. Configure limites de corpo (32 KiB), tempo e taxa também no proxy; múltiplas réplicas precisam de limitador compartilhado. O servidor não habilita CORS; acesso web exigirá configuração explícita de origem no proxy.
5. Configure `EXPO_PUBLIC_ASSISTANT_URL=https://seu-backend/assistant` no ambiente do app e gere/reinicie o bundle. Somente essa URL é pública; nenhuma chave de IA ou segredo OAuth pode receber prefixo `EXPO_PUBLIC_`.
6. Valide login, expiração, isolamento entre contas e chamadas reais em homologação antes de disponibilizar. Testes locais usam provedores simulados e não gastam créditos. Na tela, o usuário habilita o envio de resumos antes de perguntar.

O servidor autentica cada consulta com o emissor configurado, rejeita campos extras como `userId`, limita requisições por identidade e não mantém histórico nem banco financeiro remoto. Ele processa somente o resumo local enviado naquela requisição: esses dados não são extratos verificados. Uma futura sincronização deve consultar dados pelo `sub` validado no servidor, nunca por identidade recebida no corpo.

O contexto remoto contém pergunta, período e agregados formatados; exclui IDs, transações individuais, notas e descrições de compras. Nomes de categorias e bancos ainda são dados financeiros. A pergunta digitada também é enviada. Há timeout, mensagens de erro, nova tentativa, `store: false` no provedor e nenhuma ferramenta de execução de pagamentos. Isso não altera as demais políticas de retenção do provedor. Respostas do modelo podem conter erros; os indicadores e consultas locais são a referência verificável.

## Validação

`npm run lint`, `npm run typecheck`, `npm test -- --runInBand` e `node --test server/assistant.test.mjs`.

Documentação consultada: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo Router](https://docs.expo.dev/router/basics/navigation/), [OpenAI Responses](https://developers.openai.com/api/reference/typescript/resources/responses/methods/create) e [OAuth introspection](https://datatracker.ietf.org/doc/html/rfc7662).
