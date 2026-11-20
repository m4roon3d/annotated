const APP_BASE = 'https://m4roon3d.github.io/annotated/'; // Keep in sync with content.js
const $ = (id) => document.getElementById(id);
let current = null;

const openApp = (items) => chrome.tabs.create({ url: `${APP_BASE}#td=${encodeURIComponent(JSON.stringify({ v: 1, items }))}` });

async function render() {
  const { queue = [] } = await chrome.storage.local.get('queue');
  $('saved-title').textContent = `Saved (${queue.length})`;
  $('saved').innerHTML = '';
  queue.slice(0, 30).forEach((q) => { const li = document.createElement('li'); li.textContent = q.title || q.id; $('saved').appendChild(li); });
  $('btn-run').disabled = queue.length === 0;
  $('btn-run').textContent = queue.length ? `Analyze ${queue.length} saved` : 'Analyze saved videos';
  $('btn-clear').hidden = queue.length === 0;
}

async function init() {
  render();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try { current = await chrome.tabs.sendMessage(tab.id, { type: 'collect' }); } catch { current = null; }
  if (current) {
    $('here').textContent = current.title || 'This video';
    $('btn-study').disabled = $('btn-save').disabled = false;
  } else if (/youtube\.com/.test(tab?.url || '')) {
    $('here').textContent = 'Open a video or Short. If you just installed the extension, reload this tab first.';
  }
}

$('btn-study').addEventListener('click', () => { openApp([current]); window.close(); });
$('btn-save').addEventListener('click', async () => {
  const { queue = [] } = await chrome.storage.local.get('queue');
  if (!queue.some((q) => q.id === current.id)) queue.push({ ...current, transcript: (current.transcript || '').slice(0, 150000) });
  await chrome.storage.local.set({ queue });
  $('msg').textContent = 'Saved.';
  render();
});
$('btn-run').addEventListener('click', async () => {
  const { queue = [] } = await chrome.storage.local.get('queue');
  if (!queue.length) return;
  openApp(queue);
  await chrome.storage.local.set({ queue: [] }); // the app keeps its own saved list from here
  window.close();
});
$('btn-clear').addEventListener('click', async () => { await chrome.storage.local.set({ queue: [] }); $('msg').textContent = 'Cleared.'; render(); });

init();
