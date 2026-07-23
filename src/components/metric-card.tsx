import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function MetricCard({
  label,
  value,
  delta,
  detail,
}: {
  label: string;
  value: string;
  delta: string;
  detail: string;
}) {
  const positive = delta.startsWith("+");

  return (
    <article className="rounded-md border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase text-muted">{label}</p>
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold ${
            positive ? "text-scope-green" : "text-scope-blue"
          }`}
        >
          {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {delta}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </article>
  );
}
