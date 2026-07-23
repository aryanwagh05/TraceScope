import { BellRing } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { AlertStatusPill, SeverityPill } from "@/components/status-pill";
import { alerts } from "@/lib/demo-data";

export default function AlertsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Alert rules"
        title="Catch reliability drift early"
        description="Alert on hallucination risk, latency spikes, cost spikes, JSON failures, retrieval quality drops, and model drift."
        action={
          <button className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white">
            <BellRing size={16} />
            New rule
          </button>
        }
      />

      <section className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="data-table min-w-[760px] text-left text-sm">
          <thead>
            <tr className="bg-surface-strong text-xs uppercase text-muted">
              <th className="px-4 py-3 font-semibold">Rule</th>
              <th className="px-4 py-3 font-semibold">Metric</th>
              <th className="px-4 py-3 font-semibold">Threshold</th>
              <th className="px-4 py-3 font-semibold">Severity</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Last triggered</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <tr key={alert.id}>
                <td className="px-4 py-3 font-semibold text-ink">{alert.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{alert.metric}</td>
                <td className="px-4 py-3 text-muted">{alert.threshold}</td>
                <td className="px-4 py-3">
                  <SeverityPill severity={alert.severity} />
                </td>
                <td className="px-4 py-3">
                  <AlertStatusPill status={alert.status} />
                </td>
                <td className="px-4 py-3 text-xs text-muted">{alert.lastTriggered}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
