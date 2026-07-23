export type TraceStatus = "ok" | "warning" | "error";

export type SpanType =
  | "input"
  | "system"
  | "retrieval"
  | "rerank"
  | "model"
  | "tool"
  | "validation"
  | "eval"
  | "output";

export type EvaluatorKey =
  | "groundedness"
  | "relevance"
  | "citation_support"
  | "schema_validity"
  | "safety"
  | "tool_correctness"
  | "latency"
  | "cost";

export type Severity = "info" | "warning" | "critical";

export interface Span {
  id: string;
  traceId: string;
  name: string;
  type: SpanType;
  status: TraceStatus;
  latencyMs: number;
  tokenCount: number;
  costUsd: number;
  startedAt: string;
  metadata: Record<string, string | number | boolean>;
}

export interface RetrievalChunk {
  id: string;
  source: string;
  score: number;
  cited: boolean;
  excerpt: string;
}

export interface EvalResult {
  id: string;
  traceId: string;
  evaluator: EvaluatorKey;
  score: number;
  passed: boolean;
  notes: string;
}

export interface Trace {
  id: string;
  app: string;
  environment: "prod" | "staging" | "dev";
  model: string;
  latencyMs: number;
  costUsd: number;
  tokenCount: number;
  status: TraceStatus;
  evalScore: number;
  hallucinationRisk: number;
  timestamp: string;
  tags: string[];
  userInput: string;
  systemPrompt: string;
  finalResponse: string;
  spans: Span[];
  retrievalChunks: RetrievalChunk[];
  evalResults: EvalResult[];
  feedback: "good" | "bad" | "none";
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator?: ">" | "<";
  threshold: string;
  severity: Severity;
  status: "healthy" | "watching" | "firing";
  lastTriggered: string;
  enabled?: boolean;
}

export interface EvalDatasetCase {
  id: string;
  area: string;
  input: string;
  expectedSignals: string[];
  promotedFromTrace?: string;
  createdAt?: string;
}

export interface ExperimentResult {
  id: string;
  name: string;
  control: string;
  variant: string;
  qualityDelta: number;
  costDelta: number;
  latencyDelta: number;
  recommendation: string;
}

export interface WorkspaceSettings {
  workspaceName: string;
  ownerName: string;
  groundednessMin: number;
  citationSupportMin: number;
  schemaValidityMin: number;
  latencyP95Ms: number;
  avgCostUsd: number;
  hallucinationRiskMax: number;
  schemaFailureRateMax: number;
  retrievalQualityMin: number;
  ingestionKeys: IngestionKey[];
}

export interface IngestionKey {
  id: string;
  name: string;
  token: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface EvalRun {
  id: string;
  createdAt: string;
  caseCount: number;
  matchedTraceCount: number;
  passRate: number;
  results: EvalRunResult[];
}

export interface EvalRunResult {
  caseId: string;
  traceId?: string;
  passed: boolean;
  score: number;
  notes: string;
}
