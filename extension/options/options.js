// Smakdown — settings page

const DEFAULTS = {
  apiKey: "",
  outputPath: "",
  format: "org",
  openInTab: false,
};

const form = document.getElementById("settings-form");
const apiKeyEl = document.getElementById("api-key");
const outputPathEl = document.getElementById("output-path");
const openInTabEl = document.getElementById("open-in-tab");
const statusEl = document.getElementById("status");

async function load() {
  const stored = await browser.storage.local.get(DEFAULTS);
  apiKeyEl.value = stored.apiKey;
  outputPathEl.value = stored.outputPath;
  openInTabEl.checked = stored.openInTab;
  const formatRadio = document.querySelector(
    `input[name="format"][value="${stored.format}"]`,
  );
  if (formatRadio) formatRadio.checked = true;
}

async function save(event) {
  event.preventDefault();
  const format =
    document.querySelector('input[name="format"]:checked')?.value ?? "org";
  await browser.storage.local.set({
    apiKey: apiKeyEl.value.trim(),
    outputPath: outputPathEl.value.trim(),
    format,
    openInTab: openInTabEl.checked,
  });
  statusEl.textContent = "Saved.";
  setTimeout(() => (statusEl.textContent = ""), 1500);
}

form.addEventListener("submit", save);
load();
