import { readFile, writeFile, mkdir, open, unlink, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify, parseArgs } from 'node:util';
import { createHash, randomUUID, randomInt } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMessages, normalizeRequest, parseResponse } from '../web/workflow.mjs';
import { providerConfig, completeWithMetadata } from '../server/provider.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const git = promisify(execFile);
const rulePaths = ['SKILL.md', 'references/writing-rules.md', 'references/voice.md', 'references/review.md'];
const hash = value => createHash('sha256').update(value).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const readJSON = async path => JSON.parse(await readFile(path, 'utf8'));
const writeJSON = (path, value, flag = 'w') => writeFile(path, json(value), { flag });
async function optional(path) { try { return await readFile(path, 'utf8'); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } }
async function gitText(args) { return (await git('git', args, { cwd: root, maxBuffer: 2_000_000 })).stdout.trimEnd(); }

export function prepareCase(value) {
  if (!value || typeof value.id !== 'string' || !/^[a-z0-9-]+$/.test(value.id) || typeof value.request !== 'string' || !Array.isArray(value.checks) || value.checks.some(check => typeof check !== 'string')) throw new Error('Each case needs an id, request, and checks.');
  if (value.operation !== undefined && !['edit', 'draft'].includes(value.operation)) throw new Error('Comparison cases support edit or draft operations.');
  if (value.expectedWords !== undefined && (!Number.isInteger(value.expectedWords) || value.expectedWords < 1)) throw new Error('expectedWords must be a positive integer.');
  if (value.oneParagraph !== undefined && typeof value.oneParagraph !== 'boolean') throw new Error('oneParagraph must be boolean.');
  // The assessment rubric never enters model messages. Intensity is explicit on both sides.
  const request = normalizeRequest({ operation: value.operation || 'edit', source: value.source, purpose: value.request, intensity: value.intensity || 'standard', samples: Array.isArray(value.samples) ? value.samples.join('\n---\n') : value.samples, profile: value.profile ?? null });
  return { ...value, input: request };
}
export function measure(text, testCase) {
  const words = text.trim() ? text.trim().split(/\s+/u).length : 0;
  const paragraphs = text.trim() ? text.trim().split(/\n\s*\n/u).length : 0;
  return { words, paragraphs, exactWords: testCase.expectedWords === undefined ? null : words === testCase.expectedWords, oneParagraph: testCase.oneParagraph ? paragraphs === 1 : null };
}
export function validateReview(value) {
  if (!value || typeof value.reviewer !== 'string') throw new Error('Review needs a reviewer field.');
  for (const key of ['fidelity', 'readability', 'voice']) {
    const item = value[key];
    if (!item || !['not_reviewed', 'pass', 'concern'].includes(item.status) || typeof item.note !== 'string') throw new Error(`Invalid ${key} review.`);
    if (item.status !== 'not_reviewed' && (!value.reviewer.trim() || !item.note.trim())) throw new Error('Completed reviews need a named reviewer and evidence.');
  }
  if (!Array.isArray(value.detectors)) throw new Error('detectors must be an array.');
  for (const item of value.detectors) {
    if (!item || !Number.isFinite(item.score) || item.score < 0 || item.score > 100 || ['tool', 'meaning', 'date'].some(key => typeof item[key] !== 'string' || !item[key].trim())) throw new Error('Detector observations need tool, score (0–100), score meaning, and date.');
  }
  return value;
}
const blankReview = () => ({ reviewer: '', fidelity: { status: 'not_reviewed', note: '' }, readability: { status: 'not_reviewed', note: '' }, voice: { status: 'not_reviewed', note: '' }, detectors: [] });

async function snapshot(ref) {
  const commit = await gitText(['rev-parse', '--verify', '--end-of-options', `${ref === 'WORKTREE' ? 'HEAD' : ref}^{commit}`]);
  const files = {};
  for (const name of rulePaths) files[name] = ref === 'WORKTREE' ? await readFile(resolve(root, 'xohumanize', name), 'utf8') : (await git('git', ['show', `${commit}:xohumanize/${name}`], { cwd: root, maxBuffer: 2_000_000 })).stdout;
  const instructions = rulePaths.map(name => files[name]).join('\n\n');
  return { ref, commit, instructions, sha256: hash(instructions), files };
}

export async function prepare(options = {}) {
  const baseline = await readJSON(resolve(root, 'evals/baseline.json'));
  const repeats = Number(options.repeats ?? 3);
  if (!Number.isInteger(repeats) || repeats < 1 || repeats > 10) throw new Error('Use 1–10 repeats.');
  const suppliedCases = await readJSON(resolve(options.cases || resolve(root, 'evals/cases.json')));
  if (!Array.isArray(suppliedCases) || !suppliedCases.length) throw new Error('Cases must be a nonempty array.');
  const cases = suppliedCases.map(prepareCase).filter(item => !options.case || item.id === options.case);
  if (!cases.length || new Set(cases.map(item => item.id)).size !== cases.length) throw new Error('Choose unique, nonempty cases.');
  const config = providerConfig();
  const settings = {};
  if (options.temperature !== undefined) {
    settings.temperature = Number(options.temperature);
    if (!Number.isFinite(settings.temperature) || settings.temperature < 0 || settings.temperature > 2) throw new Error('Temperature must be between 0 and 2.');
  }
  if (options.seed !== undefined) {
    settings.seed = Number(options.seed);
    if (!Number.isSafeInteger(settings.seed)) throw new Error('Seed must be a safe integer.');
  }
  const versions = [await snapshot(options.baseline || baseline.revision), await snapshot(options.candidate || 'WORKTREE')];
  if (randomInt(2)) versions.reverse();
  const directory = resolve(root, '.private/evaluations', `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`);
  await mkdir(directory, { recursive: true });
  const manifest = { version: 1, createdAt: new Date().toISOString(), wrapperSha256: hash(await readFile(resolve(root, 'web/workflow.mjs'))), casesSha256: hash(json(cases)), provider: { endpoint: config.endpoint, model: options.model || config.model || null, jsonMode: config.jsonMode }, settings, repeats, variants: {}, tasks: [] };
  for (let index = 0; index < versions.length; index++) {
    const name = index === 0 ? 'A' : 'B';
    const version = versions[index];
    manifest.variants[name] = { ref: version.ref, commit: version.commit, sha256: version.sha256 };
    await writeJSON(resolve(directory, `snapshot-${name}.json`), version);
  }
  await writeJSON(resolve(directory, 'cases.json'), cases);
  for (const testCase of cases) for (let repeat = 1; repeat <= repeats; repeat++) {
    const order = randomInt(2) ? ['A', 'B'] : ['B', 'A'];
    for (const variant of order) {
      const id = String(manifest.tasks.length + 1).padStart(3, '0');
      const version = versions[variant === 'A' ? 0 : 1];
      const task = { input: testCase.input, messages: buildMessages(testCase.input, version.instructions) };
      const folder = resolve(directory, id);
      await mkdir(folder);
      await writeJSON(resolve(folder, 'request.json'), task);
      await writeFile(resolve(folder, 'prompt.txt'), task.messages.map(message => `${message.role.toUpperCase()}\n${message.content}`).join('\n\n'));
      await writeJSON(resolve(folder, 'review.json'), blankReview());
      manifest.tasks.push({ id, caseId: testCase.id, repeat, variant, requestSha256: hash(json(task)) });
    }
  }
  await writeJSON(resolve(directory, 'manifest.json'), manifest);
  return directory;
}

async function loadRun(directory) {
  const manifest = await readJSON(resolve(directory, 'manifest.json'));
  if (manifest.version !== 1 || !Array.isArray(manifest.tasks) || !manifest.tasks.length || manifest.tasks.some(task => !/^\d{3,6}$/.test(task.id) || !['A', 'B'].includes(task.variant)) || new Set(manifest.tasks.map(task => task.id)).size !== manifest.tasks.length) throw new Error('Invalid evaluation manifest.');
  const cases = await readJSON(resolve(directory, 'cases.json'));
  if (hash(json(cases)) !== manifest.casesSha256) throw new Error('Evaluation cases changed after preparation. Prepare a new run.');
  for (const variant of ['A', 'B']) {
    const saved = await readJSON(resolve(directory, `snapshot-${variant}.json`));
    if (hash(saved.instructions) !== manifest.variants[variant]?.sha256) throw new Error('Instruction snapshot changed after preparation.');
  }
  return { manifest, cases };
}
async function loadTask(directory, task) {
  const value = await readJSON(resolve(directory, task.id, 'request.json'));
  if (hash(json(value)) !== task.requestSha256) throw new Error('Prepared request changed. Prepare a new run rather than editing prompts.');
  return value;
}
export async function run(directory, runModel = completeWithMetadata) {
  directory = resolve(directory);
  const { manifest } = await loadRun(directory);
  const config = providerConfig();
  if (!config.ready) throw new Error('Configure XO_MODEL and provider credentials, or use the saved prompts manually.');
  if (config.model !== manifest.provider.model || config.endpoint !== manifest.provider.endpoint || config.jsonMode !== manifest.provider.jsonMode) throw new Error('Provider/model configuration differs from the prepared run. Restore it or prepare again.');
  for (const task of manifest.tasks) await loadTask(directory, task);
  const lock = await open(resolve(directory, '.running'), 'wx');
  let failures = 0;
  try {
    for (const task of manifest.tasks) {
      const folder = resolve(directory, task.id);
      if (await optional(resolve(folder, 'response.txt')) !== null) continue;
      try {
        const request = await loadTask(directory, task);
        const result = await runModel(request.messages, { ...config, ...manifest.settings }, AbortSignal.timeout(90000));
        // Keep even malformed model output for diagnosis; reporting validates it later.
        await writeJSON(resolve(folder, 'generation.json'), { method: 'api', date: new Date().toISOString(), requestedModel: config.model, resolvedModel: result.model, systemFingerprint: result.systemFingerprint, usage: result.usage, requestSha256: task.requestSha256, responseSha256: hash(result.text) });
        await writeFile(resolve(folder, 'response.txt'), result.text, { flag: 'wx' });
      } catch (error) {
        failures++;
        const message = config.key ? error.message.replaceAll(config.key, '[redacted]') : error.message;
        await writeJSON(resolve(folder, `error-${Date.now()}.json`), { date: new Date().toISOString(), error: message });
      }
    }
  } finally { await lock.close(); await unlink(resolve(directory, '.running')); }
  return { failures };
}

export async function report(directory) {
  directory = resolve(directory);
  const { manifest, cases } = await loadRun(directory);
  const results = [];
  for (const task of manifest.tasks) {
    const request = await loadTask(directory, task);
    const testCase = cases.find(item => item.id === task.caseId);
    if (!testCase) throw new Error('Task references an unknown case.');
    const folder = resolve(directory, task.id);
    const raw = await optional(resolve(folder, 'response.txt'));
    const errors = await Promise.all((await readdir(folder)).filter(name => /^error-\d+\.json$/.test(name)).map(name => readJSON(resolve(folder, name))));
    const entry = { ...task, status: raw === null ? (errors.length ? 'failed' : 'missing') : 'invalid', errors, generation: null, metrics: null, warnings: [], review: null, checks: testCase.checks };
    try { entry.review = validateReview(await readJSON(resolve(folder, 'review.json'))); } catch (error) { entry.reviewError = error.message; }
    if (raw !== null) {
      const generation = await optional(resolve(folder, 'generation.json'));
      if (generation) {
        try {
          const metadata = JSON.parse(generation);
          entry.generation = metadata.requestSha256 === task.requestSha256 && metadata.responseSha256 === hash(raw) ? metadata : { method: 'unverified', note: 'Response or request differs from generation record.' };
        } catch { entry.generation = { method: 'unverified', note: 'Generation record could not be read.' }; }
      } else entry.generation = { method: 'manual', note: 'Model and generation settings were not verified.' };
      try {
        const parsed = parseResponse(raw, request.input);
        entry.status = 'complete';
        entry.metrics = measure(parsed.text, testCase);
        entry.warnings = parsed.warnings;
        await writeFile(resolve(folder, 'text.txt'), parsed.text);
      } catch (error) { entry.error = error.message; }
    }
    results.push(entry);
  }
  const result = { version: 1, createdAt: new Date().toISOString(), provider: manifest.provider, settings: manifest.settings, note: 'Counts and literal warnings are mechanical checks. Editorial reviews and detector observations are entered separately. No automatic winner or detector guarantee.', counts: { total: results.length, complete: results.filter(item => item.status === 'complete').length, missing: results.filter(item => item.status === 'missing').length, failed: results.filter(item => item.status === 'failed').length, invalid: results.filter(item => item.status === 'invalid').length }, results };
  await writeJSON(resolve(directory, 'report.json'), result);
  const cell = value => String(value ?? '—').replaceAll('|', '\\|').replace(/[\r\n]/g, ' ');
  const lines = ['# Comparison report', '', result.note, '', 'Version identities are in manifest.json; review outputs before revealing them.', '', '| Task | Case | Variant | Repeat | Status | Words | Exact length | Fidelity | Readability | Voice |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'];
  for (const item of results) lines.push(`| ${[item.id, item.caseId, item.variant, item.repeat, item.status, item.metrics?.words, item.metrics?.exactWords, item.review?.fidelity.status ?? 'not_reviewed', item.review?.readability.status ?? 'not_reviewed', item.review?.voice.status ?? 'not_reviewed'].map(cell).join(' | ')} |`);
  lines.push('', 'See report.json for generation provenance, paragraph checks, validation errors, literal warnings, review notes, and detector observations. Missing and invalid outputs remain visible. Detector percentages are not averaged or compared as a common scale.');
  await writeFile(resolve(directory, 'report.md'), lines.join('\n') + '\n');
  return result;
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'prepare') {
    const { values } = parseArgs({ args, options: Object.fromEntries(['baseline', 'candidate', 'cases', 'case', 'repeats', 'model', 'temperature', 'seed'].map(name => [name, { type: 'string' }])) });
    console.log(await prepare(values));
  } else if (['run', 'report'].includes(command) && args.length === 1) {
    if (command === 'run') { const outcome = await run(args[0]); if (outcome.failures) process.exitCode = 1; }
    const result = await report(args[0]);
    console.log(JSON.stringify(result.counts));
    console.log(resolve(args[0], 'report.md'));
  } else throw new Error('Use: npm run eval -- prepare [--baseline REF] [--candidate REF|WORKTREE] [--repeats 3] [--case ID] [--model ID] [--temperature N] [--seed N]; or run|report <run-directory>.');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
