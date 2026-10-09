import { describe, expect, it } from "vitest";
import { evaluateAlertRules } from "./alert-engine";
import { seedTraces } from "./demo-data";
import { runEvalSuite, suggestEvalCasesFromTraces } from "./eval-suite";
import { compareModels, modelOptions } from "./experiment-analytics";
import { filterTraces } from "./trace-filters";
import type { AlertRule, EvalDatasetCase } from "./types";

describe("functional page engines", () => {
  it("evaluates alert rules against trace metrics", () => {
    const rules: AlertRule[] = [
      {
        id: "rule-risk",
        name: "Risk high",
        metric: "hallucination_risk",
        operator: ">",
        threshold: "0.1",
        severity: "warning",
        status: "healthy",
        lastTriggered: "Never",
      },
    ];

    expect(evaluateAlertRules(seedTraces, rules)[0].status).toBe("firing");
  });

  it("suggests dataset cases from failed traces", () => {
    const suggestions = suggestEvalCasesFromTraces(seedTraces, []);

    expect(suggestions.some((suggestion) => suggestion.trace.id === "tr-1031")).toBe(true);
  });

  it("does not pass a promoted failure against its own source trace", () => {
    const cases: EvalDatasetCase[] = [
      {
        id: "case-contract",
        area: "Document Q&A",
        input: "What service credits are available if uptime drops below 99.9 percent?",
        expectedSignals: ["unsupported claim"],
        promotedFromTrace: "tr-1031",
        createdAt: "2026-07-23T09:00:00Z",
      },
    ];

    const run = runEvalSuite(cases, seedTraces);
    expect(run.caseCount).toBe(1);
    expect(run.matchedTraceCount).toBe(0);
    expect(run.results[0].passed).toBe(false);
    expect(run.results[0].notes).toContain("No newer comparable trace");
  });

  it("checks explicit signals on a later comparable trace", () => {
    const source = seedTraces.find((trace) => trace.id === "tr-1031")!;
    const later = {
      ...source,
      id: "tr-2031",
      timestamp: "2026-07-24T08:14:48Z",
      finalResponse: "The SLA addendum specifies the available service credit.",
      evalScore: 0.95,
    };
    const testCase: EvalDatasetCase = {
      id: "case-contract",
      area: "Document Q&A",
      input: source.userInput,
      expectedSignals: ["SLA addendum"],
      promotedFromTrace: source.id,
      createdAt: "2026-07-23T09:00:00Z",
    };

    const passing = runEvalSuite([testCase], [source, later]);
    expect(passing.matchedTraceCount).toBe(1);
    expect(passing.results[0].traceId).toBe(later.id);
    expect(passing.results[0].passed).toBe(true);

    const failing = runEvalSuite([{ ...testCase, expectedSignals: ["citation missing"] }], [source, later]);
    expect(failing.results[0].passed).toBe(false);
  });

  it("compares real model cohorts", () => {
    const models = modelOptions(seedTraces);
    const comparison = compareModels(seedTraces, models[0], models[1]);

    expect(comparison).not.toBeNull();
    expect(comparison?.control.traceCount).toBeGreaterThan(0);
    expect(comparison?.variant.traceCount).toBeGreaterThan(0);
  });

  it("filters traces by query, model, status, environment, and tag", () => {
    const [match] = filterTraces(seedTraces, {
      query: "service credits",
      model: "gpt-5.6-sol",
      status: "error",
      environment: "prod",
      tag: "rag",
    });

    expect(match.id).toBe("tr-1031");
  });
});
