import type { Trace } from "./types";

export interface CohortSummary {
  key: string;
  label: string;
  traceCount: number;
  quality: number;
  avgCost: number;
  avgLatency: number;
  failures: Trace[];
}

export interface ModelExperimentComparison {
  control: CohortSummary;
  variant: CohortSummary;
  qualityDelta: number;
  costDelta: number;
  latencyDelta: number;
  recommendation: string;
}

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function summarize(key: string, traces: Trace[]): CohortSummary {
  return {
    key,
    label: key,
    traceCount: traces.length,
    quality: average(traces.map((trace) => trace.evalScore)),
    avgCost: average(traces.map((trace) => trace.costUsd)),
    avgLatency: average(traces.map((trace) => trace.latencyMs)),
    failures: traces
      .filter((trace) => trace.status !== "ok" || trace.evalScore < 0.72)
      .slice(0, 3),
  };
}

function percentDelta(control: number, variant: number) {
  if (control === 0) {
    return variant === 0 ? 0 : 100;
  }

  return Number((((variant - control) / control) * 100).toFixed(1));
}

export function modelOptions(traces: Trace[]) {
  return [...new Set(traces.map((trace) => trace.model))].sort();
}

export function compareModels(
  traces: Trace[],
  controlModel: string,
  variantModel: string,
): ModelExperimentComparison | null {
  const controlTraces = traces.filter((trace) => trace.model === controlModel);
  const variantTraces = traces.filter((trace) => trace.model === variantModel);

  if (!controlTraces.length || !variantTraces.length) {
    return null;
  }

  const control = summarize(controlModel, controlTraces);
  const variant = summarize(variantModel, variantTraces);
  const qualityDelta = percentDelta(control.quality, variant.quality);
  const costDelta = percentDelta(control.avgCost, variant.avgCost);
  const latencyDelta = percentDelta(control.avgLatency, variant.avgLatency);
  const recommendation =
    qualityDelta >= -2 && costDelta < 0
      ? `Use ${variantModel} for this workload. Quality is comparable and average cost is lower.`
      : qualityDelta > 3
        ? `Use ${variantModel} where quality matters most; monitor cost and latency.`
        : `Keep ${controlModel} as the baseline until ${variantModel} has stronger quality or cost evidence.`;

  return {
    control,
    variant,
    qualityDelta,
    costDelta,
    latencyDelta,
    recommendation,
  };
}
