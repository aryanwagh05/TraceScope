"use client";

import Link from "next/link";
import { useActionState } from "react";

interface ExampleState {
  traceId?: string;
  answer?: string;
  gatewayLogId?: string;
  status?: string;
  error?: string;
}

export function AiGatewayExample({
  action,
  enabled,
}: {
  action: (previous: ExampleState, formData: FormData) => Promise<ExampleState>;
  enabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <section className="mt-6 border-t border-border pt-5">
      <h2 className="text-lg font-semibold text-ink">Try AI Gateway</h2>
      <p className="mt-1 text-sm text-muted">Send a real question through Workers AI and inspect the resulting trace.</p>
      <form action={formAction} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          name="question"
          required
          maxLength={500}
          defaultValue="What does a trace tell us about an AI answer?"
          className="h-10 min-w-0 flex-1 rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-scope-blue"
        />
        <button disabled={!enabled || pending} className="h-10 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Running..." : "Run example"}
        </button>
      </form>
      {!enabled ? <p className="mt-2 text-sm text-muted">Connect the Cloudflare backend to enable live inference.</p> : null}
      {state.error ? <p className="mt-3 text-sm text-scope-red">{state.error}</p> : null}
      {state.traceId ? (
        <div className="mt-4 border-l-2 border-scope-blue pl-4 text-sm">
          <p className="text-xs font-semibold uppercase text-muted">{state.status}</p>
          <p className="mt-2 whitespace-pre-wrap text-ink">{state.answer}</p>
          <p className="mt-3 font-mono text-xs text-muted">Trace {state.traceId}</p>
          {state.gatewayLogId ? <p className="font-mono text-xs text-muted">Gateway log {state.gatewayLogId}</p> : null}
          <Link href="/traces" className="mt-3 inline-block font-semibold text-scope-blue">Open trace explorer</Link>
        </div>
      ) : null}
    </section>
  );
}
