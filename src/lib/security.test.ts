import { describe, expect, it, vi } from "vitest";
import {
  createSessionToken,
  getConsolePassword,
  verifyConsolePassword,
  verifySessionToken,
} from "./security";

describe("console security helpers", () => {
  it("uses a local development password when no env password is configured", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TRACESCOPE_CONSOLE_PASSWORD", "");

    expect(getConsolePassword()).toBe("tracescope-local");
    expect(verifyConsolePassword("tracescope-local")).toBe(true);
    expect(verifyConsolePassword("wrong-password")).toBe(false);
  });

  it("creates and verifies signed session tokens", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TRACESCOPE_CONSOLE_PASSWORD", "test-password");
    vi.stubEnv("TRACESCOPE_SESSION_SECRET", "test-secret");

    const token = await createSessionToken();

    expect(token).toBeTruthy();
    expect(await verifySessionToken(token ?? undefined)).toBe(true);
    expect(await verifySessionToken(`${token}.tampered`)).toBe(false);
  });
});

