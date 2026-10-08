import type { Trace } from "./types";

export interface CohortSummary {
  key: string;
  label: string;
  traceCount: number;
  quality: number;
  qualitySampleCount: number;
  avgCost: number;
  costSampleCount: number;
  avgLatency: number;
  latencySampleCount: number;
  failures: Trace[];
}

export interface ModelExperimentComparison {
  control: CohortSummary;
  variant: CohortSummary;
  qualityDelta: number | null;
  costDelta: number | null;
  latencyDelta: number | null;
  recommendation: string;
}

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function summarize(key: string, traces: Trace[]): CohortSummary {
  const costed = traces.filter((trace) => trace.costKnown !== false);
  const timed = traces.filter((trace) => trace.latencyKnown !== false);
  const evaluated = traces.filter((trace) => trace.evalScoreKnown !== false);
  return {
    key,
    label: key,
    traceCount: traces.length,
    quality: average(evaluated.map((trace) => trace.evalScore)),
    qualitySampleCount: evaluated.length,
    avgCost: average(costed.map((trace) => trace.costUsd)),
    costSampleCount: costed.length,
    avgLatency: average(timed.map((trace) => trace.latencyMs)),
    latencySampleCount: timed.length,
    failures: traces
      .filter((trace) => trace.status !== "ok" || (trace.evalScoreKnown !== false && trace.evalScore < 0.72))
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
  const qualityDelta = control.qualitySampleCount && variant.qualitySampleCount
    ? percentDelta(control.quality, variant.quality) : null;
  const costDelta = control.costSampleCount && variant.costSampleCount
    ? percentDelta(control.avgCost, variant.avgCost)
    : null;
  const latencyDelta = control.latencySampleCount && variant.latencySampleCount
    ? percentDelta(control.avgLatency, variant.avgLatency) : null;
  const recommendation =
    costDelta !== null && qualityDelta !== null && qualityDelta >= -2 && costDelta < 0
      ? `Use ${variantModel} for this workload. Quality is comparable and average cost is lower.`
      : qualityDelta !== null && qualityDelta > 3
        ? `Use ${variantModel} where quality matters most; monitor cost and latency.`
        : `Keep ${controlModel} as the baseline until ${variantModel} has stronger observed quality and cost evidence.`;

  return {
    control,
    variant,
    qualityDelta,
    costDelta,
    latencyDelta,
    recommendation,
  };
}
