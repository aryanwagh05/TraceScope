import { NextResponse } from "next/server";
import { appendTrace, listTraces } from "@/lib/trace-store";
import { isValidIngestionKey, markIngestionKeyUsed } from "@/lib/workspace-store";
import { isCloudflareConfigured } from "@/lib/cloudflare-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const upstream = await fetch(new URL("/v1/traces", process.env.TRACESCOPE_WORKER_URL), {
      method: "POST",
      headers: { "content-type": "application/json", "x-tracescope-key": key },
      body: await request.text(),
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
