// Serves only the selected APK and its QR code, never the project directory.
// Usage: node scripts/share-test-apk.cjs <apk-path> <LAN-IP> [port]
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const zlib = require('node:zlib');
const { toQR } = require('toqr');

const apk = path.resolve(process.argv[2]);
const host = process.argv[3];
const port = Number(process.argv[4] || 8765);
if (!fs.statSync(apk).isFile() || !apk.endsWith('.apk')) throw Error('APK inválido');
if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) throw Error('Informe o IPv4 da rede local');
const name = path.basename(apk);
const route = '/' + encodeURIComponent(name);
const url = `http://${host}:${port}${route}`;

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([size, body, crc]);
}
const cells = toQR(url);
const modules = Math.sqrt(cells.length);
const scale = 10;
const margin = 4;
const width = (modules + margin * 2) * scale;
const pixels = Buffer.alloc((width + 1) * width, 255);
for (let y = 0; y < width; y++) {
  pixels[y * (width + 1)] = 0;
  for (let x = 0; x < width; x++) {
    const row = Math.floor(y / scale) - margin;
    const col = Math.floor(x / scale) - margin;
    if (row >= 0 && col >= 0 && row < modules && col < modules && cells[row * modules + col]) {
      pixels[y * (width + 1) + x + 1] = 0;
    }
  }
}
const header = Buffer.alloc(13);
header.writeUInt32BE(width, 0);
header.writeUInt32BE(width, 4);
header[8] = 8; // 8-bit grayscale
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
const qrPath = path.join(path.dirname(apk), 'teste-android-qr.png');
fs.writeFileSync(qrPath, png);
const server = http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  if (req.url === '/qr.png') {
    res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': png.length });
    res.end(req.method === 'HEAD' ? undefined : png); return;
  }
  if (req.url !== route) { res.writeHead(404); res.end(); return; }
  const stat = fs.statSync(apk);
  res.writeHead(200, { 'Content-Type': 'application/vnd.android.package-archive',
    'Content-Length': stat.size, 'Content-Disposition': `attachment; filename="${name}"`,
    'Cache-Control': 'no-store' });
  if (req.method === 'HEAD') { res.end(); return; }
  const stream = fs.createReadStream(apk);
  stream.on('error', () => res.destroy());
  res.on('close', () => stream.destroy());
  stream.pipe(res);
});
server.listen(port, host, () => {
  console.log(`APK: ${apk}\nURL: ${url}\nQR: ${qrPath}\nPID: ${process.pid}`);
});
