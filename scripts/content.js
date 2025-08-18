(() => {
  const HOSTS = ['x.com', 'twitter.com', 'www.linkedin.com', 'linkedin.com', 'www.reddit.com', 'reddit.com'];
  const isTarget = HOSTS.some(h => location.hostname.endsWith(h));
  if (!isTarget) return;

  const SIDEBAR_ID = 'post-compass-sidebar';
  const BTN_ID = 'post-compass-fab';
  
  let sidebarFrame = null;

  function createSidebar() {
    if (document.getElementById(SIDEBAR_ID)) return;

    sidebarFrame = document.createElement('iframe');
    sidebarFrame.id = SIDEBAR_ID;
    sidebarFrame.src = chrome.runtime.getURL('sidebar.html');
    sidebarFrame.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 380px;
      height: 100vh;
      border: none;
      z-index: 2147483646;
      background: white;
      box-shadow: -4px 0 16px rgba(0,0,0,0.1);
    `;
    document.documentElement.appendChild(sidebarFrame);
  }

  function removeSidebar() {
    const sidebar = document.getElementById(SIDEBAR_ID);
    if (sidebar) sidebar.remove();
    sidebarFrame = null;
  }

  function createFAB() {
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
      if (sidebarFrame) {
        removeSidebar();
      } else {
        createSidebar();
      }
    });
    document.documentElement.appendChild(btn);
  }

  // DOM injection functions
  function fillTwitterComposer(text) {
    const selectors = [
      'div[data-testid="tweetTextarea_0"]',
      'div[role="textbox"][aria-label*="tweet"]',
      'div[role="textbox"][data-testid*="tweet"]'
    ];
    
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        el.focus();
        el.textContent = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
    }
    return false;
  }

  function fillLinkedInComposer(text) {
    // First try to click "Start a post" if we're on the feed
    const startBtn = document.querySelector('button[aria-label*="Start a post"], .share-box-feed-entry__trigger');
    if (startBtn) startBtn.click();

    setTimeout(() => {
      const selectors = [
        'div[role="dialog"] div[contenteditable="true"][role="textbox"]',
        'div[role="dialog"] div[contenteditable="true"]',
        '.share-creation-state__text-editor div[contenteditable="true"]'
      ];
      
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          el.focus();
          el.textContent = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
      }
      return false;
    }, 500);
  }

  function fillRedditComposer(title, body) {
    const titleSelectors = [
      'input[name="title"]',
      'textarea[name="title"]',
      'div[role="textbox"][aria-label*="Title"]'
    ];
    
    const bodySelectors = [
      'textarea[name="text"]',
      'div[role="textbox"][aria-label*="Text"]',
      'div[role="textbox"][data-testid*="post-content"]'
    ];

    const setVal = (el, val) => {
      if (!el || !val) return;
      el.focus();
      if ('value' in el) {
        el.value = val;
      } else {
        el.textContent = val;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };

    let titleSet = false, bodySet = false;
    
    for (const sel of titleSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        setVal(el, title);
        titleSet = true;
        break;
      }
    }
    
    for (const sel of bodySelectors) {
      const el = document.querySelector(sel);
      if (el) {
        setVal(el, body);
        bodySet = true;
        break;
      }
    }

    return titleSet || bodySet;
  }

  // Listen for messages from sidebar/background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'fillTwitter') {
      const success = fillTwitterComposer(message.text);
      sendResponse({ success });
    } else if (message.type === 'fillLinkedIn') {
      fillLinkedInComposer(message.text);
      sendResponse({ success: true });
    } else if (message.type === 'fillReddit') {
      const success = fillRedditComposer(message.title, message.body);
      sendResponse({ success });
    } else if (message.type === 'closeSidebar') {
      removeSidebar();
      sendResponse({ success: true });
    }
  });

  createFAB();
})();


