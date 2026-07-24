export const SESSION_COOKIE_NAME = "tracescope_session";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

const encoder = new TextEncoder();

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function getConsolePassword() {
  const configured = process.env.TRACESCOPE_CONSOLE_PASSWORD?.trim();

  if (configured) {
    return configured;
  }

  return isProduction() ? null : "tracescope-local";
}

function getSessionSecret() {
  const configuredSecret = process.env.TRACESCOPE_SESSION_SECRET?.trim();
  const password = getConsolePassword();

  if (configuredSecret) {
    return configuredSecret;
  }

  if (password && !isProduction()) {
    return `local-session:${password}`;
  }

  return null;
}

function base64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

async function signPayload(payload: string) {
  const secret = getSessionSecret();

  if (!secret) {
    return null;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));

  return base64Url(signature);
}

export function verifyConsolePassword(password: string) {
  const configured = getConsolePassword();

  return Boolean(configured && constantTimeEqual(password, configured));
}

export async function createSessionToken() {
  const issuedAt = Date.now().toString();
  const payload = `v1.${issuedAt}`;
  const signature = await signPayload(payload);

  if (!signature) {
    return null;
  }

  return `${payload}.${signature}`;
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) {
    return false;
  }

  const [version, issuedAt, signature, ...rest] = token.split(".");

  if (version !== "v1" || rest.length > 0 || !issuedAt || !signature) {
    return false;
  }

  const issuedAtMs = Number(issuedAt);
  if (!Number.isFinite(issuedAtMs)) {
    return false;
  }

  const ageMs = Date.now() - issuedAtMs;
  if (ageMs < 0 || ageMs > SESSION_MAX_AGE_SECONDS * 1000) {
    return false;
  }

  const expectedSignature = await signPayload(`${version}.${issuedAt}`);

  return Boolean(expectedSignature && constantTimeEqual(signature, expectedSignature));
}

