export type JsonObject = Record<string, unknown>;

export function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateTracePayload(value: unknown): string | null {
  if (!isObject(value)) return "Expected a JSON object.";
  for (const field of ["app", "model", "userInput", "finalResponse"]) {
    if (typeof value[field] !== "string" || !value[field].trim()) {
      return `${field} must be a nonempty string.`;
    }
    if ((value[field] as string).length > 16000) return `${field} is too long.`;
  }
  if (value.systemPrompt !== undefined && (typeof value.systemPrompt !== "string" || value.systemPrompt.length > 16000)) {
    return "systemPrompt must be a string of at most 16000 characters.";
  }
  if (value.schemaValid !== undefined && typeof value.schemaValid !== "boolean") {
    return "schemaValid must be a boolean.";
  }
  if (value.status !== undefined && !["ok", "warning", "error"].includes(String(value.status))) {
    return "Invalid trace status.";
  }
  if (value.feedback !== undefined && !["good", "bad", "none"].includes(String(value.feedback))) {
    return "feedback must be good, bad, or none.";
  }
  if (value.id !== undefined && (typeof value.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(value.id))) {
    return "id must contain 1-80 letters, digits, hyphens, or underscores.";
  }
  if (value.environment !== undefined && !["dev", "staging", "prod"].includes(String(value.environment))) {
    return "environment must be dev, staging, or prod.";
  }
  if (value.timestamp !== undefined && (typeof value.timestamp !== "string" || !Number.isFinite(Date.parse(value.timestamp)))) {
    return "timestamp must be a valid date-time.";
  }
  for (const [field, maximum] of [["spans", 128], ["retrievalChunks", 64], ["evalResults", 32], ["tags", 16]] as const) {
    if (value[field] !== undefined && (!Array.isArray(value[field]) || value[field].length > maximum)) {
      return `${field} must be an array of at most ${maximum} items.`;
    }
  }
  for (const tag of (value.tags ?? []) as unknown[]) {
    if (typeof tag !== "string" || tag.length > 64) return "tags must be strings of at most 64 characters.";
  }
  for (const span of (value.spans ?? []) as unknown[]) {
    if (!isObject(span) || typeof span.name !== "string" || !span.name.trim() || span.name.length > 120) {
      return "Each span needs a name of at most 120 characters.";
    }
    if (span.status !== undefined && !["ok", "warning", "error"].includes(String(span.status))) {
      return "Invalid span status.";
    }
    if (span.type !== undefined && !["input", "system", "retrieval", "rerank", "model", "tool", "validation", "eval", "output"].includes(String(span.type))) {
      return "Invalid span type.";
    }
    for (const field of ["latencyMs", "tokenCount", "costUsd"]) {
      const number = span[field];
      if (number !== undefined && (typeof number !== "number" || !Number.isFinite(number) || number < 0)) {
        return `span ${field} must be a nonnegative finite number.`;
      }
    }
  }
  for (const chunk of (value.retrievalChunks ?? []) as unknown[]) {
    if (!isObject(chunk) || typeof chunk.source !== "string" || typeof chunk.excerpt !== "string") {
      return "Each retrieval chunk needs a source and excerpt.";
    }
    if (chunk.excerpt.length > 16000) return "Retrieval excerpt is too long.";
    if (chunk.score !== undefined && (typeof chunk.score !== "number" || !Number.isFinite(chunk.score) || chunk.score < 0 || chunk.score > 1)) {
      return "Retrieval score must be between 0 and 1.";
    }
    if (chunk.cited !== undefined && typeof chunk.cited !== "boolean") return "Retrieval cited must be a boolean.";
  }
  for (const result of (value.evalResults ?? []) as unknown[]) {
    if (!isObject(result) || !["groundedness", "relevance", "citation_support", "schema_validity", "safety", "tool_correctness", "latency", "cost"].includes(String(result.evaluator)) ||
      typeof result.score !== "number" || !Number.isFinite(result.score) || result.score < 0 || result.score > 1) {
      return "Each evaluator result needs an evaluator and score between 0 and 1.";
    }
  }
  for (const field of ["latencyMs", "costUsd", "tokenCount"]) {
    const item = value[field];
    if (item !== undefined && (typeof item !== "number" || !Number.isFinite(item) || item < 0)) {
      return `${field} must be a nonnegative finite number.`;
    }
  }
  return null;
}
