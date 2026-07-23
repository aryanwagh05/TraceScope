import Link from "next/link";
import { revalidatePath } from "next/cache";
import { CheckCircle2, FlaskConical, XCircle } from "lucide-react";
import { EvaluatorChart } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { runEvalSuite } from "@/lib/eval-suite";
import { calculateEvaluatorBreakdown } from "@/lib/trace-analytics";
import { listTraces } from "@/lib/trace-store";
import {
  listEvalCases,
  listEvalRuns,
  saveEvalRun,
} from "@/lib/workspace-store";
import { formatDateTime, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

async function runSuiteAction() {
  "use server";

  const traces = await listTraces();
  const cases = await listEvalCases();
  const run = runEvalSuite(cases, traces);
  await saveEvalRun(run);
  revalidatePath("/evals");
}

export default async function EvalsPage() {
  const traces = await listTraces();
  const cases = await listEvalCases();
  const runs = await listEvalRuns();
  const evaluatorBreakdown = calculateEvaluatorBreakdown(traces);
  const allResults = traces.flatMap((trace) => trace.evalResults);
  const passCount = allResults.filter((result) => result.passed).length;
  const latestRun = runs[0];

  return (
    <>
      <PageHeader
        eyebrow="Evaluation engine"
        title="Quality gates for LLM behavior"
        description="Evaluator results come from trace telemetry. Dataset runs compare persisted test cases against the current trace store."
        action={
          <form action={runSuiteAction}>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-[#ffffff] disabled:opacity-50"
              disabled={cases.length === 0}
            >
              <FlaskConical size={16} />
              Run eval suite
            </button>
          </form>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-md border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-ink">Evaluator pass/fail mix</h2>
          <p className="text-sm text-muted">
            {passCount} of {allResults.length} checks passed across current traces.
          </p>
          <EvaluatorChart data={evaluatorBreakdown} />
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Dataset run status</h2>
              <p className="text-sm text-muted">
                {cases.length} case{cases.length === 1 ? "" : "s"} available.
              </p>
            </div>
            <Link href="/datasets" className="text-sm font-semibold text-scope-blue">
              Manage cases
            </Link>
          </div>

          {latestRun ? (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase text-muted">Latest run</p>
              <p className="mt-1 text-3xl font-semibold text-ink">
                {formatPercent(latestRun.passRate)}
              </p>
              <p className="mt-1 text-sm text-muted">
                {latestRun.matchedTraceCount}/{latestRun.caseCount} cases matched a trace on{" "}
                {formatDateTime(latestRun.createdAt)}.
              </p>
              <div className="mt-4 divide-y divide-border">
                {latestRun.results.slice(0, 5).map((result) => (
                  <div key={result.caseId} className="flex items-start gap-3 py-3">
                    {result.passed ? (
                      <CheckCircle2 size={18} className="mt-0.5 text-scope-green" />
                    ) : (
                      <XCircle size={18} className="mt-0.5 text-scope-red" />
                    )}
                    <div>
                      <p className="font-mono text-xs text-muted">{result.caseId}</p>
                      <p className="text-sm text-ink">{result.notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm leading-6 text-muted">
              No suite runs yet. Add or promote dataset cases, then run the suite.
            </p>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-md border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-ink">Recent evaluator results</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {allResults.map((result) => (
            <article key={result.id} className="border-l border-border pl-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold capitalize text-ink">
                  {result.evaluator.replaceAll("_", " ")}
                </p>
                {result.passed ? (
                  <CheckCircle2 size={18} className="text-scope-green" />
                ) : (
                  <XCircle size={18} className="text-scope-red" />
                )}
              </div>
              <p className="mt-2 text-2xl font-semibold text-ink">{formatPercent(result.score)}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{result.notes}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
