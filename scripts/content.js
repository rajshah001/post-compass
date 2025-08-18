(() => {
  const HOSTS = ['x.com', 'twitter.com', 'www.linkedin.com', 'linkedin.com', 'www.reddit.com', 'reddit.com'];
  const isTarget = HOSTS.some(h => location.hostname.endsWith(h));
  if (!isTarget) return;

  // Toast notification function
  function showToast(message, type = 'success') {
    // Remove any existing toast
    const existingToast = document.getElementById('post-compass-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'post-compass-toast';
    toast.textContent = message;
    
    // Styling
    Object.assign(toast.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: type === 'success' ? '#10b981' : '#ef4444',
      color: '#ffffff',
      padding: '12px 20px',
      borderRadius: '8px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      fontWeight: '500',
      zIndex: '10000',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      opacity: '0',
      transform: 'translateY(-10px)',
      transition: 'all 0.3s ease'
    });

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    }, 100);

    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
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
  if (chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      try {
        let success = false;
        let platform = '';
        
        if (message.type === 'fillTwitter') {
          success = fillTwitterComposer(message.text);
          platform = 'X (Twitter)';
        } else if (message.type === 'fillLinkedIn') {
          // LinkedIn needs a slight delay for the composer to appear
          setTimeout(() => {
            fillLinkedInComposer(message.text);
            if (message.showToast) {
              showToast('LinkedIn content has been filled! ✨');
            }
          }, 800);
          sendResponse({ success: true });
          return;
        } else if (message.type === 'fillReddit') {
          success = fillRedditComposer(message.title, message.body);
          platform = 'Reddit';
        }
        
        // Show toast notification if requested
        if (message.showToast && platform) {
          if (success) {
            showToast(`${platform} content has been filled! ✨`);
          } else {
            showToast(`Failed to fill ${platform} content. Please try manually.`, 'error');
          }
        }
        
        sendResponse({ success });
      } catch (e) {
        console.error('Content script message handler error:', e);
        if (message.showToast) {
          showToast('Error filling content. Please try again.', 'error');
        }
        sendResponse({ success: false, error: e.message });
      }
    });
  }

})();


