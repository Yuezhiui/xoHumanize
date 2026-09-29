export function providerConfig(env = process.env) {
  const base = env.XO_API_BASE || 'https://api.openai.com/v1';
  const url = new URL(base);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && local))) throw new Error('XO_API_BASE must use HTTPS, or HTTP on localhost, without embedded credentials or query parameters.');
  return { endpoint: `${base.replace(/\/$/, '')}/chat/completions`, model: env.XO_MODEL || '', key: env.XO_API_KEY || '', jsonMode: env.XO_JSON_MODE !== 'false', ready: Boolean(env.XO_MODEL && (env.XO_API_KEY || local)) };
}
export async function complete(messages, config, signal, fetcher = fetch) {
  return (await completeWithMetadata(messages, config, signal, fetcher)).text;
}
export async function completeWithMetadata(messages, config, signal, fetcher = fetch) {
  if (!config.ready) throw new Error('Configure XO_MODEL and your provider in .env, or use Copy prompt with a web chatbot.');
  const body = { model: config.model, messages, ...(config.jsonMode ? { response_format: { type: 'json_object' } } : {}), ...(config.temperature === undefined ? {} : { temperature: config.temperature }), ...(config.seed === undefined ? {} : { seed: config.seed }) };
  const response = await fetcher(config.endpoint, {
    method: 'POST', redirect: 'error', signal,
    headers: { 'Content-Type': 'application/json', ...(config.key ? { Authorization: `Bearer ${config.key}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`The model provider returned HTTP ${response.status}. Check its model, credentials, and usage limits.`);
  const reader = response.body.getReader();
  const chunks = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > 1000000) { await reader.cancel(); throw new Error('The model provider response was too large.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const output = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const choice = output.choices?.[0];
  if (!choice || choice.message?.refusal) throw new Error('The model declined this request or returned no answer.');
  if (choice.finish_reason && choice.finish_reason !== 'stop') throw new Error('The model response was incomplete. Try a shorter passage.');
  if (typeof choice.message?.content !== 'string') throw new Error('The provider did not return text.');
  return { text: choice.message.content, model: output.model ?? null, systemFingerprint: output.system_fingerprint ?? null, usage: output.usage ?? null };
}
