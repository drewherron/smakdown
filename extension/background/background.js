// Smakdown — background script

// Distinguishes "this page has no recipe" (informational) from a real pipeline
// failure (bad key, network, helper down). Both end in a toast, but a non-recipe
// page isn't an error — we log it differently and don't append anything.
class NoRecipeError extends Error {}
const NO_RECIPE_MESSAGE = "No recipe found on this page.";

browser.action.onClicked.addListener(async (tab) => {
  console.log("[smakdown] action clicked", { tabId: tab.id, url: tab.url });

  // A save takes a few seconds (the LLM call); show a working badge on the icon
  // so the click clearly registered. Scoped to this tab and cleared in finally.
  browser.action.setBadgeBackgroundColor({ color: "#8a3a1e", tabId: tab.id });
  browser.action.setBadgeText({ text: "…", tabId: tab.id });

  let message;
  try {
    const { payload, source } = await preprocessPage(tab);
    console.log(`[smakdown] preprocessed (${source ?? "no hint"})`, payload);

    // Nothing usable on the page — no structured hint and essentially no article
    // text. Don't spend an LLM call to hallucinate a recipe from nothing.
    if (!payload.jsonLdHint && payload.cleanedText.trim().length < 64) {
      throw new NoRecipeError(NO_RECIPE_MESSAGE);
    }

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

    // The LLM found no recipe (no ingredients and no steps) — there was page text,
    // but it isn't a recipe. Don't append an empty/hallucinated entry.
    if (!recipe.ingredients.length && !recipe.steps.length) {
      throw new NoRecipeError(NO_RECIPE_MESSAGE);
    }

    const formatted = formatRecipe(recipe, settings.format);
    await appendToFile(settings.outputPath, formatted);

    // Silent-save is primary; optionally also open a styled render in a new tab.
    if (settings.openInTab) await openRecipeTab(recipe);

    message = `Saved: ${recipe.title}`;
  } catch (err) {
    if (err instanceof NoRecipeError) {
      console.info("[smakdown] no recipe on page", tab.url);
    } else {
      console.error("[smakdown] recipe pipeline failed", err);
    }
    message = err.message;
  } finally {
    browser.action.setBadgeText({ text: "", tabId: tab.id });
  }

  await browser.notifications.create({
    type: "basic",
    iconUrl: browser.runtime.getURL("icons/icon48.png"),
    title: "Smakdown",
    message,
  });
});
