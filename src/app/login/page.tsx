import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Braces, LockKeyhole } from "lucide-react";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  verifyConsolePassword,
} from "@/lib/security";

export const dynamic = "force-dynamic";

function safeNext(value: FormDataEntryValue | string | string[] | null | undefined) {
  const raw = Array.isArray(value) ? value[0] : String(value ?? "/dashboard");

  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
}

async function loginAction(formData: FormData) {
  "use server";

  const password = String(formData.get("password") ?? "");
  const nextPath = safeNext(formData.get("next"));

  if (!verifyConsolePassword(password)) {
    redirect(`/login?error=1&next=${encodeURIComponent(nextPath)}`);
  }

  const token = await createSessionToken();

  if (!token) {
    redirect(`/login?error=config&next=${encodeURIComponent(nextPath)}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect(nextPath);
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const nextPath = safeNext(params.next);
  const error = Array.isArray(params.error) ? params.error[0] : params.error;

  return (
    <main className="min-h-screen bg-ink text-[#ffffff]">
      <section className="grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_440px]">
        <div className="flex flex-col justify-between px-6 py-6 sm:px-10 lg:px-14">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-md border border-[#ffffff]/15 bg-[#ffffff]/10">
              <Braces size={23} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d7dddf]">
                TraceScope
              </p>
              <p className="text-xs text-[#a9b7bd]">Protected observability console</p>
            </div>
          </div>

          <div className="max-w-3xl py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8fc8e5]">
              Workspace Access
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-normal sm:text-6xl lg:text-7xl">
              Keep production telemetry behind a deliberate gate.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#c7d2d6]">
              TraceScope stores prompts, retrieved context, evaluator notes, cost, latency,
              and feedback. This lock screen keeps the console private while ingestion
              keys continue to accept authenticated telemetry from applications.
            </p>
          </div>

          <p className="text-xs leading-6 text-[#8c9aa1]">
            Local development password: <span className="font-mono">tracescope-local</span>.
            Set <span className="font-mono">TRACESCOPE_CONSOLE_PASSWORD</span> and{" "}
            <span className="font-mono">TRACESCOPE_SESSION_SECRET</span> before deployment.
          </p>
        </div>

        <div className="flex items-center border-t border-[#ffffff]/10 bg-[#f7f6f1] p-6 text-ink lg:border-l lg:border-t-0 lg:p-10">
          <form action={loginAction} className="w-full rounded-md border border-border bg-surface p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-ink text-[#ffffff]">
              <LockKeyhole size={20} />
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-ink">Unlock console</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Enter the workspace password to inspect traces, alerts, eval runs,
              experiments, datasets, and settings.
            </p>

            <input type="hidden" name="next" value={nextPath} />

            <label className="mt-5 grid gap-1 text-sm">
              <span className="font-medium text-ink">Workspace password</span>
              <input
                name="password"
                type="password"
                required
                autoFocus
                autoComplete="current-password"
                className="h-11 rounded-md border border-border bg-[#fbfaf6] px-3 text-sm outline-none focus:border-scope-blue"
              />
            </label>

            {error ? (
              <p className="mt-3 rounded-md border border-[#efc4bb] bg-[#fff3f0] px-3 py-2 text-sm text-scope-red">
                {error === "config"
                  ? "Console security is not configured for this environment."
                  : "That password did not match the workspace gate."}
              </p>
            ) : null}

            <button className="mt-5 h-11 w-full rounded-md bg-ink px-4 text-sm font-semibold text-[#ffffff]">
              Continue to TraceScope
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
