// Smakdown — recipe schema + prompt (provider-agnostic)
//
// These are the LLM-facing, provider-independent pieces of the Claude call:
// the structured-output JSON schema, the system prompt, and a small example
// recipe used as a format anchor. Kept separate from any provider's HTTP shape
// so adding OpenAI/Google later only means a new transport module.
//
// Note: the schema covers only the fields the LLM produces. source_url and
// captured_at come from local preprocessing and are merged in afterward — we
// never ask the model to echo a URL (avoids hallucinated links).

// JSON Schema for structured output. Optional fields are nullable + required
// (structured outputs wants every property in `required` with
// additionalProperties:false; nullability is how a field becomes "optional").
const RECIPE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    yield: { type: ["string", "null"] },
    time: {
      type: "object",
      properties: {
        prep: { type: ["string", "null"] },
        cook: { type: ["string", "null"] },
        total: { type: ["string", "null"] },
      },
      required: ["prep", "cook", "total"],
      additionalProperties: false,
    },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          quantity: { type: ["string", "null"] },
          unit: { type: ["string", "null"] },
          item: { type: "string" },
          note: { type: ["string", "null"] },
        },
        required: ["quantity", "unit", "item", "note"],
        additionalProperties: false,
      },
    },
    steps: { type: "array", items: { type: "string" } },
    notes: { type: ["string", "null"] },
  },
  required: ["title", "yield", "time", "ingredients", "steps", "notes"],
  additionalProperties: false,
};

// The "notes" rule is the one part of the system prompt that varies with the
// user's "Detailed notes" setting. Two fixed variants (chosen per request, but
// each a constant string) rather than a string mutated at call time — so the
// system prompt stays a stable, cacheable prefix in either mode.
const NOTES_RULE_BRIEF = `- Notes: distill genuinely useful context from the surrounding article — headnotes, tips, substitutions, make-ahead/storage advice. Summarize in your own words; do not copy marketing copy, ads, SEO filler, or comments. If there's nothing useful, use null.`;

const NOTES_RULE_DETAILED = `- Notes: generously capture the context around the recipe — the dish's history and origin, the author's headnotes and personal story, why they make it this way, plus tips, substitutions, and make-ahead/storage advice. Retell it in your own words as one flowing paragraph (a handful of sentences); keep what gives the recipe its character. Leave out ads, SEO filler, navigation, and reader comments. If the article offers no surrounding context at all, use null.`;

// Build the system prompt for a request. `detailed` toggles the notes rule.
function buildSystemPrompt(detailed) {
  return `You extract cooking recipes from messy web-page text into a single standardized JSON object.

Rules:
- Use only what the page provides. Do not invent ingredients, quantities, or steps. If a field is unknown, use null (or [] for empty lists).
- If the page contains no cooking recipe at all, do not fabricate one: return an empty string for "title" and empty arrays for "ingredients" and "steps".
- Split ingredients into quantity / unit / item / note. "note" holds prep or parentheticals (e.g. "softened", "finely chopped", "about 2 cups"). Keep the item itself clean.
- Steps: one clear instruction per array entry, in order. Preserve the author's step boundaries when the text already delimits them (e.g. dashed list lines). Do not merge distinct steps or split a single step into several.
${detailed ? NOTES_RULE_DETAILED : NOTES_RULE_BRIEF}
- Normalize lightly: trim whitespace, fix obvious OCR-ish artifacts, keep the original wording and measurement system. Don't convert units.
- A JSON-LD hint may be provided. Treat it as a helpful but possibly incomplete or noisy signal; reconcile it against the page text rather than trusting it blindly.`;
}

// A compact input->output example, included as a static format anchor. The
// caching breakpoint is placed after this block (it's the end of the stable
// prefix), so it's worth keeping verbatim and stable.
const FORMAT_ANCHOR = `Example.

Input (cleaned page text):
Simple Vinaigrette
Makes about 1/2 cup. Whisk together and use right away, or shake in a jar.
- 3 tablespoons olive oil
- 1 tablespoon red wine vinegar
- 1 teaspoon Dijon mustard
- Salt and pepper to taste
Tip: a pinch of sugar softens a sharp vinegar.

Output (JSON):
{
  "title": "Simple Vinaigrette",
  "yield": "about 1/2 cup",
  "time": { "prep": null, "cook": null, "total": null },
  "ingredients": [
    { "quantity": "3", "unit": "tablespoons", "item": "olive oil", "note": null },
    { "quantity": "1", "unit": "tablespoon", "item": "red wine vinegar", "note": null },
    { "quantity": "1", "unit": "teaspoon", "item": "Dijon mustard", "note": null },
    { "quantity": null, "unit": null, "item": "salt and pepper", "note": "to taste" }
  ],
  "steps": [
    "Whisk all ingredients together until emulsified.",
    "Use right away, or shake in a jar before serving."
  ],
  "notes": "A pinch of sugar softens a sharp vinegar."
}`;

// Build the volatile user-turn text from a preprocessing payload. This is the
// per-page content that must sit AFTER the cache breakpoint.
function buildUserContent(payload) {
  const parts = [
    "Extract the recipe from this page into the required JSON shape.",
    `Source URL: ${payload.sourceUrl ?? "(unknown)"}`,
  ];
  if (payload.jsonLdHint) {
    parts.push(
      "JSON-LD hint (schema.org Recipe; may be incomplete or noisy):",
      "```json",
      JSON.stringify(payload.jsonLdHint, null, 2),
      "```",
    );
  }
  parts.push(
    "Cleaned page text:",
    payload.cleanedText || "(no article text extracted)",
  );
  return parts.join("\n\n");
}
