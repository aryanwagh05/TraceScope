import { describe, expect, it } from "vitest";
import { seedTraces } from "./demo-data";
import {
  calculateDashboardMetrics,
  calculateEvaluatorBreakdown,
  calculateModelCostBreakdown,
  calculateRiskBuckets,
  calculateTrafficSeries,
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
});
