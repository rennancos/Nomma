# Abre o emulador Android, instala o APK da versão atual (builds\nomma-<versão do app.json>.apk) e abre o app.
# Tudo pelo ambiente local do projeto (.android-env): o AVD "Financas" e seus dados ficam em .android-env/avd — nada no disco C:.
# A instalação é por cima (adb install -r): os dados do app no emulador continuam entre versões.
#
# Uso: npm run emulator
#      pwsh -File scripts/emulator.ps1 -IfRunning   (só instala se já houver emulador aberto; usado pelo build:apk)
param([switch]$IfRunning)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$envDir = Join-Path $root '.android-env'
$env:ANDROID_HOME = Join-Path $envDir 'sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:ANDROID_AVD_HOME = Join-Path $envDir 'avd'
$env:ANDROID_EMULATOR_HOME = Join-Path $envDir 'emuhome'
$env:ANDROID_USER_HOME = $env:ANDROID_EMULATOR_HOME
$env:TMP = Join-Path $envDir 'tmp'
$env:TEMP = $env:TMP
$adb = Join-Path $env:ANDROID_HOME 'platform-tools\adb.exe'
$pkg = 'com.rennancos.financas'

$running = (& $adb devices) -match '^emulator-\d+\s+device'
if (-not $running) {
  if ($IfRunning) { Write-Host 'Nenhum emulador aberto: APK não instalado (use npm run emulator).'; return }
  Start-Process -FilePath (Join-Path $env:ANDROID_HOME 'emulator\emulator.exe') `
    -ArgumentList '-avd', 'Financas', '-no-audio', '-no-boot-anim', '-no-snapshot' `
    -RedirectStandardOutput (Join-Path $envDir 'emulator.log') -RedirectStandardError (Join-Path $envDir 'emulator.err')
  Write-Host 'Iniciando o emulador...'
  & $adb wait-for-device
  $deadline = (Get-Date).AddMinutes(5)
  while ((& $adb shell getprop sys.boot_completed 2>$null) -notmatch '1') {
    if ((Get-Date) -gt $deadline) { throw 'O emulador não terminou de iniciar em 5 minutos.' }
    Start-Sleep 2
  }
}

$version = (Get-Content (Join-Path $root 'app.json') -Raw | ConvertFrom-Json).expo.version
$apk = Join-Path $root "builds\nomma-$version.apk"
if (-not (Test-Path $apk)) { throw "APK da versão $version não encontrado: $apk (gere com npm run build:apk)" }
Write-Host "Instalando Nomma $version no emulador..."
& $adb install -r $apk
if ($LASTEXITCODE) { throw 'Falha ao instalar o APK.' }
& $adb shell am force-stop $pkg
& $adb shell am start -n "$pkg/.MainActivity" | Out-Null
Write-Host "Nomma $version aberto no emulador."
