/** Minimal local preview server: mimics Vercel's routing (public/ static + /api/rpc) for manual testing. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const rpc = require('./api/rpc');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/rpc') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      req.body = body;
      const fakeRes = {
        statusCode: 200,
        setHeader: () => {},
        end: (s) => { res.writeHead(fakeRes.statusCode, { 'Content-Type': 'application/json' }); res.end(s); }
      };
      rpc(req, fakeRes).catch((e) => { fakeRes.statusCode = 500; fakeRes.end(JSON.stringify({ ok: false, error: String(e) })); });
    });
    return;
  }
  let file = req.url === '/' ? '/index.html' : req.url === '/admin' ? '/admin.html' : req.url;
  const full = path.join(__dirname, 'public', file);
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'text/plain' });
    res.end(data);
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log('Dev server on http://localhost:' + port));
