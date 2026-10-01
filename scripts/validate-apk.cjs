// Validação do APK em um aparelho/emulador via adb (sem dependências).
// Instala limpo, abre, cadastra receita e gasto pela interface, confere saldo,
// reinicia o app e confere persistência; por fim procura crashes no logcat.
// Uso: node scripts/validate-apk.cjs [caminho-do-apk]
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const root = path.resolve(__dirname, '..');
const version = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo.version;
const apk = process.argv[2] ?? path.join(root, 'builds', `nomma-${version}.apk`);
const adbPath = path.join(root, '.android-env', 'sdk', 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const PKG = 'com.rennancos.financas';

const adb = (...args) => execFileSync(adbPath, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const record = (name, ok, detail = '') => {
  results.push({ name, ok });
  if (!ok) {
    // Evidência da falha: captura de tela em .android-env/tmp.
    const shot = path.join(root, '.android-env', 'tmp', `falha-${results.length}.png`);
    fs.writeFileSync(shot, execFileSync(adbPath, ['exec-out', 'screencap', '-p']));
    detail = `${detail} captura: ${shot}`.trim();
  }
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

function screen() {
  adb('shell', 'uiautomator', 'dump', '/sdcard/ui.xml');
  return adb('exec-out', 'cat', '/sdcard/ui.xml');
}

/** Centro do primeiro nó cujo text ou content-desc é exatamente `label`. */
function find(xml, label) {
  const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:text|content-desc)="${esc}"[^>]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
  const m = re.exec(xml);
  if (!m) return null;
  const [x1, y1, x2, y2] = m.slice(1).map(Number);
  return { x: Math.round((x1 + x2) / 2), y: Math.round((y1 + y2) / 2) };
}

async function waitFor(label, timeoutMs = 30000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const xml = screen();
    const pos = find(xml, label);
    if (pos) return pos;
    await sleep(1000);
  }
  return null;
}

async function tap(label) {
  let pos = await waitFor(label, 8000);
  // Rola para baixo até achar (formulários longos).
  for (let i = 0; !pos && i < 5; i++) {
    adb('shell', 'input', 'swipe', '540', '1800', '540', '700', '300');
    await sleep(600);
    pos = find(screen(), label);
  }
  if (!pos) throw new Error(`não encontrado na tela: "${label}"`);
  adb('shell', 'input', 'tap', String(pos.x), String(pos.y));
  await sleep(800);
}

async function addTransaction(action, amount) {
  await tap('Adicionar movimentação');
  await tap(action);
  await waitFor('Valor (R$)');
  adb('shell', 'input', 'text', amount); // campo de valor tem foco automático
  await sleep(500);
  adb('shell', 'input', 'keyevent', '111'); // ESC fecha o teclado
  await sleep(500);
  await tap('Salvar');
}

(async () => {
  const devices = adb('devices').split(/\r?\n/).filter((l) => /\tdevice$/.test(l));
  if (devices.length === 0) throw new Error('nenhum aparelho/emulador conectado (adb devices)');
  console.log(`Aparelho: ${devices[0].split('\t')[0]}  APK: ${apk}`);

  // Prova de independência: sem rede (modo avião) e sem túnel para o computador (Metro/dev server).
  adb('reverse', '--remove-all');
  adb('shell', 'cmd', 'connectivity', 'airplane-mode', 'enable');
  adb('shell', 'svc', 'wifi', 'disable');
  adb('shell', 'svc', 'data', 'disable');
  await sleep(2000);
  const airplane = adb('shell', 'settings', 'get', 'global', 'airplane_mode_on').trim() === '1';
  const reverses = adb('reverse', '--list').trim();
  record('Aparelho offline (modo avião, sem adb reverse)', airplane && reverses === '', reverses);

  try { adb('uninstall', PKG); } catch { /* não instalado */ }
  adb('install', '-r', apk);
  record('Instalação', adb('shell', 'pm', 'list', 'packages', PKG).includes(PKG));

  adb('logcat', '-c');
  adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1');
  record('Inicialização + SQLite (dashboard carregado)', (await waitFor('Saldo disponível', 60000)) !== null);

  await addTransaction('Adicionar receita', '5300');
  record('Cadastro de receita (saldo R$ 5.300,00)', (await waitFor('R$ 5.300,00')) !== null);

  await addTransaction('Adicionar gasto', '32,90');
  record('Cadastro de gasto (saldo R$ 5.267,10)', (await waitFor('R$ 5.267,10')) !== null);

  adb('shell', 'am', 'force-stop', PKG);
  await sleep(1500);
  adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1');
  record('Persistência após fechar e reabrir', (await waitFor('R$ 5.267,10', 60000)) !== null);

  // Navega por todas as abas e telas do menu "Mais" (detecta módulo nativo faltando / crash de tela).
  const screens = [
    ['Movimentações', 'Pesquisar'],
    ['Análises', 'Fechamento do mês'],
  ];
  let navOk = true;
  for (const [tab, marker] of screens) {
    await tap(tab);
    if (!(await waitFor(marker, 15000))) { navOk = false; console.log(`  tela sem conteúdo: ${tab}`); }
  }
  const more = [
    ['Gastos fixos e salário', 'Nova recorrência'],
    ['Parcelamentos', 'Novo parcelamento'],
    ['Cartões de crédito', 'Novo cartão'],
    ['Investimentos', 'Novo aporte'],
    ['Metas', 'Nova meta'],
    ['Orçamentos', 'Novo orçamento'],
    ['Contas', 'Nova conta'],
    ['Categorias', 'Adicionar'],
    ['Backup e exportação', 'Exportar JSON'],
    ['Configurações', 'Carregar exemplos'],
  ];
  for (const [item, marker] of more) {
    await tap('Mais');
    await tap(item);
    if (!(await waitFor(marker, 15000))) { navOk = false; console.log(`  tela sem conteúdo: ${item}`); }
    adb('shell', 'input', 'keyevent', '4'); // voltar
    await sleep(800);
  }
  record('Navegação por todas as telas', navOk);

  const log = adb('logcat', '-d', '-b', 'crash');
  const crashed = log.includes(PKG);
  record('Sem crash no logcat', !crashed, crashed ? 'ver adb logcat -b crash' : '');

  adb('shell', 'cmd', 'connectivity', 'airplane-mode', 'disable'); // devolve a rede do emulador

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} PASS`);
  process.exitCode = failed ? 1 : 0;
})().catch((e) => {
  const shot = path.join(root, '.android-env', 'tmp', 'falha-excecao.png');
  try {
    fs.writeFileSync(shot, execFileSync(adbPath, ['exec-out', 'screencap', '-p']));
    const texts = [...screen().matchAll(/text="([^"]+)"/g)].map((m) => m[1]).slice(0, 15);
    console.error(`  tela no momento: ${texts.join(' | ')}\n  captura: ${shot}`);
  } catch { /* sem aparelho */ }
  console.error(`FAIL ${e.message}`);
  process.exitCode = 1;
});
