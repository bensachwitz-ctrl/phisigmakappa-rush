import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Guards the release-gate fix: errorSink() — the single chokepoint every
 * deliberately try/caught failure flows through (Stripe webhook, onboard
 * provisioning, dues receipts, tenant updates) — must FORWARD those errors to
 * Sentry when SENTRY_DSN is set, not silently drop them into Vercel Runtime
 * Logs. Auto-instrumentation only captures UNHANDLED exceptions; these caught
 * ones would otherwise never reach the operator's error tracker.
 *
 * The forwarding is DSN-gated + dynamically imported, so with no DSN there is
 * zero @sentry load and the layer stays fully Vercel-native.
 */

// Hoisted spy for Sentry.captureException so we can assert on it from the
// dynamic `import("@sentry/nextjs")` inside errorSink.
const mocks = vi.hoisted(() => ({ captureException: vi.fn() }));

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureException,
}));

// errorSink forwards via a dynamic `import("@sentry/nextjs").then(...)`, which
// settles on the microtask queue. Yield to the event loop so that chain drains
// before we assert. A macrotask tick (setTimeout 0) reliably flushes it.
function flushAsync(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// Keep stdout/stderr quiet — errorSink always logs a structured line too.
let errSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  errSpy.mockRestore();
  vi.unstubAllEnvs();
});

describe("errorSink Sentry forwarding", () => {
  it("forwards caught errors to Sentry.captureException when SENTRY_DSN is set", async () => {
    vi.stubEnv("SENTRY_DSN", "https://examplePublicKey@o0.ingest.sentry.io/0");
    const { errorSink } = await import("@/lib/logger");

    const boom = new Error("provisioning_failed");
    errorSink(boom, { route: "/api/onboard", tenant: "usc-psk" });

    // The dynamic import + .then() resolves on a microtask; flush it.
    await flushAsync();

    expect(mocks.captureException).toHaveBeenCalledTimes(1);
    const [forwardedErr, opts] = mocks.captureException.mock.calls[0];
    // The ORIGINAL Error is forwarded (real type/stack preserved), not a
    // normalized plain object.
    expect(forwardedErr).toBe(boom);
    // Context rides along as redacted `extra`.
    expect(opts.extra.route).toBe("/api/onboard");
    expect(opts.extra.tenant).toBe("usc-psk");
  });

  it("redacts secret-shaped context before it becomes Sentry extra", async () => {
    vi.stubEnv("SENTRY_DSN", "https://examplePublicKey@o0.ingest.sentry.io/0");
    const { errorSink } = await import("@/lib/logger");

    errorSink(new Error("handler_error"), {
      route: "/api/dues/webhook",
      stripeSecretKey: "sk_live_abcdef0123456789",
      authToken: "super-secret",
      note: "Bearer eyJhbGciOiabc.def.ghi",
    });

    await flushAsync();

    expect(mocks.captureException).toHaveBeenCalledTimes(1);
    const [, opts] = mocks.captureException.mock.calls[0];
    // Secret-shaped KEYS are masked.
    expect(opts.extra.stripeSecretKey).toBe("***");
    expect(opts.extra.authToken).toBe("***");
    // Secret-shaped VALUES under innocuous keys are masked too.
    expect(opts.extra.note).toBe("***");
    // Non-secret context survives.
    expect(opts.extra.route).toBe("/api/dues/webhook");
  });

  it("does NOT load Sentry when SENTRY_DSN is unset (Vercel-native no-op)", async () => {
    vi.stubEnv("SENTRY_DSN", "");
    const { errorSink } = await import("@/lib/logger");

    errorSink(new Error("tenant_update_failed"), { route: "/api/platform/tenants" });

    await flushAsync();

    expect(mocks.captureException).not.toHaveBeenCalled();
    // The structured log line is still emitted (Runtime Logs).
    expect(errSpy).toHaveBeenCalled();
  });

  it("never lets a Sentry failure surface to the caller", async () => {
    vi.stubEnv("SENTRY_DSN", "https://examplePublicKey@o0.ingest.sentry.io/0");
    mocks.captureException.mockImplementationOnce(() => {
      throw new Error("sentry transport down");
    });
    const { errorSink } = await import("@/lib/logger");

    // Must not throw even though captureException blows up.
    expect(() => errorSink(new Error("dues_receipt_failed"), { route: "/x" })).not.toThrow();
    await flushAsync();
  });
});
