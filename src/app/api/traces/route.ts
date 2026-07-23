import { NextResponse } from "next/server";
import { appendTrace, listTraces } from "@/lib/trace-store";
import { isValidIngestionKey, markIngestionKeyUsed } from "@/lib/workspace-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const traces = await listTraces();

  return NextResponse.json({
    data: traces,
    meta: {
      count: traces.length,
      source: "local-json-trace-store",
    },
  });
}

export async function POST(request: Request) {
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
