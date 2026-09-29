import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { buildMessages, normalizeRequest, parseResponse } from '../web/workflow.mjs';
import { complete, providerConfig } from './provider.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const rulePaths = ['SKILL.md', 'references/writing-rules.md', 'references/voice.md', 'references/review.md'];
export async function loadInstructions() { return (await Promise.all(rulePaths.map(path => readFile(resolve(root, 'xohumanize', path), 'utf8')))).join('\n\n'); }
const headers = {
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
};
export function createApp({ config = providerConfig(), instructions, token = '', origin = '', runModel = complete } = {}) {
  let active = 0;
  return http.createServer(async (req, res) => {
    const send = (status, data) => { res.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
    try {
      const host = req.headers.host || '';
      const allowedHosts = origin ? [new URL(origin).host] : [`localhost:${req.socket.localPort}`, `127.0.0.1:${req.socket.localPort}`, `[::1]:${req.socket.localPort}`];
      if (!allowedHosts.includes(host)) return send(403, { error: 'Host is not allowed.' });
      const expectedOrigin = origin || `http://${host}`;
      if (req.headers.origin && req.headers.origin !== expectedOrigin) return send(403, { error: 'Origin is not allowed.' });
      const path = new URL(req.url, expectedOrigin).pathname;
      if (req.method === 'GET' && path === '/api/status') return send(200, { ready: config.ready, model: config.model, requiresToken: Boolean(token), provider: new URL(config.endpoint).host });
      if (req.method === 'POST' && path === '/api/run') {
        const supplied = (req.headers.authorization || '').replace(/^Bearer /, '');
        if (token && (Buffer.byteLength(supplied) !== Buffer.byteLength(token) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(token)))) return send(401, { error: 'Enter the server access token in Settings.' });
        if (!req.headers['content-type']?.startsWith('application/json')) return send(415, { error: 'Use application/json.' });
        if (active >= 2) return send(429, { error: 'Two requests are already running. Try again shortly.' });
        const chunks = []; let size = 0;
        for await (const chunk of req) { size += chunk.length; if (size > 150000) { send(413, { error: 'Request too large.' }); return; } chunks.push(chunk); }
        let request;
        try { request = normalizeRequest(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch (error) { return send(400, { error: error.message }); }
        if (!config.ready) return send(503, { error: 'No model connected. Configure .env or use Copy prompt with your web chatbot.' });
        // Other requests may have entered the provider while this body was arriving.
        if (active >= 2) return send(429, { error: 'Two requests are already running. Try again shortly.' });
        active++;
        const abort = new AbortController();
        const timer = setTimeout(() => abort.abort(), 90000);
        res.on('close', () => { if (!res.writableEnded) abort.abort(); });
        try {
          const raw = await runModel(buildMessages(request, instructions ?? await loadInstructions()), config, abort.signal);
          send(200, parseResponse(raw, request));
        } catch (error) {
          const message = config.key ? error.message.replaceAll(config.key, '[redacted]') : error.message;
          if (!res.destroyed) send(502, { error: abort.signal.aborted ? 'The request timed out or was cancelled.' : message });
        } finally { clearTimeout(timer); active--; }
        return;
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, { error: 'Method not allowed.' });
      const files = { '/': ['web/index.html', 'text/html'], '/app.mjs': ['web/app.mjs', 'text/javascript'], '/workflow.mjs': ['web/workflow.mjs', 'text/javascript'], '/style.css': ['web/style.css', 'text/css'] };
      if (path === '/instructions.txt') { res.writeHead(200, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' }); return res.end(req.method === 'HEAD' ? '' : instructions ?? await loadInstructions()); }
      const file = files[path]; if (!file) return send(404, { error: 'Not found.' });
      const contents = await readFile(resolve(root, file[0]));
      res.writeHead(200, { ...headers, 'Content-Type': `${file[1]}; charset=utf-8` }); res.end(req.method === 'HEAD' ? '' : contents);
    } catch { if (!res.headersSent) send(500, { error: 'The request could not be completed.' }); else res.end(); }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const host = process.env.HOST || '127.0.0.1';
  const token = process.env.XO_ACCESS_TOKEN || '';
  const origin = process.env.XO_ORIGIN || '';
  if (!['127.0.0.1', 'localhost', '::1'].includes(host) && (token.length < 32 || !origin.startsWith('https://'))) throw new Error('Public binding requires XO_ACCESS_TOKEN (32+ characters) and an HTTPS XO_ORIGIN behind a reverse proxy.');
  const server = createApp({ token, origin });
  server.requestTimeout = 100000; server.headersTimeout = 15000;
  server.listen(Number(process.env.PORT || 4318), host, () => console.log(`xoHumanize is ready at http://${host}:${server.address().port}`));
}
