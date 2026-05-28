#!/usr/bin/env python3
"""Smakdown native-messaging helper.

Browser extensions can't append to arbitrary files on disk, so the extension
hands the formatted recipe to this script over Firefox/Zen native messaging.
We read one message from stdin (native-messaging framing: a 4-byte little-endian
length header followed by that many UTF-8 JSON bytes), append the recipe to the
configured file, write one JSON reply back in the same framing, and exit.

Message in:  {"path": "/abs/path/to/notes.org", "content": "...formatted..."}
Reply out:   {"ok": true, "bytes": 1234}
             {"ok": false, "error": "..."}
"""

import json
import os
import struct
import sys


def read_message():
    """Read one native-messaging message from stdin, or None at EOF."""
    header = sys.stdin.buffer.read(4)
    if len(header) < 4:
        return None  # clean EOF — the browser closed the pipe
    (length,) = struct.unpack("<I", header)
    body = sys.stdin.buffer.read(length)
    return json.loads(body.decode("utf-8"))


def write_message(obj):
    """Write one native-messaging message to stdout."""
    data = json.dumps(obj).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("<I", len(data)))
    sys.stdout.buffer.write(data)
    sys.stdout.buffer.flush()


def append_recipe(message):
    """Append message['content'] to message['path']; return a reply dict."""
    path = message.get("path")
    content = message.get("content")
    if not path:
        return {"ok": False, "error": "No output path configured."}
    if content is None:
        return {"ok": False, "error": "No content to write."}

    # Expand ~ and env vars so settings can use a friendly path.
    target = os.path.expanduser(os.path.expandvars(path))
    parent = os.path.dirname(target) or "."
    if not os.path.isdir(parent):
        return {"ok": False, "error": f"Directory does not exist: {parent}"}

    try:
        with open(target, "a", encoding="utf-8") as fh:
            fh.write(content)
    except OSError as err:
        return {"ok": False, "error": f"Could not write file: {err}"}

    return {"ok": True, "bytes": len(content.encode("utf-8"))}


def main():
    message = read_message()
    if message is None:
        return
    try:
        reply = append_recipe(message)
    except Exception as err:  # never crash silently — report back to the toast
        reply = {"ok": False, "error": f"Helper error: {err}"}
    write_message(reply)


if __name__ == "__main__":
    main()
