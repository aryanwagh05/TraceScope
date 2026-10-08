import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Filter, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TraceTable } from "@/components/trace-table";
import { filterTraces, type TraceFilters } from "@/lib/trace-filters";
import { listPendingIngestions, listTraces, retryIngestion } from "@/lib/trace-store";

export const dynamic = "force-dynamic";

type TraceSearchParams = Record<string, string | string[] | undefined>;

function firstParam(params: TraceSearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

async function retryAction(formData: FormData) {
  "use server";
  await retryIngestion(String(formData.get("traceId") ?? ""));
  revalidatePath("/traces");
}

export default async function TracesPage({
  searchParams,
}: {
  searchParams: Promise<TraceSearchParams>;
}) {
  const [traces, pending] = await Promise.all([listTraces(), listPendingIngestions()]);
  const params = await searchParams;
  const filters: TraceFilters = {
    query: firstParam(params, "q"),
    environment: firstParam(params, "environment") as TraceFilters["environment"],
    status: firstParam(params, "status") as TraceFilters["status"],
    model: firstParam(params, "model"),
    tag: firstParam(params, "tag"),
  };
  const filteredTraces = filterTraces(traces, filters);
  const models = uniqueSorted(traces.map((trace) => trace.model));
  const tags = uniqueSorted(traces.flatMap((trace) => trace.tags)).slice(0, 8);

  return (
    <>
      <PageHeader
        eyebrow="Trace explorer"
        title="Inspect every LLM request path"
        description="Search across prompts, tool calls, retrieval chunks, model choices, latency budgets, token cost, evaluator output, tags, and user feedback."
        action={
          <Link
            href="/traces?status=warning"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-semibold text-ink"
          >
            <Filter size={16} />
            Review warnings
          </Link>
        }
      />

      {pending.length ? (
        <section className="mb-5 border-b border-border pb-4">
          <h2 className="text-sm font-semibold text-ink">Ingestion activity</h2>
          <div className="mt-2 divide-y divide-border">
            {pending.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                <div>
                  <span className="font-mono text-xs text-muted">{item.id}</span>
                  <span className="ml-3 text-ink">{item.app} / {item.model}</span>
                  <span className="ml-3 font-semibold text-scope-blue">{item.status}</span>
                  {item.error ? <p className="text-xs text-scope-red">{item.error}</p> : null}
                </div>
                {item.status === "failed" ? (
                  <form action={retryAction}>
                    <input type="hidden" name="traceId" value={item.id} />
                    <button className="text-xs font-semibold text-scope-blue">Retry</button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section id="trace-filters" className="mb-4 rounded-md border border-border bg-surface p-3">
        <form className="grid gap-3 lg:grid-cols-[1.5fr_.75fr_.75fr_1fr_auto]" action="/traces">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Search</span>
            <span className="flex h-10 items-center gap-2 rounded-md border border-border bg-[#fbfaf6] px-3">
              <Search size={16} className="text-muted" />
              <input
                name="q"
                defaultValue={filters.query}
                placeholder="Trace ID, app, prompt, tag"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
              />
            </span>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Environment</span>
            <select
              name="environment"
              defaultValue={filters.environment}
              className="h-10 rounded-md border border-border bg-[#fbfaf6] px-3 text-sm outline-none focus:border-scope-blue"
            >
              <option value="">All</option>
              <option value="prod">prod</option>
              <option value="staging">staging</option>
              <option value="dev">dev</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Status</span>
            <select
              name="status"
              defaultValue={filters.status}
              className="h-10 rounded-md border border-border bg-[#fbfaf6] px-3 text-sm outline-none focus:border-scope-blue"
            >
              <option value="">All</option>
              <option value="ok">ok</option>
              <option value="warning">warning</option>
              <option value="error">error</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Model</span>
            <select
              name="model"
              defaultValue={filters.model}
              className="h-10 rounded-md border border-border bg-[#fbfaf6] px-3 text-sm outline-none focus:border-scope-blue"
            >
              <option value="">All</option>
              {models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </label>
          <button className="mt-6 h-10 rounded-md bg-ink px-4 text-sm font-semibold text-[#ffffff]">
            Apply
          </button>
        </form>

        {tags.length ? (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {tags.map((tag) => (
              <Link
                key={tag}
                href={`/traces?tag=${encodeURIComponent(tag)}`}
                className="font-semibold text-scope-blue"
              >
                #{tag}
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Showing {filteredTraces.length} of {traces.length} trace
          {traces.length === 1 ? "" : "s"}.
        </p>
        {filteredTraces.length !== traces.length ? (
          <Link href="/traces" className="text-sm font-semibold text-scope-blue">
            Clear filters
          </Link>
        ) : null}
      </div>

      <TraceTable traces={filteredTraces} />
    </>
  );
}
