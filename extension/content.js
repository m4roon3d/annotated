(function () {
  const APP_BASE = 'https://m4roon3d.github.io/annotated/'; // Deployed app (GitHub Pages). Keep in sync with popup.js.
  const ANCHORS = ['#top-level-buttons-computed', 'ytd-watch-metadata #actions-inner #menu', 'ytd-watch-metadata #actions', '#above-the-fold #top-row'];
  const MAX_TRANSCRIPT = 400000; // characters handed to the app for "Study now"
  const MAX_SAVED_TRANSCRIPT = 150000; // smaller copy kept in extension storage for the saved list
  const INK = '#1B2430', HL = '#FFE45C';

  const isShorts = () => location.pathname.startsWith('/shorts/');
  function currentId() {
    if (isShorts()) return (location.pathname.split('/')[2] || '').slice(0, 11) || null;
    if (location.pathname === '/watch') return new URLSearchParams(location.search).get('v');
    return null;
  }

  // YouTube embeds the player data (title, full description, length, caption tracks) as JSON in the watch page.
  function playerResponseFrom(html) {
    const marker = 'ytInitialPlayerResponse = ';
    const start = html.indexOf(marker);
    if (start < 0) return null;
    const from = start + marker.length;
    let depth = 0, inStr = false, escaped = false;
    for (let j = from; j < html.length; j++) {
      const c = html[j];
      if (inStr) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) { try { return JSON.parse(html.slice(from, j + 1)); } catch { return null; } }
    }
    return null;
  }

  async function collect(id) {
    const item = { id, title: '', channel: '', description: '', lengthSeconds: null, isShort: isShorts(), transcript: '' };
    try {
      const html = await (await fetch(`/watch?v=${encodeURIComponent(id)}`, { credentials: 'include' })).text();
      const pr = playerResponseFrom(html) || {};
      const d = pr.videoDetails || {};
      item.title = d.title || '';
      item.channel = d.author || '';
      item.description = d.shortDescription || '';
      item.lengthSeconds = Number(d.lengthSeconds) || null;
      if (item.lengthSeconds && item.lengthSeconds <= 180 && item.isShort === false && /#shorts/i.test(item.description)) item.isShort = true;
      const tracks = pr.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
      const pick = tracks.find((t) => /^en/.test(t.languageCode) && t.kind !== 'asr') || tracks.find((t) => /^en/.test(t.languageCode)) || tracks[0];
      if (pick?.baseUrl) {
        const r = await fetch(`${pick.baseUrl}&fmt=vtt`, { credentials: 'include' });
        const vtt = r.ok ? await r.text() : '';
        if (vtt.includes('-->')) item.transcript = vtt.slice(0, MAX_TRANSCRIPT);
      }
    } catch { /* fall back to what the page shows */ }
    if (!item.title) item.title = document.title.replace(/ - YouTube$/, '');
    return item;
  }

  function openApp(items) {
    window.open(`${APP_BASE}#td=${encodeURIComponent(JSON.stringify({ v: 1, items }))}`, '_blank', 'noopener');
  }

  async function saveForLater(id) {
    const item = await collect(id);
    item.transcript = item.transcript.slice(0, MAX_SAVED_TRANSCRIPT);
    const { queue = [] } = await chrome.storage.local.get('queue');
    if (!queue.some((q) => q.id === id)) queue.push(item);
    await chrome.storage.local.set({ queue });
    return queue.length;
  }

  function makeButton(label, primary) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.style.cssText = `height:36px;padding:0 14px;border-radius:18px;border:0;cursor:pointer;white-space:nowrap;font:600 14px Roboto,Arial,sans-serif;${primary ? `background:${INK};color:#fff;box-shadow:inset 0 -3px 0 ${HL}` : 'background:rgba(127,127,127,.18);color:inherit'}`;
    return b;
  }
  function wire(studyBtn, saveBtn) {
    studyBtn.addEventListener('click', async () => {
      const id = currentId(); if (!id) return; // read at click time: YouTube swaps videos without reloading
      studyBtn.disabled = true; const old = studyBtn.textContent; studyBtn.textContent = 'Opening…';
      openApp([await collect(id)]);
      studyBtn.textContent = old; studyBtn.disabled = false;
    });
    saveBtn.addEventListener('click', async () => {
      const id = currentId(); if (!id) return;
      saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
      try { saveBtn.textContent = `Saved (${await saveForLater(id)})`; }
      catch { saveBtn.textContent = 'Save failed'; }
      setTimeout(() => { saveBtn.textContent = 'Save'; saveBtn.disabled = false; }, 2000);
    });
  }

  // Watch pages: buttons in the action bar under the video.
  function injectWatch() {
    if (location.pathname !== '/watch') return false;
    if (document.getElementById('annotated-launch-btn')) return true;
    const anchor = ANCHORS.map((s) => document.querySelector(s)).find(Boolean);
    if (!anchor) return false;
    const wrap = document.createElement('div');
    wrap.id = 'annotated-launch-btn';
    wrap.style.cssText = 'display:inline-flex;gap:6px;margin-left:8px;align-items:center';
    const study = makeButton('Study in annotated', true), save = makeButton('Save', false);
    save.title = 'Save to analyze later';
    wire(study, save);
    wrap.append(study, save);
    anchor.appendChild(wrap);
    return true;
  }

  // Shorts: a small floating bar, since the Shorts player has no stable place for extra buttons.
  function syncShortsBar() {
    let bar = document.getElementById('annotated-shorts-bar');
    if (!isShorts()) { bar?.remove(); return; }
    if (bar) return;
    bar = document.createElement('div');
    bar.id = 'annotated-shorts-bar';
    bar.style.cssText = 'position:fixed;right:24px;bottom:24px;z-index:9999;display:flex;gap:6px;padding:6px;border-radius:24px;background:rgba(20,24,30,.85);backdrop-filter:blur(8px);color:#fff';
    const study = makeButton('Study', true), save = makeButton('Save', false);
    save.style.color = '#fff';
    wire(study, save);
    bar.append(study, save);
    document.body.appendChild(bar);
  }

  function tryInject() {
    syncShortsBar();
    let tries = 0;
    const timer = setInterval(() => { if (injectWatch() || isShorts() || ++tries > 20) clearInterval(timer); }, 500);
  }

  // The popup asks this page for the current video's details.
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg?.type !== 'collect') return;
    const id = currentId();
    if (!id) { reply(null); return; }
    collect(id).then(reply);
    return true; // reply asynchronously
  });

  document.addEventListener('yt-navigate-finish', tryInject); // YouTube's own navigation event
  setInterval(syncShortsBar, 1000); // Shorts scrolling doesn't always fire navigation events
  tryInject();
})();
