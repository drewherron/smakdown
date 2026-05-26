// Smakdown — LLM dispatch (provider-agnostic entry point)
//
// structureRecipe() is what the background orchestrator calls. It picks a
// provider (Anthropic only for v1), runs the call, and assembles the full
// recipe data model by merging the LLM-produced fields with the locally-known
// source_url and captured_at. Adding OpenAI/Google later means a new transport
// module + a case here — the schema, prompt, and assembly stay shared.

async function structureRecipe(payload, settings) {
  const provider = settings.provider || "anthropic";

  let fields;
  switch (provider) {
    case "anthropic":
      fields = await callAnthropic(payload, settings);
      break;
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }

  // Merge LLM output with locally-known metadata into the intermediate model.
  return {
    title: fields.title,
    source_url: payload.sourceUrl,
    captured_at: payload.capturedAt,
    yield: fields.yield,
    time: fields.time,
    ingredients: fields.ingredients,
    steps: fields.steps,
    notes: fields.notes,
  };
}
