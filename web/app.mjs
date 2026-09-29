import { normalizeRequest, validateProfile, exportPrompt, parseResponse, diffTokens } from './workflow.mjs';

const $ = id => document.getElementById(id);
const PROFILE_KEY = 'xohumanize.profiles.v1', HISTORY_KEY = 'xohumanize.history.v1';
let instructions = '', connection = { ready: false }, profiles = [], history = [], selection = null;
let pending = null, current = null, controller = null, busy = false, activeView = 'text', transientProfile = null;
let intensityChosen = false;
const words = text => text.trim() ? text.trim().split(/\s+/u).length : 0;
function notify(message, target = 'status') { $(target).textContent = message; }
function handle(id, event, fn, target = 'status') {
  $(id).addEventListener(event, async e => { try { await fn(e); } catch (error) { notify(error.message, target); } });
}
function el(tag, text, className) { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; }
function button(text, fn) { const node = el('button', text, 'text-button'); node.addEventListener('click', () => { try { fn(); } catch (error) { notify(error.message); } }); return node; }
function download(name, content, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement('a');
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function copy(text) { if (!navigator.clipboard) throw new Error('Clipboard is unavailable. Select the text and copy it manually.'); await navigator.clipboard.writeText(text); }
function setBusy(value) {
  busy = value;
  for (const id of ['run', 'analyze', 'prepare', 'analyze-voice', 'import-response']) $(id).disabled = value;
  $('cancel').hidden = !value; $('source').setAttribute('aria-busy', String(value));
}
function readRequest(operation = $('task').value) {
  const profile = $('profile-select').value === 'transient' ? transientProfile : profiles.find(item => item.id === $('profile-select').value)?.profile;
  return normalizeRequest({ operation, intensity: document.querySelector('input[name=intensity]:checked').value, source: $('source').value, audience: $('audience').value, purpose: $('purpose').value, context: $('context').value, samples: operation === 'profile' ? $('samples').value : '', profile: profile || null, selection: operation === 'edit' ? selection : null });
}
function clearSelection() { selection = null; $('selection-banner').hidden = true; }
function restoreScope(request) {
  clearSelection();
  $('source-title').textContent = $('task').value === 'draft' ? 'Your notes' : 'Your draft';
  $('use-selection').disabled = $('task').value === 'draft';
  if (request?.selection) {
    selection = { ...request.selection };
    $('selection-note').textContent = `Editing ${words(request.source.slice(selection.start, selection.end))} selected words`;
    $('selection-banner').hidden = false;
  }
}
function wordCount() { $('source-count').textContent = `${words($('source').value)} words`; }
function changeView(view) {
  activeView = view;
  for (const tab of document.querySelectorAll('[data-view]')) { const selected = tab.dataset.view === view; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; }
  for (const name of ['text', 'changes', 'review']) $(`${name}-panel`).hidden = !current || name !== view;
}
function renderResult() {
  if (!current) return;
  const { request, result } = current;
  $('empty-result').hidden = true;
  const isAnalysis = request.operation === 'analyze';
  $('text-panel').textContent = isAnalysis ? 'Analysis only. Your source has not been rewritten.' : result.text;
  $('result-count').textContent = isAnalysis ? 'Analysis' : `${words(result.text)} words`;
  $('result-scope').textContent = isAnalysis ? 'Source diagnosis' : result.scope;
  $('copy-result').disabled = $('download-result').disabled = isAnalysis;
  $('changes-panel').replaceChildren();
  if (isAnalysis) $('changes-panel').textContent = 'No changes: this was an analysis request.';
  else for (const part of diffTokens(request.source, result.text)) $('changes-panel').append(el(part.type === 'added' ? 'ins' : part.type === 'removed' ? 'del' : 'span', part.text, part.type));
  const panel = $('review-panel'); panel.replaceChildren();
  panel.append(el('p', 'Editorial review by the writing model. “Checked” means compared with your source, not independently verified.', 'hint'));
  panel.append(el('h3', 'What the draft needs'));
  const analysis = el('ul'); for (const item of result.analysis) analysis.append(el('li', item)); panel.append(analysis);
  if (result.warnings.length) {
    panel.append(el('h3', 'Literal checks to review'));
    for (const warning of result.warnings) panel.append(el('p', warning, 'warning'));
  }
  panel.append(el('h3', 'Fidelity review'));
  const labels = { meaning: 'Meaning and stance', details: 'Names, numbers, and dates', qualifications: 'Qualifications and obligations', citations: 'Quotations and citations', additions: 'Added information', omissions: 'Omissions', external_accuracy: 'External accuracy' };
  for (const item of result.review) {
    const row = el('div', null, 'review-entry'); row.append(el('strong', labels[item.category]), el('span', item.status.replaceAll('_', ' '), 'review-status'), el('p', item.note)); panel.append(row);
  }
  changeView(isAnalysis ? 'review' : activeView);
}
function persistHistory() {
  if (!$('persist-history').checked) return true;
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); notify('', 'history-status'); return true; }
  catch { notify('Browser storage is full or unavailable. The latest revision is only available in this session; download it to keep a copy.', 'history-status'); return false; }
}
function applyResponse(result, request, record = true) {
  if (result.profile) {
    delete $('profile-json').dataset.editId;
    $('profile-json').value = JSON.stringify(result.profile, null, 2); $('profile-area').hidden = false;
    if (!$('voice-dialog').open) $('voice-dialog').showModal();
    notify('Review the traits and evidence. Save the profile if you want to reuse it.', 'voice-status'); return;
  }
  current = { result, request };
  renderResult();
  let saved = true;
  if (record) {
    history.unshift({ id: crypto.randomUUID(), date: new Date().toISOString(), request, raw: { text: result.replacement, analysis: result.analysis, review: result.review } });
    history = history.slice(0, 20); saved = persistHistory(); renderHistory();
  }
  const message = request.source !== $('source').value ? 'Your draft changed while this was being prepared. The comparison uses the original submitted text.' : request.operation === 'analyze' ? 'Analysis ready. Your draft is unchanged.' : 'Revision ready. Compare the changes and check the review before using it.';
  notify(message + (saved ? '' : ' Browser storage is full or unavailable; this revision was not saved across visits.'));
}
function preparePrompt(request) {
  if (!instructions) throw new Error('Writing rules are not loaded. Reload the page and try again.');
  pending = request; $('prompt-text').value = exportPrompt(request, instructions); $('response-text').value = ''; notify('', 'prompt-status');
  $('prompt-dialog').showModal();
}
async function run(operation) {
  if (busy) return;
  const request = readRequest(operation);
  if (!connection.ready) { preparePrompt(request); return; }
  setBusy(true); controller = new AbortController();
  const timer = setTimeout(() => controller?.abort(), 95000);
  notify(operation === 'profile' ? 'Reading your writing samples…' : 'Working through your draft…', operation === 'profile' ? 'voice-status' : 'status');
  try {
    const token = $('access-token').value;
    const response = await fetch('./api/run', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(request), signal: controller.signal });
    const result = await response.json(); if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
    // Revalidate the response even when it came from our server.
    const validated = result.profile ? { profile: validateProfile(result.profile) } : parseResponse({ text: result.replacement, analysis: result.analysis, review: result.review }, request);
    applyResponse(validated, request);
  } catch (error) { notify(error.name === 'AbortError' ? 'Request cancelled or timed out. Your draft is still here.' : error.message, operation === 'profile' ? 'voice-status' : 'status'); }
  finally { clearTimeout(timer); controller = null; setBusy(false); }
}
function refreshProfiles(selected = $('profile-select').value) {
  const select = $('profile-select'); select.replaceChildren(new Option('Follow this draft', ''));
  if (transientProfile) select.add(new Option(`${transientProfile.name} (from revision)`, 'transient'));
  for (const item of profiles) select.add(new Option(item.profile.name, item.id));
  select.value = selected;
  const list = $('saved-profiles'); list.replaceChildren();
  if (profiles.length) list.append(el('h3', 'Saved in this browser'));
  for (const item of profiles) {
    const row = el('div', null, 'saved-item'), description = el('div'), actions = el('div', null, 'actions');
    description.append(el('strong', item.profile.name), el('p', item.profile.scope));
    actions.append(button('Edit', () => { $('profile-json').value = JSON.stringify(item.profile, null, 2); $('profile-area').hidden = false; $('profile-json').dataset.editId = item.id; }), button('Remove', () => {
      const updated = profiles.filter(p => p.id !== item.id); localStorage.setItem(PROFILE_KEY, JSON.stringify(updated)); profiles = updated; refreshProfiles();
      if ($('profile-json').dataset.editId === item.id) delete $('profile-json').dataset.editId;
    })); row.append(description, actions); list.append(row);
  }
}
function renderHistory() {
  const list = $('history-list'); list.replaceChildren();
  if (!history.length) { list.append(el('p', 'Your revisions will appear here as you work.', 'hint')); return; }
  for (const entry of history) {
    const row = el('div', null, 'saved-item'), description = el('div');
    description.append(el('strong', entry.request.operation === 'analyze' ? 'Draft analysis' : `${entry.request.intensity} ${entry.request.operation}`), el('p', new Date(entry.date).toLocaleString()), el('p', entry.request.source.slice(0, 90)));
    row.append(description, button('Restore', () => {
      const request = normalizeRequest(entry.request), result = parseResponse(entry.raw, request);
      $('source').value = request.source; $('task').value = request.operation === 'draft' ? 'draft' : 'edit';
      for (const key of ['audience', 'purpose', 'context']) $(key).value = request[key];
      document.querySelector(`input[name=intensity][value="${request.intensity}"]`).checked = true;
      intensityChosen = true;
      updateIntensity(); restoreScope(request); wordCount(); transientProfile = request.profile; refreshProfiles(transientProfile ? 'transient' : '');
      applyResponse(result, request, false); $('history-dialog').close();
    })); list.append(row);
  }
}
function updateIntensity() {
  const level = document.querySelector('input[name=intensity]:checked').value;
  $('intensity-help').textContent = { light: 'Keep your phrasing. Change only what needs attention.', standard: 'Improve the flow and phrasing. Keep your argument.', deep: 'Rethink the structure. Preserve your claims and evidence.' }[level];
}
for (const node of document.querySelectorAll('[data-close]')) node.addEventListener('click', () => $(node.dataset.close).close());
for (const node of document.querySelectorAll('[data-view]')) {
  node.addEventListener('click', () => changeView(node.dataset.view));
  node.addEventListener('keydown', event => {
    const tabs = [...document.querySelectorAll('[data-view]')]; let index = tabs.indexOf(node);
    if (event.key === 'ArrowRight') index = (index + 1) % tabs.length; else if (event.key === 'ArrowLeft') index = (index + tabs.length - 1) % tabs.length; else return;
    event.preventDefault(); changeView(tabs[index].dataset.view); tabs[index].focus();
  });
}
document.querySelectorAll('input[name=intensity]').forEach(node => node.addEventListener('change', () => { intensityChosen = true; updateIntensity(); }));
handle('open-voice', 'click', () => $('voice-dialog').showModal()); handle('add-voice', 'click', () => $('voice-dialog').showModal());
handle('open-history', 'click', () => { renderHistory(); $('history-dialog').showModal(); });
handle('open-settings', 'click', () => $('settings-dialog').showModal());
handle('source', 'input', () => { wordCount(); clearSelection(); if (current) notify('You changed the source. The displayed revision still refers to its original draft.'); });
handle('task', 'change', () => {
  if (!intensityChosen) { document.querySelector(`input[name=intensity][value="${$('task').value === 'draft' ? 'standard' : 'light'}"]`).checked = true; updateIntensity(); }
  restoreScope();
});
handle('use-selection', 'click', () => {
  const start = $('source').selectionStart, end = $('source').selectionEnd;
  if (start === end) throw new Error('Select the paragraph or passage you want to edit in your draft first.');
  selection = { start, end }; $('selection-note').textContent = `Editing ${words($('source').value.slice(start, end))} selected words`; $('selection-banner').hidden = false;
});
handle('clear-selection', 'click', clearSelection);
handle('run', 'click', () => run($('task').value)); handle('analyze', 'click', () => run('analyze'));
handle('analyze-voice', 'click', () => { delete $('profile-json').dataset.editId; return run('profile'); }, 'voice-status');
handle('cancel', 'click', () => controller?.abort());
handle('prepare', 'click', () => preparePrompt(readRequest()));
handle('copy-prompt', 'click', async () => { await copy($('prompt-text').value); notify('Copied. Paste into your chatbot, then bring its JSON response back here.', 'prompt-status'); }, 'prompt-status');
handle('import-response', 'click', () => {
  if (!pending) throw new Error('Prepare a prompt first.');
  const result = parseResponse($('response-text').value, pending), request = pending;
  $('prompt-dialog').close(); pending = null; applyResponse(result, request);
}, 'prompt-status');
handle('copy-result', 'click', async () => { await copy(current.result.text); notify('Revision copied.'); });
handle('download-result', 'click', () => download('xohumanize-revision.txt', current.result.text));
handle('load-example', 'click', () => {
  if ($('source').value.trim()) throw new Error('Clear your source before loading the example so your draft is not overwritten.');
  $('source').value = 'Our dashboard serves as a powerful tool that empowers teams to leverage real-time insights, fostering collaboration and enhancing operational efficiency. It shows open orders and updates every minute.\n\nIn a 2026 pilot with 18 teams, the median reporting time fell from 45 minutes to 30 minutes [1]. The results may not apply to larger teams.\n\n[1] Internal pilot notes, 12 June 2026.';
  wordCount(); clearSelection(); notify('Illustrative sample loaded. Its numbers and citation are fictional and should stay intact in the edit.');
});
handle('save-profile', 'click', () => {
  const profile = validateProfile(JSON.parse($('profile-json').value));
  const editId = $('profile-json').dataset.editId;
  const id = editId && profiles.some(item => item.id === editId) ? editId : crypto.randomUUID();
  const updated = [...profiles.filter(item => item.id !== id), { id, profile }];
  if (updated.length > 20) throw new Error('You can save up to 20 profiles. Remove one before adding another.');
  localStorage.setItem(PROFILE_KEY, JSON.stringify(updated)); profiles = updated; $('profile-json').dataset.editId = id; refreshProfiles(id);
  notify('Saved in this browser and selected for your next edit.', 'voice-status');
}, 'voice-status');
handle('export-profile', 'click', () => { const profile = validateProfile(JSON.parse($('profile-json').value)); download('xohumanize-voice.json', JSON.stringify(profile, null, 2), 'application/json'); }, 'voice-status');
handle('import-profile', 'change', async e => {
  const file = e.target.files[0]; if (!file) return;
  try {
    if (file.size > 100000) throw new Error('Profile files must be smaller than 100 KB.');
    const profile = validateProfile(JSON.parse(await file.text()));
    $('profile-json').value = JSON.stringify(profile, null, 2); $('profile-area').hidden = false; delete $('profile-json').dataset.editId;
    notify('Imported for review. Choose Save to keep and use it.', 'voice-status');
  } finally { e.target.value = ''; }
}, 'voice-status');
handle('persist-history', 'change', () => { if ($('persist-history').checked) persistHistory(); else localStorage.removeItem(HISTORY_KEY); });

async function init() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || '[]');
    if (!Array.isArray(saved) || saved.length > 20) throw new Error();
    profiles = saved.map(item => { if (typeof item.id !== 'string') throw new Error(); return { id: item.id, profile: validateProfile(item.profile) }; });
    const savedHistory = localStorage.getItem(HISTORY_KEY);
    if (savedHistory) {
      const entries = JSON.parse(savedHistory); if (!Array.isArray(entries) || entries.length > 20) throw new Error();
      history = entries.filter(item => { try { normalizeRequest(item.request); parseResponse(item.raw, item.request); return typeof item.date === 'string'; } catch { return false; } });
      $('persist-history').checked = true;
    }
  } catch { notify('Some saved browser data could not be read. You can still work in this session.'); }
  refreshProfiles(); renderHistory();
  const results = await Promise.allSettled([
    fetch('./instructions.txt').then(async response => { if (!response.ok) throw new Error('Writing rules could not be loaded.'); return response.text(); }),
    fetch('./api/status').then(async response => { if (!response.ok) throw new Error(); return response.json(); }),
  ]);
  if (results[0].status === 'fulfilled') instructions = results[0].value;
  else { notify('Writing rules could not be loaded. Reload the page or check the web build.'); for (const id of ['run', 'analyze', 'prepare', 'analyze-voice']) $(id).disabled = true; }
  if (results[1].status === 'fulfilled') connection = results[1].value;
  $('connection-label').textContent = connection.ready ? 'Model connected' : 'Prompt mode';
  $('mode-note').textContent = connection.ready ? `AI actions send your text to ${connection.provider}.` : 'Use your web chatbot. Prepare a prompt, then bring back its response.';
  $('provider-description').textContent = connection.ready ? `Connected to ${connection.model} at ${connection.provider}.` : 'No model is connected. Copy-prompt mode works without an API key.';
  $('run').replaceChildren(document.createTextNode(connection.ready ? 'Rewrite' : 'Prepare rewrite'), el('span', '↗'));
}
init().catch(error => notify(error.message));
