// Smakdown — preprocessing orchestrator
//
// Turns any page into the payload the Claude call consumes. Runs the structured
// parsers (JSON-LD, then microdata fallback) for an accuracy hint, and
// Readability for the surrounding article text. Both pieces are optional: a
// page may have a clean Recipe hint but little prose, or prose but no markup.
// Shrinking the payload is the goal; Claude does the understanding.
//
// Output shape (consumed in Phase 3):
//   {
//     jsonLdHint: object | null,   // schema.org-shaped Recipe hint, or null
//     cleanedText: string,         // Readability article text ("" if none)
//     sourceUrl: string,           // the page URL
//     capturedAt: string,          // ISO timestamp of capture
//   }

// Locate a structured Recipe hint: JSON-LD first, microdata/hRecipe as fallback.
// Returns the hint object and which source produced it (for logging/UX).
async function extractRecipeHint(tabId) {
  const jsonLd = await extractRecipeJsonLd(tabId);
  if (jsonLd) return { hint: jsonLd, source: "JSON-LD" };

  const microdata = await extractRecipeMicrodata(tabId);
  if (microdata) return { hint: microdata, source: "microdata" };

  return { hint: null, source: null };
}

// Build the full preprocessing payload for a tab. The hint lookup and the
// content extraction are independent, so run them in parallel.
async function preprocessPage(tab) {
  const [{ hint, source }, cleanedText] = await Promise.all([
    extractRecipeHint(tab.id),
    extractMainContent(tab.id),
  ]);

  return {
    payload: {
      jsonLdHint: hint,
      cleanedText,
      sourceUrl: tab.url,
      capturedAt: new Date().toISOString(),
    },
    source, // null when no structured hint was found
  };
}
