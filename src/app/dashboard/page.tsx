import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { ModelCostChart, RiskDonut, TrafficChart } from "@/components/charts";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { TraceTable } from "@/components/trace-table";
import { listTraces } from "@/lib/trace-store";
import {
  calculateDashboardMetrics,
  calculateModelCostBreakdown,
  calculateRiskBuckets,
  calculateTrafficSeries,
} from "@/lib/trace-analytics";
import { formatCurrency, formatMs, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const traces = await listTraces();
  const dashboardMetrics = calculateDashboardMetrics(traces);
  const trafficSeries = calculateTrafficSeries(traces);
  const modelCostBreakdown = calculateModelCostBreakdown(traces);
  const mostExpensive = traces.filter((trace) => trace.costKnown !== false)
    .sort((a, b) => b.costUsd - a.costUsd).slice(0, 3);
  const riskBuckets = calculateRiskBuckets(traces);

  return (
    <>
      <PageHeader
        eyebrow="Production overview"
        title="LLM telemetry without the hand-waving"
        description="Monitor traces, RAG quality, model cost, latency, evaluator drift, schema failures, and user feedback from one engineering console."
        action={
          <Link
            href="/docs"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-[#ffffff]"
          >
            Integration docs
            <ArrowRight size={16} />
          </Link>
        }
      />

      {traces.length === 0 ? (
        <section className="mb-5 rounded-md border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-ink">No traces ingested yet</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Connect an application through the ingestion endpoint to populate the
            dashboard, alerts, experiments, datasets, and eval runs with real telemetry.
          </p>
          <Link href="/docs" className="mt-3 inline-flex text-sm font-semibold text-scope-blue">
            Open integration docs
          </Link>
        </section>
      ) : null}

      <section className="grid metric-grid gap-3">
        {dashboardMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-md border border-border bg-surface p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Latency and eval health</h2>
              <p className="text-sm text-muted">Up to six recent four-hour UTC windows.</p>
            </div>
            <ShieldCheck className="text-scope-green" size={22} />
          </div>
          {trafficSeries.length ? <TrafficChart data={trafficSeries} /> : <p className="py-8 text-sm text-muted">No trace activity yet.</p>}
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-ink">Hallucination risk</h2>
          <p className="text-sm text-muted">Risk mix for traces with groundedness or citation evidence.</p>
          {riskBuckets.low + riskBuckets.medium + riskBuckets.high ? <RiskDonut
            low={riskBuckets.low}
            medium={riskBuckets.medium}
            high={riskBuckets.high}
          /> : <p className="py-8 text-sm text-muted">No risk evaluations available yet.</p>}
        </div>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-md border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-ink">Most expensive model calls</h2>
          <div className="mt-4 space-y-3">
            {mostExpensive.map((trace) => (
              <Link
                key={trace.id}
                href={`/traces/${trace.id}`}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-3 transition hover:bg-surface-strong"
              >
                <div>
                  <p className="font-mono text-xs font-semibold text-scope-blue">{trace.id}</p>
                  <p className="mt-1 text-sm font-medium text-ink">{trace.app}</p>
                  <p className="text-xs text-muted">
                    {trace.model} | {formatMs(trace.latencyMs)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-ink">{formatCurrency(trace.costUsd)}</p>
                  <StatusPill status={trace.status} />
                </div>
              </Link>
            ))}
            {!mostExpensive.length ? <p className="text-sm text-muted">No provider cost reported yet.</p> : null}
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-ink">Cost by model</h2>
          <p className="text-sm text-muted">Observed spend grouped by model.</p>
          {modelCostBreakdown.length ? <ModelCostChart data={modelCostBreakdown} /> : <p className="py-8 text-sm text-muted">No provider cost reported yet.</p>}
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Recent traces</h2>
            <p className="text-sm text-muted">
              Eval average:{" "}
              {traces.some((trace) => trace.evalScoreKnown !== false)
                ? formatPercent(traces.filter((trace) => trace.evalScoreKnown !== false)
                    .reduce((sum, trace, _, cohort) => sum + trace.evalScore / cohort.length, 0))
                : "n/a"}
            </p>
          </div>
          <Link href="/traces" className="text-sm font-semibold text-scope-blue">
            View all
          </Link>
        </div>
        <TraceTable traces={traces.slice(0, 4)} />
      </section>
    </>
  );
}
