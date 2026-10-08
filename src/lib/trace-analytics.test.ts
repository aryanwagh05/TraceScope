import { describe, expect, it } from "vitest";
import { seedTraces } from "./demo-data";
import { formatCurrency } from "./format";
import { normalizeTrace } from "./trace-normalization";
import {
  calculateDashboardMetrics,
  calculateEvaluatorBreakdown,
  calculateModelCostBreakdown,
  calculateRiskBuckets,
  calculateTrafficSeries,
  calculateTraceTotals,
} from "./trace-analytics";

describe("trace analytics", () => {
  it("calculates dashboard metrics from traces", () => {
    const metrics = calculateDashboardMetrics(seedTraces);

    expect(metrics.find((metric) => metric.label === "Total requests")?.value).toBe("4");
    expect(metrics.find((metric) => metric.label === "Error rate")?.value).toBe("25%");
  });

  it("groups model cost from trace records", () => {
    const breakdown = calculateModelCostBreakdown(seedTraces);

    expect(breakdown[0]).toMatchObject({
      model: "gpt-5.6-sol",
      requests: 2,
    });
  });

  it("keeps small reported costs visible through totals and charts", () => {
    const trace = {
      ...seedTraces[0],
      costUsd: 0.000013,
      costKnown: true,
      spans: [{ ...seedTraces[0].spans[0], costUsd: 0.000013 }],
    };

    expect(formatCurrency(trace.costUsd)).toBe("$0.000013");
    expect(calculateTraceTotals(trace).costUsd).toBe(0.000013);
    expect(calculateModelCostBreakdown([trace])[0].cost).toBe(0.000013);
    expect(calculateTrafficSeries([trace])[0].cost).toBe(0.000013);
    expect(calculateDashboardMetrics([trace]).find((metric) => metric.label === "Token cost")?.value)
      .toBe("$0.000013");
  });

  it("groups traffic by timestamp buckets", () => {
    const series = calculateTrafficSeries(seedTraces);

    expect(series.length).toBeGreaterThan(0);
    expect(series.every((point) => point.time.endsWith(":00"))).toBe(true);
  });

  it("counts evaluator pass and fail results", () => {
    const breakdown = calculateEvaluatorBreakdown(seedTraces);
    const groundedness = breakdown.find((point) => point.name === "Groundedness");

    expect(groundedness).toMatchObject({ pass: 2, fail: 1 });
  });

  it("counts hallucination risk buckets", () => {
    expect(calculateRiskBuckets(seedTraces)).toEqual({
      low: 2,
      medium: 1,
      high: 1,
    });
  });

  it("does not turn missing provider and retrieval evidence into zero-valued metrics", () => {
    const trace = normalizeTrace({
      id: "unknown-metrics",
      app: "example",
      model: "example-model",
      userInput: "Question",
      finalResponse: "Answer",
    });
    const metrics = calculateDashboardMetrics([trace]);

    expect(trace.status).toBe("ok");
    expect(trace.costKnown).toBe(false);
    expect(trace.latencyKnown).toBe(false);
    expect(trace.tokenCountKnown).toBe(false);
    expect(trace.evalScoreKnown).toBe(false);
    expect(trace.hallucinationRiskKnown).toBe(false);
    expect(metrics.find((metric) => metric.label === "Token cost")?.value).toBe("n/a");
    expect(metrics.find((metric) => metric.label === "Avg latency")?.value).toBe("n/a");
    expect(metrics.find((metric) => metric.label === "Eval pass rate")?.value).toBe("n/a");
    expect(metrics.find((metric) => metric.label === "Hallucination risk")?.value).toBe("n/a");
    expect(calculateRiskBuckets([trace])).toEqual({ low: 0, medium: 0, high: 0 });
  });
});
