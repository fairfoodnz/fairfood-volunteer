import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryRaw, executeRaw, headerValues } = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  executeRaw: vi.fn(),
  headerValues: new Map<string, string>(),
}));

vi.mock("@/lib/db", () => ({
  db: { $queryRaw: queryRaw, $executeRaw: executeRaw },
}));
vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => headerValues.get(name) ?? null }),
}));

import {
  RATE_LIMITS,
  bucketKey,
  clientIpFrom,
  rateLimit,
  retryAfterText,
} from "@/lib/rate-limit";

/** The bucket key passed to the upsert (first interpolated value). */
const keysHit = () => queryRaw.mock.calls.map((call) => call[1] as string);

describe("bucketKey", () => {
  it("hashes the identifier so no raw email or IP is stored", () => {
    const key = bucketKey("signIn", "email", "kiri@example.nz");
    expect(key).toMatch(/^signIn:email:[0-9a-f]{64}$/);
    expect(key).not.toContain("kiri");
  });

  it("normalises case and surrounding whitespace", () => {
    expect(bucketKey("signIn", "email", "  Kiri@Example.NZ ")).toBe(
      bucketKey("signIn", "email", "kiri@example.nz"),
    );
  });

  it("keeps scopes and dimensions apart", () => {
    const id = "kiri@example.nz";
    expect(bucketKey("signIn", "email", id)).not.toBe(
      bucketKey("passwordResetRequest", "email", id),
    );
    expect(bucketKey("signIn", "email", id)).not.toBe(bucketKey("signIn", "ip", id));
  });
});

describe("clientIpFrom", () => {
  const from = (h: Record<string, string>) => clientIpFrom((n) => h[n] ?? null);

  it("takes the right-most X-Forwarded-For hop, the one the proxy added", () => {
    // A client can prepend whatever it likes; only the last hop is trusted.
    expect(from({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" })).toBe("203.0.113.9");
  });

  it("handles a single hop and stray whitespace or empty entries", () => {
    expect(from({ "x-forwarded-for": " 203.0.113.9 " })).toBe("203.0.113.9");
    expect(from({ "x-forwarded-for": "203.0.113.9, " })).toBe("203.0.113.9");
  });

  it("falls back to X-Real-IP, then null", () => {
    expect(from({ "x-real-ip": "198.51.100.7" })).toBe("198.51.100.7");
    expect(from({})).toBeNull();
  });
});

describe("retryAfterText", () => {
  it("rounds up to whole minutes", () => {
    expect(retryAfterText(1)).toBe("a minute");
    expect(retryAfterText(60)).toBe("a minute");
    expect(retryAfterText(61)).toBe("2 minutes");
    expect(retryAfterText(599)).toBe("10 minutes");
    expect(retryAfterText(3600)).toBe("an hour");
  });
});

describe("rateLimit", () => {
  beforeEach(() => {
    headerValues.clear();
    headerValues.set("x-forwarded-for", "203.0.113.9");
    vi.spyOn(Math, "random").mockReturnValue(0.5); // skip the prune sweep
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("allows an attempt under every limit and counts each dimension", async () => {
    queryRaw.mockResolvedValue([{ count: 1, retryAfter: 600 }]);

    await expect(rateLimit("signIn", { email: "kiri@example.nz" })).resolves.toEqual({
      ok: true,
    });
    expect(keysHit()).toEqual([
      bucketKey("signIn", "email", "kiri@example.nz"),
      bucketKey("signIn", "ip", "203.0.113.9"),
    ]);
  });

  it("allows the attempt that reaches the limit exactly", async () => {
    queryRaw.mockResolvedValue([{ count: RATE_LIMITS.signIn.email.limit, retryAfter: 600 }]);
    await expect(rateLimit("signIn", { email: "kiri@example.nz" })).resolves.toEqual({
      ok: true,
    });
  });

  it("blocks once any dimension is over, reporting the longest wait", async () => {
    queryRaw
      .mockResolvedValueOnce([{ count: RATE_LIMITS.signIn.email.limit + 1, retryAfter: 240 }])
      .mockResolvedValueOnce([{ count: RATE_LIMITS.signIn.ip.limit + 1, retryAfter: 420 }]);

    await expect(rateLimit("signIn", { email: "kiri@example.nz" })).resolves.toEqual({
      ok: false,
      retryAfterSeconds: 420,
    });
    // Both buckets still counted, and the audit log names no identifier.
    expect(queryRaw).toHaveBeenCalledTimes(2);
    const logged = vi.mocked(console.warn).mock.calls.flat().join(" ");
    expect(logged).toContain("signIn");
    expect(logged).not.toContain("kiri");
    expect(logged).not.toContain("203.0.113.9");
  });

  it("blocks on the IP alone for IP-only scopes", async () => {
    queryRaw.mockResolvedValue([{ count: RATE_LIMITS.signUp.ip.limit + 1, retryAfter: 900 }]);
    await expect(rateLimit("signUp", {})).resolves.toEqual({
      ok: false,
      retryAfterSeconds: 900,
    });
    expect(keysHit()).toEqual([bucketKey("signUp", "ip", "203.0.113.9")]);
  });

  it("skips a dimension it has no identifier for", async () => {
    headerValues.clear();
    queryRaw.mockResolvedValue([{ count: 1, retryAfter: 600 }]);

    await rateLimit("signIn", { email: "kiri@example.nz" });
    await rateLimit("signUp", {});
    expect(keysHit()).toEqual([bucketKey("signIn", "email", "kiri@example.nz")]);
  });

  it("fails open when the counters can't be reached", async () => {
    queryRaw.mockRejectedValue(new Error("connection refused"));
    await expect(rateLimit("signIn", { email: "kiri@example.nz" })).resolves.toEqual({
      ok: true,
    });
    expect(console.error).toHaveBeenCalled();
  });

  it("occasionally prunes expired buckets, without failing the attempt", async () => {
    vi.mocked(Math.random).mockReturnValue(0);
    queryRaw.mockResolvedValue([{ count: 1, retryAfter: 600 }]);
    executeRaw.mockRejectedValue(new Error("lock timeout"));

    await expect(rateLimit("signUp", {})).resolves.toEqual({ ok: true });
    expect(executeRaw).toHaveBeenCalledTimes(1);
  });
});
