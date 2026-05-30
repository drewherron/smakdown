# Smakdown native messaging helper

A small Python script the extension talks to over [native
messaging](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging)
to append extracted recipes to your notes file on disk. Needed because
browser extensions can't write to arbitrary files themselves.

Not an ideal setup, but it is much more reliable. If you're worried
about security this is probably the code you'd want to review, so I've
tried to explain everything in (very thorough) comments. It's not very
complicated.

## Files

- `smakdown_helper.py` — reads one native-messaging message from stdin
  (`{ "path", "content" }`), appends `content` to `path`, replies
  `{ "ok": true, "bytes": N }` or `{ "ok": false, "error": "..." }`.
- `install.sh` — writes the native-messaging host manifest (`smakdown.json`)
  into each detected Firefox/Zen/LibreWolf profile dir, pointing at the absolute
  path of `smakdown_helper.py`.

## Install

```sh
./install.sh
```

Then restart the browser. Re-run `install.sh` if you move the repo
(the manifest stores an absolute path to the script).

Requires Python 3 (standard library only — no dependencies). The
output file path itself is configured in the extension's settings
page, not here; `~` and `$VARS` in that path are expanded by the
helper.

## Notes

- The host name is `smakdown` and the manifest restricts access to the
  `smakdown@smakdown.local` extension ID (must match `manifest.json`).
- Currently Linux-only paths. macOS/Windows host-dir locations are a later step.
