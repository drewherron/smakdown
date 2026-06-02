# Smakdown

A browser extension that extracts cooking recipes from any webpage and appends
them to your notes file in a clean, consistent format.

Currently only works with Claude. More options incoming.

## How it works

1. You're on a recipe page.
2. You click the Smakdown toolbar icon.
3. The extension strips the page down to its meaningful content, sends
   it to an LLM for structuring, formats the result as org-mode or
   markdown, and appends it to your configured notes file.
4. Optionally, a clean rendered view also opens in a new tab.

## Architecture

Two pieces:

- **`extension/`** — the browser extension (first Firefox, eventually Chrome).
  Handles preprocessing, the LLM API call, and formatting.
- **`helper/`** — a small Python native-messaging script that appends to
  your notes file. Required because browser extensions can't append to
  arbitrary files on disk. Will keep searching for a better solution...

## Install

Three steps: install the extension, install the helper, add an API key.

### 1. The extension

**From a release (recommended).** Download the signed `.xpi` from the
[latest release][releases], then open `about:addons` in Firefox/Zen →
gear icon → "Install Add-on From File" → pick the `.xpi`. This survives
restarts.

[releases]: https://github.com/drewherron/smakdown/releases

### 2. The helper

The extension can't write to files on its own, so a tiny Python script
(stdlib only) does the append over native messaging. Download
`smakdown-helper-<version>.zip` from the [latest release][releases],
unzip it, then:

```sh
cd helper && ./install.sh
```

Then restart the browser. Re-run it if you move the folder. See
[`helper/README.md`](helper/README.md) for what it can and can't do —
it's the part worth reviewing before you trust it. Linux only for now.

### 3. An API key

Open the extension's settings, paste an Anthropic API key, and set the
path to your notes file. Claude is the only LLM option today; ChatGPT
and Gemini are planned, will eventually be selectable in settings.

## Building

To produce your own signed `.xpi`, see [`BUILDING.md`](BUILDING.md).

## License

MIT. See `LICENSE`.
