// Smakdown — Anthropic transport for the recipe call
//
// Raw fetch to api.anthropic.com (no SDK — this runs in the extension
// background). Produces the LLM-only recipe fields; source_url/captured_at are
// merged by the caller. Provider-specific: request shape, headers, response
// parsing, and error mapping all live here. The schema/prompt are shared
// (see schema.js) so other providers can reuse them.

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
// Default per project plan: Haiku 4.5 — cheap, fast, structured-output friendly.
// Note: Haiku does NOT support the `effort` param or extended thinking, so we
// send neither.
const DEFAULT_MODEL = "claude-haiku-4-5";

// Map a non-OK response to a user-readable error. Tries to surface the API's
// own message; falls back to status-based text.
async function anthropicErrorMessage(response) {
  let detail = "";
  try {
    const body = await response.json();
    detail = body?.error?.message ?? "";
  } catch {
    // non-JSON error body; ignore
  }
  switch (response.status) {
    case 401:
      return "Invalid Anthropic API key. Check it in Smakdown settings.";
    case 429:
      return "Rate limited by Anthropic. Wait a moment and try again.";
    case 413:
      return "Page too large to send. Try a simpler recipe page.";
    default:
      if (response.status >= 500) {
        return "Anthropic service error. Try again shortly.";
      }
      return detail || `Anthropic API error (${response.status}).`;
  }
}

// Call Anthropic and return the parsed recipe fields (per RECIPE_SCHEMA).
// `settings` provides { apiKey, model? }. Throws Error with a friendly message
// on any failure (bad key, rate limit, network, malformed response).
async function callAnthropic(payload, settings) {
  if (!settings.apiKey) {
    throw new Error("No Anthropic API key set. Add one in Smakdown settings.");
  }

  const body = {
    model: settings.model || DEFAULT_MODEL,
    max_tokens: 8192,
    // Static prefix first; cache breakpoint on the last stable block so the
    // system prompt + example are cached across calls. (Haiku's minimum
    // cacheable prefix is ~4096 tokens; if the prefix is shorter, caching is
    // simply a no-op — no error.)
    system: [
      { type: "text", text: SYSTEM_PROMPT },
      {
        type: "text",
        text: FORMAT_ANCHOR,
        cache_control: { type: "ephemeral" },
      },
    ],
    output_config: {
      format: { type: "json_schema", schema: RECIPE_SCHEMA },
    },
    messages: [{ role: "user", content: buildUserContent(payload) }],
  };

  let response;
  try {
    response = await fetch(ANTHROPIC_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": settings.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        // Required for direct calls from a browser/extension origin.
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`Network error reaching Anthropic: ${err.message}`);
  }

  if (!response.ok) {
    throw new Error(await anthropicErrorMessage(response));
  }

  const data = await response.json();
  if (data.stop_reason === "refusal") {
    throw new Error("Claude declined to process this page.");
  }

  // With output_config.format, the first text block is schema-valid JSON.
  const textBlock = (data.content ?? []).find((b) => b.type === "text");
  if (!textBlock?.text) {
    throw new Error("Empty response from Claude.");
  }
  try {
    return JSON.parse(textBlock.text);
  } catch {
    throw new Error("Claude returned malformed recipe JSON.");
  }
}
