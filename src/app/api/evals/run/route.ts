import { NextResponse } from "next/server";
import { runEvaluators, type EvaluatorInput } from "@/lib/evaluators";

export async function POST(request: Request) {
  const input = (await request.json()) as EvaluatorInput;
  return NextResponse.json({
    traceId: input.traceId,
    results: runEvaluators(input),
  });
}
