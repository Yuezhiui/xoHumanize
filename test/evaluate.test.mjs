import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, rm, realpath } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepare, run, report, prepareCase, measure, validateReview } from '../scripts/evaluate.mjs';
import { CATEGORIES, normalizeRequest } from '../web/workflow.mjs';
import { completeWithMetadata, providerConfig } from '../server/provider.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJSON = async path => JSON.parse(await readFile(path, 'utf8'));
const reply = text => JSON.stringify({ text, analysis: [], review: CATEGORIES.map(category => ({ category, status: 'not_checked', note: 'Mock response.' })) });
async function fixture(t, options = {}) {
  const directory = await prepare({ case: 'final-word-count', repeats: '1', ...options });
  t.after(async () => {
    const checked = await realpath(directory);
    const parent = await realpath(resolve(root, '.private/evaluations'));
    assert.equal(dirname(checked), parent, 'Only delete the evaluation directory created by this test.');
    await rm(checked, { recursive: true, force: true });
  });
  return directory;
}
function environment(t) {
  const values = { XO_MODEL: 'evaluation-model', XO_API_BASE: 'https://example.test/v1', XO_API_KEY: 'test-private-credential', XO_JSON_MODE: 'true' };
  const original = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  Object.assign(process.env, values);
  t.after(() => { for (const [key, value] of Object.entries(original)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
}

test('paired evaluations freeze identical inputs and settings, excluding the rubric and credentials', async t => {
  environment(t);
  const directory = await fixture(t, { repeats: '2', temperature: '0.5', seed: '7' });
  const manifest = await readJSON(resolve(directory, 'manifest.json'));
  assert.equal(manifest.tasks.length, 4);
  assert.deepEqual(manifest.settings, { temperature: 0.5, seed: 7 });
  assert.doesNotMatch(JSON.stringify(manifest), /test-private-credential/);
  const tasks = await Promise.all(manifest.tasks.map(task => readJSON(resolve(directory, task.id, 'request.json'))));
  for (const task of tasks) {
    assert.deepEqual(task.input, tasks[0].input);
    assert.deepEqual(task.messages[1], tasks[0].messages[1]);
    assert.doesNotMatch(JSON.stringify(task.messages), /Final prose has exactly 60 whitespace-separated words after all edits|test-private-credential/);
  }
  const initial = await report(directory);
  assert.equal(initial.counts.missing, 4);
  assert.ok(initial.results.every(item => item.metrics === null && item.review.fidelity.status === 'not_reviewed'));
});

test('API evaluation resumes without overwriting responses and records provenance', async t => {
  environment(t);
  const directory = await fixture(t, { temperature: '0.4', seed: '9' });
  let calls = 0;
  const model = async (messages, config, signal) => {
    calls++;
    assert.equal(config.model, 'evaluation-model'); assert.equal(config.temperature, 0.4); assert.equal(config.seed, 9);
    assert.ok(signal instanceof AbortSignal);
    return { text: reply('word '.repeat(60).trim()), model: 'resolved-model', systemFingerprint: 'fixture', usage: { total_tokens: 100 } };
  };
  assert.equal((await run(directory, model)).failures, 0);
  await run(directory, model); assert.equal(calls, 2);
  const result = await report(directory);
  assert.equal(result.counts.complete, 2);
  assert.ok(result.results.every(item => item.metrics.exactWords === true && item.generation.resolvedModel === 'resolved-model' && item.review.fidelity.status === 'not_reviewed'));
  const task = result.results[0];
  await writeFile(resolve(directory, task.id, 'response.txt'), reply('Changed response.'));
  const changed = await report(directory);
  assert.equal(changed.results[0].generation.method, 'unverified');
  assert.equal(changed.results[0].metrics.exactWords, false);
});

test('configuration mismatch and altered prompts stop evaluation before any provider call', async t => {
  environment(t);
  const directory = await fixture(t);
  const noCall = async () => { assert.fail('Provider must not be called.'); };
  process.env.XO_MODEL = 'different-model';
  await assert.rejects(run(directory, noCall), /differs/);
  process.env.XO_MODEL = 'evaluation-model';
  const manifest = await readJSON(resolve(directory, 'manifest.json'));
  const path = resolve(directory, manifest.tasks[0].id, 'request.json');
  const task = await readJSON(path); task.input.source = 'Changed after preparation';
  await writeFile(path, JSON.stringify(task));
  await assert.rejects(run(directory, noCall), /Prepared request changed/);
});

test('failures remain visible and credentials are redacted; malformed results cannot pass', async t => {
  environment(t);
  const directory = await fixture(t);
  let calls = 0;
  const outcome = await run(directory, async () => {
    if (calls++ === 0) throw new Error('test-private-credential test-private-credential failed');
    return { text: 'not JSON', model: 'fixture' };
  });
  assert.equal(outcome.failures, 1);
  const result = await report(directory);
  assert.equal(result.counts.failed, 1); assert.equal(result.counts.invalid, 1);
  assert.doesNotMatch(JSON.stringify(result), /test-private-credential/);
  assert.ok(result.results.every(item => item.metrics === null));
});

test('manual outputs retain unverified provenance and separate detector observations', async t => {
  const directory = await fixture(t);
  const manifest = await readJSON(resolve(directory, 'manifest.json'));
  const folder = resolve(directory, manifest.tasks[0].id);
  await writeFile(resolve(folder, 'response.txt'), reply('A short reply.'));
  const review = await readJSON(resolve(folder, 'review.json'));
  review.reviewer = 'Fixture reviewer'; review.fidelity = { status: 'concern', note: 'All practical details were omitted.' };
  review.detectors = [{ tool: 'User supplied fixture', score: 15.3, meaning: 'Estimated content proportion', date: '2026-09-29' }];
  await writeFile(resolve(folder, 'review.json'), JSON.stringify(review));
  const result = await report(directory);
  assert.equal(result.results[0].generation.method, 'manual');
  assert.equal(result.results[0].review.fidelity.status, 'concern');
  assert.equal(result.results[0].review.detectors[0].score, 15.3);
  assert.equal(result.counts.missing, 1);
});

test('case, review, and length validation reject ambiguous or unsupported records', () => {
  assert.throws(() => prepareCase({ request: 'edit', source: 'x', checks: [] }));
  assert.throws(() => prepareCase({ id: 'x', request: 'edit', source: 'x', checks: [], operation: 'profile' }));
  assert.throws(() => validateReview({ reviewer: '', fidelity: { status: 'pass', note: '' } }));
  assert.deepEqual(measure('One two.\n\nThree.', { expectedWords: 3, oneParagraph: true }), { words: 3, paragraphs: 2, exactWords: true, oneParagraph: false });
  assert.equal(normalizeRequest({ source: 'My draft.' }).intensity, 'light');
  assert.equal(normalizeRequest({ source: 'My notes.', operation: 'draft' }).intensity, 'standard');
  assert.equal(normalizeRequest({ source: 'My draft.', intensity: 'deep' }).intensity, 'deep');
});

test('provider preserves evaluation settings and returns resolved model metadata', async () => {
  const config = { ...providerConfig({ XO_MODEL: 'alias', XO_API_KEY: 'private' }), temperature: 0.5, seed: 4 };
  const result = await completeWithMetadata([], config, undefined, async (_, options) => {
    const body = JSON.parse(options.body); assert.equal(body.temperature, 0.5); assert.equal(body.seed, 4);
    return new Response(JSON.stringify({ model: 'resolved', system_fingerprint: 'fp', usage: { total_tokens: 10 }, choices: [{ finish_reason: 'stop', message: { content: '{}' } }] }));
  });
  assert.equal(result.text, '{}'); assert.equal(result.model, 'resolved'); assert.equal(result.systemFingerprint, 'fp');
});
