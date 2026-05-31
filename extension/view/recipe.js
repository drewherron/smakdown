// Smakdown — rendered recipe view.
//
// Opened (when the `openInTab` setting is on) right after a recipe is saved.
// The background script stashes the structured recipe in storage.session under
// a one-shot id and passes that id in our URL. We read it, clear it, and render.
// storage.session (not the URL) keeps arbitrarily large recipes out of the
// address bar; (not storage.local) means this preview never touches disk and is
// gone when the browser closes. The saved notes file stays the source of truth.

const $ = (id) => document.getElementById(id);

// Build "quantity unit item" — mirrors the formatter's ingredientLine, but the
// trailing "(note)" is returned separately so we can style it.
function ingredientHead(ing) {
  return [ing.quantity, ing.unit, ing.item]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

// Add a <dt>/<dd> pair to the metadata grid, skipping empty values. When `href`
// is given the value renders as a link.
function addMeta(label, value, href) {
  if (!value) return;
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  if (href) {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = value;
    dd.append(a);
  } else {
    dd.textContent = value;
  }
  $("meta").append(dt, dd);
}

function render(recipe) {
  document.title = `${recipe.title} — Smakdown`;
  $("title").textContent = recipe.title;

  addMeta("Yield", recipe.yield);
  addMeta("Prep", recipe.time?.prep);
  addMeta("Cook", recipe.time?.cook);
  addMeta("Total", recipe.time?.total);
  addMeta("Source", recipe.source_url, recipe.source_url);
  addMeta("Saved", recipe.captured_at);

  for (const ing of recipe.ingredients ?? []) {
    const li = document.createElement("li");
    li.textContent = ingredientHead(ing);
    if (ing.note) {
      const span = document.createElement("span");
      span.className = "note";
      span.textContent = ` (${ing.note})`;
      li.append(span);
    }
    $("ingredients").append(li);
  }

  for (const step of recipe.steps ?? []) {
    const li = document.createElement("li");
    li.textContent = step;
    $("steps").append(li);
  }

  if (recipe.notes) {
    $("notes").textContent = recipe.notes;
    $("notes-section").hidden = false;
  }

  $("recipe").hidden = false;
}

function showError(message) {
  $("error").textContent = message;
  $("error").hidden = false;
}

async function main() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    showError("No recipe to show.");
    return;
  }

  const stored = await browser.storage.session.get(id);
  const recipe = stored[id];
  if (!recipe) {
    showError("This recipe is no longer available. Try saving it again.");
    return;
  }

  // One-shot: drop it so a refresh doesn't resurrect a stale preview.
  await browser.storage.session.remove(id);
  render(recipe);
}

main();
