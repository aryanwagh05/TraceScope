import { clsx } from "clsx";
import type { AlertRule, Severity, TraceStatus } from "@/lib/types";

const statusClass: Record<TraceStatus, string> = {
  ok: "border-[#bad7cb] bg-[#eef8f2] text-scope-green",
  warning: "border-[#ead4ae] bg-[#fff6e6] text-scope-amber",
  error: "border-[#edc5bd] bg-[#fff0ed] text-scope-red",
};

const alertClass: Record<AlertRule["status"], string> = {
  healthy: "border-[#bad7cb] bg-[#eef8f2] text-scope-green",
  watching: "border-[#ead4ae] bg-[#fff6e6] text-scope-amber",
  firing: "border-[#edc5bd] bg-[#fff0ed] text-scope-red",
};

const severityClass: Record<Severity, string> = {
  info: "border-[#c7d9e5] bg-[#eef6fa] text-scope-blue",
  warning: "border-[#ead4ae] bg-[#fff6e6] text-scope-amber",
  critical: "border-[#edc5bd] bg-[#fff0ed] text-scope-red",
};

export function StatusPill({ status }: { status: TraceStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex h-7 items-center rounded-md border px-2 text-xs font-semibold capitalize",
        statusClass[status],
      )}
    >
      {status}
    </span>
  );
}

export function AlertStatusPill({ status }: { status: AlertRule["status"] }) {
  return (
    <span
      className={clsx(
        "inline-flex h-7 items-center rounded-md border px-2 text-xs font-semibold capitalize",
        alertClass[status],
      )}
    >
      {status}
    </span>
  );
}

export function SeverityPill({ severity }: { severity: Severity }) {
  return (
    <span
      className={clsx(
        "inline-flex h-7 items-center rounded-md border px-2 text-xs font-semibold capitalize",
        severityClass[severity],
      )}
    >
      {severity}
    </span>
  );
}
