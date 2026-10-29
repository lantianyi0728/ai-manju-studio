/**
 * 漫剧工坊 · 本地服务
 * 零依赖：静态文件托管 + LLM 流式转发（解决浏览器直连 API 的 CORS 问题）
 * 启动： node server.js   →  http://127.0.0.1:5178
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT) || 5178;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function sendJSON(res, code, obj) {
  const buf = Buffer.from(JSON.stringify(obj));
  if (res.headersSent) { try { res.end(buf); } catch (e) {} return; }
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': buf.length });
  res.end(buf);
}

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  if (/^\/(\.git|node_modules|_)/.test(rel)) { res.writeHead(403); return res.end('Forbidden'); }
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('404 Not Found'); }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}

function proxyStream(targetUrl, apiKey, payload, res) {
  let u;
  try { u = new URL(targetUrl); } catch (e) { return sendJSON(res, 400, { error: '接口地址格式不正确：' + targetUrl }); }

  const lib = u.protocol === 'https:' ? https : http;
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': body.length,
    'Accept': payload.stream ? 'text/event-stream' : 'application/json'
  };
  if (apiKey) headers['Authorization'] = 'Bearer ' + apiKey;

  const req = lib.request({
    protocol: u.protocol,
    hostname: u.hostname,
    port: u.port || (u.protocol === 'https:' ? 443 : 80),
    path: u.pathname + (u.search || ''),
    method: 'POST',
    headers
  }, (up) => {
    if (up.statusCode !== 200) {
      let err = '';
      up.setEncoding('utf8');
      up.on('data', d => { if (err.length < 4000) err += d; });
      up.on('end', () => sendJSON(res, up.statusCode || 502, { error: '上游接口返回 ' + up.statusCode + '：' + err.slice(0, 1500) }));
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    up.pipe(res);
  });

  req.setTimeout(300000, () => req.destroy(new Error('上游请求超时（300s）')));
  req.on('error', (e) => {
    if (!res.headersSent) sendJSON(res, 502, { error: '连接失败：' + e.message });
    else { try { res.end(); } catch (_) {} }
  });
  req.write(body);
  req.end();
}

const server = http.createServer((req, res) => {
  const pathname = (req.url || '/').split('?')[0];

  if (req.method === 'POST' && pathname === '/api/generate') {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', d => {
      raw += d;
      if (raw.length > 40 * 1024 * 1024) { req.destroy(); }
    });
    req.on('end', () => {
      let cfg;
      try { cfg = JSON.parse(raw || '{}'); } catch (e) { return sendJSON(res, 400, { error: '请求体不是合法 JSON' }); }
      const { baseURL, apiKey, model, messages, temperature, maxTokens } = cfg;
      if (!baseURL || !model) return sendJSON(res, 400, { error: '缺少接口地址或模型名' });
      if (!Array.isArray(messages) || !messages.length) return sendJSON(res, 400, { error: '缺少对话内容' });

      let url = String(baseURL).trim().replace(/\/+$/, '');
      if (!/\/chat\/completions$/.test(url)) url += '/chat/completions';

      proxyStream(url, apiKey, {
        model,
        messages,
        temperature: typeof temperature === 'number' ? temperature : 0.8,
        max_tokens: maxTokens || 8192,
        stream: true
      }, res);
    });
    return;
  }

  if (pathname === '/api/health') return sendJSON(res, 200, { ok: true, ts: Date.now() });

  serveStatic(req, res, pathname);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  漫剧工坊已启动  →  http://127.0.0.1:' + PORT);
  console.log('  工作目录: ' + ROOT);
  console.log('  按 Ctrl+C 停止');
  console.log('');
});
