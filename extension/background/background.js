// Smakdown — background script

browser.action.onClicked.addListener(async (tab) => {
  console.log("[smakdown] action clicked", { tabId: tab.id, url: tab.url });

  await browser.notifications.create({
    type: "basic",
    iconUrl: browser.runtime.getURL("icons/icon48.png"),
    title: "Smakdown",
    message: `Stub: would extract from ${tab.url ?? "current tab"}`,
  });
});
