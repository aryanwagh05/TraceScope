import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, GitCompareArrows } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  compareModels,
  modelOptions,
  type ModelExperimentComparison,
} from "@/lib/experiment-analytics";
import { listTraces } from "@/lib/trace-store";
import { formatCurrency, formatMs, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

function Delta({ value, invert = false }: { value: number; invert?: boolean }) {
  const good = invert ? value < 0 : value > 0;
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={
        good
          ? "inline-flex items-center gap-1 text-scope-green"
          : "inline-flex items-center gap-1 text-scope-amber"
      }
    >
      <Icon size={15} />
      {value > 0 ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

function CohortPanel({
  title,
  cohort,
}: {
  title: string;
  cohort: ModelExperimentComparison["control"];
}) {
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <p className="text-xs font-semibold uppercase text-muted">{title}</p>
      <h2 className="mt-1 text-xl font-semibold text-ink">{cohort.label}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs uppercase text-muted">Traces</p>
          <p className="mt-1 font-semibold text-ink">{cohort.traceCount}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted">Quality</p>
          <p className="mt-1 font-semibold text-ink">{formatPercent(cohort.quality)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted">Avg cost</p>
          <p className="mt-1 font-semibold text-ink">{formatCurrency(cohort.avgCost)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted">Avg latency</p>
          <p className="mt-1 font-semibold text-ink">{formatMs(Math.round(cohort.avgLatency))}</p>
        </div>
      </div>
    </div>
  );
}

export default async function ExperimentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const traces = await listTraces();
  const models = modelOptions(traces);
  const params = await searchParams;
  const controlModel =
    typeof params.control === "string" ? params.control : models[0] ?? "";
  const variantModel =
    typeof params.variant === "string"
      ? params.variant
      : models.find((model) => model !== controlModel) ?? models[1] ?? controlModel;
  const comparison =
    controlModel && variantModel && controlModel !== variantModel
      ? compareModels(traces, controlModel, variantModel)
      : null;
  const canCompare = models.length >= 2 && controlModel !== variantModel;

  return (
    <>
      <PageHeader
        eyebrow="Prompt and model comparison"
        title="Compare models using observed traces"
        description="This page calculates quality, cost, latency, and failure examples from real traces already ingested into TraceScope."
      />

      <section className="rounded-md border border-border bg-surface p-4">
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" action="/experiments">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Control model</span>
            <select
              name="control"
              defaultValue={controlModel}
              className="h-10 rounded-md border border-border bg-[#fbfaf6] px-3 text-sm outline-none focus:border-scope-blue"
            >
              {models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Variant model</span>
            <select
              name="variant"
              defaultValue={variantModel}
              className="h-10 rounded-md border border-border bg-[#fbfaf6] px-3 text-sm outline-none focus:border-scope-blue"
            >
              {models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </label>
          <button
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-[#ffffff] disabled:opacity-50"
            disabled={!canCompare}
          >
            <GitCompareArrows size={16} />
            Compare
          </button>
        </form>
      </section>

      {comparison ? (
        <>
          <section className="mt-5 grid gap-4 xl:grid-cols-2">
            <CohortPanel title="Control" cohort={comparison.control} />
            <CohortPanel title="Variant" cohort={comparison.variant} />
          </section>

          <section className="mt-5 rounded-md border border-border bg-surface p-4">
            <h2 className="text-lg font-semibold text-ink">Comparison result</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="border-l border-border pl-3">
                <p className="text-xs uppercase text-muted">Quality delta</p>
                <p className="mt-1 text-xl font-semibold">
                  <Delta value={comparison.qualityDelta} />
                </p>
              </div>
              <div className="border-l border-border pl-3">
                <p className="text-xs uppercase text-muted">Cost delta</p>
                <p className="mt-1 text-xl font-semibold">
                  <Delta value={comparison.costDelta} invert />
                </p>
              </div>
              <div className="border-l border-border pl-3">
                <p className="text-xs uppercase text-muted">Latency delta</p>
                <p className="mt-1 text-xl font-semibold">
                  <Delta value={comparison.latencyDelta} invert />
                </p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-ink">{comparison.recommendation}</p>
          </section>

          <section className="mt-5 rounded-md border border-border bg-surface p-4">
            <h2 className="text-lg font-semibold text-ink">Failure examples</h2>
            <div className="mt-3 divide-y divide-border">
              {[...comparison.control.failures, ...comparison.variant.failures].length ? (
                [...comparison.control.failures, ...comparison.variant.failures].map((trace) => (
                  <Link
                    key={trace.id}
                    href={`/traces/${trace.id}`}
                    className="flex items-start justify-between gap-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-mono text-xs font-semibold text-scope-blue">
                        {trace.id}
                      </p>
                      <p className="mt-1 text-ink">{trace.userInput}</p>
                    </div>
                    <span className="text-muted">{formatPercent(trace.evalScore)}</span>
                  </Link>
                ))
              ) : (
                <p className="py-4 text-sm text-muted">
                  No failed traces in these cohorts.
                </p>
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="mt-5 rounded-md border border-border bg-surface p-4">
          <p className="text-sm leading-6 text-muted">
            Ingest traces for at least two models to compare model behavior.
          </p>
        </section>
      )}
    </>
  );
}
