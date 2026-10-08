import "server-only";

export function isCloudflareConfigured() {
  const configured = Boolean(process.env.TRACESCOPE_WORKER_URL && process.env.TRACESCOPE_ADMIN_TOKEN);
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("Cloudflare backend configuration is missing in production.");
  }
  return configured;
}

export async function cloudflareRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = process.env.TRACESCOPE_WORKER_URL;
  const token = process.env.TRACESCOPE_ADMIN_TOKEN;
  if (!base || !token) {
    throw new Error("Cloudflare backend is not configured.");
  }
  const response = await fetch(new URL(path, `${base.replace(/\/$/, "")}/`), {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Cloudflare backend returned ${response.status}`);
  }
  return (await response.json()) as T;
}
