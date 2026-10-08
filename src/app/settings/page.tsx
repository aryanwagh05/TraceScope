import { revalidatePath } from "next/cache";
import { KeyRound, SlidersHorizontal, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KeyGenerator } from "@/components/key-generator";
import {
  generateIngestionKey,
  getWorkspaceSettings,
  revokeIngestionKey,
  saveWorkspaceSettings,
} from "@/lib/workspace-store";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

async function saveSettingsAction(formData: FormData) {
  "use server";

  await saveWorkspaceSettings(formData);
  revalidatePath("/settings");
  revalidatePath("/alerts");
  revalidatePath("/", "layout");
}

async function generateKeyAction(_previous: { token?: string; error?: string }, formData: FormData) {
  "use server";

  const name = String(formData.get("keyName") ?? "Local key");
  try {
    const key = await generateIngestionKey(name);
    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return { token: key.token };
  } catch {
    return { error: "Could not generate the key. Please try again." };
  }
}

async function revokeKeyAction(formData: FormData) {
  "use server";
  await revokeIngestionKey(String(formData.get("keyId") ?? ""));
  revalidatePath("/settings");
}

function NumberField({
  name,
  label,
  value,
  step = "0.01",
}: {
  name: string;
  label: string;
  value: number;
  step?: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-ink">{label}</span>
      <input
        name={name}
        type="number"
        step={step}
        defaultValue={value}
        className="h-10 rounded-md border border-border bg-[#fbfaf6] px-3 text-sm outline-none focus:border-scope-blue"
      />
    </label>
  );
}

export default async function SettingsPage() {
  const settings = await getWorkspaceSettings();

  return (
    <>
      <PageHeader
        eyebrow="Workspace settings"
        title="Production controls for AI teams"
        description="Save workspace identity and quality budgets. Budgets shape new heuristic evaluations and the workspace rules shown in Alerts; ingestion keys are managed below."
      />

      <section className="grid gap-5 xl:grid-cols-[1fr_.9fr]">
        <form action={saveSettingsAction} className="rounded-md border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-scope-blue" />
            <h2 className="text-lg font-semibold text-ink">Quality budgets</h2>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-ink">Workspace name</span>
              <input
                name="workspaceName"
                defaultValue={settings.workspaceName}
                className="h-10 rounded-md border border-border bg-[#fbfaf6] px-3 text-sm outline-none focus:border-scope-blue"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-ink">Owner</span>
              <input
                name="ownerName"
                defaultValue={settings.ownerName}
                className="h-10 rounded-md border border-border bg-[#fbfaf6] px-3 text-sm outline-none focus:border-scope-blue"
              />
            </label>
            <NumberField
              name="groundednessMin"
              label="Groundedness minimum"
              value={settings.groundednessMin}
            />
            <NumberField
              name="citationSupportMin"
              label="Citation support minimum"
              value={settings.citationSupportMin}
            />
            <NumberField
              name="schemaValidityMin"
              label="Schema validity minimum"
              value={settings.schemaValidityMin}
            />
            <NumberField
              name="latencyP95Ms"
              label="Latency p95 budget ms"
              value={settings.latencyP95Ms}
              step="1"
            />
            <NumberField
              name="avgCostUsd"
              label="Average cost budget USD"
              value={settings.avgCostUsd}
              step="0.001"
            />
            <NumberField
              name="hallucinationRiskMax"
              label="Hallucination risk maximum"
              value={settings.hallucinationRiskMax}
            />
            <NumberField
              name="schemaFailureRateMax"
              label="Schema failure rate maximum"
              value={settings.schemaFailureRateMax}
            />
            <NumberField
              name="retrievalQualityMin"
              label="Retrieval quality minimum"
              value={settings.retrievalQualityMin}
            />
          </div>

          <button className="mt-5 h-10 rounded-md bg-ink px-4 text-sm font-semibold text-[#ffffff]">
            Save settings
          </button>
        </form>

        <div className="grid gap-5">
          <section className="rounded-md border border-border bg-surface p-4">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-scope-blue" />
              <h2 className="text-lg font-semibold text-ink">Workspace</h2>
            </div>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="text-xs uppercase text-muted">Name</dt>
                <dd className="mt-1 font-semibold text-ink">{settings.workspaceName}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted">Owner</dt>
                <dd className="mt-1 font-semibold text-ink">{settings.ownerName}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted">Mode</dt>
                <dd className="mt-1 font-semibold text-ink">{process.env.TRACESCOPE_WORKER_URL ? "Cloudflare D1" : "Local development"}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-md border border-border bg-surface p-4">
            <div className="flex items-center gap-2">
              <KeyRound size={18} className="text-scope-blue" />
              <h2 className="text-lg font-semibold text-ink">Ingestion keys</h2>
            </div>
            <KeyGenerator action={generateKeyAction} />
            <div className="mt-4 divide-y divide-border">
              {settings.ingestionKeys.map((key) => (
                <div key={key.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{key.name}</p>
                      <p className="mt-1 font-mono text-xs text-muted">{key.token ?? "Key hidden after creation"}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <p className="text-xs text-muted">
                        {key.lastUsedAt ? `Used ${formatDateTime(key.lastUsedAt)}` : "Never used"}
                      </p>
                      <form action={revokeKeyAction}>
                        <input type="hidden" name="keyId" value={key.id} />
                        <button className="text-xs font-semibold text-scope-red">Revoke</button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
