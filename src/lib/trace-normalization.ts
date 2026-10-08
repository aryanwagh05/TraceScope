import {
  calculateTraceEvalScore,
  calculateTraceHallucinationRisk,
  calculateTraceStatus,
  calculateTraceTotals,
} from "./trace-analytics";
import type { EvalResult, RetrievalChunk, Span, Trace } from "./types";

export type TraceInput = Partial<Omit<Trace, "id">> & { id?: string };

function finiteNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nonemptyString(value: unknown, fallback = "") {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export function normalizeTrace(input: TraceInput): Trace {
  const id = nonemptyString(input.id, crypto.randomUUID());
  const spans = (Array.isArray(input.spans) ? input.spans : []).map((span, index) => ({
    id: nonemptyString(span?.id, `${id}-span-${index + 1}`),
    traceId: id,
    name: nonemptyString(span?.name, `Span ${index + 1}`),
    type: span?.type ?? "model",
    status: span?.status ?? "ok",
    latencyMs: finiteNumber(span?.latencyMs),
    tokenCount: finiteNumber(span?.tokenCount),
    costUsd: finiteNumber(span?.costUsd),
    startedAt: nonemptyString(span?.startedAt, new Date().toISOString()),
    metadata: typeof span?.metadata === "object" && span.metadata !== null ? span.metadata : {},
  })) as Span[];
  const retrievalChunks = (Array.isArray(input.retrievalChunks) ? input.retrievalChunks : []).map(
    (chunk, index) => ({
      id: nonemptyString(chunk?.id, `${id}-chunk-${index + 1}`),
      source: nonemptyString(chunk?.source, "unknown-source"),
      score: finiteNumber(chunk?.score),
      cited: Boolean(chunk?.cited),
      excerpt: nonemptyString(chunk?.excerpt),
    }),
  ) as RetrievalChunk[];
  const evalResults = (Array.isArray(input.evalResults) ? input.evalResults : []).map(
    (result, index) => {
      const score = finiteNumber(result?.score);
      return {
        id: nonemptyString(result?.id, `${id}-eval-${index + 1}`),
        traceId: id,
        evaluator: result?.evaluator ?? "relevance",
        score,
        passed: typeof result?.passed === "boolean" ? result.passed : score >= 0.72,
        notes: nonemptyString(result?.notes),
      };
    },
  ) as EvalResult[];
  const totals = calculateTraceTotals({ spans });
  const evalScore = finiteNumber(input.evalScore, calculateTraceEvalScore({ evalResults }));
  const hallucinationRisk = finiteNumber(
    input.hallucinationRisk,
    calculateTraceHallucinationRisk({ evalResults }),
  );
  const trace: Trace = {
    id,
    gatewayLogId: input.gatewayLogId,
    gatewayId: input.gatewayId,
    costKnown: input.costKnown,
    tokenCountKnown: input.tokenCountKnown,
    app: nonemptyString(input.app, "Unassigned App"),
    environment: input.environment ?? "dev",
    model: nonemptyString(input.model, "unknown-model"),
    latencyMs: finiteNumber(input.latencyMs, totals.latencyMs),
    costUsd: finiteNumber(input.costUsd, totals.costUsd),
    tokenCount: finiteNumber(input.tokenCount, totals.tokenCount),
    status: input.status ?? "ok",
    evalScore,
    hallucinationRisk,
    timestamp: nonemptyString(input.timestamp, new Date().toISOString()),
    tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
    userInput: nonemptyString(input.userInput),
    systemPrompt: nonemptyString(input.systemPrompt),
    finalResponse: nonemptyString(input.finalResponse),
    spans,
    retrievalChunks,
    evalResults,
    feedback: input.feedback ?? "none",
  };
  return { ...trace, status: input.status ?? calculateTraceStatus(trace) };
}
