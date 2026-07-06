// Service worker: adds a right-click "Optimize image with Cleanor" entry on images.
// It does NOT fetch anything here. It opens the optimizer with the image URL; the
// optimizer page asks for one-time permission for that site and fetches the image
// itself (a foreground user gesture — the reliable, least-privilege place to do it).

const MENU_ID = 'cleanor-optimize-image';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: 'Optimize image with Cleanor',
    contexts: ['image'],
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== MENU_ID || !info.srcUrl) return;
  const url = chrome.runtime.getURL(
    'popup.html?tab=1&src=' + encodeURIComponent(info.srcUrl),
  );
  chrome.tabs.create({ url });
});
