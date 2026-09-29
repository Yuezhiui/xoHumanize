import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/index.mjs';
import { complete, providerConfig } from '../server/provider.mjs';
import { CATEGORIES } from '../web/workflow.mjs';
import http from 'node:http';

const raw = JSON.stringify({ text: 'Revised.', analysis: ['Concise wording.'], review: CATEGORIES.map(category => ({ category, status: 'not_checked', note: 'Test fixture.' })) });
async function withApp(options, callback) {
  const server = createApp({ instructions: 'Preserve meaning.', config: { ready: true, endpoint: 'https://example.com/v1/chat/completions', key: 'secret', model: 'test' }, runModel: async () => raw, ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await callback(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
const post = (base, body, headers = {}) => fetch(`${base}/api/run`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('API returns a validated rewrite and never includes credentials in status', async () => {
  await withApp({}, async base => {
    const response = await post(base, { source: 'Original.' }); assert.equal(response.status, 200); assert.equal((await response.json()).text, 'Revised.');
    const status = await (await fetch(`${base}/api/status`)).text(); assert.doesNotMatch(status, /secret|Bearer/);
  });
});
test('API enforces origin, token, content type, JSON shape, and body limits', async () => {
  await withApp({ token: 'test-token' }, async base => {
    assert.equal((await post(base, { source: 'x' })).status, 401);
    assert.equal((await post(base, { source: 'x' }, { Authorization: 'Bearer test-token', Origin: 'https://attacker.example' })).status, 403);
    const auth = { Authorization: 'Bearer test-token' };
    assert.equal((await post(base, '{broken', auth)).status, 400);
    assert.equal((await post(base, { source: '' }, auth)).status, 400);
    assert.equal((await post(base, { source: 'x' }, { ...auth, 'Content-Type': 'text/plain' })).status, 415);
    assert.equal((await post(base, 'x'.repeat(150001), auth)).status, 413);
    assert.equal((await post(base, { source: 'x' }, auth)).status, 200);
  });
});
test('static routes cannot expose .env, git, or arbitrary files', async () => {
  await withApp({}, async base => {
    for (const path of ['/.env', '/.git/config', '/server/provider.mjs', '/README.md', '/../../.env']) assert.equal((await fetch(base + path)).status, 404);
    const page = await fetch(base); assert.equal(page.status, 200); assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  });
});
test('missing configuration is an actionable error, not a fake rewrite', async () => {
  await withApp({ config: { ready: false, endpoint: 'https://example.com/v1/chat/completions' } }, async base => {
    const response = await post(base, { source: 'Original.' }); assert.equal(response.status, 503); assert.match((await response.json()).error, /Copy prompt/);
  });
});
test('provider errors do not echo provider API keys', async () => {
  await withApp({ runModel: async () => { throw new Error('failed secret secret'); } }, async base => {
    const response = await post(base, { source: 'Original.' }); assert.equal(response.status, 502); assert.doesNotMatch(await response.text(), /secret/);
  });
});
test('simultaneously arriving bodies cannot exceed two active provider calls', async () => {
  let calls = 0;
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await withApp({ runModel: async () => { calls++; await held; return raw; } }, async base => {
    const requests = [];
    const results = Array.from({ length: 3 }, () => new Promise((resolve, reject) => {
      const req = http.request(`${base}/api/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
      req.on('error', reject); req.flushHeaders(); requests.push(req);
    }));
    // Let all three enter body parsing before any one body completes.
    await new Promise(resolve => setTimeout(resolve, 25));
    for (const req of requests) req.end(JSON.stringify({ source: 'Original.' }));
    try {
      const first = await Promise.race([Promise.race(results), new Promise((_, reject) => setTimeout(() => reject(new Error('Admission did not reject the extra request.')), 1000))]);
      assert.equal(first, 429); assert.equal(calls, 2);
    } finally { release(); }
    assert.deepEqual((await Promise.all(results)).sort(), [200, 200, 429]);
  });
});
test('provider validates endpoint and supports keyless local models', () => {
  assert.equal(providerConfig({ XO_API_BASE: 'http://localhost:11434/v1', XO_MODEL: 'local' }).ready, true);
  assert.equal(providerConfig({ XO_MODEL: 'remote' }).ready, false);
  for (const base of ['http://example.com/v1', 'https://user:password@example.com/v1', 'https://example.com/v1?token=bad', 'file:///tmp']) assert.throws(() => providerConfig({ XO_API_BASE: base }));
});
test('provider handles JSON mode, credentials, truncation, and refusals', async () => {
  const config = providerConfig({ XO_MODEL: 'test', XO_API_KEY: 'secret' });
  const mock = async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/chat/completions'); assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, 'Bearer secret'); assert.equal(JSON.parse(options.body).response_format.type, 'json_object');
    return new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: raw } }] }));
  };
  assert.equal(await complete([], config, undefined, mock), raw);
  for (const choice of [{ finish_reason: 'length', message: { content: '{}' } }, { message: { refusal: 'Cannot do this' } }, { message: {} }]) await assert.rejects(complete([], config, undefined, async () => new Response(JSON.stringify({ choices: [choice] }))));
  await assert.rejects(complete([], config, undefined, async () => new Response('private provider info', { status: 401 })), /HTTP 401/);
});
