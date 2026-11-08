import { describe, expect, it } from "vitest";

import { turnstileTokenSchema } from "./turnstile";

describe("Cloudflare signup verification", () => {
  it("requires a completed Turnstile token", () => {
    expect(turnstileTokenSchema.safeParse("").success).toBe(false);
    expect(turnstileTokenSchema.safeParse("   ").success).toBe(false);
    expect(turnstileTokenSchema.safeParse("valid-token").success).toBe(true);
  });

  it("rejects tokens longer than Cloudflare's 2048-character limit", () => {
    expect(turnstileTokenSchema.safeParse("x".repeat(2048)).success).toBe(true);
    expect(turnstileTokenSchema.safeParse("x".repeat(2049)).success).toBe(false);
  });
});
