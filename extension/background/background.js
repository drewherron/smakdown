// Smakdown — background script

browser.action.onClicked.addListener(async (tab) => {
  console.log("[smakdown] action clicked", { tabId: tab.id, url: tab.url });

  let message;
  try {
    let recipe = await extractRecipeJsonLd(tab.id);
    let source = "JSON-LD";
    if (!recipe) {
      recipe = await extractRecipeMicrodata(tab.id);
      source = "microdata";
    }

    const cleanedText = await extractMainContent(tab.id);
    console.log(`[smakdown] cleaned text: ${cleanedText.length} chars`);

    if (recipe) {
      console.log(`[smakdown] recipe found via ${source}`, recipe);
      message = `Found recipe (${source}): ${recipe.name ?? "(untitled)"} · ${cleanedText.length} chars text`;
    } else {
      console.log("[smakdown] no structured recipe on page");
      message = `No structured recipe; extracted ${cleanedText.length} chars of text.`;
    }
  } catch (err) {
    console.error("[smakdown] recipe extraction failed", err);
    message = `Extraction error: ${err.message}`;
  }

  await browser.notifications.create({
    type: "basic",
    iconUrl: browser.runtime.getURL("icons/icon48.png"),
    title: "Smakdown",
    message,
  });
});
