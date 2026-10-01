// Serve o APK na rede local para instalar pelo celular via QR Code (só durante a instalação).
// Uso: node scripts/serve-apk.cjs [ip] [porta]  — Ctrl+C para parar.
// O app instalado não depende deste servidor: ele só entrega o arquivo.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const root = path.resolve(__dirname, '..');
const version = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo.version;
const apk = path.join(root, 'builds', `nomma-${version}.apk`);
const port = Number(process.argv[3] ?? 8765);
const lanIp =
  process.argv[2] ??
  Object.values(os.networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal)?.address;

if (!fs.existsSync(apk)) {
  console.error(`APK não encontrado: ${apk}. Rode npm run build:apk.`);
  process.exit(1);
}

const fileName = path.basename(apk);
const page = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Nomma ${version}</title>
<body style="font-family:sans-serif;padding:24px;text-align:center">
<h1>Nomma ${version}</h1>
<p><a href="/${fileName}" style="font-size:20px;padding:14px 24px;background:#0E7C66;color:#fff;border-radius:12px;text-decoration:none;display:inline-block">Baixar APK</a></p>
<p>Depois de baixar, abra o arquivo e permita instalar apps desta fonte.</p></body>`;

http
  .createServer((req, res) => {
    console.log(`${new Date().toLocaleTimeString('pt-BR')} ${req.socket.remoteAddress} ${req.method} ${req.url}`);
    if (req.url === `/${fileName}`) {
      res.writeHead(200, {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': fs.statSync(apk).size,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      });
      fs.createReadStream(apk).pipe(res);
    } else if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(page);
    } else {
      res.writeHead(404).end();
    }
  })
  .listen(port, '0.0.0.0', () => {
    console.log(`Servindo ${fileName} em http://${lanIp}:${port}/`);
  });
