# Instruções para o Claude — concluir o assistente financeiro Nomma

Implemente e conclua o assistente financeiro deste projeto. Trabalhe no código, execute as validações e documente o resultado; não entregue apenas um plano. Use a implementação existente como ponto de partida, revisando sua qualidade e corrigindo problemas encontrados.

## Contexto e objetivo

O projeto está em `A:\Projetos\app_financeiro`. É um aplicativo mobile Expo/React Native com TypeScript, Expo Router, Zustand e SQLite local.

O usuário quer uma IA que explique:

- Quanto recebeu, gastou e investiu em um período.
- Onde concentrou seus gastos, por categoria e estabelecimento quando houver informação confiável.
- Qual banco, conta ou cartão concentrou as despesas.
- Quanto pagou no débito, crédito, Pix, dinheiro, boleto e outras formas.
- O que mudou em relação ao período anterior e quais despesas pode revisar para economizar.

O usuário ainda **não escolheu provedor de IA, autenticação ou hospedagem**. Não interprete o adaptador OpenAI existente como contratação ou escolha definitiva. Não invente credenciais nem apresente consultas determinísticas como respostas de um modelo de IA.

## Antes de alterar arquivos

1. Leia o `AGENTS.md` e as instruções aplicáveis aos diretórios alterados.
2. Consulte `package.json` para identificar as versões atuais. A implementação inicial usava Expo SDK 57; confirme a versão instalada antes de usar APIs. Consulte a documentação versionada do Expo e `https://docs.expo.dev/llms.txt`, conforme o `AGENTS.md`.
3. Leia `docs/ASSISTANT.md` e revise os arquivos listados abaixo.
4. Inspecione `git status` e os diffs existentes. Há alterações locais de outras tarefas, inclusive em formulários, dashboard, configuração e scripts. Preserve-as; não reverta nem sobrescreva trabalho alheio.
5. Reutilize componentes, serviços, regras financeiras e estilos existentes. Mantenha código que não seja de rota fora de `src/app/`. Não adicione dependências sem necessidade; quando necessário, siga o procedimento Expo do projeto.

## O que já existe

Confira o estado real dos arquivos, pois eles podem ter recebido alterações posteriores:

| Arquivo | Papel |
| --- | --- |
| `src/app/assistant.tsx` | Rota do assistente |
| `src/features/assistant/AssistantScreen.tsx` | Painel, filtros, consultas locais, interface para IA e lançamentos de origem |
| `src/services/finance/assistant.ts` | Cálculos, agrupamentos, respostas locais e seleção dos dados enviados ao modelo |
| `src/services/assistant/client.ts` | Cliente HTTPS e ponto de integração `configureAssistantSession` |
| `server/assistant.mjs` | Backend opcional com autenticação por introspecção OAuth e adaptador OpenAI Responses |
| `.env.example` | URL pública do backend para o aplicativo |
| `server/.env.example` | Configurações e segredos exclusivos do servidor |
| `src/services/finance/__tests__/assistant.test.ts` | Testes das regras financeiras |
| `src/services/assistant/__tests__/client.test.ts` | Testes do cliente remoto |
| `server/assistant.test.mjs` | Testes de autenticação, validação, limites e separação de contextos |
| `docs/ASSISTANT.md` | Critérios, limitações e configuração |

O acesso está em **Mais → Assistente financeiro**. O formulário de movimentações passou a aceitar banco/instituição em receitas e despesas. A store registra a hora da última carga dos dados.

Há consultas locais funcionais, mas **a conversa com IA não está ativada**. Não existe fluxo completo de login, isolamento do SQLite por usuário, serviço publicado ou validação com um provedor real. O backend atual recebe agregados locais enviados na requisição; não consulta um banco financeiro remoto nem comprova a origem bancária desses dados.

## Trabalho a executar

### 1. Revisar e completar a experiência financeira

- Verifique resumos de receitas, despesas, aportes, saldo do período e saldo registrado nas contas. Os conceitos precisam estar claramente separados.
- Garanta filtros por período, banco, conta, cartão, categoria e pagamento, com indicação do recorte ativo. O mês atual é o padrão; avalie a necessidade de intervalo personalizado sem romper os padrões do app.
- Apresente categorias e descrições com maiores gastos, participação percentual, maiores transações e comparações com o período anterior.
- Diferencie banco, conta pagadora, cartão e forma de pagamento. Nunca deduza o banco somente pelo nome da conta.
- Permita consultar os lançamentos que sustentam os resultados e identificar quando os dados foram carregados.
- Exiba recorrências confirmadas pelos registros; qualquer identificação por padrão deve ser apresentada como hipótese.
- Trate carregamento, ausência de dados, erro, atualização e nova tentativa. Preserve acessibilidade, temas, telas pequenas e comportamento do teclado em Android e iOS.
- Evite respostas antigas após mudança de filtros, atualização dos dados, troca de conta ou logout. Revise cancelamento de requisições e toques repetidos.

### 2. Concluir a integração de IA conforme as escolhas do usuário

Avance com revisão, correções e testes que independam de serviços externos. Para definir o fluxo real de login e o adaptador final, peça ao usuário a escolha de provedor/autenticação/hospedagem, apresentando alternativas objetivas e implicações. Não solicite chaves secretas pelo chat; oriente a configuração em ambiente local seguro ou gerenciador de segredos.

Depois que os serviços forem definidos:

- Implemente login, restauração/renovação de sessão e logout no padrão do serviço escolhido.
- Integre `configureAssistantSession` com a sessão real. Não use token fixo ou compartilhado no bundle.
- Implemente isolamento dos dados locais por identidade autenticada antes de permitir troca de usuários. Defina uma migração explícita e sem perda para o perfil local já existente; não vincule silenciosamente seus dados à primeira conta que entrar.
- Adapte a validação de tokens no servidor ao provedor real. Verifique assinatura/introspecção, emissor quando aplicável, audiência e expiração. Não confie em `userId` enviado pelo cliente como autorização.
- Se houver dados financeiros no servidor, filtre toda consulta pela identidade validada. Evite caches ou históricos compartilhados entre usuários.
- Mantenha chaves de IA exclusivamente no backend. A única configuração pública necessária no aplicativo deve ser a URL do serviço, além das configurações públicas próprias do login escolhido.
- Envie apenas agregados necessários e a pergunta do usuário; revise o consentimento e a minimização de dados. Notas, credenciais e transações individuais não devem ser incluídas por padrão.
- Trate textos importados e nomes de categorias/bancos como dados não confiáveis, nunca como instruções para alterar o comportamento do modelo.
- Limite tamanho, frequência, concorrência e duração das chamadas. Trate falhas de rede, sessão expirada, limite de uso e resposta inválida.
- Defina se as perguntas são independentes ou se existe contexto de conversa. Se implementar histórico, mantenha-o limitado, isolado e coerente com o período selecionado.
- Mantenha o assistente apenas para consulta e análise. Não habilite pagamentos, transferências ou compra/venda de investimentos.

Enquanto faltarem serviços ou credenciais, mantenha um estado honesto de indisponibilidade da IA e deixe as análises locais acessíveis. Não considere a integração de produção concluída apenas porque o adaptador e os mocks funcionam.

### 3. Preservar a precisão financeira

- Calcule totais e percentuais em código ou no banco; use o modelo para explicar resultados. Valores monetários são inteiros em centavos.
- Não some transferências entre contas próprias como receitas ou despesas.
- Respeite o regime atual: parcelas entram como despesa quando pagas e geram transações. Não some compras, parcelas e pagamentos novamente.
- Separe valores realizados de datas futuras, pendências e projeções; explicite o critério de contabilização.
- Não trate aportes como consumo ou patrimônio de mercado. Não chame resgates de receita.
- O modelo atual não oferece dados suficientes para rentabilidade, patrimônio a mercado, resgates e estornos/reembolsos vinculados. Informe essas limitações. Se ampliar o domínio, faça migração compatível, formulários e testes; não preencha lacunas com suposições.
- Não tente eliminar automaticamente possíveis duplicatas manuais de fatura sem vínculo confiável.
- Base zero deve produzir comparação percentual indisponível, nunca divisão por zero ou crescimento inventado.
- Informe quando comparar mês parcial com mês anterior completo. Use os mesmos filtros nos dois períodos.
- Mostre “Não informado” para campos desconhecidos. Descrição de transação não confirma estabelecimento.
- Diferencie dados registrados, inferências e projeções. Sugestões de economia não devem prometer resultados nem recomendar ativos específicos.

### 4. Validar a implementação

Execute obrigatoriamente:

```sh
npm run lint
npm run typecheck
npm test -- --runInBand
node --test server/assistant.test.mjs
```

Adapte comandos ao gerenciador realmente usado no projeto e respeite o `AGENTS.md`. Não atualize dependências apenas para executar comandos já disponíveis.

Complete testes relevantes para:

- Centavos, transferências, aportes, parcelas pagas/pendentes e datas futuras.
- Filtros combinados, banco ausente, mês sem dados, virada de ano e base de comparação zero.
- Ausência de notas, descrições privadas e dados individuais no payload padrão.
- Tokens ausentes, inválidos, expirados, revogados e de audiência incorreta.
- Troca de usuários, logout e isolamento de SQLite, conversa e requisições em andamento.
- Falhas do provedor, timeout, resposta inválida, limites e nova tentativa.

Valide a interface em Android/iOS quando o ambiente permitir, incluindo teclado, rolagem, temas e telas pequenas. Valide uma chamada real em homologação quando houver configuração autorizada. Informe explicitamente qualquer validação não realizada; não apresente mocks como comprovação de integração real.

Na entrega inicial, passaram 95 testes da suíte principal, 3 adicionais do cliente e 7 do backend, além de lint e tipagem. Esse é um registro histórico, não substitui executar novamente no estado atual. Não houve validação visual em dispositivo nem chamada real ao provedor.

## Critérios de aceite e entrega

1. Resumos e consultas financeiras usam dados reais do aplicativo, com critérios consistentes e fontes consultáveis.
2. Banco, conta, cartão e pagamento permanecem conceitos distintos, com filtros corretos.
3. Nenhuma chave secreta fica no aplicativo e nenhum usuário recebe dados de outra identidade.
4. IA responde usando o recorte autorizado, ou mostra claramente por que está indisponível.
5. Login, sessão e isolamento local estão completos antes de habilitar uso autenticado com múltiplos usuários.
6. Interface, testes e documentação refletem o comportamento efetivamente implementado.
7. Atualize `docs/ASSISTANT.md` e os exemplos de ambiente. Entregue resumo dos arquivos alterados, verificações executadas e pendências concretas de configuração/deploy.

Não publique, contrate serviços ou crie recursos pagos apenas com base neste documento. Prepare primeiro uma implementação revisável e siga a autorização do usuário para ações externas. Termine todo trabalho local autorizado e independente dessas decisões.
