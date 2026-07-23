import { describe, expect, it } from "vitest";
import {
  runEvaluators,
  scoreCitationSupport,
  scoreGroundedness,
  scoreToolCorrectness,
} from "./evaluators";

const baseInput = {
  traceId: "trace-test",
  answer:
    "The refund policy allows a full refund inside 30 days when the order is unopened.",
  question: "Can a customer get a refund for an unopened order within 30 days?",
  retrievedContext: [
    "Refund policy: unopened orders are eligible for a full refund inside 30 days.",
  ],
  citations: ["Refund policy"],
  expectedToolNames: ["lookup_policy"],
  actualToolNames: ["lookup_policy"],
  latencyMs: 1200,
  costUsd: 0.03,
};

describe("TraceScope evaluators", () => {
  it("scores grounded answers higher when retrieved context supports them", () => {
    expect(scoreGroundedness(baseInput)).toBeGreaterThan(0.7);
  });

  it("penalizes missing citation support", () => {
    expect(
      scoreCitationSupport({
        ...baseInput,
        citations: ["unknown-source"],
      }),
    ).toBeLessThan(0.5);
  });

  it("detects expected tool calls", () => {
    expect(scoreToolCorrectness(baseInput)).toBe(1);
    expect(
      scoreToolCorrectness({
        ...baseInput,
        actualToolNames: ["charge_card"],
      }),
    ).toBeLessThan(0.5);
  });

  it("returns all evaluator dimensions for regression gates", () => {
    const results = runEvaluators(baseInput);
    expect(results).toHaveLength(8);
    expect(results.every((result) => result.traceId === "trace-test")).toBe(true);
  });
});
