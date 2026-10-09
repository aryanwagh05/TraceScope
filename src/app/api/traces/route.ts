import { NextResponse } from "next/server";
import { appendTrace, listTraces } from "@/lib/trace-store";
import { isValidIngestionKey, markIngestionKeyUsed } from "@/lib/workspace-store";
import { isCloudflareConfigured } from "@/lib/cloudflare-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function boundedBody(request: Request, maximumBytes = 131072) {
  if (Number(request.headers.get("content-length")) > maximumBytes) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

export async function GET() {
  const traces = await listTraces();

  return NextResponse.json({
    data: traces,
    meta: {
      count: traces.length,
      source: isCloudflareConfigured() ? "cloudflare-d1" : "local-json-trace-store",
    },
  });
}

export async function POST(request: Request) {
  if (isCloudflareConfigured()) {
    const key = request.headers.get("x-tracescope-key") ??
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    if (!key) return NextResponse.json({ error: "Missing ingestion key." }, { status: 401 });
    const body = await boundedBody(request);
    if (body === null) return NextResponse.json({ error: "Payload too large." }, { status: 413 });
    const upstream = await fetch(new URL("/v1/traces", process.env.TRACESCOPE_WORKER_URL), {
      method: "POST",
      headers: { "content-type": "application/json", "x-tracescope-key": key },
      body,
      cache: "no-store",
    });
    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
  const rawToken =
    request.headers.get("x-tracescope-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;

  if (!rawToken || !(await isValidIngestionKey(rawToken))) {
    return NextResponse.json(
      {
        accepted: false,
        message:
          "Missing or invalid ingestion key. Send x-tracescope-key or Authorization: Bearer <key>.",
      },
      { status: 401 },
    );
  }

  const ingestionKey = rawToken;
  const body = await request.json();
  const trace = await appendTrace(body);
  await markIngestionKeyUsed(ingestionKey);

  return NextResponse.json(
    {
      accepted: true,
      traceId: trace.id,
      trace,
      message: "Trace persisted to the local JSON trace store.",
    },
    { status: 202 },
  );
}
