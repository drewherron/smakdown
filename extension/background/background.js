// Smakdown — background script

browser.action.onClicked.addListener(async (tab) => {
  console.log("[smakdown] action clicked", { tabId: tab.id, url: tab.url });

  let message;
  try {
    const { payload, source } = await preprocessPage(tab);
    console.log(`[smakdown] preprocessed (${source ?? "no hint"})`, payload);

    const settings = await browser.storage.local.get({
      apiKey: "",
      model: "",
      provider: "anthropic",
      format: "org",
    });

    const recipe = await structureRecipe(payload, settings);
    console.log("[smakdown] structured recipe", recipe);

    const formatted = formatRecipe(recipe, settings.format);
    console.log(`[smakdown] formatted (${settings.format}):\n${formatted}`);
    message = `Formatted: ${recipe.title} (${settings.format})`;
  } catch (err) {
    console.error("[smakdown] recipe pipeline failed", err);
    message = err.message;
  }

  await browser.notifications.create({
    type: "basic",
    iconUrl: browser.runtime.getURL("icons/icon48.png"),
    title: "Smakdown",
    message,
  });
});
