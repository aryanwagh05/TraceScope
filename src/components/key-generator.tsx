"use client";

import { useActionState } from "react";

interface KeyState {
  token?: string;
  error?: string;
}

export function KeyGenerator({
  action,
}: {
  action: (previous: KeyState, formData: FormData) => Promise<KeyState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <div>
      <form action={formAction} className="mt-4 flex gap-2">
        <input
          name="keyName"
          required
          maxLength={80}
          placeholder="Production integration"
          className="h-10 min-w-0 flex-1 rounded-md border border-border bg-[#fbfaf6] px-3 text-sm outline-none focus:border-scope-blue"
        />
        <button disabled={pending} className="h-10 rounded-md border border-border px-4 text-sm font-semibold text-ink disabled:opacity-50">
          Generate
        </button>
      </form>
      {state.token ? (
        <div className="mt-3 border-l-2 border-scope-green pl-3 text-sm">
          <p className="font-semibold text-ink">Copy this key now. It will not be shown again.</p>
          <code className="mt-1 block break-all font-mono text-xs text-ink">{state.token}</code>
        </div>
      ) : null}
      {state.error ? <p className="mt-2 text-sm text-scope-red">{state.error}</p> : null}
    </div>
  );
}
