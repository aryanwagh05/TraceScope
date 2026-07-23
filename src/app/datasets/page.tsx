import Link from "next/link";
import { Database, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { evalDataset } from "@/lib/demo-data";

export default function DatasetsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Eval datasets"
        title="Turn bad traces into regression tests"
        description="Capture production failures as reusable eval cases with expected signals for RAG answers, agent tool usage, structured outputs, and latency budgets."
        action={
          <button className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white">
            <Plus size={16} />
            Add case
          </button>
        }
      />

      <section className="grid gap-4 md:grid-cols-2">
        {evalDataset.map((testCase) => (
          <article key={testCase.id} className="rounded-md border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs font-semibold text-scope-blue">{testCase.id}</p>
                <h2 className="mt-1 text-lg font-semibold text-ink">{testCase.area}</h2>
              </div>
              <Database size={18} className="text-muted" />
            </div>
            <p className="mt-3 text-sm leading-6 text-ink">{testCase.input}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {testCase.expectedSignals.map((signal) => (
                <span
                  key={signal}
                  className="rounded-md border border-border bg-surface-strong px-2 py-1 text-xs font-medium text-muted"
                >
                  {signal}
                </span>
              ))}
            </div>
            {testCase.promotedFromTrace ? (
              <Link
                href={`/traces/${testCase.promotedFromTrace}`}
                className="mt-4 inline-flex text-sm font-semibold text-scope-blue"
              >
                Promoted from {testCase.promotedFromTrace}
              </Link>
            ) : null}
          </article>
        ))}
      </section>
    </>
  );
}
