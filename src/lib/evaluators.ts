import type { EvalResult, EvaluatorKey } from "./types";

export interface EvaluatorInput {
  traceId: string;
  answer: string;
  question: string;
  retrievedContext: string[];
  citations: string[];
  expectedToolNames: string[];
  actualToolNames: string[];
  latencyMs: number;
  costUsd: number;
  maxLatencyMs?: number;
  maxCostUsd?: number;
  schemaValid?: boolean;
  safetyFlags?: string[];
}

function clampScore(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

function includesAny(source: string, terms: string[]) {
  const normalized = source.toLowerCase();
  return terms.some((term) => normalized.includes(term.toLowerCase()));
}

function keywordOverlap(a: string, b: string) {
  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "into",
    "your",
    "are",
    "was",
    "were",
  ]);
  const tokenize = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));

  const left = new Set(tokenize(a));
  const right = new Set(tokenize(b));
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let overlap = 0;
  left.forEach((word) => {
    if (right.has(word)) {
      overlap += 1;
    }
  });

  return clampScore(overlap / Math.max(left.size, right.size));
}

export function scoreGroundedness(input: EvaluatorInput) {
  if (input.retrievedContext.length === 0) {
    return 0.35;
  }

  const context = input.retrievedContext.join(" ");
  return clampScore(0.25 + keywordOverlap(input.answer, context) * 0.95);
}

export function scoreRelevance(input: EvaluatorInput) {
  return clampScore(0.35 + keywordOverlap(input.answer, input.question) * 1.1);
}

export function scoreCitationSupport(input: EvaluatorInput) {
  if (input.citations.length === 0) {
    return input.retrievedContext.length > 0 ? 0.25 : 0.8;
  }

  const supported = input.citations.filter((citation) =>
    input.retrievedContext.some((chunk) => includesAny(chunk, [citation])),
  ).length;
  return clampScore(supported / input.citations.length);
}

export function scoreToolCorrectness(input: EvaluatorInput) {
  if (input.expectedToolNames.length === 0) {
    return input.actualToolNames.length === 0 ? 1 : 0.55;
  }

  const usedExpectedTools = input.expectedToolNames.filter((tool) =>
    input.actualToolNames.includes(tool),
  ).length;
  const unexpectedPenalty = Math.max(
    0,
    input.actualToolNames.length - input.expectedToolNames.length,
  );
  return clampScore(
    usedExpectedTools / input.expectedToolNames.length - unexpectedPenalty * 0.15,
  );
}

function toResult(
  traceId: string,
  evaluator: EvaluatorKey,
  score: number,
  notes: string,
  passThreshold = 0.72,
): EvalResult {
  return {
    id: `${traceId}-${evaluator}`,
    traceId,
    evaluator,
    score,
    passed: score >= passThreshold,
    notes,
  };
}

export function runEvaluators(input: EvaluatorInput): EvalResult[] {
  const maxLatency = input.maxLatencyMs ?? 2500;
  const maxCost = input.maxCostUsd ?? 0.08;
  const safetyScore = input.safetyFlags?.length ? 0.4 : 0.98;
  const latencyScore = clampScore(
    1 - Math.max(0, input.latencyMs - maxLatency) / maxLatency,
  );
  const costScore = clampScore(1 - Math.max(0, input.costUsd - maxCost) / maxCost);

  return [
    toResult(
      input.traceId,
      "groundedness",
      scoreGroundedness(input),
      "Checks whether the answer can be supported by retrieved context.",
    ),
    toResult(
      input.traceId,
      "relevance",
      scoreRelevance(input),
      "Measures overlap between the user question and answer content.",
    ),
    toResult(
      input.traceId,
      "citation_support",
      scoreCitationSupport(input),
      "Verifies cited sources appear in the retrieved context.",
    ),
    toResult(
      input.traceId,
      "schema_validity",
      input.schemaValid === false ? 0 : 1,
      "Validates structured output against the expected response schema.",
    ),
    toResult(input.traceId, "safety", safetyScore, "Flags unsafe or toxic output risk."),
    toResult(
      input.traceId,
      "tool_correctness",
      scoreToolCorrectness(input),
      "Checks expected tool calls against actual agent execution.",
    ),
    toResult(input.traceId, "latency", latencyScore, `Budget: ${maxLatency}ms.`),
    toResult(input.traceId, "cost", costScore, `Budget: $${maxCost.toFixed(2)}.`),
  ];
}
