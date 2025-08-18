(() => {
  const HOSTS = ['x.com', 'twitter.com', 'www.linkedin.com', 'linkedin.com', 'www.reddit.com', 'reddit.com'];
  const isTarget = HOSTS.some(h => location.hostname.endsWith(h));
  if (!isTarget) return;

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
  if (chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      try {
        if (message.type === 'fillTwitter') {
          const success = fillTwitterComposer(message.text);
          sendResponse({ success });
        } else if (message.type === 'fillLinkedIn') {
          fillLinkedInComposer(message.text);
          sendResponse({ success: true });
        } else if (message.type === 'fillReddit') {
          const success = fillRedditComposer(message.title, message.body);
          sendResponse({ success });
        }
      } catch (e) {
        console.error('Content script message handler error:', e);
        sendResponse({ success: false, error: e.message });
      }
    });
  }

})();


