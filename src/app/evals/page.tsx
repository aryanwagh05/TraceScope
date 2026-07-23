import { CheckCircle2, FlaskConical, XCircle } from "lucide-react";
import { EvaluatorChart } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { evaluatorBreakdown, traces } from "@/lib/demo-data";
import { formatPercent } from "@/lib/format";

export default function EvalsPage() {
  const allResults = traces.flatMap((trace) => trace.evalResults);
  const passCount = allResults.filter((result) => result.passed).length;

  return (
    <>
      <PageHeader
        eyebrow="Evaluation engine"
        title="Quality gates for LLM behavior"
        description="TraceScope stores evaluator outputs per trace so model, prompt, RAG, tool, schema, latency, and cost regressions can be tested before they reach production."
        action={
          <button className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white">
            <FlaskConical size={16} />
            Run eval suite
          </button>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-md border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-ink">Evaluator pass/fail mix</h2>
          <p className="text-sm text-muted">
            {passCount} of {allResults.length} checks passed across sampled traces.
          </p>
          <EvaluatorChart data={evaluatorBreakdown} />
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-ink">Regression gates</h2>
          <div className="mt-4 space-y-3">
            {[
              "groundedness >= 0.72",
              "citation support >= 0.72",
              "JSON schema validity == 1.0",
              "tool correctness >= 0.72",
              "latency under route budget",
              "cost under workspace budget",
            ].map((gate) => (
              <div key={gate} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                <CheckCircle2 size={16} className="text-scope-green" />
                <span className="text-sm text-ink">{gate}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-ink">Recent evaluator results</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {allResults.map((result) => (
            <article key={result.id} className="rounded-md border border-border p-3">
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
