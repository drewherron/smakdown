// Smakdown — native-messaging bridge to the file-append helper
//
// The extension can't write to arbitrary files, so the formatted recipe is
// handed to the Python helper (see helper/) over native messaging. We use
// sendNativeMessage (one message, one reply, host exits) rather than a
// long-lived port — a save is a single fire-and-forget append.

const NATIVE_HOST = "smakdown";

// Append formatted text to the file at `path` via the helper. Resolves on
// success; throws an Error with a user-readable message on any failure
// (helper not installed, bad path, write error).
async function appendToFile(path, content) {
  if (!path) {
    throw new Error("No output file path set. Add one in Smakdown settings.");
  }

  let reply;
  try {
    reply = await browser.runtime.sendNativeMessage(NATIVE_HOST, {
      path,
      content,
    });
  } catch (err) {
    // Most common cause: the native-messaging host manifest isn't installed.
    throw new Error(
      `Couldn't reach the Smakdown helper. Is it installed? (${err.message})`,
    );
  }

  if (!reply?.ok) {
    throw new Error(reply?.error ?? "Helper failed to save the recipe.");
  }
  return reply;
}
