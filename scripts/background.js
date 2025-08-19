import { generatePlatformDrafts } from './services/ai.js';

chrome.runtime.onInstalled.addListener(() => {
  console.log('Post Compass installed');
  // Enable opening side panel when extension icon is clicked
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Platform URLs for navigation
const PLATFORM_URLS = {
  twitter: 'https://x.com/compose/tweet',
  linkedin: 'https://www.linkedin.com/feed/',
  reddit: 'https://www.reddit.com/submit'
};

// Check if current tab is on the target platform
function isOnPlatform(url, platform) {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname;
  
  switch(platform) {
    case 'twitter':
      return hostname.includes('x.com') || hostname.includes('twitter.com');
    case 'linkedin':
      return hostname.includes('linkedin.com');
    case 'reddit':
      return hostname.includes('reddit.com');
    default:
      return false;
  }
}

// Wait for tab to complete loading
function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handleMessage = async () => {
    try {
      if (message?.type === 'rewrite') {
        const drafts = await generatePlatformDrafts(message.text || '', { model: message.model, tone: message.tone || 'Auto' });
        sendResponse({ ok: true, data: drafts });
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