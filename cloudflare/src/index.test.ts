import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import worker from "./index";

const adminToken = "test-admin-token";

function harness() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  const migrations = join(process.cwd(), "cloudflare", "migrations");
  for (const file of readdirSync(migrations).filter((name) => name.endsWith(".sql")).sort()) {
    sqlite.exec(readFileSync(join(migrations, file), "utf8"));
  }
  const db = {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          const params = values as (string | number | null)[];
          return {
            async run() {
              return { meta: { changes: Number(sqlite.prepare(sql).run(...params).changes) } };
            },
            async first<T>() {
              return (sqlite.prepare(sql).get(...params) ?? null) as T | null;
            },
            async all<T>() {
              return { results: sqlite.prepare(sql).all(...params) as T[] };
            },
          };
        },
        async first<T>() {
          return (sqlite.prepare(sql).get() ?? null) as T | null;
        },
      };
    },
    async batch(statements: Array<{ run: () => Promise<unknown> }>) {
      sqlite.exec("BEGIN");
      try {
        for (const statement of statements) await statement.run();
        sqlite.exec("COMMIT");
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
  const messages: Array<{ traceId: string }> = [];
  const deliveries = { acknowledged: 0, retried: 0 };
  let queueAvailable = true;
  const env = {
    DB: db,
    ADMIN_TOKEN: adminToken,
    TRACE_QUEUE: {
      async send(message: { traceId: string }) {
        if (!queueAvailable) throw new Error("queue unavailable");
        messages.push(message);
      },
    },
  };
  const request = (path: string, method = "GET", body?: string, headers: Record<string, string> = {}) =>
    worker.fetch(new Request(`https://trace.test${path}`, { method, body, headers }), env as never);
  const admin = (path: string, method = "GET", body?: string) =>
    request(path, method, body, { authorization: `Bearer ${adminToken}`, "content-type": "application/json" });
  async function drain() {
    const next = messages.shift();
    if (!next) return;
    await worker.queue({
      messages: [{
        body: next,
        ack() { deliveries.acknowledged += 1; },
        retry() { deliveries.retried += 1; },
      }],
    } as never, env as never);
  }
  return { sqlite, request, admin, drain, messages, deliveries, setQueueAvailable: (value: boolean) => { queueAvailable = value; } };
}

async function createKey(test: ReturnType<typeof harness>) {
  const response = await test.admin("/admin/keys", "POST", JSON.stringify({ name: "test" }));
  expect(response.status).toBe(201);
  return (await response.json() as { token: string }).token;
}

function traceBody(id: string) {
  return JSON.stringify({
    id, app: "test-app", environment: "dev", model: "test-model",
    userInput: "What is an observability trace?",
    finalResponse: "A trace records a request and its spans.",
    feedback: "good",
    spans: [{ name: "model call", type: "model", status: "ok", latencyMs: 25, tokenCount: 12, costUsd: 0.001 }],
  });
}

describe("Worker ingestion and D1 persistence", () => {
  const openDatabases: DatabaseSync[] = [];
  afterEach(() => {
    for (const db of openDatabases) db.close();
    openDatabases.length = 0;
  });

  it("processes one trace and its evaluations despite duplicate delivery", async () => {
    const test = harness();
    openDatabases.push(test.sqlite);
    const key = await createKey(test);
    const headers = { "x-tracescope-key": key, "content-type": "application/json" };
    const body = traceBody("test-001");
    const accepted = await test.request("/v1/traces", "POST", body, headers);
    expect(accepted.status).toBe(202);
    expect((await accepted.json() as { status: string }).status).toBe("queued");
    await test.drain();
    const duplicate = await test.request("/v1/traces", "POST", body, headers);
    expect((await duplicate.json() as { duplicate: boolean }).duplicate).toBe(true);
    expect(test.messages).toHaveLength(0);
    expect(test.deliveries).toEqual({ acknowledged: 1, retried: 0 });
    expect(test.sqlite.prepare("SELECT count(*) AS n FROM traces WHERE processing_status = 'processed'").get()).toMatchObject({ n: 1 });
    expect(test.sqlite.prepare("SELECT count(*) AS n FROM spans").get()).toMatchObject({ n: 1 });
    expect(test.sqlite.prepare("SELECT count(*) AS n FROM eval_results").get()).toMatchObject({ n: 3 });
    expect(test.sqlite.prepare("SELECT value FROM trace_feedback").get()).toMatchObject({ value: "good" });
  });

  it("rejects bad keys, malformed input, oversize input, and conflicting IDs", async () => {
    const test = harness();
    openDatabases.push(test.sqlite);
    const key = await createKey(test);
    const headers = { "x-tracescope-key": key, "content-type": "application/json" };
    expect((await test.request("/v1/traces", "POST", traceBody("test-002"))).status).toBe(401);
    expect((await test.request("/v1/traces", "POST", "{bad", headers)).status).toBe(400);
    expect((await test.request("/v1/traces", "POST", "x".repeat(131073), headers)).status).toBe(413);
    expect((await test.request("/v1/traces", "POST", traceBody("test-002"), headers)).status).toBe(202);
    expect((await test.request("/v1/traces", "POST", traceBody("test-002").replace("What is", "Explain"), headers)).status).toBe(409);
  });

  it("marks enqueue failure and safely accepts retry with the same ID", async () => {
    const test = harness();
    openDatabases.push(test.sqlite);
    const key = await createKey(test);
    const headers = { "x-tracescope-key": key, "content-type": "application/json" };
    test.setQueueAvailable(false);
    expect((await test.request("/v1/traces", "POST", traceBody("test-003"), headers)).status).toBe(503);
    expect(test.sqlite.prepare("SELECT processing_status FROM traces WHERE id = 'test-003'").get()).toMatchObject({ processing_status: "failed" });
    test.setQueueAvailable(true);
    expect((await test.request("/v1/traces", "POST", traceBody("test-003"), headers)).status).toBe(202);
    await test.drain();
    expect(test.sqlite.prepare("SELECT processing_status FROM traces WHERE id = 'test-003'").get()).toMatchObject({ processing_status: "processed" });
  });

  it("marks a consumer error failed and asks the queue to retry", async () => {
    const test = harness();
    openDatabases.push(test.sqlite);
    const key = await createKey(test);
    const headers = { "x-tracescope-key": key, "content-type": "application/json" };
    expect((await test.request("/v1/traces", "POST", traceBody("test-004"), headers)).status).toBe(202);
    test.sqlite.prepare("UPDATE traces SET payload_json = '{broken' WHERE id = 'test-004'").run();
    await test.drain();
    expect(test.deliveries).toEqual({ acknowledged: 0, retried: 1 });
    expect(test.sqlite.prepare("SELECT processing_status, error FROM traces WHERE id = 'test-004'").get())
      .toMatchObject({ processing_status: "failed", error: "Processing failed; queued for retry." });
  });
});
