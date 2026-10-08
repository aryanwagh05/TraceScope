import type { Ai, D1Database, MessageBatch, Queue } from "@cloudflare/workers-types";
import { runEvaluators } from "../../src/lib/evaluators";
import { normalizeTrace, type TraceInput } from "../../src/lib/trace-normalization";
import type { AlertRule, EvalDatasetCase, EvalRun, Trace, WorkspaceSettings } from "../../src/lib/types";
import { isObject, validateTracePayload } from "./validation";

interface Env {
  DB: D1Database;
  TRACE_QUEUE: Queue<{ traceId: string }>;
  ADMIN_TOKEN: string;
  AI: Ai;
  AI_GATEWAY_ID?: string;
}

interface StoredTrace {
  id: string;
  payload_json: string;
  request_hash: string | null;
  processing_status: "queued" | "processed" | "failed";
  error: string | null;
}

const defaultSettings: WorkspaceSettings = {
  workspaceName: "TraceScope",
  ownerName: "Aryan Wagh",
  groundednessMin: 0.72,
  citationSupportMin: 0.72,
  schemaValidityMin: 1,
  latencyP95Ms: 4000,
  avgCostUsd: 0.08,
  hallucinationRiskMax: 0.12,
  schemaFailureRateMax: 0.05,
  retrievalQualityMin: 0.72,
  ingestionKeys: [],
};

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function tokenHash(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bearer(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
}

async function readJson(request: Request, maximumBytes = 131072): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (declaredLength > maximumBytes) throw new Error("Payload too large.");
  if (!request.body) throw new Error("Invalid JSON.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maximumBytes) {
      await reader.cancel();
      throw new Error("Payload too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const body = new TextDecoder().decode(bytes);
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Invalid JSON.");
  }
}

async function rows<T>(db: D1Database, sql: string, ...values: unknown[]): Promise<T[]> {
  const result = await db.prepare(sql).bind(...values).all<T>();
  return result.results;
}

async function payloadRows<T>(db: D1Database, sql: string, ...values: unknown[]): Promise<T[]> {
  return (await rows<{ payload_json: string }>(db, sql, ...values)).map((row) => JSON.parse(row.payload_json) as T);
}

async function ingestionKey(request: Request, env: Env) {
  const token = request.headers.get("x-tracescope-key") ?? bearer(request);
  if (!token) return null;
  const key = await env.DB.prepare("SELECT id FROM ingestion_keys WHERE token_hash = ?")
    .bind(await tokenHash(token)).first<{ id: string }>();
  if (key) {
    await env.DB.prepare("UPDATE ingestion_keys SET last_used_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), key.id).run();
  }
  return key;
}

function evaluatorResults(input: TraceInput, id: string) {
  if (input.status === "error") return [];
  if (Array.isArray(input.evalResults) && input.evalResults.length) return input.evalResults;
  const chunks = Array.isArray(input.retrievalChunks) ? input.retrievalChunks : [];
  const spans = Array.isArray(input.spans) ? input.spans : [];
  const results = runEvaluators({
    traceId: id,
    answer: input.finalResponse ?? "",
    question: input.userInput ?? "",
    retrievedContext: chunks.map((chunk) => chunk.excerpt),
    citations: chunks.filter((chunk) => chunk.cited).map((chunk) => chunk.source),
    expectedToolNames: [],
    actualToolNames: spans.filter((span) => span.type === "tool").map((span) => span.name),
    latencyMs: input.latencyMs ?? spans.reduce((sum, span) => sum + (span.latencyMs ?? 0), 0),
    costUsd: input.costUsd ?? spans.reduce((sum, span) => sum + (span.costUsd ?? 0), 0),
  });
  return results.filter((result) =>
    result.evaluator === "relevance" ||
    result.evaluator === "latency" ||
    (result.evaluator === "cost" && input.costKnown !== false) ||
    (chunks.length > 0 && ["groundedness", "citation_support"].includes(result.evaluator)),
  );
}

async function processTrace(id: string, env: Env) {
  const stored = await env.DB.prepare("SELECT * FROM traces WHERE id = ?")
    .bind(id).first<StoredTrace>();
  if (!stored || stored.processing_status === "processed") return;
  const input = JSON.parse(stored.payload_json) as TraceInput;
  if (input.gatewayLogId && (input.costKnown === false || input.tokenCountKnown === false)) {
    try {
      const log = await env.AI.gateway(input.gatewayId ?? "default").getLog(input.gatewayLogId);
      if (typeof log.cost === "number") {
        input.costUsd = log.cost;
        input.costKnown = true;
        if (input.spans?.[0]) input.spans[0].costUsd = log.cost;
      }
      if (typeof log.tokens_in === "number" && typeof log.tokens_out === "number") {
        input.tokenCount = log.tokens_in + log.tokens_out;
        input.tokenCountKnown = true;
        if (input.spans?.[0]) input.spans[0].tokenCount = input.tokenCount;
      }
    } catch {
      // Gateway logs can arrive after the model response; retain an honest unknown value.
    }
  }
  const trace = normalizeTrace({ ...input, evalResults: evaluatorResults(input, id) });
  const statements = [
    ...trace.spans.map((span) => env.DB.prepare(
      "INSERT OR REPLACE INTO spans (trace_id, id, type, started_at, payload_json) VALUES (?, ?, ?, ?, ?)",
    ).bind(id, span.id, span.type, span.startedAt, JSON.stringify(span))),
    ...trace.retrievalChunks.map((chunk) => env.DB.prepare(
      "INSERT OR REPLACE INTO retrieval_chunks (trace_id, id, payload_json) VALUES (?, ?, ?)",
    ).bind(id, chunk.id, JSON.stringify(chunk))),
    ...trace.evalResults.map((item) => env.DB.prepare(
      "INSERT OR REPLACE INTO eval_results (trace_id, id, evaluator, score, passed, payload_json) VALUES (?, ?, ?, ?, ?, ?)",
    ).bind(id, item.id, item.evaluator, item.score, item.passed ? 1 : 0, JSON.stringify(item))),
    env.DB.prepare(
      "UPDATE traces SET payload_json = ?, processing_status = 'processed', error = NULL WHERE id = ?",
    ).bind(JSON.stringify(trace), id),
  ];
  await env.DB.batch(statements);
}

async function ingest(request: Request, env: Env) {
  if (!(await ingestionKey(request, env))) return response({ error: "Invalid ingestion key." }, 401);
  let value: unknown;
  try {
    value = await readJson(request);
  } catch (error) {
    return response({ error: (error as Error).message }, (error as Error).message === "Payload too large." ? 413 : 400);
  }
  const problem = validateTracePayload(value);
  if (problem) return response({ error: problem }, 400);
  const input = value as TraceInput;
  const id = input.id ?? `tr-${crypto.randomUUID()}`;
  const payload = JSON.stringify({ ...input, id });
  const requestHash = await tokenHash(payload);
  const now = new Date().toISOString();
  const inserted = await env.DB.prepare(
    "INSERT OR IGNORE INTO traces (id, app, environment, model, timestamp, received_at, processing_status, payload_json, request_hash) VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, ?)",
  ).bind(id, input.app, input.environment ?? "dev", input.model, input.timestamp ?? now, now, payload, requestHash).run();
  const existing = await env.DB.prepare("SELECT id, payload_json, request_hash, processing_status FROM traces WHERE id = ?")
    .bind(id).first<StoredTrace>();
  if (!existing || (existing.request_hash ?? await tokenHash(existing.payload_json)) !== requestHash) {
    return response({ error: "Trace ID already exists with different content." }, 409);
  }
  if (!inserted.meta.changes && existing.processing_status === "processed") {
    return response({ accepted: true, traceId: id, status: "processed", duplicate: true });
  }
  if (!inserted.meta.changes && existing.processing_status === "queued") {
    return response({ accepted: true, traceId: id, status: "queued", duplicate: true }, 202);
  }
  if (!inserted.meta.changes) {
    await env.DB.prepare("UPDATE traces SET processing_status = 'queued', error = NULL WHERE id = ?")
      .bind(id).run();
  }
  try {
    await env.TRACE_QUEUE.send({ traceId: id });
  } catch {
    await env.DB.prepare("UPDATE traces SET processing_status = 'failed', error = ? WHERE id = ?")
      .bind("Queue submission failed.", id).run();
    return response({ accepted: false, traceId: id, status: "failed", error: "Queue unavailable; retry with the same trace ID." }, 503);
  }
  return response({ accepted: true, traceId: id, status: "queued" }, 202);
}

async function adminRoute(request: Request, env: Env, path: string) {
  if (!env.ADMIN_TOKEN || !safeEqual(bearer(request), env.ADMIN_TOKEN)) {
    return response({ error: "Unauthorized." }, 401);
  }
  const method = request.method;
  if (path === "/admin/examples/ai" && method === "POST") {
    const body = await readJson(request, 2048);
    const question = isObject(body) && typeof body.question === "string" ? body.question.trim() : "";
    if (!question || question.length > 500) return response({ error: "Question must contain 1-500 characters." }, 400);
    const day = new Date().toISOString().slice(0, 10);
    const allowance = await env.DB.prepare(
      "INSERT INTO ai_example_runs (day, count) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET count = count + 1 WHERE count < 20 RETURNING count",
    ).bind(day).first<{ count: number }>();
    if (!allowance) return response({ error: "Daily example limit reached." }, 429);
    const id = `tr-${crypto.randomUUID()}`;
    const gatewayId = env.AI_GATEWAY_ID ?? "default";
    const model = "@cf/meta/llama-3.2-1b-instruct";
    const started = Date.now();
    let answer: string;
    let status: Trace["status"] = "ok";
    let usage: { total_tokens?: number } | undefined;
    try {
      const result = await env.AI.run(model, { prompt: question, max_tokens: 128 }, {
        gateway: { id: gatewayId, skipCache: true, metadata: { trace_id: id } },
      });
      answer = typeof result.response === "string" ? result.response : "";
      usage = "usage" in result ? result.usage as { total_tokens?: number } : undefined;
      if (!answer) throw new Error("Model returned no response.");
    } catch {
      answer = "AI Gateway request failed.";
      status = "error";
    }
    const gatewayLogId = env.AI.aiGatewayLogId ?? undefined;
    let costUsd = 0;
    let costKnown = false;
    let tokenCount = usage?.total_tokens ?? 0;
    let tokenCountKnown = typeof usage?.total_tokens === "number";
    if (gatewayLogId) {
      try {
        const log = await env.AI.gateway(gatewayId).getLog(gatewayLogId);
        if (typeof log.cost === "number") {
          costUsd = log.cost;
          costKnown = true;
        }
        if (typeof log.tokens_in === "number" && typeof log.tokens_out === "number") {
          tokenCount = log.tokens_in + log.tokens_out;
          tokenCountKnown = true;
        }
      } catch {
        // The queue consumer will try again once the gateway log is available.
      }
    }
    const input: TraceInput = {
      id, app: "AI Gateway example", environment: "dev", model,
      userInput: question, finalResponse: answer, systemPrompt: "",
      status, latencyMs: Date.now() - started, tokenCount, costUsd,
      costKnown, tokenCountKnown, gatewayLogId, gatewayId,
      tags: ["cloudflare", "ai-gateway"],
      spans: [{
        id: `${id}-model`, traceId: id, name: "Workers AI via AI Gateway", type: "model", status,
        latencyMs: Date.now() - started, tokenCount, costUsd,
        startedAt: new Date(started).toISOString(),
        metadata: { gatewayId, gatewayLogId: gatewayLogId ?? "unavailable" },
      }],
      retrievalChunks: [], evalResults: [], feedback: "none",
    };
    await env.DB.prepare(
      "INSERT INTO traces (id, app, environment, model, timestamp, received_at, processing_status, payload_json) VALUES (?, ?, ?, ?, ?, ?, 'queued', ?)",
    ).bind(id, input.app, input.environment, input.model, new Date().toISOString(), new Date().toISOString(), JSON.stringify(input)).run();
    try {
      await env.TRACE_QUEUE.send({ traceId: id });
    } catch {
      await env.DB.prepare("UPDATE traces SET processing_status = 'failed', error = 'Queue submission failed.' WHERE id = ?").bind(id).run();
      return response({ traceId: id, status: "failed", error: "Queue submission failed." }, 503);
    }
    return response({ traceId: id, status: "queued", answer, gatewayLogId, costKnown, tokenCountKnown }, 202);
  }
  if (path === "/admin/traces" && method === "GET") {
    const url = new URL(request.url);
    const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
    const limit = Math.min(200, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "200", 10) || 200));
    const items = await payloadRows<Trace>(env.DB,
      "SELECT payload_json FROM traces WHERE processing_status = 'processed' ORDER BY timestamp DESC, id DESC LIMIT ? OFFSET ?", limit, offset);
    return response({ items, nextOffset: items.length === limit ? offset + limit : null });
  }
  if (path.startsWith("/admin/traces/") && method === "GET") {
    const id = decodeURIComponent(path.slice("/admin/traces/".length));
    const item = await env.DB.prepare("SELECT payload_json FROM traces WHERE id = ? AND processing_status = 'processed'")
      .bind(id).first<{ payload_json: string }>();
    return response(item ? JSON.parse(item.payload_json) : null);
  }
  if (path === "/admin/ingestions" && method === "GET") {
    return response(await rows(env.DB,
      "SELECT id, app, model, received_at AS receivedAt, processing_status AS status, error FROM traces WHERE processing_status != 'processed' ORDER BY received_at DESC LIMIT 100"));
  }
  if (path.startsWith("/admin/ingestions/") && path.endsWith("/retry") && method === "POST") {
    const id = decodeURIComponent(path.slice("/admin/ingestions/".length, -"/retry".length));
    const item = await env.DB.prepare("SELECT processing_status FROM traces WHERE id = ?")
      .bind(id).first<{ processing_status: string }>();
    if (!item) return response({ error: "Trace not found." }, 404);
    if (item.processing_status === "processed") return response({ error: "Trace is already processed." }, 409);
    await env.DB.prepare("UPDATE traces SET processing_status = 'queued', error = NULL WHERE id = ?").bind(id).run();
    try {
      await env.TRACE_QUEUE.send({ traceId: id });
    } catch {
      await env.DB.prepare("UPDATE traces SET processing_status = 'failed', error = 'Queue submission failed.' WHERE id = ?").bind(id).run();
      return response({ error: "Queue submission failed." }, 503);
    }
    return response({ id, status: "queued" });
  }
  if (path === "/admin/settings") {
    if (method === "GET") {
      const item = await env.DB.prepare("SELECT payload_json FROM workspace_settings WHERE id = 1")
        .first<{ payload_json: string }>();
      const settings = item ? JSON.parse(item.payload_json) as WorkspaceSettings : defaultSettings;
      return response({ ...settings, ingestionKeys: await listKeys(env.DB) });
    }
    if (method === "PUT") {
      const value = await readJson(request, 8192);
      if (!isObject(value)) return response({ error: "Expected settings object." }, 400);
      const next = { ...defaultSettings, ...value, ingestionKeys: [] };
      await env.DB.prepare("INSERT INTO workspace_settings (id, payload_json) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET payload_json = excluded.payload_json")
        .bind(JSON.stringify(next)).run();
      return response({ ...next, ingestionKeys: await listKeys(env.DB) });
    }
  }
  if (path === "/admin/keys") {
    if (method === "GET") return response(await listKeys(env.DB));
    if (method === "POST") {
      const value = await readJson(request, 1024);
      const name = isObject(value) && typeof value.name === "string" ? value.name.trim().slice(0, 80) : "Integration key";
      const token = `ts_${[...crypto.getRandomValues(new Uint8Array(24))].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
      const key = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString(), token };
      await env.DB.prepare("INSERT INTO ingestion_keys (id, name, token_hash, created_at) VALUES (?, ?, ?, ?)")
        .bind(key.id, key.name, await tokenHash(token), key.createdAt).run();
      return response(key, 201);
    }
  }
  if (path.startsWith("/admin/keys/") && method === "DELETE") {
    const id = decodeURIComponent(path.slice("/admin/keys/".length));
    await env.DB.prepare("DELETE FROM ingestion_keys WHERE id = ?").bind(id).run();
    return response({ revoked: true });
  }
  const collections = {
    "/admin/alert-rules": { table: "alert_rules", order: "rowid DESC" },
    "/admin/eval-cases": { table: "eval_cases", order: "created_at DESC" },
    "/admin/eval-runs": { table: "eval_runs", order: "created_at DESC" },
  } as const;
  const collection = collections[path as keyof typeof collections];
  if (collection) {
    if (method === "GET") return response(await payloadRows(env.DB,
      `SELECT payload_json FROM ${collection.table} ORDER BY ${collection.order}`));
    if (method === "POST") {
      const value = await readJson(request, 16384);
      if (!isObject(value) || typeof value.id !== "string") return response({ error: "Expected an object with id." }, 400);
      if (path === "/admin/alert-rules") {
        const rule = value as unknown as AlertRule;
        await env.DB.prepare("INSERT INTO alert_rules (id, metric, enabled, payload_json) VALUES (?, ?, ?, ?)")
          .bind(rule.id, rule.metric, rule.enabled === false ? 0 : 1, JSON.stringify(rule)).run();
      } else if (path === "/admin/eval-cases") {
        const item = value as unknown as EvalDatasetCase;
        await env.DB.prepare("INSERT OR IGNORE INTO eval_cases (id, promoted_from_trace, created_at, payload_json) VALUES (?, ?, ?, ?)")
          .bind(item.id, item.promotedFromTrace ?? null, item.createdAt ?? new Date().toISOString(), JSON.stringify(item)).run();
      } else {
        const run = value as unknown as EvalRun;
        await env.DB.prepare("INSERT INTO eval_runs (id, created_at, payload_json) VALUES (?, ?, ?)")
          .bind(run.id, run.createdAt, JSON.stringify(run)).run();
      }
      return response(value, 201);
    }
  }
  return response({ error: "Not found." }, 404);
}

async function listKeys(db: D1Database) {
  return rows(db, "SELECT id, name, created_at AS createdAt, last_used_at AS lastUsedAt FROM ingestion_keys ORDER BY created_at DESC");
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    try {
      if (path === "/health" && request.method === "GET") return response({ status: "ok" });
      if (path === "/v1/traces" && request.method === "POST") return ingest(request, env);
      if (path === "/v1/examples/ai" && request.method === "POST") {
        if (!(await ingestionKey(request, env))) return response({ error: "Invalid ingestion key." }, 401);
        const adminRequest = new Request(new URL("/admin/examples/ai", request.url), {
          method: "POST",
          headers: { authorization: `Bearer ${env.ADMIN_TOKEN}` },
          body: await request.text(),
        });
        return adminRoute(adminRequest, env, "/admin/examples/ai");
      }
      if (path.startsWith("/admin/")) return adminRoute(request, env, path);
      return response({ error: "Not found." }, 404);
    } catch (error) {
      console.error("Request failed");
      if (error instanceof Error && error.message === "Payload too large.") return response({ error: error.message }, 413);
      if (error instanceof Error && error.message === "Invalid JSON.") return response({ error: error.message }, 400);
      return response({ error: "Internal backend error." }, 500);
    }
  },
  async queue(batch: MessageBatch<{ traceId: string }>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await processTrace(message.body.traceId, env);
        message.ack();
      } catch {
        await env.DB.prepare("UPDATE traces SET processing_status = 'failed', error = ? WHERE id = ?")
          .bind("Processing failed; queued for retry.", message.body.traceId).run();
        message.retry();
      }
    }
  },
};
export default worker;
