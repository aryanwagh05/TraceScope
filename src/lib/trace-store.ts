import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { cloudflareRequest, isCloudflareConfigured } from "./cloudflare-client";
import { normalizeTrace, type TraceInput } from "./trace-normalization";
import type { Trace } from "./types";

const dataDir = path.join(process.cwd(), "data");
const tracesPath = path.join(dataDir, "traces.json");

async function readLocalTraces(): Promise<Trace[]> {
  try {
    const parsed = JSON.parse(await readFile(tracesPath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeLocalTraces(traces: Trace[]) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(tracesPath, `${JSON.stringify(traces, null, 2)}\n`, "utf8");
}

export async function listTraces(): Promise<Trace[]> {
  let traces: Trace[];
  if (isCloudflareConfigured()) {
    traces = [];
    let offset: number | null = 0;
    while (offset !== null) {
      const page: { items: Trace[]; nextOffset: number | null } =
        await cloudflareRequest(`/admin/traces?offset=${offset}`);
      traces.push(...page.items);
      offset = page.nextOffset;
    }
  } else {
    traces = await readLocalTraces();
  }
  return [...traces].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}

export interface IngestionRecord {
  id: string;
  app: string;
  model: string;
  receivedAt: string;
  status: "queued" | "failed";
  error: string | null;
}

export async function listPendingIngestions(): Promise<IngestionRecord[]> {
  return isCloudflareConfigured()
    ? cloudflareRequest<IngestionRecord[]>("/admin/ingestions")
    : [];
}

export async function retryIngestion(id: string) {
  if (!isCloudflareConfigured()) return;
  await cloudflareRequest(`/admin/ingestions/${encodeURIComponent(id)}/retry`, { method: "POST" });
}

export async function getTraceById(id: string) {
  if (isCloudflareConfigured()) {
    return cloudflareRequest<Trace | null>(`/admin/traces/${encodeURIComponent(id)}`);
  }
  return (await listTraces()).find((trace) => trace.id === id);
}

export async function appendTrace(input: TraceInput) {
  if (isCloudflareConfigured()) {
    throw new Error("Use the Cloudflare ingestion API when the hosted backend is configured.");
  }
  const trace = normalizeTrace(input);
  const traces = await readLocalTraces();
  await writeLocalTraces([trace, ...traces.filter((existing) => existing.id !== trace.id)]);
  return trace;
}

