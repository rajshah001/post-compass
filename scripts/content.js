(() => {
  const HOSTS = ['x.com', 'twitter.com', 'www.linkedin.com', 'linkedin.com', 'www.reddit.com', 'reddit.com'];
  const isTarget = HOSTS.some(h => location.hostname.endsWith(h));
  if (!isTarget) return;

  // Create and show toast notification
  function showToast(message, type = 'success') {
    // Remove any existing toasts
    const existingToast = document.getElementById('post-compass-toast');
    if (existingToast) existingToast.remove();

    // Create toast element
    const toast = document.createElement('div');
    toast.id = 'post-compass-toast';
    toast.textContent = message;
    
    // Style the toast
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 999999;
      animation: slideIn 0.3s ease-out;
      max-width: 300px;
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    // Add to page
    document.body.appendChild(toast);

    // Remove after 4 seconds
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // DOM injection functions
  function fillTwitterComposer(text) {
    const selectors = [
      'div[data-testid="tweetTextarea_0"]',
      'div[role="textbox"][aria-label*="tweet" i]',
      'div[role="textbox"][aria-label*="post" i]',
      'div[role="textbox"][data-testid*="tweet"]',
      'div.DraftEditor-root div[contenteditable="true"]',
      'div.public-DraftEditor-content div[contenteditable="true"]'
    ];
    
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        el.focus();
        el.click();
        
        // Clear existing content
        el.innerHTML = '';
        
        // Set new content
        if (el.tagName === 'DIV') {
          // For contenteditable divs
          const textNode = document.createTextNode(text);
          el.appendChild(textNode);
          
          // Trigger various events to ensure X/Twitter recognizes the input
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
          el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
        } else {
          el.value = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        showToast('Content filled successfully! Please review before posting.', 'success');
        return true;
      }
    }
    
    showToast('Could not find the compose box. Please open the tweet composer first.', 'error');
    return false;
  }

  function fillLinkedInComposer(text) {
    // First try to click "Start a post" if we're on the feed
    const startBtn = document.querySelector('button[aria-label*="Start a post" i], .share-box-feed-entry__trigger');
    if (startBtn) {
      startBtn.click();
      // Wait for modal to open
      setTimeout(() => fillLinkedInTextbox(text), 800);
    } else {
      // Try to fill directly if already in composer
      fillLinkedInTextbox(text);
    }
  }

  function fillLinkedInTextbox(text) {
    const selectors = [
      'div[role="dialog"] div[contenteditable="true"][role="textbox"]',
      'div[role="dialog"] div[contenteditable="true"]',
      '.ql-editor[contenteditable="true"]',
      '.share-creation-state__text-editor div[contenteditable="true"]',
      'div.editor-content div[contenteditable="true"]'
    ];
    
    let filled = false;
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        el.focus();
        el.click();
        
        // Clear and set content
        el.innerHTML = `<p>${text}</p>`;
        
        // Trigger events
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
        
        filled = true;
        break;
      }
    }
    
    if (filled) {
      showToast('Content filled successfully! Please review before posting.', 'success');
    } else {
      showToast('Could not find the post composer. Please try clicking "Start a post" first.', 'error');
    }
    
    return filled;
  }

  function fillRedditComposer(title, body) {
    const titleSelectors = [
      'input[name="title"]',
      'textarea[name="title"]',
      'input[placeholder*="Title" i]',
      'textarea[placeholder*="Title" i]',
      'div[role="textbox"][aria-label*="Title" i]'
    ];
    
    const bodySelectors = [
      'textarea[name="text"]',
      'div[role="textbox"][aria-label*="Text" i]',
      'div[role="textbox"][data-testid*="post-content"]',
      'div.md-container textarea',
      'textarea[placeholder*="Text" i]',
      'div[contenteditable="true"][data-placeholder*="Text" i]'
    ];

    const setVal = (el, val) => {
      if (!el || !val) return false;
      el.focus();
      el.click();
      
      if ('value' in el) {
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        // For contenteditable
        el.innerHTML = '';
        el.textContent = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return true;
    };

    let titleSet = false, bodySet = false;
    
    // Fill title
    for (const sel of titleSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        titleSet = setVal(el, title);
        if (titleSet) break;
      }
    }
    
    // Fill body
    for (const sel of bodySelectors) {
      const el = document.querySelector(sel);
      if (el) {
        bodySet = setVal(el, body);
        if (bodySet) break;
      }
    }

    if (titleSet || bodySet) {
      const parts = [];
      if (titleSet) parts.push('title');
      if (bodySet) parts.push('body');
      showToast(`Reddit ${parts.join(' and ')} filled successfully! Please review before posting.`, 'success');
    } else {
      showToast('Could not find Reddit post form. Please make sure you are on the submit page.', 'error');
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
          // LinkedIn fill is async due to modal animation
          setTimeout(() => sendResponse({ success: true }), 1000);
          return true; // Keep channel open for async response
        } else if (message.type === 'fillReddit') {
          const success = fillRedditComposer(message.title, message.body);
          sendResponse({ success });
        }
      } catch (e) {
        console.error('Content script message handler error:', e);
        showToast('An error occurred while filling content.', 'error');
        sendResponse({ success: false, error: e.message });
      }
    });
  }

})();