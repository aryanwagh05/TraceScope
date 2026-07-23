import { Filter, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TraceTable } from "@/components/trace-table";
import { listTraces } from "@/lib/trace-store";

export const dynamic = "force-dynamic";

export default async function TracesPage() {
  const traces = await listTraces();

  return (
    <>
      <PageHeader
        eyebrow="Trace explorer"
        title="Inspect every LLM request path"
        description="Search across prompts, tool calls, retrieval chunks, model choices, latency budgets, token cost, evaluator output, tags, and user feedback."
        action={
          <button className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-semibold text-ink">
            <Filter size={16} />
            Saved filters
          </button>
        }
      />

      <section className="mb-4 grid gap-3 rounded-md border border-border bg-surface p-3 md:grid-cols-[1fr_auto]">
        <label className="flex h-11 items-center gap-2 rounded-md border border-border bg-[#fbfaf6] px-3 text-sm text-muted">
          <Search size={16} />
          <span className="font-medium">Search traces, tags, models, apps</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {["prod", "rag", "agent", "warning", "high cost"].map((filter) => (
            <span
              key={filter}
              className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-muted"
            >
              {filter}
            </span>
          ))}
        </div>
      </section>

      <TraceTable traces={traces} />
    </>
  );
}
