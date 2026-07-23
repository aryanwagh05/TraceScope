import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { experiments } from "@/lib/demo-data";

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

export default function ExperimentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Prompt and model comparison"
        title="Compare quality, latency, and cost"
        description="Run the same eval cases across prompt versions, model choices, retrieval thresholds, and tool policies before promoting changes."
      />

      <section className="grid gap-4">
        {experiments.map((experiment) => (
          <article key={experiment.id} className="rounded-md border border-border bg-surface p-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="text-xs font-semibold uppercase text-scope-blue">{experiment.id}</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">{experiment.name}</h2>
                <p className="mt-2 text-sm text-muted">
                  {experiment.control} vs {experiment.variant}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-md bg-surface-strong p-3">
                  <p className="text-xs uppercase text-muted">Quality</p>
                  <p className="mt-1 font-semibold">
                    <Delta value={experiment.qualityDelta} />
                  </p>
                </div>
                <div className="rounded-md bg-surface-strong p-3">
                  <p className="text-xs uppercase text-muted">Cost</p>
                  <p className="mt-1 font-semibold">
                    <Delta value={experiment.costDelta} invert />
                  </p>
                </div>
                <div className="rounded-md bg-surface-strong p-3">
                  <p className="text-xs uppercase text-muted">Latency</p>
                  <p className="mt-1 font-semibold">
                    <Delta value={experiment.latencyDelta} invert />
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-4 rounded-md border border-border bg-[#fbfaf6] p-3 text-sm leading-6 text-ink">
              {experiment.recommendation}
            </p>
          </article>
        ))}
      </section>
    </>
  );
}
