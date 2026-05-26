// Smakdown — main-content extraction (Mozilla Readability)
//
// When structured data (JSON-LD / microdata) is missing or thin, we still want
// to send Claude the article body around the recipe — headnotes, tips,
// substitutions — without the nav/ads/footer/comment cruft. We use Mozilla's
// Readability (the engine behind Firefox Reader View, vendored verbatim in
// extension/vendor/) to do that extraction. This shrinks the payload; Claude
// does the understanding.

// Runs in the page context after vendor/Readability.js has been injected, so
// the `Readability` global is available. Must be self-contained otherwise.
// Readability mutates the document it parses, so we hand it a clone and never
// touch the live page.
//
// We use article.content (cleaned HTML) rather than article.textContent: the
// latter flattens everything into one blob, destroying the <li>/<p>/<ol>
// boundaries that delimit recipe steps. Preserving those boundaries means
// Claude gets the author's own step segmentation instead of having to guess it
// from a wall of text — important on blog-style pages with no JSON-LD hint.
function runReadabilityInPage() {
  // Block-level tags whose edges should become line breaks. Inline tags (a,
  // span, strong, em, …) are left alone so words don't get split mid-phrase.
  const BLOCK_TAGS = new Set([
    "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "BR", "DD", "DIV", "DL", "DT",
    "FIGCAPTION", "FIGURE", "FOOTER", "H1", "H2", "H3", "H4", "H5", "H6",
    "HEADER", "HR", "LI", "OL", "P", "PRE", "SECTION", "TABLE", "TR", "UL",
  ]);

  // Convert cleaned HTML to text while keeping one line per block and marking
  // list items, so step lists survive as discrete lines.
  function htmlToStructuredText(html) {
    const container = document.createElement("div");
    container.innerHTML = html;

    const lines = [];
    let current = "";
    const flush = () => {
      const t = current.replace(/[ \t]+/g, " ").trim();
      if (t) lines.push(t);
      current = "";
    };

    const walk = (node) => {
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          current += child.textContent;
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const tag = child.tagName;
          if (tag === "BR") {
            flush();
            continue;
          }
          const isBlock = BLOCK_TAGS.has(tag);
          if (isBlock) flush();
          if (tag === "LI") current += "- ";
          walk(child);
          if (isBlock) flush();
        }
      }
    };

    walk(container);
    flush();
    return lines.join("\n");
  }

  try {
    const docClone = document.cloneNode(true);
    const article = new Readability(docClone).parse();
    // article.content is cleaned HTML; null if Readability found no article.
    return article?.content ? htmlToStructuredText(article.content) : "";
  } catch {
    return "";
  }
}

// Orchestrator: inject Readability + the wrapper into the tab, return the
// cleaned text, or "" if the page yielded nothing usable. The two injections
// share the same isolated world, so the wrapper sees the Readability global.
async function extractMainContent(tabId) {
  await browser.scripting.executeScript({
    target: { tabId },
    files: ["vendor/Readability.js"],
  });
  const results = await browser.scripting.executeScript({
    target: { tabId },
    func: runReadabilityInPage,
  });
  for (const { result } of results) {
    if (result) return result;
  }
  return "";
}
