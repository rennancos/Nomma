# Gera o APK Android de release usando somente o ambiente local do projeto (.android-env).
# Nada é baixado ou gravado no disco C: (JDK, SDK, NDK, Gradle e temporários ficam em .android-env).
#
# Limite de 260 caracteres do Windows: os headers C++ do React Native dentro do cache do Gradle
# geram caminhos longos demais. Por isso o cache (.android-env\gradle) é acessado por uma unidade
# virtual curta (subst G:), só durante o build. Os arquivos continuam fisicamente no projeto.
#
# Uso: npm run build:apk    (ou: pwsh -File scripts/build-apk.ps1)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$envDir = Join-Path $root '.android-env'
$gradleDir = Join-Path $envDir 'gradle'
$drive = 'G:'
New-Item -ItemType Directory -Force $gradleDir, (Join-Path $envDir 'tmp') | Out-Null

$mapped = @(subst) -match "^$drive\\: => "
if ($mapped -and ($mapped -notmatch [regex]::Escape($gradleDir))) { throw "A unidade $drive já está em uso: $mapped" }
$created = -not $mapped
if ($created) { subst $drive $gradleDir; if ($LASTEXITCODE) { throw "Não foi possível criar $drive" } }

try {
  $env:JAVA_HOME = Join-Path $envDir 'jdk-17'
  $env:ANDROID_HOME = Join-Path $envDir 'sdk'
  $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
  $env:GRADLE_USER_HOME = "$drive\"
  $env:TMP = Join-Path $envDir 'tmp'
  $env:TEMP = $env:TMP
  $env:JAVA_TOOL_OPTIONS = "-Djava.io.tmpdir=$($env:TMP)"
  $env:NODE_ENV = 'production'
  $env:Path = "$($env:JAVA_HOME)\bin;$($env:ANDROID_HOME)\platform-tools;$($env:Path)"

  Set-Location $root
  # Cada build é uma versão nova (1.0.0 -> 1.0.1): sobe a versão e o versionCode no app.json.
  # É essa versão que aparece em Configurações e no nome do APK; um APK existente nunca é sobrescrito.
  $appJson = Join-Path $root 'app.json'
  $originalAppJson = Get-Content $appJson -Raw
  $config = $originalAppJson | ConvertFrom-Json
  $restoreVersion = @($config.expo.version, $config.expo.android.versionCode)
  $parts = $config.expo.version.Split('.')
  $versionCode = [int]$config.expo.android.versionCode
  do {
    $parts[2] = [int]$parts[2] + 1
    $version = $parts -join '.'
    $apk = Join-Path $root "builds\nomma-$version.apk"
  } while (Test-Path $apk)
  $versionCode++
  $updated = $originalAppJson -replace '"version":\s*"[^"]*"', "`"version`": `"$version`"" -replace '"versionCode":\s*\d+', "`"versionCode`": $versionCode"
  [IO.File]::WriteAllText($appJson, $updated)
  Write-Host "Versão $version (versionCode $versionCode)"

  # Sempre roda o prebuild (sem --clean) para levar versão, versionCode e plugins do app.json ao projeto nativo.
  npx expo prebuild -p android --no-install
  if ($LASTEXITCODE) { throw 'prebuild falhou' }
  Set-Location android
  # arm64-v8a: celulares Android atuais; x86_64: emulador. Menos ABIs = build mais rápido e APK menor.
  .\gradlew.bat assembleRelease --console=plain '-PreactNativeArchitectures=arm64-v8a,x86_64'
  $gradleExit = $LASTEXITCODE
  .\gradlew.bat --stop | Out-Null # encerra o daemon para liberar a unidade virtual
  if ($gradleExit) { throw 'Gradle falhou' }

  New-Item -ItemType Directory -Force (Join-Path $root 'builds') | Out-Null
  Copy-Item (Join-Path $root 'android\app\build\outputs\apk\release\app-release.apk') $apk
  $restoreVersion = $null # build concluído: a versão nova fica
  Write-Host "APK gerado: $apk ($([math]::Round((Get-Item $apk).Length / 1MB, 1)) MB)"
  # Emulador aberto? Já instala e abre a versão nova para testar.
  & (Join-Path $PSScriptRoot 'emulator.ps1') -IfRunning
} finally {
  # Build falhou: volta só versão e versionCode, para a próxima tentativa reusar o número.
  # Não restaura o arquivo inteiro: o resto do app.json pode ter sido editado durante o build.
  if ($restoreVersion) {
    $current = Get-Content $appJson -Raw
    [IO.File]::WriteAllText($appJson, ($current -replace '"version":\s*"[^"]*"', "`"version`": `"$($restoreVersion[0])`"" -replace '"versionCode":\s*\d+', "`"versionCode`": $($restoreVersion[1])"))
  }
  Set-Location $root
  if ($created) { subst $drive /D }
}
