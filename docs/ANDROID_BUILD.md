# Android Build

## Resultado

| Item | Valor |
| --- | --- |
| APK | `builds/financas-1.0.0.apk` |
| Tamanho | 60,4 MB |
| Package | `com.rennancos.financas` |
| Versão | 1.0.0 (versionCode 1) |
| minSdk / targetSdk | 24 (Android 7) / 36 |
| ABIs | arm64-v8a (celulares), x86_64 (emulador) |
| Assinatura | chave de debug pública do React Native (CN=Android Debug) |
| Permissões finais | `VIBRATE` + permissão interna `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` |

## Ambiente

| Componente | Versão | Onde |
| --- | --- | --- |
| Node | 24.15.0 (npm 11.12.1) | sistema |
| Expo SDK | 57.0.26 | `node_modules` |
| React Native | 0.86.3 | `node_modules` |
| JDK | 17.0.12 | `.android-env/jdk-17` |
| Android SDK | platform android-36, build-tools 35.0.0 / 36.0.0 / 36.1.0, platform-tools | `.android-env/sdk` |
| NDK | 27.1.12297006 (baixado pelo Gradle) | `.android-env/sdk/ndk` |
| Gradle | 9.3.1 (wrapper) | `.android-env/gradle` |
| Emulador | 36.2.12, imagem android-36 google_apis_playstore x86_64 | `.android-env/sdk`, AVD em `.android-env/avd` |

**Tudo fica dentro do projeto, no disco A:.** O disco C: estava cheio (≈500 MB livres), então JDK, SDK, NDK, cache do Gradle,
temporários, AVD e logs ficam em `.android-env/` (ignorado pelo git e pelo Metro). Nenhuma configuração global do Windows foi alterada.

## Estratégia

Build **local** (`expo prebuild` + Gradle `assembleRelease`). Não usamos EAS Build porque ele exige login em conta Expo e envia o código para a nuvem.
Se quiser usar o EAS no futuro, crie um `eas.json` com um profile `preview` e `android.buildType: "apk"`.

## Como gerar novamente

```powershell
npm run build:apk
```

O script `scripts/build-apk.ps1`:

1. aponta `JAVA_HOME`, `ANDROID_HOME`, `GRADLE_USER_HOME` e `TEMP` para `.android-env` (só no processo do build);
2. cria a pasta `android/` com `expo prebuild`, se ela ainda não existir;
3. roda `gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,x86_64`;
4. copia o resultado para `builds/financas-<versão>.apk`.

Para uma nova versão: aumente `expo.version` e `expo.android.versionCode` no `app.json`, rode `npx expo prebuild -p android` e depois `npm run build:apk`.

## Como instalar

**No celular (manual):** copie `builds/financas-1.0.0.apk` para o celular, abra o arquivo e permita "instalar apps desconhecidos" para o app usado (Arquivos/Chrome).

**Pelo QR Code (Wi-Fi):** com o celular na mesma rede do PC, rode `npm run serve:apk` (ou `node scripts/serve-apk.cjs <ip-do-pc> 8765`)
e escaneie `builds/qrcode-financas.png`, que abre `http://192.168.0.67:8765/` → "Baixar APK". Se o IP do PC mudar, gere o QR de novo:
`npx qrcode -o builds/qrcode-financas.png -w 600 "http://<ip>:8765/"`. O servidor só entrega o arquivo; pare com Ctrl+C depois de instalar.

**Via cabo USB (adb):** ative a Depuração USB nas Opções do desenvolvedor e rode:

```powershell
.android-env\sdk\platform-tools\adb.exe devices
.android-env\sdk\platform-tools\adb.exe install builds\financas-1.0.0.apk
# atualizando uma versão já instalada (mantém os dados):
.android-env\sdk\platform-tools\adb.exe install -r builds\financas-1.0.0.apk
```

Uma atualização só preserva os dados se o APK novo for assinado com **a mesma chave**. O APK usa a chave de debug
pública padrão do React Native (SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`), que é a mesma
toda vez que `android/` é regenerada. Por isso novas versões atualizam sem perder dados (há uma cópia em `.android-env/debug.keystore`).
Como ela é pública, serve para uso pessoal, mas não para distribuir o app.

## Validação em emulador

```powershell
pwsh -File scripts/emulator.ps1   # sobe o AVD "Financas" (dados em .android-env/avd)
npm run validate:apk              # instala, abre, cadastra receita e gasto, reinicia, navega, verifica crash
```

## Problemas encontrados e correções

| Problema | Correção |
| --- | --- |
| Disco C: cheio: o Gradle não conseguiu descompactar a distribuição | Todo o ambiente de build foi movido para `.android-env` no A:; o download parcial no C: foi apagado |
| Emulador recusou iniciar ("not enough disk space") | Emulador e imagem copiados para `.android-env/sdk`; AVD próprio em `.android-env/avd` (`scripts/emulator.ps1`) |
| Build C++ de `react-native-gesture-handler`: caminho com 355 caracteres (limite do Windows: 260) | `gesture-handler`, `reanimated`, `worklets` e `masked-view` são dependências opcionais do expo-router (Drawer e pilha JS), que o app não usa. Eles foram desligados do autolinking em `react-native.config.js`, e a navegação completa foi validada no APK |
| Headers do React Native no cache do Gradle com 268 caracteres | Durante o build, o cache é acessado pela unidade virtual curta `G:` (`subst`), removida ao final |
| `subst` na raiz do projeto quebrava o autolinking do Expo (a busca por `package.json` não olha a raiz da unidade) | O `subst` passou a ser aplicado só ao cache do Gradle |
| Conflito de lock com um daemon Gradle órfão | O script encerra o daemon (`gradlew --stop`) ao final de cada build |
| `:app:packageRelease` falhou após apagar o APK de saída à mão | Estado incremental do AGP; a execução seguinte se recupera. Não apague `android/app/build/outputs` entre builds |
| Permissões desnecessárias (`INTERNET`, armazenamento) | Bloqueadas em `app.json` (`android.blockedPermissions`): o app é 100% offline |
| Modo escuro nativo exigia `expo-system-ui` | Pacote instalado (versão compatível com o SDK 57) |

## Assinatura de release (quando for publicar)

Para distribuir fora do uso pessoal, gere uma keystore própria fora do repositório e configure
`signingConfigs.release` por variáveis de ambiente. Nunca coloque senhas no código.
