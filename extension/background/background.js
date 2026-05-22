// Smakdown — background script

browser.action.onClicked.addListener(async (tab) => {
  console.log("[smakdown] action clicked", { tabId: tab.id, url: tab.url });

  let message;
  try {
    const recipe = await extractRecipeJsonLd(tab.id);
    if (recipe) {
      console.log("[smakdown] JSON-LD recipe found", recipe);
      message = `Found JSON-LD recipe: ${recipe.name ?? "(untitled)"}`;
    } else {
      console.log("[smakdown] no JSON-LD recipe on page");
      message = "No JSON-LD recipe found on this page.";
    }
  } catch (err) {
    console.error("[smakdown] JSON-LD extraction failed", err);
    message = `Extraction error: ${err.message}`;
  }

  await browser.notifications.create({
    type: "basic",
    iconUrl: browser.runtime.getURL("icons/icon48.png"),
    title: "Smakdown",
    message,
  });
});
