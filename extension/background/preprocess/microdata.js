// Smakdown — microdata / hRecipe fallback recipe extraction
//
// Runs only when JSON-LD finds nothing. Some sites mark recipes up inline
// instead: either schema.org microdata (itemscope/itemtype/itemprop) or the
// older hRecipe microformat (CSS classes like "fn", "ingredient",
// "instructions"). This is a *basic* fallback — it produces the same hint
// shape as the JSON-LD path (schema.org keys), so downstream code is uniform.
// As with JSON-LD, this is a prompt hint, not a way to skip the LLM.

// Runs in the page context (injected via scripting.executeScript), so it must
// be self-contained — no references to anything outside its own body.
function collectMicrodataFromPage() {
  const text = (el) => (el ? el.textContent.trim() : undefined);
  const clean = (arr) => arr.map((s) => s.trim()).filter(Boolean);

  // --- schema.org microdata: scope element carries itemtype ".../Recipe" ---
  function fromMicrodata() {
    const scope = document.querySelector('[itemscope][itemtype*="Recipe" i]');
    if (!scope) return null;

    // itemprop lookup limited to this scope. Nested itemscopes have their own
    // props, but for a basic fallback we accept the shallow over-reach.
    const props = (name) =>
      Array.from(scope.querySelectorAll(`[itemprop="${name}" i]`));
    const first = (name) => props(name)[0];
    // For times, schema.org puts the ISO value in a <time datetime> or content.
    const propValue = (el) =>
      el
        ? el.getAttribute("datetime") ??
          el.getAttribute("content") ??
          el.textContent.trim()
        : undefined;

    const hint = {};
    const name = text(first("name"));
    if (name) hint.name = name;
    const desc = text(first("description"));
    if (desc) hint.description = desc;
    const author = text(first("author"));
    if (author) hint.author = author;
    const yld = text(first("recipeYield"));
    if (yld) hint.recipeYield = yld;
    for (const t of ["prepTime", "cookTime", "totalTime"]) {
      const v = propValue(first(t));
      if (v) hint[t] = v;
    }
    const ingredients = clean(
      props("recipeIngredient").concat(props("ingredients")).map(text),
    );
    if (ingredients.length) hint.recipeIngredient = ingredients;
    const steps = clean(props("recipeInstructions").map(text));
    if (steps.length) hint.recipeInstructions = steps;

    return hint.name || hint.recipeIngredient ? hint : null;
  }

  // --- hRecipe microformat: a container with class "hrecipe" ---
  function fromHRecipe() {
    const root = document.querySelector(".hrecipe");
    if (!root) return null;

    const byClass = (cls) => Array.from(root.querySelectorAll("." + cls));
    const hint = {};
    const name = text(byClass("fn")[0]);
    if (name) hint.name = name;
    const summary = text(byClass("summary")[0]);
    if (summary) hint.description = summary;
    const author = text(byClass("author")[0]);
    if (author) hint.author = author;
    const yld = text(byClass("yield")[0]);
    if (yld) hint.recipeYield = yld;
    const ingredients = clean(byClass("ingredient").map(text));
    if (ingredients.length) hint.recipeIngredient = ingredients;
    const steps = clean(
      byClass("instruction").concat(byClass("instructions")).map(text),
    );
    if (steps.length) hint.recipeInstructions = steps;

    return hint.name || hint.recipeIngredient ? hint : null;
  }

  return fromMicrodata() ?? fromHRecipe();
}

// Orchestrator: inject the collector and return the hint, or null if neither
// microdata nor hRecipe markup is present.
async function extractRecipeMicrodata(tabId) {
  const results = await browser.scripting.executeScript({
    target: { tabId },
    func: collectMicrodataFromPage,
  });
  for (const { result } of results) {
    if (result) return result;
  }
  return null;
}
