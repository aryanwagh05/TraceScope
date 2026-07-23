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

  it("runs dataset cases against matching traces", () => {
    const cases: EvalDatasetCase[] = [
      {
        id: "case-contract",
        area: "Document Q&A",
        input: "What service credits are available if uptime drops below 99.9 percent?",
        expectedSignals: ["unsupported claim"],
        promotedFromTrace: "tr-1031",
      },
    ];

    const run = runEvalSuite(cases, seedTraces);
    expect(run.caseCount).toBe(1);
    expect(run.matchedTraceCount).toBe(1);
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
