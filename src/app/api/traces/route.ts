import { NextResponse } from "next/server";
import { appendTrace, listTraces } from "@/lib/trace-store";

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
  const body = await request.json();
  const trace = await appendTrace(body);

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
