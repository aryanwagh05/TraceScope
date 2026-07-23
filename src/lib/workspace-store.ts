import "server-only";

import { randomBytes } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type {
  AlertRule,
  EvalDatasetCase,
  EvalRun,
  IngestionKey,
  WorkspaceSettings,
} from "./types";

type JsonFile = "settings" | "alert-rules" | "eval-cases" | "eval-runs";

const dataDir = path.join(process.cwd(), "data");

const defaultSettings: WorkspaceSettings = {
  workspaceName: "AI Platform Team",
  ownerName: "Aryan Wagh",
  groundednessMin: 0.72,
  citationSupportMin: 0.72,
  schemaValidityMin: 1,
  latencyP95Ms: 4000,
  avgCostUsd: 0.08,
  hallucinationRiskMax: 0.12,
  schemaFailureRateMax: 0.05,
  retrievalQualityMin: 0.72,
  ingestionKeys: [
    {
      id: "key-local-dev",
      name: "Local development",
      token: "ts_dev_local_key",
      createdAt: "2026-07-23T00:00:00.000Z",
    },
  ],
};

function defaultAlertRules(settings: WorkspaceSettings): AlertRule[] {
  return [
    {
      id: "rule-hallucination-risk",
      name: "Hallucination risk spike",
      metric: "hallucination_risk",
      operator: ">",
      threshold: String(settings.hallucinationRiskMax),
      severity: "critical",
      status: "healthy",
      lastTriggered: "Never",
      enabled: true,
    },
    {
      id: "rule-latency-p95",
      name: "Latency p95",
      metric: "latency_p95_ms",
      operator: ">",
      threshold: String(settings.latencyP95Ms),
      severity: "warning",
      status: "healthy",
      lastTriggered: "Never",
      enabled: true,
    },
    {
      id: "rule-schema-failure",
      name: "JSON schema failure rate",
      metric: "schema_failure_rate",
      operator: ">",
      threshold: String(settings.schemaFailureRateMax),
      severity: "warning",
      status: "healthy",
      lastTriggered: "Never",
      enabled: true,
    },
    {
      id: "rule-retrieval-quality",
      name: "Retrieval quality drop",
      metric: "retrieval_quality",
      operator: "<",
      threshold: String(settings.retrievalQualityMin),
      severity: "critical",
      status: "healthy",
      lastTriggered: "Never",
      enabled: true,
    },
  ];
}

async function readJson<T>(file: JsonFile, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path.join(dataDir, `${file}.json`), "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return fallback;
    }

    throw error;
  }
}

async function writeJson<T>(file: JsonFile, data: T) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(
    path.join(dataDir, `${file}.json`),
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );
}

function formNumber(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formString(value: FormDataEntryValue | null, fallback = "") {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

export async function getWorkspaceSettings() {
  return readJson<WorkspaceSettings>("settings", defaultSettings);
}

export async function saveWorkspaceSettings(formData: FormData) {
  const current = await getWorkspaceSettings();
  const next: WorkspaceSettings = {
    ...current,
    workspaceName: formString(formData.get("workspaceName"), current.workspaceName),
    ownerName: formString(formData.get("ownerName"), current.ownerName),
    groundednessMin: formNumber(formData.get("groundednessMin"), current.groundednessMin),
    citationSupportMin: formNumber(
      formData.get("citationSupportMin"),
      current.citationSupportMin,
    ),
    schemaValidityMin: formNumber(
      formData.get("schemaValidityMin"),
      current.schemaValidityMin,
    ),
    latencyP95Ms: formNumber(formData.get("latencyP95Ms"), current.latencyP95Ms),
    avgCostUsd: formNumber(formData.get("avgCostUsd"), current.avgCostUsd),
    hallucinationRiskMax: formNumber(
      formData.get("hallucinationRiskMax"),
      current.hallucinationRiskMax,
    ),
    schemaFailureRateMax: formNumber(
      formData.get("schemaFailureRateMax"),
      current.schemaFailureRateMax,
    ),
    retrievalQualityMin: formNumber(
      formData.get("retrievalQualityMin"),
      current.retrievalQualityMin,
    ),
  };

  await writeJson("settings", next);
  return next;
}

export async function generateIngestionKey(name: string) {
  const settings = await getWorkspaceSettings();
  const key: IngestionKey = {
    id: `key-${Date.now().toString(36)}`,
    name: name.trim() || "Local key",
    token: `ts_${randomBytes(18).toString("hex")}`,
    createdAt: new Date().toISOString(),
  };

  const next = {
    ...settings,
    ingestionKeys: [key, ...settings.ingestionKeys],
  };
  await writeJson("settings", next);
  return key;
}

export async function markIngestionKeyUsed(token: string) {
  const settings = await getWorkspaceSettings();
  const next = {
    ...settings,
    ingestionKeys: settings.ingestionKeys.map((key) =>
      key.token === token ? { ...key, lastUsedAt: new Date().toISOString() } : key,
    ),
  };
  await writeJson("settings", next);
}

export async function isValidIngestionKey(token: string | null) {
  if (!token) {
    return false;
  }

  const settings = await getWorkspaceSettings();
  return settings.ingestionKeys.some((key) => key.token === token);
}

export async function listAlertRules() {
  const settings = await getWorkspaceSettings();
  return readJson<AlertRule[]>("alert-rules", defaultAlertRules(settings));
}

export async function addAlertRule(formData: FormData) {
  const rules = await listAlertRules();
  const rule: AlertRule = {
    id: `rule-${Date.now().toString(36)}`,
    name: formString(formData.get("name"), "Custom alert"),
    metric: formString(formData.get("metric"), "hallucination_risk"),
    operator: formString(formData.get("operator"), ">") as AlertRule["operator"],
    threshold: String(formNumber(formData.get("threshold"), 0)),
    severity: formString(formData.get("severity"), "warning") as AlertRule["severity"],
    status: "healthy",
    lastTriggered: "Never",
    enabled: true,
  };

  await writeJson("alert-rules", [rule, ...rules]);
  return rule;
}

export async function listEvalCases() {
  return readJson<EvalDatasetCase[]>("eval-cases", []);
}

export async function addEvalCase(input: Omit<EvalDatasetCase, "id" | "createdAt">) {
  const cases = await listEvalCases();
  const existing = cases.find(
    (testCase) =>
      testCase.promotedFromTrace &&
      testCase.promotedFromTrace === input.promotedFromTrace,
  );

  if (existing) {
    return existing;
  }

  const testCase: EvalDatasetCase = {
    ...input,
    id: `case-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
  };

  await writeJson("eval-cases", [testCase, ...cases]);
  return testCase;
}

export async function addEvalCaseFromForm(formData: FormData) {
  return addEvalCase({
    area: formString(formData.get("area"), "General"),
    input: formString(formData.get("input"), ""),
    expectedSignals: formString(formData.get("expectedSignals"), "")
      .split(",")
      .map((signal) => signal.trim())
      .filter(Boolean),
  });
}

export async function listEvalRuns() {
  return readJson<EvalRun[]>("eval-runs", []);
}

export async function saveEvalRun(run: EvalRun) {
  const runs = await listEvalRuns();
  await writeJson("eval-runs", [run, ...runs]);
  return run;
}
