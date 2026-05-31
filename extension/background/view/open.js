// Smakdown — open the saved recipe in a new tab (optional, per `openInTab`).
//
// The styled render lives in view/recipe.html. We stash the structured recipe
// in storage.session under a one-shot id and pass that id in the tab URL; the
// view page reads it and clears it. Using storage.session (not a query param)
// keeps arbitrarily large recipes out of the URL; using session (not local)
// means this preview never touches disk and clears when the browser closes.

async function openRecipeTab(recipe) {
  const id = `recipe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await browser.storage.session.set({ [id]: recipe });
  await browser.tabs.create({
    url: browser.runtime.getURL(`view/recipe.html?id=${id}`),
  });
}
