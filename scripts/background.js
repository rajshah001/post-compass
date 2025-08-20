chrome.runtime.onInstalled.addListener(() => {
  console.log('Post Compass installed');
  // Enable opening side panel when extension icon is clicked
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
// Background is intentionally minimal: no message handlers needed.