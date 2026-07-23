import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StatusPill } from "@/components/status-pill";
import type { Trace } from "@/lib/types";
import {
  formatCurrency,
  formatDateTime,
  formatMs,
  formatNumber,
  formatPercent,
} from "@/lib/format";

export function TraceTable({ traces }: { traces: Trace[] }) {
  if (traces.length === 0) {
    return (
      <div className="rounded-md border border-border bg-surface p-6">
        <p className="text-sm font-semibold text-ink">No traces found</p>
        <p className="mt-1 text-sm leading-6 text-muted">
          Ingest telemetry or loosen the active filters to inspect trace data.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-surface">
      <table className="data-table min-w-[920px] text-left text-sm">
        <thead>
          <tr className="bg-surface-strong text-xs uppercase text-muted">
            <th className="px-4 py-3 font-semibold">Trace</th>
            <th className="px-4 py-3 font-semibold">App</th>
            <th className="px-4 py-3 font-semibold">Model</th>
            <th className="px-4 py-3 font-semibold">Latency</th>
            <th className="px-4 py-3 font-semibold">Cost</th>
            <th className="px-4 py-3 font-semibold">Tokens</th>
            <th className="px-4 py-3 font-semibold">Eval</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Opened</th>
          </tr>
        </thead>
        <tbody>
          {traces.map((trace) => (
            <tr key={trace.id} className="text-ink">
              <td className="px-4 py-3 font-mono text-xs">
                <Link
                  href={`/traces/${trace.id}`}
                  className="inline-flex items-center gap-2 font-semibold text-scope-blue"
                >
                  {trace.id}
                  <ArrowRight size={14} />
                </Link>
              </td>
              <td className="px-4 py-3">
                <p className="font-medium">{trace.app}</p>
                <p className="text-xs text-muted">{trace.environment}</p>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted">{trace.model}</td>
              <td className="px-4 py-3">{formatMs(trace.latencyMs)}</td>
              <td className="px-4 py-3">{formatCurrency(trace.costUsd)}</td>
              <td className="px-4 py-3">{formatNumber(trace.tokenCount)}</td>
              <td className="px-4 py-3">{formatPercent(trace.evalScore)}</td>
              <td className="px-4 py-3">
                <StatusPill status={trace.status} />
              </td>
              <td className="px-4 py-3 text-xs text-muted">{formatDateTime(trace.timestamp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
