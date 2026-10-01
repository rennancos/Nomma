# Handoff — APK Android e QR code

Data: 30/09/2026.
Estado: trabalho interrompido por solicitação explícita do usuário.

## Pedido

Gerar um APK instalável para teste no celular e um QR code para baixar o arquivo. O usuário escolheu APK independente, não Expo Go.

## Resultado até a interrupção

- APK: **arquivo encontrado na checagem final**, em `A:/Projetos/app_financeiro/builds/financas-1.0.0.apk`, com **63.349.129 bytes**, data de modificação **30/09/2026 18:59:46**. As tentativas do Codex falharam; o artefato surgiu posteriormente no workspace compartilhado. Origem exata, assinatura, conteúdo e integridade **NOT TESTED**. Não foi iniciado novo trabalho de validação após o pedido de parada.
- QR code: **NOT GENERATED**; não foi entregue link de download sem artefato.
- Servidor de download: **NOT RUN**.
- Instalação, inicialização, persistência no Android e upgrade: **NOT TESTED**.
- A tentativa inicial de iniciar Expo foi encerrada após a escolha por APK.
- As tentativas de build iniciadas pelo Codex terminaram com erro. Não foi executado novo build após o pedido de parada.
- Outros processos do Claude não foram encerrados pelo Codex.

## Configuração observada

- Aplicativo: Finanças.
- Package: `com.rennancos.financas`.
- Version: `1.0.0`.
- VersionCode: `1`.
- Expo: `57.0.26`; React Native: `0.86.3`.
- Estratégia existente: Gradle local via `npm run build:apk`.
- Script existente: `scripts/build-apk.ps1`.
- Ambiente local: `.android-env` com JDK 17, SDK e cache Gradle.
- Variante release configurada com chave **debug**: adequada apenas para teste, não assinatura de distribuição definitiva.
- Caminho do arquivo encontrado: `builds/financas-1.0.0.apk`. Package e versões acima vieram da configuração e **não foram extraídos desse APK**.

## Validações executadas nesta sessão

| Comando | Resultado |
| --- | --- |
| `git status --short` | Inspecionado: alterações locais do projeto preservadas |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test -- --runInBand` | PASS — 4 suítes, 47 testes |
| `node docs/tests/sqlite-review.cjs` | PASS — 9 casos no SQLite do computador |
| `npx --yes expo-doctor` | PASS — 21/21 após repetição fora do sandbox |
| `node --check scripts/share-test-apk.cjs` | PASS — sintaxe do helper |
| `npm run build:apk` | FAIL — detalhes abaixo |

O teste de recorrência que falhava na baseline anterior passou com as alterações posteriores presentes no projeto. Isso não representa nova revisão integral do delta nem validação Android.

## Falhas de build

### 1. Permissão do sandbox

A primeira execução falhou com acesso negado ao lock do Gradle:

```text
.android-env/gradle/wrapper/dists/gradle-9.3.1-bin/.../gradle-9.3.1-bin.zip.lck
```

Foi autorizada e executada repetição fora do sandbox.

### 2. NDK ainda em instalação

A execução seguinte falhou:

```text
[CXX1101] NDK at .../.android-env/sdk/ndk/27.1.12297006
did not have a source.properties file
```

Foi constatada instalação simultânea por outra build do projeto. O Codex não apagou nem substituiu a pasta em uso. Depois foi observado `source.properties` presente e mensagem de instalação finalizada no log.

### 3. Conflito de arquivos e CMake

A última tentativa terminou com `BUILD FAILED in 4m 5s`, com dois erros:

```text
Execution failed for task ':react-native-reanimated:prepareReanimatedHeadersForPrefabs'.
Unable to delete directory '.../node_modules/react-native-reanimated/android/build/prefab-headers/reanimated'
New files were found. This might happen because a process is still writing to the target directory.
```

```text
Execution failed for task ':react-native-screens:configureCMakeRelWithDebInfo[arm64-v8a]'.
Failed to install the following SDK components:
cmake;3.22.1 CMake 3.22.1
```

Havia builds simultâneas do mesmo projeto. A evidência é compatível com conflito de geração de arquivos; não atribuir automaticamente a falha a código do aplicativo. A pasta CMake 3.22.1 apareceu, mas sua integridade final **não foi validada**.

Logs de diagnóstico locais:

- `.android-env/gradle/daemon/9.3.1/daemon-19448.out.log` — tentativas do Codex e erros.
- `.android-env/gradle/daemon/9.3.1/daemon-26708.out.log` — processo concorrente e instalação do NDK.

Tentativa de consultar threads via `jcmd` retornou `AttachNotSupportedException: Acesso negado`; não forneceu diagnóstico adicional.

## Arquivo criado pelo Codex nesta etapa

`scripts/share-test-apk.cjs`

Helper para servir somente um APK escolhido e sua imagem QR na rede local. Não expõe o diretório do projeto. Gera PNG usando o pacote `toqr` já instalado transitivamente e módulos nativos do Node; nenhuma dependência foi adicionada para isso.

Uso planejado, **ainda não executado**:

```powershell
node scripts/share-test-apk.cjs builds/financas-1.0.0.apk 192.168.0.67 8765
```

O IP `192.168.0.67` foi observado na interface Ethernet nesta sessão e precisa ser reconfirmado ao retomar. Celular e computador devem estar na mesma rede. O helper gera `builds/teste-android-qr.png` e mantém um servidor ativo enquanto o processo estiver rodando. Sintaxe validada; serviço HTTP e leitura do QR **NOT TESTED**.

## Retomada sugerida

1. Coordenar com Claude para executar somente uma build por vez no mesmo workspace; não encerrar processos alheios automaticamente.
2. Verificar integridade de NDK 27.1.12297006 e CMake 3.22.1 no SDK local.
3. Reexecutar `npm run build:apk`, preservando saída e código de retorno.
4. Localizar o APK real, registrar tamanho, data, SHA-256, package, version, versionCode, arquiteturas e assinatura.
5. Validar o APK com `aapt`/`apksigner` disponíveis no SDK. Não marcar instalação ou launch como PASS com base apenas nisso.
6. Iniciar o helper, verificar resposta HTTP e conferir QR PNG antes de entregar ao usuário.
7. Testar instalação e fluxos no celular; preferir atualização sem desinstalar nem apagar dados.

## Resultado

**INCOMPLETO — INTERROMPIDO PELO USUÁRIO.**

Um arquivo APK foi encontrado na checagem final, mas ainda não foi validado nem servido por QR code. Este documento não altera o histórico da revisão anterior e não certifica o aplicativo para release.
