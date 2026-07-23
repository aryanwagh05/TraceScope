import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleAlert, MessageSquareText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { TraceGraph } from "@/components/trace-graph";
import { getRiskLabel, getTraceById } from "@/lib/demo-data";
import {
  formatCurrency,
  formatDateTime,
  formatMs,
  formatNumber,
  formatPercent,
} from "@/lib/format";

export default async function TraceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trace = getTraceById(id);

  if (!trace) {
    notFound();
  }

  return (
    <>
      <Link
        href="/traces"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-scope-blue"
      >
        <ArrowLeft size={16} />
        Back to traces
      </Link>

      <PageHeader
        eyebrow={`${trace.app} | ${trace.environment}`}
        title={trace.id}
        description={`${trace.model} request opened ${formatDateTime(
          trace.timestamp,
        )} with ${formatNumber(trace.tokenCount)} tokens and ${formatCurrency(trace.costUsd)} cost.`}
        action={<StatusPill status={trace.status} />}
      />

      <TraceGraph spans={trace.spans} />

      <section className="mt-6 grid metric-grid gap-3">
        {[
          ["Latency", formatMs(trace.latencyMs), "request wall time"],
          ["Cost", formatCurrency(trace.costUsd), "model and eval spend"],
          ["Eval score", formatPercent(trace.evalScore), "weighted pass rate"],
          ["Risk", getRiskLabel(trace.hallucinationRisk), "hallucination signal"],
        ].map(([label, value, detail]) => (
          <article key={label} className="rounded-md border border-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase text-muted">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
            <p className="mt-1 text-xs text-muted">{detail}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-md border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-ink">Execution timeline</h2>
          <div className="mt-4 space-y-3">
            {trace.spans.map((span) => (
              <div
                key={span.id}
                className="grid gap-3 rounded-md border border-border px-3 py-3 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{span.name}</p>
                  <p className="mt-1 text-xs uppercase text-muted">{span.type}</p>
                  {Object.keys(span.metadata).length ? (
                    <p className="mt-2 font-mono text-xs text-muted">
                      {JSON.stringify(span.metadata)}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <StatusPill status={span.status} />
                  <span className="rounded-md bg-surface-strong px-2 py-1 text-xs text-muted">
                    {formatMs(span.latencyMs)}
                  </span>
                  <span className="rounded-md bg-surface-strong px-2 py-1 text-xs text-muted">
                    {formatCurrency(span.costUsd)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-ink">Prompt and response</h2>
          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-muted">User input</p>
              <p className="rounded-md border border-border bg-[#fbfaf6] p-3 text-sm leading-6 text-ink">
                {trace.userInput}
              </p>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-muted">System prompt</p>
              <p className="rounded-md border border-border bg-[#fbfaf6] p-3 text-sm leading-6 text-ink">
                {trace.systemPrompt}
              </p>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-muted">Final response</p>
              <p className="rounded-md border border-border bg-[#fbfaf6] p-3 text-sm leading-6 text-ink">
                {trace.finalResponse}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-md border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-ink">RAG inspection</h2>
          <div className="mt-4 space-y-3">
            {trace.retrievalChunks.map((chunk) => (
              <article key={chunk.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-xs font-semibold text-scope-blue">
                    {chunk.source}
                  </p>
                  <span className="text-xs font-semibold text-muted">
                    score {formatPercent(chunk.score)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink">{chunk.excerpt}</p>
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-muted">
                  {chunk.cited ? (
                    <CheckCircle2 size={14} className="text-scope-green" />
                  ) : (
                    <CircleAlert size={14} className="text-scope-amber" />
                  )}
                  {chunk.cited ? "Cited by answer" : "Not cited"}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-ink">Evaluator output</h2>
          <div className="mt-4 space-y-3">
            {trace.evalResults.map((result) => (
              <div key={result.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold capitalize text-ink">
                    {result.evaluator.replaceAll("_", " ")}
                  </p>
                  <span className={result.passed ? "text-scope-green" : "text-scope-red"}>
                    {formatPercent(result.score)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{result.notes}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-md bg-surface-strong p-3 text-sm text-muted">
            <MessageSquareText size={16} />
            User feedback: {trace.feedback}
          </div>
        </div>
      </section>
    </>
  );
}
