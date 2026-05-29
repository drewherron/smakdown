#!/usr/bin/env bash
# Smakdown native-messaging helper installer.
#
# Drops a native-messaging host manifest pointing at smakdown_helper.py into the
# host directory of every Firefox-family browser profile we can find (Firefox,
# Zen, LibreWolf). Re-run after moving the repo — the manifest stores an
# absolute path to the script.
#
# Usage: ./install.sh

set -euo pipefail

HOST_NAME="smakdown"
EXTENSION_ID="smakdown@smakdown.local"

# Resolve absolute path to the helper script next to this installer.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HELPER_PATH="$SCRIPT_DIR/smakdown_helper.py"

if [[ ! -f "$HELPER_PATH" ]]; then
  echo "error: helper not found at $HELPER_PATH" >&2
  exit 1
fi
chmod +x "$HELPER_PATH"

# Linux native-messaging host dirs, one per Firefox-family browser.
CANDIDATES=(
  "$HOME/.mozilla/native-messaging-hosts"
  "$HOME/.zen/native-messaging-hosts"
  "$HOME/.librewolf/native-messaging-hosts"
)

installed=0
for dir in "${CANDIDATES[@]}"; do
  # Only install where the browser's base profile dir already exists.
  if [[ ! -d "$(dirname "$dir")" ]]; then
    continue
  fi
  mkdir -p "$dir"
  manifest="$dir/$HOST_NAME.json"
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
