import { generatePlatformDrafts } from './services/ai.js';
import { suggestCommunities } from './services/suggester.js';

chrome.runtime.onInstalled.addListener(() => {
  console.log('Post Compass installed');
});

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

      if (message?.type === 'openPopup') {
        const url = chrome.runtime.getURL('popup.html');
        await chrome.tabs.create({ url });
        sendResponse({ ok: true });
        return;
      }

      if (message?.type === 'navigate') {
        await chrome.tabs.update(sender.tab.id, { url: message.url });
        sendResponse({ ok: true });
        return;
      }

      if (message?.type === 'fillTwitter' || message?.type === 'fillLinkedIn' || message?.type === 'fillReddit' || message?.type === 'closeSidebar') {
        // Forward message to content script
        const response = await chrome.tabs.sendMessage(sender.tab.id, message);
        sendResponse({ ok: true, data: response });
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


