// Smakdown — recipe formatting (recipe JSON → org-mode or markdown text)
//
// Pure functions: take the intermediate recipe data model (see summary.md) and
// return a single appendable text block. No I/O — the native-messaging helper
// does the actual file append. Each saved recipe is one self-contained block
// with a leading blank line so appends stay separated in the notes file.

// --- shared helpers ---

// Render one ingredient line: "quantity unit item (note)" with parts omitted
// when null/empty. Same text for org and md (both use "- " list items).
function ingredientLine(ing) {
  const head = [ing.quantity, ing.unit, ing.item]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(" ");
  return ing.note ? `${head} (${ing.note})` : head;
}

// Collapse internal newlines so a multi-line note/step stays on one logical
// line in the list (keeps org/md lists well-formed).
function oneLine(s) {
  return s.replace(/\s*\n\s*/g, " ").trim();
}

// --- org-mode ---
// Top-level headline + PROPERTIES drawer (source URL, captured-at, yield,
// times), then an ingredient list and numbered steps.
function formatOrg(recipe) {
  const lines = [`* ${recipe.title}`, "  :PROPERTIES:"];
  const prop = (key, val) => {
    if (val) lines.push(`  :${key}: ${val}`);
  };
  prop("SOURCE_URL", recipe.source_url);
  prop("CAPTURED_AT", recipe.captured_at);
  prop("YIELD", recipe.yield);
  prop("PREP_TIME", recipe.time?.prep);
  prop("COOK_TIME", recipe.time?.cook);
  prop("TOTAL_TIME", recipe.time?.total);
  lines.push("  :END:", "");

  lines.push("** Ingredients");
  for (const ing of recipe.ingredients) lines.push(`   - ${ingredientLine(ing)}`);
  lines.push("");

  lines.push("** Steps");
  recipe.steps.forEach((step, i) => lines.push(`   ${i + 1}. ${oneLine(step)}`));

  if (recipe.notes) {
    lines.push("", "** Notes", `   ${oneLine(recipe.notes)}`);
  }

  // Leading blank line separates this recipe from prior content on append.
  return "\n" + lines.join("\n") + "\n";
}

// --- markdown ---
// H1 + YAML frontmatter for the same metadata, then lists.

// Quote a YAML scalar only when it could be misparsed (has a colon, quote, or
// leading special char). Keeps simple values clean.
function yamlScalar(val) {
  const s = String(val);
  if (/^[\w .,/&()-]+$/.test(s) && !/^\s|\s$/.test(s)) return s;
  return `"${s.replace(/"/g, '\\"')}"`;
}

function formatMarkdown(recipe) {
  const fm = ["---"];
  const field = (key, val) => {
    if (val) fm.push(`${key}: ${yamlScalar(val)}`);
  };
  field("title", recipe.title);
  field("source_url", recipe.source_url);
  field("captured_at", recipe.captured_at);
  field("yield", recipe.yield);
  field("prep_time", recipe.time?.prep);
  field("cook_time", recipe.time?.cook);
  field("total_time", recipe.time?.total);
  fm.push("---");

  const lines = [...fm, "", `# ${recipe.title}`, "", "## Ingredients", ""];
  for (const ing of recipe.ingredients) lines.push(`- ${ingredientLine(ing)}`);
  lines.push("", "## Steps", "");
  recipe.steps.forEach((step, i) => lines.push(`${i + 1}. ${oneLine(step)}`));

  if (recipe.notes) {
    lines.push("", "## Notes", "", oneLine(recipe.notes));
  }

  return "\n" + lines.join("\n") + "\n";
}

// Dispatch on the configured format ("org" | "md"); defaults to org.
function formatRecipe(recipe, format) {
  return format === "md" ? formatMarkdown(recipe) : formatOrg(recipe);
}
