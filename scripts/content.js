// Placeholder content script. Reserved for future features like one-click posting.
(() => {
  const HOSTS = ['x.com', 'twitter.com', 'www.linkedin.com', 'linkedin.com', 'www.reddit.com', 'reddit.com'];
  const isTarget = HOSTS.some(h => location.hostname.endsWith(h));
  if (!isTarget) return;

  const BTN_ID = 'post-compass-fab';
  if (document.getElementById(BTN_ID)) return;

  const style = document.createElement('style');
  style.textContent = `
    #${BTN_ID} {
      position: fixed;
      right: 16px;
      top: 16px;
      width: 42px;
      height: 42px;
      border-radius: 9999px;
      background: #111827;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
      box-shadow: 0 6px 16px rgba(0,0,0,0.25);
      z-index: 2147483647;
      cursor: pointer;
      user-select: none;
    }
    #${BTN_ID}:hover { filter: brightness(1.05); }
  `;
  document.documentElement.appendChild(style);

  const btn = document.createElement('div');
  btn.id = BTN_ID;
  btn.title = 'Open Post Compass';
  btn.textContent = 'PC';
  btn.addEventListener('click', () => {
    try {
      chrome.runtime.sendMessage({ type: 'openPopup' });
    } catch (_) {
      // ignore
    }
  });
  document.documentElement.appendChild(btn);
})();


