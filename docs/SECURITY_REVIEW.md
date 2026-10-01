# Security Review

## SEC-001

Área: dependências.
Problema: npm audit final reporta 15 ocorrências moderate (contagem inclui propagação para pacotes dependentes, não 15 exploits independentes).
Evidência: reviews/2026-09-30_npm-audit.json; exit 1. Cadeias incluem decode-uri-component/query-string/Expo Router e uuid/xcode/config plugins.
Severidade: MEDIUM, conforme scanner; explorabilidade no aplicativo não demonstrada.
Correção: pendente de atualização compatível verificada. Não aplicar audit fix --force: sugestões incluem regressão de Expo para SDK 46 e Router 5, incompatíveis com projeto SDK 57.
Estado: ABERTO. Revalidar alertas e alcance antes da release.

## SEC-002

Área: CSV.
Problema: textos iniciados com '=' eram emitidos como células de fórmula; aspas CSV não neutralizam interpretação em planilhas. Retorno de carro não era escapado.
Evidência: teste de buildTransactionsCsv com descrição '=1+1' falhou antes e passou após correção; teste também preserva valor numérico -53,20.
Severidade: MEDIUM (conteúdo de exportação interpretável como fórmula; execução em Excel NÃO TESTADA).
Correção: prefixo apóstrofo em campos textuais perigosos e escape de CR. Campo monetário continua numérico.
Estado: CORRIGIDO em geração de CSV; abertura em planilhas NOT TESTED.

## Escopo e limitações

Repositórios analisados usam parâmetros SQL para valores. Interpolação de tabelas no seed/backup provém de listas fixas. Busca no núcleo não encontrou logs financeiros ou credenciais hardcoded. Isso não certifica arquivos posteriores.

Dados de backup JSON são pessoais e em texto claro por desenho; compartilhamento e limpeza de cache no dispositivo NOT TESTED. Política de backup Android, permissões transitivas e Manifest final NOT TESTED. Configuração permissions=[] não demonstra ausência de permissões de bibliotecas. Não há backend/auth/API implementada no recorte; IDOR e autorização remota não aplicáveis ao núcleo local observado. Não foram executados testes destrutivos, exploração, desinstalação ou leitura de dados financeiros reais.

## SEC-003

Área: permissões Android.
Problema: o manifest herdava `INTERNET` e `READ/WRITE_EXTERNAL_STORAGE` das bibliotecas, sem necessidade para um app offline.
Correção: `android.blockedPermissions` no `app.json`. O APK final (`aapt dump badging`) declara apenas `VIBRATE` e a permissão interna `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`.
Estado: CORRIGIDO. Sem `INTERNET`, o app não consegue enviar dados para fora do aparelho.

## Assinatura

O APK é assinado com a chave de debug pública do React Native: adequado para instalação pessoal, inadequado para distribuição (ver ANDROID_BUILD.md).
