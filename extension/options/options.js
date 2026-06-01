// Smakdown — settings page

const DEFAULTS = {
  apiKey: "",
  outputPath: "",
  format: "org",
  openInTab: false,
  detailedNotes: false,
};

const form = document.getElementById("settings-form");
const apiKeyEl = document.getElementById("api-key");
const outputPathEl = document.getElementById("output-path");
const openInTabEl = document.getElementById("open-in-tab");
const detailedNotesEl = document.getElementById("detailed-notes");
const statusEl = document.getElementById("status");
const cancelEl = document.getElementById("cancel");

// Each field has an inline error slot (<small class="error">) keyed by id.
const errorEls = {
  apiKey: document.getElementById("api-key-error"),
  outputPath: document.getElementById("output-path-error"),
};
const fieldEls = { apiKey: apiKeyEl, outputPath: outputPathEl };

function showError(field, message) {
  errorEls[field].textContent = message;
  errorEls[field].hidden = false;
  fieldEls[field].classList.add("invalid");
}

function clearError(field) {
  errorEls[field].hidden = true;
  fieldEls[field].classList.remove("invalid");
}

// Returns true if the form is valid; otherwise paints inline errors and
// returns false. A path is "absolute" if it starts with /, ~, or $VAR — the
// helper expands ~ and env vars before opening, so all three are acceptable.
function validate(apiKey, outputPath) {
  let ok = true;
  if (!apiKey) {
    showError("apiKey", "Enter your Anthropic API key.");
    ok = false;
  }
  if (!outputPath) {
    showError("outputPath", "Enter the path to your notes file.");
    ok = false;
  } else if (!/^[/~$]/.test(outputPath)) {
    showError("outputPath", "Use an absolute path (e.g. /home/you/recipes.org).");
    ok = false;
  }
  return ok;
}

async function load() {
  const stored = await browser.storage.local.get(DEFAULTS);
  apiKeyEl.value = stored.apiKey;
  outputPathEl.value = stored.outputPath;
  openInTabEl.checked = stored.openInTab;
  detailedNotesEl.checked = stored.detailedNotes;
  const formatRadio = document.querySelector(
    `input[name="format"][value="${stored.format}"]`,
  );
  if (formatRadio) formatRadio.checked = true;
}

async function save(event) {
  event.preventDefault();
  const apiKey = apiKeyEl.value.trim();
  const outputPath = outputPathEl.value.trim();
  if (!validate(apiKey, outputPath)) return;

  const format =
    document.querySelector('input[name="format"]:checked')?.value ?? "org";
  await browser.storage.local.set({
    apiKey,
    outputPath,
    format,
    openInTab: openInTabEl.checked,
    detailedNotes: detailedNotesEl.checked,
  });
  statusEl.textContent = "Saved.";
  setTimeout(() => (statusEl.textContent = ""), 1500);
}

form.addEventListener("submit", save);

// Clear a field's error as soon as the user starts fixing it.
apiKeyEl.addEventListener("input", () => clearError("apiKey"));
outputPathEl.addEventListener("input", () => clearError("outputPath"));

// Cancel just closes the settings tab without saving.
cancelEl.addEventListener("click", () => window.close());

load();
