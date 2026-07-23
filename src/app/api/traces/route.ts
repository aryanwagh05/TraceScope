import { NextResponse } from "next/server";
import { traces } from "@/lib/demo-data";

export function GET() {
  return NextResponse.json({
    data: traces,
    meta: {
      count: traces.length,
      source: "seeded-demo-telemetry",
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json();

  return NextResponse.json(
    {
      accepted: true,
      traceId: body.traceId ?? `tr-${Date.now()}`,
      message: "Trace accepted by the demo ingestion endpoint.",
    },
    { status: 202 },
  );
}
