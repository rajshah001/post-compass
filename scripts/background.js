import { generatePlatformDrafts } from './services/ai.js';
import { suggestCommunities } from './services/suggester.js';

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

// Show notification
function showNotification(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icon.png'),
    title: 'Post Compass',
    message: message,
    priority: 2
  });
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

      // Handle fill requests with navigation
      if (message?.type === 'fillTwitter' || message?.type === 'fillLinkedIn' || message?.type === 'fillReddit') {
        const platform = message.type.replace('fill', '').toLowerCase();
        
        // Get the current active tab
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!activeTab) {
          sendResponse({ ok: false, error: 'No active tab found' });
          return;
        }
        
        // Check if we're already on the platform
        const onPlatform = isOnPlatform(activeTab.url, platform);
        
        if (!onPlatform) {
          // Navigate to the platform
          await chrome.tabs.update(activeTab.id, { url: PLATFORM_URLS[platform] });
          // Wait for the page to load
          await waitForTabLoad(activeTab.id);
          // Give the page a moment to fully render
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
        // Now inject the content
        try {
          const response = await chrome.tabs.sendMessage(activeTab.id, message);
          
          if (response?.success) {
            // Show success notification
            let platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
            if (platform === 'twitter') platformName = 'X/Twitter';
            showNotification(`Content has been filled on ${platformName}. Please review before posting.`);
          } else {
            showNotification(`Could not fill content. Please try again.`);
          }
          
          sendResponse({ ok: true, data: response });
        } catch (e) {
          // If content script isn't ready, inject it
          await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ['scripts/content.js']
          });
          
          // Try again after injection
          await new Promise(resolve => setTimeout(resolve, 500));
          const response = await chrome.tabs.sendMessage(activeTab.id, message);
          
          if (response?.success) {
            let platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
            if (platform === 'twitter') platformName = 'X/Twitter';
            showNotification(`Content has been filled on ${platformName}. Please review before posting.`);
          } else {
            showNotification(`Could not fill content. Please try again.`);
          }
          
          sendResponse({ ok: true, data: response });
        }
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