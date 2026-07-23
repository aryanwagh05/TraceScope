import { calculateDashboardMetrics } from "./trace-analytics";
import type { AlertRule, Trace } from "./types";

export interface EvaluatedAlertRule extends AlertRule {
  currentValue: number;
  currentLabel: string;
}

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function percentile(values: number[], percentileValue: number) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function metricValue(metric: string, traces: Trace[]) {
  const evalResults = traces.flatMap((trace) => trace.evalResults);
  const schemaResults = evalResults.filter(
    (result) => result.evaluator === "schema_validity",
  );
  const retrievalChunks = traces.flatMap((trace) => trace.retrievalChunks);

  switch (metric) {
    case "hallucination_risk":
      return average(traces.map((trace) => trace.hallucinationRisk));
    case "latency_p95_ms":
      return percentile(
        traces.map((trace) => trace.latencyMs),
        95,
      );
    case "avg_cost_usd":
      return average(traces.map((trace) => trace.costUsd));
    case "schema_failure_rate":
      return schemaResults.length
        ? schemaResults.filter((result) => !result.passed).length / schemaResults.length
        : 0;
    case "retrieval_quality":
      return average(retrievalChunks.map((chunk) => chunk.score));
    case "error_rate":
      return traces.length
        ? traces.filter((trace) => trace.status === "error").length / traces.length
        : 0;
    case "eval_pass_rate":
      return evalResults.length
        ? evalResults.filter((result) => result.passed).length / evalResults.length
        : 0;
    default:
      return 0;
  }
}

function formatMetric(metric: string, value: number) {
  if (metric.endsWith("_rate") || metric === "hallucination_risk" || metric === "retrieval_quality") {
    return `${Math.round(value * 100)}%`;
  }

  if (metric.endsWith("_usd")) {
    return `$${value.toFixed(3)}`;
  }

  if (metric.endsWith("_ms")) {
    return `${Math.round(value)}ms`;
  }

  return value.toFixed(2);
}

function isTriggered(rule: AlertRule, value: number) {
  const threshold = Number(rule.threshold);
  if (!Number.isFinite(threshold)) {
    return false;
  }

  return rule.operator === "<" ? value < threshold : value > threshold;
}

function isNearThreshold(rule: AlertRule, value: number) {
  const threshold = Number(rule.threshold);
  if (!Number.isFinite(threshold) || threshold === 0) {
    return false;
  }

  if (rule.operator === "<") {
    return value <= threshold * 1.15;
  }

  return value >= threshold * 0.8;
}

export function evaluateAlertRules(
  traces: Trace[],
  rules: AlertRule[],
): EvaluatedAlertRule[] {
  return rules.map((rule) => {
    const currentValue = metricValue(rule.metric, traces);
    const firing = rule.enabled !== false && isTriggered(rule, currentValue);
    const watching = rule.enabled !== false && !firing && isNearThreshold(rule, currentValue);

    return {
      ...rule,
      status: firing ? "firing" : watching ? "watching" : "healthy",
      lastTriggered: firing ? new Date().toLocaleString("en-US") : rule.lastTriggered,
      currentValue,
      currentLabel: formatMetric(rule.metric, currentValue),
    };
  });
}

export function alertMetricOptions() {
  return [
    ["hallucination_risk", "Hallucination risk"],
    ["latency_p95_ms", "Latency p95"],
    ["avg_cost_usd", "Average cost"],
    ["schema_failure_rate", "Schema failure rate"],
    ["retrieval_quality", "Retrieval quality"],
    ["error_rate", "Error rate"],
    ["eval_pass_rate", "Eval pass rate"],
  ] as const;
}

export function summarizeAlertHealth(traces: Trace[]) {
  return calculateDashboardMetrics(traces).map((metric) => ({
    label: metric.label,
    value: metric.value,
  }));
}
