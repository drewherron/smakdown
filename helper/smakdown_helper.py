#!/usr/bin/env python3
"""Smakdown native-messaging helper.

WHAT THIS IS, AND WHY IT EXISTS -------------------------------
A browser extension runs inside the browser's sandbox and is NOT
allowed to write to files on your disk. That's a deliberate browser
security feature. But the whole point of Smakdown is to append a
recipe to your notes file — so we need a tiny program that lives
outside the sandbox and does exactly that one write, and nothing
else. This is that program.

The browser talks to it over "native messaging": when you click Save,
the browser launches this script, sends it one message, reads one
reply, and the script exits. It is not a server, it does not stay
running, and it does not listen on any network port.

WHY THIS IS THE FILE WORTH REVIEWING
------------------------------------

This is the only part of Smakdown that runs with your normal user
permissions, outside the browser sandbox — so in principle it could
touch any file your user account can. That makes it the right thing to
read before trusting it. The good news is there isn't much to
read. What this script can and cannot do:

  - It ONLY ever appends (open mode "a"). It never truncates,
    overwrites, or deletes a file. The worst a bug here could do is
    add text to the end of a file — it cannot wipe one.
  - It does NOT run shell commands. There is no os.system, subprocess,
    eval, or exec anywhere in this file. The "content" it receives is
    treated purely as text to write; it is never executed or interpreted.
  - It does NOT touch the network. No sockets, no HTTP, no imports that do.
  - It has NO third-party dependencies. Every import below is from the
    Python standard library, so there is no pip package supply chain to vet.
  - It reads exactly one message and writes exactly one reply, then exits.

WHO IS ALLOWED TO TALK TO IT
----------------------------
You might worry that any program could invoke this and make it write
files.  It can't reach this script directly — the browser is the one
that launches it, and the browser only launches it for an extension
whose ID is listed in the host manifest (see install.sh, the
"allowed_extensions" field). That manifest restricts callers to
Smakdown's own extension ID. No other extension or web page can reach
this helper.

WHERE THE FILE PATH COMES FROM
------------------------------
The destination path is not hard-coded and is not chosen by this
script. It is whatever you typed into Smakdown's settings page,
forwarded here in the message.  So the helper writes where YOU told
the extension to write.

THE MESSAGE FORMAT (native-messaging framing)
---------------------------------------------
Native messaging frames each message as: a 4-byte little-endian length
header, followed by that many bytes of UTF-8 JSON. We read that header
to know how many bytes to read, then parse the JSON. Replies use the
same framing.

Message in:  {"path": "/abs/path/to/notes.org", "content": "...formatted..."}
Reply out:   {"ok": true, "bytes": 1234}
             {"ok": false, "error": "..."}

"""

import json
import os
import struct
import sys


def read_message():
    """Read one native-messaging message from stdin, or None at EOF.

    The browser sends a 4-byte little-endian unsigned int (the body length),
    then that many bytes of UTF-8 JSON. If we get fewer than 4 bytes, the
    browser closed the pipe with nothing to say — a normal shutdown, so we
    return None and the caller exits quietly.
    """
    header = sys.stdin.buffer.read(4)
    if len(header) < 4:
        return None  # clean EOF — the browser closed the pipe
    # "<I" = little-endian unsigned 32-bit int. This is the body length; we
    # only ever read exactly that many bytes, so an oversized claim just means
    # we wait for bytes that the (trusted) browser said are coming.
    (length,) = struct.unpack("<I", header)
    body = sys.stdin.buffer.read(length)
    return json.loads(body.decode("utf-8"))


def write_message(obj):
    """Write one native-messaging message to stdout using the same framing."""
    data = json.dumps(obj).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("<I", len(data)))  # 4-byte length header
    sys.stdout.buffer.write(data)
    sys.stdout.buffer.flush()


def append_recipe(message):
    """Append message['content'] to message['path']; return a reply dict.

    This is the only function that touches the filesystem. Read it closely —
    it is the entire "what can this program do to my disk" surface.
    """
    path = message.get("path")
    content = message.get("content")
    # Refuse if the message is missing either piece. We never invent a default
    # path, so a malformed message can't cause a write to some surprise file.
    if not path:
        return {"ok": False, "error": "No output path configured."}
    if content is None:
        return {"ok": False, "error": "No content to write."}

    # Expand ~ and $VARS so a friendly path like "~/notes/recipes.org" works.
    # This only resolves the path you configured; it does not let the message
    # reach beyond what your own shell would resolve that same string to.
    target = os.path.expanduser(os.path.expandvars(path))
    parent = os.path.dirname(target) or "."
    # Require the parent directory to already exist. We deliberately do NOT
    # create directories — that keeps the helper from scattering folders around
    # your disk because of a typo, and makes "wrong path" fail loudly instead.
    if not os.path.isdir(parent):
        return {"ok": False, "error": f"Directory does not exist: {parent}"}

    try:
        # Mode "a" = append only. This is the single most important line for
        # safety: the file is opened for appending, so existing contents are
        # never read, overwritten, or truncated — we can only add to the end.
        # The content is written verbatim as text; it is never executed.
        with open(target, "a", encoding="utf-8") as fh:
            fh.write(content)
    except OSError as err:
        # Permission denied, path is a directory, disk full, etc. — report it
        # back so the extension can show a useful message instead of failing
        # silently.
        return {"ok": False, "error": f"Could not write file: {err}"}

    return {"ok": True, "bytes": len(content.encode("utf-8"))}


def main():
    # 1. Read the single message the browser sent. None means "nothing to do".
    message = read_message()
    if message is None:
        return
    # 2. Do the one append, capturing any unexpected error rather than letting
    #    the process crash — a crash would leave the extension with no reply
    #    and no explanation. Anything that goes wrong becomes a normal error
    #    reply the user can see.
    try:
        reply = append_recipe(message)
    except Exception as err:
        reply = {"ok": False, "error": f"Helper error: {err}"}
    # 3. Send exactly one reply back, then fall off the end of the program and
    #    exit. There is no loop — the helper does not stay resident.
    write_message(reply)


if __name__ == "__main__":
    main()
