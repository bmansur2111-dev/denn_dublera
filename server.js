// Запуск: node server.js  →  http://localhost:3000
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const AUDIO = path.join(ROOT, 'audio');

// [папка внутри audio/, заголовок на сайте] — порядок = порядок на странице
const SECTIONS = [
  ['1-prolog', 'Пролог'],
  ['2-ustazym', 'Ұстазым песня 11А'],
  ['3-scenka', 'Сценка 10кл'],
  ['4-nominaciya', 'Номинация 11Ә'],
  ['5-dombyra', 'Домбыра'],
  ['6-flashmob', 'Флешмоб'],
  ['7-kvn', 'КВН'],
  ['8-hor', 'Хор'],
  ['9-final', 'Финал'],
];

const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac|opus)$/i;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
};

SECTIONS.forEach(([dir]) => fs.mkdirSync(path.join(AUDIO, dir), { recursive: true }));

function listTracks() {
  return SECTIONS.map(([dir, title]) => ({
    dir,
    title,
    files: fs
      .readdirSync(path.join(AUDIO, dir))
      .filter((f) => AUDIO_EXT.test(f))
      .sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }))
      .map((f) => ({
        name: f.replace(AUDIO_EXT, ''),
        src: '/audio/' + dir + '/' + encodeURIComponent(f),
      })),
  }));
}

function sendFile(req, res, file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Не найдено');
    }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (!m) {
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes' });
      return fs.createReadStream(file).pipe(res);
    }
    let start = m[1] ? parseInt(m[1], 10) : 0;
    let end = m[2] ? parseInt(m[2], 10) : st.size - 1;
    if (!m[1] && m[2]) { start = Math.max(0, st.size - end); end = st.size - 1; }
    end = Math.min(end, st.size - 1);
    if (start > end) {
      res.writeHead(416, { 'Content-Range': 'bytes */' + st.size });
      return res.end();
    }
    res.writeHead(206, {
      'Content-Type': type,
      'Content-Length': end - start + 1,
      'Content-Range': `bytes ${start}-${end}/${st.size}`,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(file, { start, end }).pipe(res);
  });
}

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);

    if (url === '/api/tracks') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify(listTracks()));
    }

    const base = url.startsWith('/audio/') ? ROOT : PUBLIC;
    const file = path.join(base, url === '/' ? 'index.html' : url);
    if (!file.startsWith(base)) {
      res.writeHead(403);
      return res.end();
    }
    sendFile(req, res, file);
  })
  .listen(PORT, () => console.log('Сайт запущен: http://localhost:' + PORT));
