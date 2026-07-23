import {
  formatCompactNumber,
  formatCurrency,
  formatMs,
  formatPercent,
} from "./format";
import type { EvaluatorKey, Trace } from "./types";

export interface DashboardMetric {
  label: string;
  value: string;
  delta: string;
  detail: string;
}

export interface TrafficPoint {
  time: string;
  latency: number;
  cost: number;
  passRate: number;
}

export interface ModelCostPoint {
  model: string;
  cost: number;
  requests: number;
}

export interface EvaluatorBreakdownPoint {
  name: string;
  pass: number;
  fail: number;
}

export interface RiskBuckets {
  low: number;
  medium: number;
  high: number;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function titleCaseEvaluator(evaluator: EvaluatorKey) {
  return evaluator
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getRiskLabel(score: number) {
  if (score < 0.15) {
    return "low";
  }

  if (score < 0.32) {
    return "medium";
  }

  return "high";
}

export function calculateRiskBuckets(traces: Trace[]): RiskBuckets {
  return traces.reduce<RiskBuckets>(
    (buckets, trace) => {
      buckets[getRiskLabel(trace.hallucinationRisk)] += 1;
      return buckets;
    },
    { low: 0, medium: 0, high: 0 },
  );
}

export function calculateDashboardMetrics(traces: Trace[]): DashboardMetric[] {
  const totalRequests = traces.length;
  const totalCost = traces.reduce((sum, trace) => sum + trace.costUsd, 0);
  const avgLatency = average(traces.map((trace) => trace.latencyMs));
  const p95Latency = percentile(
    traces.map((trace) => trace.latencyMs),
    95,
  );
  const errorCount = traces.filter((trace) => trace.status === "error").length;
  const allEvalResults = traces.flatMap((trace) => trace.evalResults);
  const passedEvalResults = allEvalResults.filter((result) => result.passed).length;
  const avgRisk = average(traces.map((trace) => trace.hallucinationRisk));
  const riskBuckets = calculateRiskBuckets(traces);

  return [
    {
      label: "Total requests",
      value: formatCompactNumber(totalRequests),
      delta: "live",
      detail: `${totalRequests} persisted trace${totalRequests === 1 ? "" : "s"}`,
    },
    {
      label: "Avg latency",
      value: formatMs(Math.round(avgLatency)),
      delta: "computed",
      detail: `p95 at ${formatMs(Math.round(p95Latency))}`,
    },
    {
      label: "Token cost",
      value: formatCurrency(totalCost),
      delta: "computed",
      detail: `${formatCurrency(totalRequests ? totalCost / totalRequests : 0)} avg request`,
    },
    {
      label: "Error rate",
      value: formatPercent(totalRequests ? errorCount / totalRequests : 0),
      delta: "computed",
      detail: `${errorCount} error trace${errorCount === 1 ? "" : "s"}`,
    },
    {
      label: "Eval pass rate",
      value: formatPercent(
        allEvalResults.length ? passedEvalResults / allEvalResults.length : 0,
      ),
      delta: "computed",
      detail: `${passedEvalResults}/${allEvalResults.length} eval checks`,
    },
    {
      label: "Hallucination risk",
      value: formatPercent(avgRisk),
      delta: "computed",
      detail: `${riskBuckets.medium + riskBuckets.high} medium/high traces`,
    },
  ];
}

export function calculateTrafficSeries(traces: Trace[]): TrafficPoint[] {
  const buckets = new Map<
    string,
    { latency: number[]; cost: number; passRate: number[] }
  >();

  traces.forEach((trace) => {
    const date = new Date(trace.timestamp);
    const hour = date.getHours();
    const bucketHour = Math.floor(hour / 4) * 4;
    const label = `${bucketHour.toString().padStart(2, "0")}:00`;
    const bucket = buckets.get(label) ?? { latency: [], cost: 0, passRate: [] };
    bucket.latency.push(trace.latencyMs);
    bucket.cost += trace.costUsd;
    bucket.passRate.push(trace.evalScore * 100);
    buckets.set(label, bucket);
  });

  return [...buckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([time, bucket]) => ({
      time,
      latency: Math.round(average(bucket.latency)),
      cost: Number(bucket.cost.toFixed(3)),
      passRate: Math.round(average(bucket.passRate)),
    }));
}

export function calculateModelCostBreakdown(traces: Trace[]): ModelCostPoint[] {
  const buckets = new Map<string, ModelCostPoint>();

  traces.forEach((trace) => {
    const bucket = buckets.get(trace.model) ?? {
      model: trace.model,
      cost: 0,
      requests: 0,
    };
    bucket.cost = Number((bucket.cost + trace.costUsd).toFixed(3));
    bucket.requests += 1;
    buckets.set(trace.model, bucket);
  });

  return [...buckets.values()].sort((a, b) => b.cost - a.cost);
}

export function calculateEvaluatorBreakdown(
  traces: Trace[],
): EvaluatorBreakdownPoint[] {
  const buckets = new Map<EvaluatorKey, { pass: number; fail: number }>();

  traces.flatMap((trace) => trace.evalResults).forEach((result) => {
    const bucket = buckets.get(result.evaluator) ?? { pass: 0, fail: 0 };
    if (result.passed) {
      bucket.pass += 1;
    } else {
      bucket.fail += 1;
    }
    buckets.set(result.evaluator, bucket);
  });

  return [...buckets.entries()].map(([evaluator, bucket]) => ({
    name: titleCaseEvaluator(evaluator),
    pass: bucket.pass,
    fail: bucket.fail,
  }));
}

export function calculateTraceStatus(trace: Pick<Trace, "evalScore" | "spans">) {
  if (trace.spans.some((span) => span.status === "error") || trace.evalScore < 0.6) {
    return "error";
  }

  if (trace.spans.some((span) => span.status === "warning") || trace.evalScore < 0.78) {
    return "warning";
  }

  return "ok";
}

export function calculateTraceEvalScore(trace: Pick<Trace, "evalResults">) {
  return average(trace.evalResults.map((result) => result.score));
}

export function calculateTraceHallucinationRisk(trace: Pick<Trace, "evalResults">) {
  const groundedness = trace.evalResults.find(
    (result) => result.evaluator === "groundedness",
  );
  const citationSupport = trace.evalResults.find(
    (result) => result.evaluator === "citation_support",
  );

  if (!groundedness && !citationSupport) {
    return 0;
  }

  return Number(
    average([
      groundedness ? 1 - groundedness.score : 0,
      citationSupport ? 1 - citationSupport.score : 0,
    ]).toFixed(2),
  );
}

export function calculateTraceTotals(trace: Pick<Trace, "spans">) {
  return trace.spans.reduce(
    (totals, span) => ({
      latencyMs: totals.latencyMs + span.latencyMs,
      costUsd: Number((totals.costUsd + span.costUsd).toFixed(4)),
      tokenCount: totals.tokenCount + span.tokenCount,
    }),
    { latencyMs: 0, costUsd: 0, tokenCount: 0 },
  );
}
