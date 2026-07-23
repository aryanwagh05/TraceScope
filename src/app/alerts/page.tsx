import { revalidatePath } from "next/cache";
import { BellRing } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { AlertStatusPill, SeverityPill } from "@/components/status-pill";
import {
  alertMetricOptions,
  evaluateAlertRules,
  summarizeAlertHealth,
} from "@/lib/alert-engine";
import { listTraces } from "@/lib/trace-store";
import { addAlertRule, listAlertRules } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

async function createAlertRule(formData: FormData) {
  "use server";

  await addAlertRule(formData);
  revalidatePath("/alerts");
}

export default async function AlertsPage() {
  const traces = await listTraces();
  const rules = await listAlertRules();
  const evaluatedRules = evaluateAlertRules(traces, rules);
  const firingCount = evaluatedRules.filter((rule) => rule.status === "firing").length;
  const healthSummary = summarizeAlertHealth(traces);

  return (
    <>
      <PageHeader
        eyebrow="Alert rules"
        title="Catch reliability drift early"
        description="Rules are evaluated against the current trace store, so firing state changes when real telemetry changes."
        action={
          <a
            href="#new-alert"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-[#ffffff]"
          >
            <BellRing size={16} />
            New rule
          </a>
        }
      />

      <section className="mb-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {healthSummary.map((metric) => (
          <div key={metric.label} className="border-l border-border pl-3">
            <p className="text-xs font-semibold uppercase text-muted">{metric.label}</p>
            <p className="mt-1 text-xl font-semibold text-ink">{metric.value}</p>
          </div>
        ))}
      </section>

      <section className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="data-table min-w-[880px] text-left text-sm">
          <thead>
            <tr className="bg-surface-strong text-xs uppercase text-muted">
              <th className="px-4 py-3 font-semibold">Rule</th>
              <th className="px-4 py-3 font-semibold">Metric</th>
              <th className="px-4 py-3 font-semibold">Current</th>
              <th className="px-4 py-3 font-semibold">Threshold</th>
              <th className="px-4 py-3 font-semibold">Severity</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Last fired</th>
            </tr>
          </thead>
          <tbody>
            {evaluatedRules.map((alert) => (
              <tr key={alert.id}>
                <td className="px-4 py-3 font-semibold text-ink">{alert.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{alert.metric}</td>
                <td className="px-4 py-3 text-ink">{alert.currentLabel}</td>
                <td className="px-4 py-3 text-muted">
                  {alert.operator ?? ">"} {alert.threshold}
                </td>
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

      <section id="new-alert" className="mt-6 rounded-md border border-border bg-surface p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-ink">Create alert rule</h2>
          <p className="text-sm text-muted">
            {firingCount
              ? `${firingCount} rule${firingCount === 1 ? " is" : "s are"} firing on current traces.`
              : "All enabled rules are below their firing threshold."}
          </p>
        </div>

        <form action={createAlertRule} className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_1fr_.7fr_.7fr_.7fr_auto]">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Name</span>
            <input
              name="name"
              required
              placeholder="High average cost"
              className="h-10 rounded-md border border-border bg-[#fbfaf6] px-3 text-sm outline-none focus:border-scope-blue"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Metric</span>
            <select
              name="metric"
              className="h-10 rounded-md border border-border bg-[#fbfaf6] px-3 text-sm outline-none focus:border-scope-blue"
            >
              {alertMetricOptions().map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Operator</span>
            <select
              name="operator"
              className="h-10 rounded-md border border-border bg-[#fbfaf6] px-3 text-sm outline-none focus:border-scope-blue"
            >
              <option value=">">greater than</option>
              <option value="<">less than</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Threshold</span>
            <input
              name="threshold"
              required
              type="number"
              step="0.001"
              placeholder="0.08"
              className="h-10 rounded-md border border-border bg-[#fbfaf6] px-3 text-sm outline-none focus:border-scope-blue"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Severity</span>
            <select
              name="severity"
              className="h-10 rounded-md border border-border bg-[#fbfaf6] px-3 text-sm outline-none focus:border-scope-blue"
            >
              <option value="warning">warning</option>
              <option value="critical">critical</option>
              <option value="info">info</option>
            </select>
          </label>
          <button className="mt-6 h-10 rounded-md bg-ink px-4 text-sm font-semibold text-[#ffffff]">
            Save
          </button>
        </form>
      </section>
    </>
  );
}
