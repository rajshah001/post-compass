import { generatePlatformDrafts } from './services/ai.js';
import { suggestCommunities } from './services/suggester.js';

chrome.runtime.onInstalled.addListener(() => {
  console.log('Post Compass installed');
  // Enable opening side panel when extension icon is clicked
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Enhanced fill request handler that checks URL and navigates if needed
async function handleFillRequest(message, tabId) {
  try {
    // Get current tab info
    const tab = await chrome.tabs.get(tabId);
    const currentUrl = tab.url;
    
    let targetUrl;
    let requiredDomains;
    
    // Determine target URL and required domains based on message type
    if (message.type === 'fillTwitter') {
      targetUrl = 'https://x.com/compose/tweet';
      requiredDomains = ['x.com', 'twitter.com'];
    } else if (message.type === 'fillLinkedIn') {
      targetUrl = 'https://www.linkedin.com/feed/';
      requiredDomains = ['linkedin.com'];
    } else if (message.type === 'fillReddit') {
      targetUrl = 'https://www.reddit.com/submit';
      requiredDomains = ['reddit.com'];
    }
    
    // Check if we're already on the target platform
    const isOnTargetPlatform = requiredDomains.some(domain => 
      currentUrl.includes(domain)
    );
    
    if (!isOnTargetPlatform) {
      // Navigate to target URL first
      await chrome.tabs.update(tabId, { url: targetUrl });
      
      // Wait for page to load before filling
      await new Promise(resolve => {
        const listener = (updatedTabId, changeInfo) => {
          if (updatedTabId === tabId && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
        
        // Fallback timeout
        setTimeout(resolve, 3000);
      });
    }
    
    // Now try to fill the content
    try {
      await chrome.tabs.sendMessage(tabId, {
        ...message,
        showToast: true // Add flag to show toast message
      });
    } catch (e) {
      console.error('Failed to send message to content script:', e);
    }
    
  } catch (e) {
    console.error('HandleFillRequest error:', e);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handleMessage = async () => {
    try {
      if (message?.type === 'rewrite') {
        const drafts = await generatePlatformDrafts(message.text || '', { model: message.model });
        sendResponse({ ok: true, data: drafts });
        return;
      }

      if (message?.type === 'suggest') {
        const suggestions = suggestCommunities(message.text || '');
        sendResponse({ ok: true, data: suggestions });
        return;
      }



      if (message?.type === 'navigate') {
        await chrome.tabs.update(sender.tab.id, { url: message.url });
        sendResponse({ ok: true });
        return;
      }

      if (message?.type === 'fillTwitter' || message?.type === 'fillLinkedIn' || message?.type === 'fillReddit') {
        await handleFillRequest(message, sender.tab.id);
        sendResponse({ ok: true });
        return;
      }

      // Unknown message type
      sendResponse({ ok: false, error: 'Unknown message type' });
    } catch (e) {
      console.error('Background script error:', e);
      sendResponse({ ok: false, error: String(e?.message || e) });
    }
  };

  handleMessage();
  return true; // keep channel open for async response
});


