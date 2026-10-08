import { revalidatePath } from "next/cache";
import { TerminalSquare } from "lucide-react";
import { AiGatewayExample } from "@/components/ai-gateway-example";
import { CopySnippetButton } from "@/components/copy-snippet-button";
import { PageHeader } from "@/components/page-header";
import { cloudflareRequest, isCloudflareConfigured } from "@/lib/cloudflare-client";

export const dynamic = "force-dynamic";

const pythonSnippet = `# In a terminal, set TRACESCOPE_WORKER_URL and TRACESCOPE_API_KEY.
# Run: python examples/send-trace.py "What is an AI trace?"
# The script makes a real Workers AI request through AI Gateway
# and returns the queued TraceScope trace ID.`;

const typescriptSnippet = `const response = await fetch(
  process.env.TRACESCOPE_WORKER_URL + "/v1/examples/ai",
  {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-tracescope-key": process.env.TRACESCOPE_API_KEY!,
    },
    body: JSON.stringify({ question: "What is an AI trace?" }),
  },
);
if (!response.ok) throw new Error(await response.text());
const { traceId } = await response.json();`;

async function runExampleAction(
  _previous: { traceId?: string; answer?: string; gatewayLogId?: string; status?: string; error?: string },
  formData: FormData,
) {
  "use server";
  const question = String(formData.get("question") ?? "").trim();
  if (!question || question.length > 500) return { error: "Enter a question under 500 characters." };
  try {
    const result = await cloudflareRequest<{
      traceId: string;
      answer: string;
      gatewayLogId?: string;
      status: string;
    }>("/admin/examples/ai", { method: "POST", body: JSON.stringify({ question }) });
    revalidatePath("/traces");
    return result;
  } catch {
    return { error: "The AI Gateway example could not complete. Check the Cloudflare backend and daily limit." };
  }
}

export default function DocsPage() {
  const enabled = isCloudflareConfigured();
  return (
    <>
      <PageHeader
        eyebrow="Integration docs"
        title="Instrument prompts, retrieval, tools, evals, and feedback"
        description="Send real trace and span data to the Cloudflare Worker. New traces appear after queue processing."
      />
      <section className="grid gap-4 xl:grid-cols-2">
        {[
          ["Python live example", pythonSnippet],
          ["TypeScript ingestion", typescriptSnippet],
        ].map(([title, snippet]) => (
          <article key={title} className="rounded-md border border-border bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <TerminalSquare size={18} className="text-scope-blue" />
                <h2 className="text-base font-semibold text-ink">{title}</h2>
              </div>
              <CopySnippetButton text={snippet} />
            </div>
            <pre className="overflow-x-auto p-4 text-xs leading-6 text-ink"><code>{snippet}</code></pre>
          </article>
        ))}
      </section>
      <AiGatewayExample action={runExampleAction} enabled={enabled} />
    </>
  );
}
