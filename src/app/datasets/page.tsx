import Link from "next/link";
import { revalidatePath } from "next/cache";
import { ArrowRight, Database, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { suggestEvalCasesFromTraces } from "@/lib/eval-suite";
import { listTraces } from "@/lib/trace-store";
import {
  addEvalCase,
  addEvalCaseFromForm,
  listEvalCases,
} from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

async function createEvalCase(formData: FormData) {
  "use server";

  await addEvalCaseFromForm(formData);
  revalidatePath("/datasets");
}

async function promoteTrace(formData: FormData) {
  "use server";

  const traceId = String(formData.get("traceId") ?? "");
  const traces = await listTraces();
  const trace = traces.find((item) => item.id === traceId);

  if (!trace) {
    return;
  }

  await addEvalCase({
    area: trace.app,
    input: trace.userInput,
    expectedSignals: [
      ...new Set([
        ...trace.tags.slice(0, 3),
        ...trace.evalResults
          .filter((result) => !result.passed)
          .map((result) => result.evaluator.replaceAll("_", " ")),
      ]),
    ],
    promotedFromTrace: trace.id,
  });
  revalidatePath("/datasets");
  revalidatePath("/evals");
}

export default async function DatasetsPage() {
  const traces = await listTraces();
  const evalCases = await listEvalCases();
  const suggestions = suggestEvalCasesFromTraces(traces, evalCases);

  return (
    <>
      <PageHeader
        eyebrow="Eval datasets"
        title="Turn trace failures into regression tests"
        description="Dataset cases are persisted locally and can be promoted from real bad traces, failed evaluator checks, or manual test-case entry."
        action={
          <a
            href="#add-case"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-[#ffffff]"
          >
            <Plus size={16} />
            Add case
          </a>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[1fr_.9fr]">
        <div className="rounded-md border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Dataset cases</h2>
              <p className="text-sm text-muted">
                {evalCases.length} persisted case{evalCases.length === 1 ? "" : "s"}.
              </p>
            </div>
            <Database size={19} className="text-scope-blue" />
          </div>

          <div className="mt-4 divide-y divide-border">
            {evalCases.length ? (
              evalCases.map((testCase) => (
                <article key={testCase.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs font-semibold text-scope-blue">
                        {testCase.id}
                      </p>
                      <h3 className="mt-1 text-base font-semibold text-ink">{testCase.area}</h3>
                    </div>
                    {testCase.promotedFromTrace ? (
                      <Link
                        href={`/traces/${testCase.promotedFromTrace}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-scope-blue"
                      >
                        Source trace
                        <ArrowRight size={14} />
                      </Link>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-ink">{testCase.input}</p>
                  <p className="mt-2 text-xs uppercase text-muted">
                    Expected: {testCase.expectedSignals.join(", ") || "no explicit signals"}
                  </p>
                </article>
              ))
            ) : (
              <p className="py-6 text-sm text-muted">
                No cases yet. Promote a failed trace or add a case manually.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-ink">Suggested from traces</h2>
          <p className="text-sm text-muted">
            Real traces with failed checks, warnings, errors, or bad feedback.
          </p>

          <div className="mt-4 divide-y divide-border">
            {suggestions.length ? (
              suggestions.map(({ trace, expectedSignals }) => (
                <article key={trace.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs font-semibold text-scope-blue">
                        {trace.id}
                      </p>
                      <h3 className="mt-1 text-base font-semibold text-ink">{trace.app}</h3>
                    </div>
                    <form action={promoteTrace}>
                      <input type="hidden" name="traceId" value={trace.id} />
                      <button className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-ink">
                        Promote
                      </button>
                    </form>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-ink">{trace.userInput}</p>
                  <p className="mt-2 text-xs uppercase text-muted">
                    Signals: {expectedSignals.join(", ") || "trace failure"}
                  </p>
                </article>
              ))
            ) : (
              <p className="py-6 text-sm text-muted">
                No unpromoted failure traces. New failed telemetry will appear here.
              </p>
            )}
          </div>
        </div>
      </section>

      <section id="add-case" className="mt-6 rounded-md border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-ink">Add manual test case</h2>
        <form action={createEvalCase} className="mt-4 grid gap-3 lg:grid-cols-[.8fr_1.3fr_1.1fr_auto]">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Area</span>
            <input
              name="area"
              required
              placeholder="RAG support"
              className="h-10 rounded-md border border-border bg-[#fbfaf6] px-3 text-sm outline-none focus:border-scope-blue"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Input</span>
            <input
              name="input"
              required
              placeholder="What should the application answer?"
              className="h-10 rounded-md border border-border bg-[#fbfaf6] px-3 text-sm outline-none focus:border-scope-blue"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Expected signals</span>
            <input
              name="expectedSignals"
              placeholder="citation support, groundedness"
              className="h-10 rounded-md border border-border bg-[#fbfaf6] px-3 text-sm outline-none focus:border-scope-blue"
            />
          </label>
          <button className="mt-6 h-10 rounded-md bg-ink px-4 text-sm font-semibold text-[#ffffff]">
            Save
          </button>
        </form>
      </section>
    </>
  );
}
