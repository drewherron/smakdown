// Smakdown — JSON-LD recipe extraction
//
// Recipe pages commonly embed a schema.org Recipe as JSON-LD inside a
// <script type="application/ld+json"> tag. We pull that out as a structured
// *hint* to include in the LLM prompt — it improves accuracy and reduces
// hallucination, but it is not a way to skip the LLM.

// Runs in the page context (injected via scripting.executeScript), so it must
// be self-contained — no references to anything outside its own body.
// Returns the parsed value of each ld+json block; malformed blocks are skipped.
function collectJsonLdFromPage() {
  const out = [];
  for (const tag of document.querySelectorAll(
    'script[type="application/ld+json"]',
  )) {
    try {
      out.push(JSON.parse(tag.textContent));
    } catch {
      // Skip malformed JSON-LD rather than failing the whole extraction.
    }
  }
  return out;
}

// Does a schema.org @type value denote a Recipe? @type may be a string or an
// array, and may be namespaced (e.g. "schema:Recipe", ".../Recipe").
function typeMatchesRecipe(type) {
  return typeof type === "string" && /(^|[/:#])Recipe$/.test(type);
}

function isRecipeType(type) {
  return Array.isArray(type)
    ? type.some(typeMatchesRecipe)
    : typeMatchesRecipe(type);
}

// Pure: walk parsed JSON-LD value(s) and return the first Recipe object found,
// or null. Handles top-level arrays and @graph containers (both common).
function findRecipe(node) {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipe(item);
      if (found) return found;
    }
    return null;
  }
  if (!node || typeof node !== "object") return null;
  if (isRecipeType(node["@type"])) return node;
  if (node["@graph"]) return findRecipe(node["@graph"]);
  return null;
}

// Orchestrator: inject the collector into the given tab, then locate a Recipe
// among the results. Returns the Recipe object, or null if none is present.
async function extractRecipeJsonLd(tabId) {
  const results = await browser.scripting.executeScript({
    target: { tabId },
    func: collectJsonLdFromPage,
  });
  for (const { result } of results) {
    const recipe = findRecipe(result);
    if (recipe) return recipe;
  }
  return null;
}
