import type {
  AlertRule,
  EvalDatasetCase,
  EvalResult,
  ExperimentResult,
  RetrievalChunk,
  Span,
  Trace,
  TraceStatus,
} from "./types";

function span(
  traceId: string,
  id: string,
  name: string,
  type: Span["type"],
  status: TraceStatus,
  latencyMs: number,
  tokenCount: number,
  costUsd: number,
  metadata: Span["metadata"] = {},
): Span {
  return {
    id,
    traceId,
    name,
    type,
    status,
    latencyMs,
    tokenCount,
    costUsd,
    startedAt: "2026-07-23T10:11:00Z",
    metadata,
  };
}

function evalResult(
  traceId: string,
  evaluator: EvalResult["evaluator"],
  score: number,
  notes: string,
): EvalResult {
  return {
    id: `${traceId}-${evaluator}`,
    traceId,
    evaluator,
    score,
    passed: score >= 0.72,
    notes,
  };
}

const chunks: Record<string, RetrievalChunk[]> = {
  "tr-1008": [
    {
      id: "chunk-refunds",
      source: "support/refunds.md",
      score: 0.91,
      cited: true,
      excerpt:
        "Unopened devices can be returned for a full refund within 30 days. Opened devices require manager review.",
    },
    {
      id: "chunk-warranty",
      source: "support/warranty.md",
      score: 0.74,
      cited: false,
      excerpt:
        "Warranty replacement applies to defective accessories inside the first year.",
    },
  ],
  "tr-1014": [
    {
      id: "chunk-agent",
      source: "runbooks/coding-agent.md",
      score: 0.86,
      cited: true,
      excerpt:
        "The agent must call repo.search before editing files and attach a patch summary to the final response.",
    },
  ],
  "tr-1031": [
    {
      id: "chunk-contract",
      source: "contracts/acme-msa.pdf",
      score: 0.68,
      cited: false,
      excerpt:
        "The service credit clause applies only when monthly uptime falls below 99.5 percent.",
    },
    {
      id: "chunk-sla",
      source: "contracts/sla-addendum.pdf",
      score: 0.61,
      cited: false,
      excerpt:
        "Critical support tickets receive a four hour first response target.",
    },
  ],
  "tr-1080": [
    {
      id: "chunk-schema",
      source: "docs/api-json-mode.md",
      score: 0.88,
      cited: true,
      excerpt:
        "Responses must include summary, confidence, citations, and follow_up_actions fields.",
    },
  ],
};

export const seedTraces: Trace[] = [
  {
    id: "tr-1008",
    app: "RAG Support Bot",
    environment: "prod",
    model: "gpt-5.6-sol",
    latencyMs: 1180,
    costUsd: 0.042,
    tokenCount: 3110,
    status: "ok",
    evalScore: 0.91,
    hallucinationRisk: 0.08,
    timestamp: "2026-07-23T10:11:32Z",
    tags: ["rag", "refunds", "customer-support"],
    userInput: "Can I return an unopened device I bought 24 days ago?",
    systemPrompt:
      "Answer from the support knowledge base. Cite policy sources and flag missing context.",
    finalResponse:
      "Yes. Unopened devices are eligible for a full refund within 30 days, so a purchase from 24 days ago qualifies under the refund policy.",
    spans: [
      span("tr-1008", "s1", "Capture user message", "input", "ok", 20, 28, 0),
      span("tr-1008", "s2", "Embed query", "retrieval", "ok", 84, 46, 0.002),
      span("tr-1008", "s3", "Retrieve policy chunks", "retrieval", "ok", 148, 412, 0.004),
      span("tr-1008", "s4", "Rerank sources", "rerank", "ok", 96, 210, 0.003),
      span("tr-1008", "s5", "Generate answer", "model", "ok", 611, 2224, 0.029),
      span("tr-1008", "s6", "Groundedness eval", "eval", "ok", 221, 190, 0.004),
    ],
    retrievalChunks: chunks["tr-1008"],
    evalResults: [
      evalResult("tr-1008", "groundedness", 0.94, "All policy claims are grounded."),
      evalResult("tr-1008", "relevance", 0.92, "Answer directly resolves the refund question."),
      evalResult("tr-1008", "citation_support", 0.9, "Primary refund source cited."),
      evalResult("tr-1008", "schema_validity", 1, "Response schema matched."),
      evalResult("tr-1008", "safety", 0.99, "No safety concern."),
      evalResult("tr-1008", "tool_correctness", 0.86, "Retrieval sequence was correct."),
      evalResult("tr-1008", "latency", 0.95, "Under latency budget."),
      evalResult("tr-1008", "cost", 0.93, "Under cost budget."),
    ],
    feedback: "good",
  },
  {
    id: "tr-1014",
    app: "AI Coding Assistant",
    environment: "staging",
    model: "gpt-5.4-codex",
    latencyMs: 2460,
    costUsd: 0.077,
    tokenCount: 7140,
    status: "warning",
    evalScore: 0.78,
    hallucinationRisk: 0.18,
    timestamp: "2026-07-23T09:48:02Z",
    tags: ["agent", "tool-call", "code-review"],
    userInput: "Patch the failing evaluator test and explain the root cause.",
    systemPrompt:
      "Inspect repository context before editing and preserve user changes.",
    finalResponse:
      "The evaluator failed because citation matching compared exact IDs against prose. I normalized citation labels and added regression coverage.",
    spans: [
      span("tr-1014", "s1", "Capture task", "input", "ok", 18, 36, 0),
      span("tr-1014", "s2", "Search repository", "tool", "ok", 410, 620, 0.003, {
        tool: "repo.search",
      }),
      span("tr-1014", "s3", "Read evaluator module", "tool", "ok", 525, 990, 0.004, {
        tool: "file.read",
      }),
      span("tr-1014", "s4", "Plan patch", "model", "ok", 610, 2130, 0.023),
      span("tr-1014", "s5", "Apply patch", "tool", "ok", 460, 1180, 0.004, {
        tool: "apply_patch",
      }),
      span("tr-1014", "s6", "Run tests", "tool", "warning", 437, 140, 0.001, {
        failedOnce: true,
      }),
    ],
    retrievalChunks: chunks["tr-1014"],
    evalResults: [
      evalResult("tr-1014", "groundedness", 0.8, "Patch summary matched repo evidence."),
      evalResult("tr-1014", "relevance", 0.86, "Root cause was explained."),
      evalResult("tr-1014", "tool_correctness", 0.76, "Correct tools used after one retry."),
      evalResult("tr-1014", "latency", 0.7, "Near latency budget."),
      evalResult("tr-1014", "cost", 0.72, "Cost was acceptable but high."),
    ],
    feedback: "none",
  },
  {
    id: "tr-1031",
    app: "Document Q&A",
    environment: "prod",
    model: "gpt-5.6-sol",
    latencyMs: 3220,
    costUsd: 0.096,
    tokenCount: 9410,
    status: "error",
    evalScore: 0.58,
    hallucinationRisk: 0.44,
    timestamp: "2026-07-23T08:14:48Z",
    tags: ["rag", "legal-docs", "unsupported-claim"],
    userInput: "What service credits are available if uptime drops below 99.9 percent?",
    systemPrompt:
      "Answer from contract sources only. Warn when contract language is ambiguous.",
    finalResponse:
      "The customer receives a 10 percent monthly service credit below 99.9 percent uptime.",
    spans: [
      span("tr-1031", "s1", "Capture question", "input", "ok", 22, 34, 0),
      span("tr-1031", "s2", "Retrieve contract text", "retrieval", "warning", 782, 2200, 0.009),
      span("tr-1031", "s3", "Generate answer", "model", "warning", 1210, 5560, 0.058),
      span("tr-1031", "s4", "Citation validator", "validation", "error", 420, 480, 0.004),
      span("tr-1031", "s5", "Groundedness eval", "eval", "error", 786, 640, 0.011),
    ],
    retrievalChunks: chunks["tr-1031"],
    evalResults: [
      evalResult("tr-1031", "groundedness", 0.42, "99.9 percent threshold was unsupported."),
      evalResult("tr-1031", "citation_support", 0.38, "Claim did not cite the SLA addendum."),
      evalResult("tr-1031", "relevance", 0.74, "Answer addressed the right topic."),
      evalResult("tr-1031", "latency", 0.44, "Over production latency budget."),
      evalResult("tr-1031", "cost", 0.52, "High context window cost."),
    ],
    feedback: "bad",
  },
  {
    id: "tr-1080",
    app: "Tool Agent",
    environment: "dev",
    model: "gpt-5.4-mini",
    latencyMs: 910,
    costUsd: 0.014,
    tokenCount: 1880,
    status: "ok",
    evalScore: 0.88,
    hallucinationRisk: 0.11,
    timestamp: "2026-07-22T22:35:15Z",
    tags: ["json", "schema", "tool-agent"],
    userInput: "Summarize this incident and return structured follow-up actions.",
    systemPrompt:
      "Return strict JSON with summary, confidence, citations, and follow_up_actions.",
    finalResponse:
      "{\"summary\":\"Payment retries spiked after gateway timeout errors.\",\"confidence\":0.82,\"citations\":[\"incident-441\"],\"follow_up_actions\":[\"Inspect gateway timeout rate\",\"Replay failed retries\"]}",
    spans: [
      span("tr-1080", "s1", "Capture incident", "input", "ok", 15, 58, 0),
      span("tr-1080", "s2", "Fetch incident timeline", "tool", "ok", 204, 430, 0.001, {
        tool: "incident.timeline",
      }),
      span("tr-1080", "s3", "Generate structured output", "model", "ok", 388, 1190, 0.009),
      span("tr-1080", "s4", "Validate JSON schema", "validation", "ok", 42, 22, 0),
      span("tr-1080", "s5", "Cost threshold eval", "eval", "ok", 88, 180, 0.002),
    ],
    retrievalChunks: chunks["tr-1080"],
    evalResults: [
      evalResult("tr-1080", "schema_validity", 1, "Strict JSON matched the schema."),
      evalResult("tr-1080", "tool_correctness", 0.91, "Expected incident tool was called."),
      evalResult("tr-1080", "latency", 0.98, "Fast response."),
      evalResult("tr-1080", "cost", 0.97, "Low-cost model worked well."),
    ],
    feedback: "good",
  },
];

export const alerts: AlertRule[] = [
  {
    id: "al-1",
    name: "Hallucination risk spike",
    metric: "groundedness_fail_rate",
    threshold: "> 12% for 15 minutes",
    severity: "critical",
    status: "watching",
    lastTriggered: "2026-07-23 08:17",
  },
  {
    id: "al-2",
    name: "JSON schema failure rate",
    metric: "schema_invalid_rate",
    threshold: "> 5% for 10 minutes",
    severity: "warning",
    status: "healthy",
    lastTriggered: "2026-07-22 17:04",
  },
  {
    id: "al-3",
    name: "Cost per request",
    metric: "avg_cost_usd",
    threshold: "> $0.08 over 1 hour",
    severity: "warning",
    status: "firing",
    lastTriggered: "2026-07-23 10:03",
  },
  {
    id: "al-4",
    name: "Retrieval quality drop",
    metric: "avg_chunk_score",
    threshold: "< 0.72 for RAG traces",
    severity: "critical",
    status: "watching",
    lastTriggered: "2026-07-23 08:44",
  },
];

export const evalDataset: EvalDatasetCase[] = [
  {
    id: "case-refund-001",
    area: "RAG support",
    input: "Can an unopened device be returned after 24 days?",
    expectedSignals: ["refund window", "unopened", "policy citation"],
  },
  {
    id: "case-agent-014",
    area: "Coding agent",
    input: "Patch a failing evaluator test after inspecting repo context.",
    expectedSignals: ["repo search", "test run", "root cause summary"],
  },
  {
    id: "case-contract-006",
    area: "Document Q&A",
    input: "Explain uptime service credits with exact threshold language.",
    expectedSignals: ["SLA addendum", "unsupported claim warning"],
    promotedFromTrace: "tr-1031",
  },
  {
    id: "case-json-022",
    area: "Structured output",
    input: "Summarize an incident as strict JSON with follow-up actions.",
    expectedSignals: ["schema validity", "citation array", "confidence"],
  },
];

export const experiments: ExperimentResult[] = [
  {
    id: "exp-1",
    name: "Refund answer prompt v4 vs v5",
    control: "support-rag-v4",
    variant: "support-rag-v5-grounded",
    qualityDelta: 6.8,
    costDelta: 1.4,
    latencyDelta: -4.2,
    recommendation:
      "Ship v5. It adds citation checks and reduces unsupported policy language.",
  },
  {
    id: "exp-2",
    name: "Mini model for JSON incident summaries",
    control: "gpt-5.6-sol",
    variant: "gpt-5.4-mini",
    qualityDelta: -1.9,
    costDelta: -68.4,
    latencyDelta: -41.7,
    recommendation:
      "Use mini for low-risk incident summaries when schema validation passes.",
  },
  {
    id: "exp-3",
    name: "Reranker threshold tuning",
    control: "top_k_8_threshold_0.62",
    variant: "top_k_5_threshold_0.74",
    qualityDelta: 4.1,
    costDelta: -22.6,
    latencyDelta: -18.5,
    recommendation:
      "Adopt tighter retrieval threshold and promote failures into the eval set.",
  },
];
