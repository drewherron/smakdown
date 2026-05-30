#!/usr/bin/env bash
# Smakdown native-messaging helper installer.
#
# This is an install script that you're manually running on your
# machine, so it's worth a read alongside smakdown_helper.py. All it
# does is write one small JSON file — a "native-messaging host
# manifest" — into your browser profile(s). That manifest is how the
# browser learns the helper exists and is allowed to run.
#
# It does NOT install packages, contact the network, run the helper,
# or touch any file outside your browsers' native-messaging-hosts
# directories. It only writes one tiny JSON file per browser profile,
# and prints what it wrote.
#
# Re-run it after moving the repo, because the manifest stores an
# absolute path to smakdown_helper.py.
#
# Usage: ./install.sh

# Fail fast: stop on any error, on use of an unset variable, or if any
# command in a pipeline fails. This is just defensive hygiene for the
# script itself.
set -euo pipefail

HOST_NAME="smakdown"
# This is the SECURITY GATE. The manifest below lists this extension
# ID under "allowed_extensions", and the browser will only launch the
# helper on behalf of an extension with this exact ID. That's what
# stops any other extension from using your helper to write files. It
# must match the id in extension/manifest.json.
EXTENSION_ID="smakdown@smakdown.local"

# Resolve the absolute path to the helper script sitting next to this
# installer.  The manifest needs an absolute path because the browser
# launches the helper from its own working directory, not this one.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HELPER_PATH="$SCRIPT_DIR/smakdown_helper.py"

if [[ ! -f "$HELPER_PATH" ]]; then
  echo "error: helper not found at $HELPER_PATH" >&2
  exit 1
fi
# Make the helper executable so the browser can run it directly.
chmod +x "$HELPER_PATH"

# The per-browser directories where Firefox-family browsers look for
# native- messaging host manifests on Linux. We only write into these
# specific dirs.
CANDIDATES=(
  "$HOME/.mozilla/native-messaging-hosts"
  "$HOME/.zen/native-messaging-hosts"
  "$HOME/.librewolf/native-messaging-hosts"
)

installed=0
for dir in "${CANDIDATES[@]}"; do
  # Only install where the browser's base profile dir already exists,
  # so we don't create config folders for browsers you don't use.
  if [[ ! -d "$(dirname "$dir")" ]]; then
    continue
  fi
  mkdir -p "$dir"
  manifest="$dir/$HOST_NAME.json"
  # Write the manifest. "path" points at the helper; "type": "stdio"
  # means the browser talks to it over stdin/stdout (the framing
  # described in the helper); "allowed_extensions" is the gate that
  # restricts callers to Smakdown.
  cat > "$manifest" <<JSON
{
  "name": "$HOST_NAME",
  "description": "Smakdown recipe-saving helper",
  "path": "$HELPER_PATH",
  "type": "stdio",
  "allowed_extensions": ["$EXTENSION_ID"]
}
JSON
  echo "installed: $manifest"
  installed=$((installed + 1))
done

if [[ "$installed" -eq 0 ]]; then
  echo "No Firefox/Zen/LibreWolf profile directory found." >&2
  echo "Create one (launch the browser once), then re-run this script." >&2
  exit 1
fi

echo "Done. Restart the browser if it's running."
