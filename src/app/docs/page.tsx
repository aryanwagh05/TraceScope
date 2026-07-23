import { Clipboard, TerminalSquare } from "lucide-react";
import { PageHeader } from "@/components/page-header";

const pythonSnippet = `from tracescope import TraceScope

client = TraceScope(api_key=os.environ["TRACESCOPE_API_KEY"])

with client.trace(app="support-bot", environment="prod") as trace:
    trace.log_prompt(system=system_prompt, user=user_message)
    chunks = retriever.search(user_message)
    trace.log_retrieval(chunks)
    response = openai_client.responses.create(
        model="gpt-5.6-sol",
        input=user_message,
    )
    trace.log_model_response(response)
    trace.log_eval("groundedness", score=0.91, passed=True)`;

const typescriptSnippet = `import { traceOpenAI } from "@tracescope/sdk";

export async function answerQuestion(input: string) {
  return traceOpenAI({
    app: "docs-qa",
    environment: "prod",
    model: "gpt-5.6-sol",
    tags: ["rag", "customer-facing"],
    run: async ({ logRetrieval, logEval }) => {
      const chunks = await searchDocs(input);
      logRetrieval(chunks);
      const response = await openai.responses.create({ model: "gpt-5.6-sol", input });
      logEval("citation_support", evaluateCitations(response, chunks));
      return response;
    },
  });
}`;

export default function DocsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Integration docs"
        title="Instrument prompts, retrieval, tools, evals, and feedback"
        description="These examples show how a production app would send OpenTelemetry-style trace and span data to TraceScope."
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
