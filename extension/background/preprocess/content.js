// Smakdown — main-content extraction (Mozilla Readability)
//
// When structured data (JSON-LD / microdata) is missing or thin, we still want
// to send Claude the article body around the recipe — headnotes, tips,
// substitutions — without the nav/ads/footer/comment cruft. We use Mozilla's
// Readability (the engine behind Firefox Reader View, vendored verbatim in
// extension/vendor/) to do that extraction. This shrinks the payload; Claude
// does the understanding.

// Runs in the page context after vendor/Readability.js has been injected, so
// the `Readability` global is available. Must be self-contained otherwise.
// Readability mutates the document it parses, so we hand it a clone and never
// touch the live page.
function runReadabilityInPage() {
  try {
    const docClone = document.cloneNode(true);
    const article = new Readability(docClone).parse();
    // article.textContent is the cleaned plain text; null if Readability
    // couldn't find an article.
    return article?.textContent?.trim() ?? "";
  } catch {
    return "";
  }
}

// Orchestrator: inject Readability + the wrapper into the tab, return the
// cleaned text, or "" if the page yielded nothing usable. The two injections
// share the same isolated world, so the wrapper sees the Readability global.
async function extractMainContent(tabId) {
  await browser.scripting.executeScript({
    target: { tabId },
    files: ["vendor/Readability.js"],
  });
  const results = await browser.scripting.executeScript({
    target: { tabId },
    func: runReadabilityInPage,
  });
  for (const { result } of results) {
    if (result) return result;
  }
  return "";
}
