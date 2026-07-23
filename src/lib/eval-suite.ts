import type { EvalDatasetCase, EvalRun, Trace } from "./types";

function textTokens(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function scoreTraceMatch(testCase: EvalDatasetCase, trace: Trace) {
  if (testCase.promotedFromTrace === trace.id) {
    return 1;
  }

  const caseTokens = new Set(textTokens(`${testCase.input} ${testCase.area}`));
  const traceText = `${trace.userInput} ${trace.finalResponse} ${trace.tags.join(" ")}`;
  const traceTokens = new Set(textTokens(traceText));
  const matches = [...caseTokens].filter((token) => traceTokens.has(token)).length;

  return caseTokens.size ? matches / caseTokens.size : 0;
}

function scoreExpectedSignals(testCase: EvalDatasetCase, trace: Trace) {
  if (testCase.expectedSignals.length === 0) {
    return trace.evalScore;
  }

  const searchable = [
    trace.userInput,
    trace.finalResponse,
    trace.tags.join(" "),
    ...trace.evalResults.map((result) => `${result.evaluator} ${result.notes}`),
    ...trace.retrievalChunks.map((chunk) => `${chunk.source} ${chunk.excerpt}`),
  ]
    .join(" ")
    .toLowerCase();

  const matches = testCase.expectedSignals.filter((signal) =>
    searchable.includes(signal.toLowerCase()),
  ).length;

  return Math.max(trace.evalScore, matches / testCase.expectedSignals.length);
}

export function suggestEvalCasesFromTraces(
  traces: Trace[],
  existingCases: EvalDatasetCase[],
) {
  const existingTraceIds = new Set(
    existingCases.map((testCase) => testCase.promotedFromTrace).filter(Boolean),
  );

  return traces
    .filter(
      (trace) =>
        !existingTraceIds.has(trace.id) &&
        (trace.feedback === "bad" ||
          trace.status !== "ok" ||
          trace.evalResults.some((result) => !result.passed)),
    )
    .map((trace) => ({
      trace,
      expectedSignals: [
        ...new Set([
          ...trace.tags.slice(0, 2),
          ...trace.evalResults
            .filter((result) => !result.passed)
            .map((result) => result.evaluator.replaceAll("_", " ")),
        ]),
      ],
    }));
}

export function runEvalSuite(cases: EvalDatasetCase[], traces: Trace[]): EvalRun {
  const results = cases.map((testCase) => {
    const matchedTrace = [...traces]
      .map((trace) => ({ trace, match: scoreTraceMatch(testCase, trace) }))
      .sort((a, b) => b.match - a.match)[0];
    const score = matchedTrace ? scoreExpectedSignals(testCase, matchedTrace.trace) : 0;
    const passed = Boolean(matchedTrace && matchedTrace.match > 0.15 && score >= 0.72);

    return {
      caseId: testCase.id,
      traceId: matchedTrace?.match ? matchedTrace.trace.id : undefined,
      passed,
      score: Number(score.toFixed(2)),
      notes: matchedTrace
        ? `Matched ${matchedTrace.trace.id} with ${(matchedTrace.match * 100).toFixed(0)}% input overlap.`
        : "No matching trace was found.",
    };
  });

  const matchedTraceCount = results.filter((result) => result.traceId).length;
  const passRate = results.length
    ? results.filter((result) => result.passed).length / results.length
    : 0;

  return {
    id: `run-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    caseCount: cases.length,
    matchedTraceCount,
    passRate: Number(passRate.toFixed(2)),
    results,
  };
}
