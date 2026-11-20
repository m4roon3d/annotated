const APP_BASE = 'https://annotated.app/'; // Placeholder. Keep in sync with content.js

document.getElementById('btn-open').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let target = APP_BASE;
  try {
    const u = new URL(tab?.url || '');
    const id = u.hostname === 'youtu.be' ? u.pathname.slice(1, 12) : u.searchParams.get('v');
    if (/youtube\.com$|youtu\.be$/.test(u.hostname) && id) target = `${APP_BASE}?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
  } catch {}
  chrome.tabs.create({ url: target });
  window.close();
});
