import { generatePlatformDrafts } from './services/ai.js';
import { suggestCommunities } from './services/suggester.js';

chrome.runtime.onInstalled.addListener(() => {
  console.log('Post Compass installed');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message?.type === 'rewrite') {
      try {
        const drafts = await generatePlatformDrafts(message.text || '', { model: message.model });
        sendResponse({ ok: true, data: drafts });
      } catch (e) {
        sendResponse({ ok: false, error: String(e?.message || e) });
      }
      return;
    }

    if (message?.type === 'suggest') {
      try {
        const suggestions = suggestCommunities(message.text || '');
        sendResponse({ ok: true, data: suggestions });
      } catch (e) {
        sendResponse({ ok: false, error: String(e?.message || e) });
      }
      return;
    }

    if (message?.type === 'openPopup') {
      try {
        const url = chrome.runtime.getURL('popup.html');
        await chrome.tabs.create({ url });
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: String(e?.message || e) });
      }
      return;
    }
  })();

  return true; // keep channel open for async response
});


