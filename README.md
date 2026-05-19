# Smakdown

A browser extension that extracts cooking recipes from any webpage and appends
them to your notes file in a clean, consistent format.

## Status

Early development. Not yet usable.

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

Not ready yet. Will require:

- Side-loading the extension into Firefox.
- Installing the native messaging helper (one-time, per-machine).
- An LLM API key.

At first, Claude will be the only LLM option. Later we'll also allow
ChatGPT and Gemini, selecting your LLM in the settings menu.

## License

MIT. See `LICENSE`.
