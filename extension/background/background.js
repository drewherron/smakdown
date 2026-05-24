// Smakdown — background script

browser.action.onClicked.addListener(async (tab) => {
  console.log("[smakdown] action clicked", { tabId: tab.id, url: tab.url });

  let message;
  try {
    const { payload, source } = await preprocessPage(tab);
    console.log("[smakdown] preprocess payload", payload);

    const textKb = (payload.cleanedText.length / 1024).toFixed(1);
    if (payload.jsonLdHint) {
      message = `Found recipe (${source}): ${payload.jsonLdHint.name ?? "(untitled)"} · ${textKb} KB text`;
    } else {
      message = `No structured recipe; extracted ${textKb} KB of text.`;
    }
  } catch (err) {
    console.error("[smakdown] preprocessing failed", err);
    message = `Extraction error: ${err.message}`;
  }

  await browser.notifications.create({
    type: "basic",
    iconUrl: browser.runtime.getURL("icons/icon48.png"),
    title: "Smakdown",
    message,
  });
});
