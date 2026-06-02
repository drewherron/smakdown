# Building Smakdown

For developing the extension or building your own signed `.xpi` (to run
a modified copy, or to verify a release against the source). Most people
just want to install the signed release — see the [README](README.md)
for that.

## Develop

There's no build step. The background "modules" are plain scripts loaded
in manifest order (see `manifest.json`), so you edit and reload.

Side-load for a live edit/reload cycle:

1. `about:debugging` → "This Firefox" → "Load Temporary Add-on".
2. Select `extension/manifest.json`.
3. After edits, hit "Reload" on the add-on (or re-load it).

A temporary add-on is removed when the browser restarts — that's fine
for development. For a copy that sticks, sign it (below).

## Why signing is needed

Firefox and Zen refuse to permanently install an unsigned extension, and
there's no signature-bypass on the release channel. Mozilla signs your
own extensions for free, without listing them publicly ("unlisted"
signing). That produces a signed `.xpi` you can install anywhere and
hand to others.

The extension already has the required `browser_specific_settings.gecko.id`
(`smakdown@smakdown.local`) in `manifest.json` — signing needs a stable
ID, and the helper's host manifest is locked to this same ID.

## Sign it yourself

One-time setup: sign in at
<https://addons.mozilla.org/developers/addon/api/key/> and generate a
JWT **issuer** and **secret**.

Then, from the repo root:

```sh
cd extension
npx web-ext sign \
  --channel=unlisted \
  --api-key="$AMO_JWT_ISSUER" \
  --api-secret="$AMO_JWT_SECRET"
```

Mozilla validates and signs it, and the signed `.xpi` lands in
`extension/web-ext-artifacts/`.

Notes:

- **Bump `version` in `manifest.json` before every sign.** Unlisted
  signing rejects a version it has already seen.
- `web-ext` needs Node; `npx` fetches it on demand, so there's nothing
  to add to the repo.

Install the resulting `.xpi` via `about:addons` → gear → "Install
Add-on From File". It survives restarts.
