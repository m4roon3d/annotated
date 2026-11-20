(function () {
  const BTN_ID = 'annotated-launch-btn';
  const APP_BASE = 'https://m4roon3d.github.io/annotated/'; // Deployed app (GitHub Pages). It reads ?url= and starts the analysis.
  // YouTube changes its markup often, so try several known spots for the action bar.
  const ANCHORS = ['#top-level-buttons-computed', 'ytd-watch-metadata #actions-inner #menu', 'ytd-watch-metadata #actions', '#above-the-fold #top-row'];

  function videoUrl() {
    const id = new URLSearchParams(location.search).get('v');
    return id ? `https://www.youtube.com/watch?v=${id}` : null;
  }

  function injectButton() {
    if (!location.pathname.startsWith('/watch')) return false;
    if (document.getElementById(BTN_ID)) return true;
    const anchor = ANCHORS.map((s) => document.querySelector(s)).find(Boolean);
    if (!anchor) return false;

    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.type = 'button';
    btn.textContent = 'Study in annotated';
    btn.title = 'Open this video as a study guide';
    btn.style.cssText = 'margin-left:8px;padding:0 16px;height:36px;border-radius:18px;border:0;background:#1B2430;color:#fff;font:600 14px Roboto,Arial,sans-serif;cursor:pointer;white-space:nowrap;box-shadow:inset 0 -3px 0 #FFE45C';
    btn.addEventListener('click', () => {
      const url = videoUrl(); // read at click time: YouTube swaps videos without reloading the page
      if (url) window.open(`${APP_BASE}?url=${encodeURIComponent(url)}`, '_blank', 'noopener');
    });
    anchor.appendChild(btn);
    return true;
  }

  // The action bar renders late, so retry for a few seconds after each navigation.
  function tryInject() {
    let tries = 0;
    const timer = setInterval(() => { if (injectButton() || ++tries > 20) clearInterval(timer); }, 500);
  }

  document.addEventListener('yt-navigate-finish', tryInject); // YouTube's own SPA navigation event
  tryInject();
})();
