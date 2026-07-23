import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { seedTraces } from "./demo-data";
import {
  calculateTraceEvalScore,
  calculateTraceHallucinationRisk,
  calculateTraceStatus,
  calculateTraceTotals,
} from "./trace-analytics";
import type { EvalResult, RetrievalChunk, Span, Trace } from "./types";

type TraceInput = Partial<Omit<Trace, "id">> & { id?: string };

const dataDir = path.join(process.cwd(), "data");
const tracesPath = path.join(dataDir, "traces.json");

async function readPersistedTraces() {
  try {
    const raw = await readFile(tracesPath, "utf8");
    const parsed = JSON.parse(raw) as Trace[];
    return Array.isArray(parsed) ? parsed : seedTraces;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return seedTraces;
    }

    throw error;
  }
}

async function writePersistedTraces(traces: Trace[]) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(tracesPath, `${JSON.stringify(traces, null, 2)}\n`, "utf8");
}

function numericValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function normalizeSpans(traceId: string, spans: unknown): Span[] {
  if (!Array.isArray(spans)) {
    return [];
  }

  return spans.map((span, index) => ({
    id: stringValue(span?.id, `${traceId}-span-${index + 1}`),
    traceId,
    name: stringValue(span?.name, `Span ${index + 1}`),
    type: span?.type ?? "model",
    status: span?.status ?? "ok",
    latencyMs: numericValue(span?.latencyMs),
    tokenCount: numericValue(span?.tokenCount),
    costUsd: numericValue(span?.costUsd),
    startedAt: stringValue(span?.startedAt, new Date().toISOString()),
    metadata:
      typeof span?.metadata === "object" && span.metadata !== null ? span.metadata : {},
  })) as Span[];
}

function normalizeRetrievalChunks(traceId: string, chunks: unknown): RetrievalChunk[] {
  if (!Array.isArray(chunks)) {
    return [];
  }

  return chunks.map((chunk, index) => ({
    id: stringValue(chunk?.id, `${traceId}-chunk-${index + 1}`),
    source: stringValue(chunk?.source, "unknown-source"),
    score: numericValue(chunk?.score),
    cited: Boolean(chunk?.cited),
    excerpt: stringValue(chunk?.excerpt, ""),
  }));
}

function normalizeEvalResults(traceId: string, results: unknown): EvalResult[] {
  if (!Array.isArray(results)) {
    return [];
  }

  return results.map((result, index) => {
    const score = numericValue(result?.score);
    return {
      id: stringValue(result?.id, `${traceId}-eval-${index + 1}`),
      traceId,
      evaluator: result?.evaluator ?? "relevance",
      score,
      passed:
        typeof result?.passed === "boolean" ? result.passed : score >= 0.72,
      notes: stringValue(result?.notes, ""),
    };
  }) as EvalResult[];
}

function normalizeTrace(input: TraceInput): Trace {
  const traceId = stringValue(input.id, `tr-${Date.now().toString(36)}`);
  const spans = normalizeSpans(traceId, input.spans);
  const retrievalChunks = normalizeRetrievalChunks(traceId, input.retrievalChunks);
  const evalResults = normalizeEvalResults(traceId, input.evalResults);
  const totals = calculateTraceTotals({ spans });
  const evalScore =
    typeof input.evalScore === "number"
      ? input.evalScore
      : calculateTraceEvalScore({ evalResults });
  const hallucinationRisk =
    typeof input.hallucinationRisk === "number"
      ? input.hallucinationRisk
      : calculateTraceHallucinationRisk({ evalResults });

  const trace: Trace = {
    id: traceId,
    app: stringValue(input.app, "Unassigned App"),
    environment: input.environment ?? "dev",
    model: stringValue(input.model, "unknown-model"),
    latencyMs: numericValue(input.latencyMs, totals.latencyMs),
    costUsd: numericValue(input.costUsd, totals.costUsd),
    tokenCount: numericValue(input.tokenCount, totals.tokenCount),
    status: input.status ?? "ok",
    evalScore,
    hallucinationRisk,
    timestamp: stringValue(input.timestamp, new Date().toISOString()),
    tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
    userInput: stringValue(input.userInput, ""),
    systemPrompt: stringValue(input.systemPrompt, ""),
    finalResponse: stringValue(input.finalResponse, ""),
    spans,
    retrievalChunks,
    evalResults,
    feedback: input.feedback ?? "none",
  };

  return {
    ...trace,
    status: input.status ?? calculateTraceStatus(trace),
  };
}

export async function listTraces() {
  const traces = await readPersistedTraces();
  return [...traces].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export async function getTraceById(id: string) {
  const traces = await listTraces();
  return traces.find((trace) => trace.id === id);
}

export async function appendTrace(input: TraceInput) {
  const traces = await listTraces();
  const trace = normalizeTrace(input);
  const nextTraces = [trace, ...traces.filter((existing) => existing.id !== trace.id)];

  await writePersistedTraces(nextTraces);
  return trace;
}

export async function resetTraceStore() {
  await writePersistedTraces(seedTraces);
  return seedTraces;
}
