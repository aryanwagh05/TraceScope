import { describe, expect, it } from "vitest";
import { validateTracePayload } from "./validation";

const validTrace = {
  app: "support",
  model: "actual-model",
  userInput: "What happened?",
  finalResponse: "The call completed.",
  spans: [{ name: "Generate", type: "model", latencyMs: 120 }],
};

describe("trace ingestion validation", () => {
  it("accepts a bounded trace", () => {
    expect(validateTracePayload(validTrace)).toBeNull();
  });

  it("rejects missing answer and invalid identifiers", () => {
    expect(validateTracePayload({ ...validTrace, finalResponse: "" })).toContain("finalResponse");
    expect(validateTracePayload({ ...validTrace, id: "bad/id" })).toContain("id");
  });

  it("rejects non-finite costs and malformed span values", () => {
    expect(validateTracePayload({ ...validTrace, costUsd: Number.POSITIVE_INFINITY })).toContain("costUsd");
    expect(validateTracePayload({ ...validTrace, spans: [{ name: "Generate", latencyMs: -1 }] })).toContain("span latencyMs");
  });

  it("rejects oversized nested collections and invalid evaluator scores", () => {
    expect(validateTracePayload({ ...validTrace, spans: Array(129).fill(validTrace.spans[0]) })).toContain("at most 128");
    expect(validateTracePayload({ ...validTrace, evalResults: [{ evaluator: "relevance", score: 2 }] })).toContain("score between 0 and 1");
  });

  it("rejects invalid feedback, span types, and retrieval signals", () => {
    expect(validateTracePayload({ ...validTrace, feedback: "positive" })).toContain("feedback");
    expect(validateTracePayload({ ...validTrace, spans: [{ name: "Generate", type: "imaginary" }] })).toContain("span type");
    expect(validateTracePayload({ ...validTrace, retrievalChunks: [{ source: "doc", excerpt: "text", score: 5 }] })).toContain("Retrieval score");
  });
});
