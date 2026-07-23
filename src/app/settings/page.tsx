import { revalidatePath } from "next/cache";
import { KeyRound, SlidersHorizontal, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  generateIngestionKey,
  getWorkspaceSettings,
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

async function generateKeyAction(formData: FormData) {
  "use server";

  const name = String(formData.get("keyName") ?? "Local key");
  await generateIngestionKey(name);
  revalidatePath("/settings");
  revalidatePath("/", "layout");
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
        description="These settings drive ingestion authorization, alert thresholds, and the quality budgets shown across the app."
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
                <dd className="mt-1 font-semibold text-ink">Local persisted workspace</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-md border border-border bg-surface p-4">
            <div className="flex items-center gap-2">
              <KeyRound size={18} className="text-scope-blue" />
              <h2 className="text-lg font-semibold text-ink">Ingestion keys</h2>
            </div>
            <form action={generateKeyAction} className="mt-4 flex gap-2">
              <input
                name="keyName"
                placeholder="Render worker"
                className="h-10 min-w-0 flex-1 rounded-md border border-border bg-[#fbfaf6] px-3 text-sm outline-none focus:border-scope-blue"
              />
              <button className="h-10 rounded-md border border-border px-4 text-sm font-semibold text-ink">
                Generate
              </button>
            </form>
            <div className="mt-4 divide-y divide-border">
              {settings.ingestionKeys.map((key) => (
                <div key={key.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{key.name}</p>
                      <p className="mt-1 font-mono text-xs text-muted">{key.token}</p>
                    </div>
                    <p className="shrink-0 text-xs text-muted">
                      {key.lastUsedAt ? `Used ${formatDateTime(key.lastUsedAt)}` : "Never used"}
                    </p>
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
