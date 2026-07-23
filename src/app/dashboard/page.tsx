import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { ModelCostChart, RiskDonut, TrafficChart } from "@/components/charts";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { TraceTable } from "@/components/trace-table";
import {
  dashboardMetrics,
  getRiskLabel,
  modelCostBreakdown,
  traces,
  trafficSeries,
} from "@/lib/demo-data";
import { formatCurrency, formatMs, formatPercent } from "@/lib/format";

export default function DashboardPage() {
  const mostExpensive = [...traces].sort((a, b) => b.costUsd - a.costUsd).slice(0, 3);
  const highRisk = traces.filter(
    (trace) => getRiskLabel(trace.hallucinationRisk) === "high",
  ).length;
  const mediumRisk = traces.filter(
    (trace) => getRiskLabel(trace.hallucinationRisk) === "medium",
  ).length;
  const lowRisk = traces.length - highRisk - mediumRisk;

  return (
    <>
      <PageHeader
        eyebrow="Production overview"
        title="LLM telemetry without the hand-waving"
        description="Monitor traces, RAG quality, model cost, latency, evaluator drift, schema failures, and user feedback from one engineering console."
        action={
          <Link
            href="/docs"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white"
          >
            Integration docs
            <ArrowRight size={16} />
          </Link>
        }
      />

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
              <p className="text-sm text-muted">Six traffic windows across production apps.</p>
            </div>
            <ShieldCheck className="text-scope-green" size={22} />
          </div>
          <TrafficChart data={trafficSeries} />
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-ink">Hallucination risk</h2>
          <p className="text-sm text-muted">Risk mix across the sampled traces.</p>
          <RiskDonut low={lowRisk} medium={mediumRisk} high={highRisk} />
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
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-ink">Cost by model</h2>
          <p className="text-sm text-muted">Current 24 hour spend grouped by model.</p>
          <ModelCostChart data={modelCostBreakdown} />
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Recent traces</h2>
            <p className="text-sm text-muted">
              Eval average:{" "}
              {formatPercent(
                traces.reduce((sum, trace) => sum + trace.evalScore, 0) / traces.length,
              )}
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
