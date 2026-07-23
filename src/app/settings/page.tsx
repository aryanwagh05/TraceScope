import { KeyRound, SlidersHorizontal, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Workspace settings"
        title="Production controls for AI teams"
        description="Configure projects, environments, sampling, alert budgets, API keys, retention, and evaluator thresholds."
      />

      <section className="grid gap-4 xl:grid-cols-3">
        {[
          {
            icon: Users,
            title: "Team workspace",
            rows: [
              "Aryan Wagh - owner",
              "Platform Engineers - editor",
              "Recruiter demo - viewer",
            ],
          },
          {
            icon: SlidersHorizontal,
            title: "Quality budgets",
            rows: [
              "groundedness >= 0.72",
              "latency p95 < 4s",
              "cost avg < $0.08",
              "schema failures < 2%",
            ],
          },
          {
            icon: KeyRound,
            title: "Ingestion keys",
            rows: [
              "prod key rotates every 30 days",
              "staging key sampled at 100%",
              "dev key sampled at 25%",
            ],
          },
        ].map((section) => {
          const Icon = section.icon;
          return (
            <article key={section.title} className="rounded-md border border-border bg-surface p-4">
              <div className="flex items-center gap-2">
                <Icon size={18} className="text-scope-blue" />
                <h2 className="text-lg font-semibold text-ink">{section.title}</h2>
              </div>
              <div className="mt-4 space-y-2">
                {section.rows.map((row) => (
                  <p key={row} className="rounded-md bg-surface-strong px-3 py-2 text-sm text-muted">
                    {row}
                  </p>
                ))}
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
