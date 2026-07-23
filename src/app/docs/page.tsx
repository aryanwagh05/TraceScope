import { Clipboard, TerminalSquare } from "lucide-react";
import { PageHeader } from "@/components/page-header";

const pythonSnippet = `import requests

trace = {
    "app": "support-bot",
    "environment": "prod",
    "model": "gpt-5.6-sol",
    "userInput": user_message,
    "systemPrompt": system_prompt,
    "finalResponse": answer,
    "tags": ["rag", "customer-support"],
    "spans": [
        {"name": "Retrieve chunks", "type": "retrieval", "status": "ok", "latencyMs": 142},
        {"name": "Generate answer", "type": "model", "status": "ok", "latencyMs": 684, "tokenCount": 1800, "costUsd": 0.024},
    ],
    "evalResults": [
        {"evaluator": "groundedness", "score": 0.91, "passed": True, "notes": "Answer is supported by retrieved context."}
    ],
}

requests.post("http://localhost:3000/api/traces", json=trace, timeout=5)`;

const typescriptSnippet = `export async function answerQuestion(input: string) {
  const trace = await runInstrumentedWorkflow({
    app: "docs-qa",
    environment: "prod",
    model: "gpt-5.6-sol",
    tags: ["rag", "customer-facing"],
  });

  await fetch("/api/traces", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(trace),
  });

  return trace.finalResponse;
}`;

export default function DocsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Integration docs"
        title="Instrument prompts, retrieval, tools, evals, and feedback"
        description="These examples send OpenTelemetry-style trace and span data to the working local ingestion endpoint."
      />

      <section className="grid gap-4 xl:grid-cols-2">
        {[
          ["Python instrumentation", pythonSnippet],
          ["TypeScript OpenAI wrapper", typescriptSnippet],
        ].map(([title, snippet]) => (
          <article key={title} className="rounded-md border border-border bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <TerminalSquare size={18} className="text-scope-blue" />
                <h2 className="text-base font-semibold text-ink">{title}</h2>
              </div>
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted"
                title="Copy snippet"
              >
                <Clipboard size={15} />
              </button>
            </div>
            <pre className="overflow-x-auto p-4 text-xs leading-6 text-ink">
              <code>{snippet}</code>
            </pre>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-md border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-ink">OpenTelemetry-inspired schema</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            "trace_id links a user request across spans",
            "span_type separates retrieval, model, tool, validation, and eval work",
            "attributes stores model, prompt version, tags, source IDs, token counts, and cost",
            "events records feedback, evaluator failures, retries, and alert matches",
          ].map((item) => (
            <p key={item} className="rounded-md border border-border bg-[#fbfaf6] p-3 text-sm leading-6 text-muted">
              {item}
            </p>
          ))}
        </div>
      </section>
    </>
  );
}
