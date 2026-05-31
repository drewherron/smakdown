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
      outputPath: "",
      openInTab: false,
    });

    const recipe = await structureRecipe(payload, settings);
    console.log("[smakdown] structured recipe", recipe);

    const formatted = formatRecipe(recipe, settings.format);
    await appendToFile(settings.outputPath, formatted);

    // Silent-save is primary; optionally also open a styled render in a new tab.
    if (settings.openInTab) await openRecipeTab(recipe);

    message = `Saved: ${recipe.title}`;
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
