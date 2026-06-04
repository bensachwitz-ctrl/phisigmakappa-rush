// lib/logger.ts — structured, single-line JSON logging for Greekstack.
//
// WHY: On Vercel, anything written to stdout/stderr from a Node serverless
// function is captured as a Runtime Log and is queryable in the dashboard
// (Project → Logs) and via `vercel logs`. By emitting ONE line of JSON per
// event — `{ ts, level, msg, ...ctx }` — those logs become structured and
// filterable (by tenant, route, requestId, level) with zero paid tooling.
//
// This module is intentionally dependency-free and framework-agnostic so it
// can be imported from any route handler, cron job, or lib helper. It never
// throws: a logger that crashes the request it's observing is worse than no
// logger at all.
//
// SENTRY-READY (but NOT Sentry-coupled): `errorSink()` is the single
// chokepoint every error flows through. When the team later adopts Sentry,
// the one place to wire `Sentry.captureException` is the clearly-marked hook
// inside `errorSink` — no other call site changes. We do NOT import @sentry
// here; there is no @sentry dependency in package.json and adding one is out
// of scope for this free, Vercel-native layer.

// ── Levels ────────────────────────────────────────────────────────────────
export type LogLevel = "debug" | "info" | "warn" | "error";

/** Free-form structured context. Conventionally carries any of:
 *  `{ tenant, route, requestId, durationMs, eventType, outcome, ... }`. */
export type LogContext = Record<string, unknown>;

// ── Secret redaction ────────────────────────────────────────────────────────
// CRITICAL: structured logs must NEVER leak credentials. `redact()` walks an
// arbitrary value and masks anything whose KEY looks secret-shaped, plus any
// string VALUE that looks like a known secret token (sk_/whsec_/pk_/Bearer …).
// This is defense-in-depth: even if a caller accidentally spreads a whole
// config object or a raw Stripe payload into ctx, the secret never hits stdout.

/** Key names that indicate a secret value. Matched case-insensitively against
 *  each object key. Mirrors the patterns the task mandates:
 *  /secret|token|password|authToken|apiKey|whsec|sk_|key$/i */
const SECRET_KEY_RE = /secret|token|password|auth[_-]?token|api[_-]?key|whsec|sk_|key$/i;

/** Value shapes that are secrets regardless of their key — live Stripe keys,
 *  webhook signing secrets, publishable keys, and Authorization bearer values.
 *  Catches the case where a secret is stored under an innocuous key. */
const SECRET_VALUE_RE = /\b(sk_(live|test)_[A-Za-z0-9]+|rk_(live|test)_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|pk_(live|test)_[A-Za-z0-9]+|Bearer\s+[A-Za-z0-9._\-]+)/;

const MASK = "***";

/**
 * Return a deep copy of `value` with every secret-shaped key masked and every
 * secret-shaped string value masked. Pure + allocation-light; cycle-safe via a
 * WeakSet; bounded recursion depth so a pathological object can't blow the
 * stack inside a logging call. Never throws — on any failure returns the mask
 * rather than risk leaking the original.
 */
export function redact<T>(value: T, _depth = 0, _seen?: WeakSet<object>): T {
  try {
    if (_depth > 8) return MASK as unknown as T;

    // Primitive strings: mask if they look like a secret token.
    if (typeof value === "string") {
      return (SECRET_VALUE_RE.test(value) ? MASK : value) as unknown as T;
    }
    if (value === null || typeof value !== "object") {
      return value;
    }

    const seen = _seen ?? new WeakSet<object>();
    if (seen.has(value as object)) return MASK as unknown as T; // cycle guard
    seen.add(value as object);

    // Errors: keep the useful, non-secret fields only.
    if (value instanceof Error) {
      return {
        name: value.name,
        message: redact(value.message, _depth + 1, seen),
        stack: value.stack,
      } as unknown as T;
    }

    if (Array.isArray(value)) {
      return value.map((v) => redact(v, _depth + 1, seen)) as unknown as T;
    }

    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY_RE.test(k)) {
        out[k] = MASK;
      } else {
        out[k] = redact(v, _depth + 1, seen);
      }
    }
    return out as unknown as T;
  } catch {
    // Redaction must be fail-closed: if we can't prove a value is safe, mask it.
    return MASK as unknown as T;
  }
}

// ── Core emitter ─────────────────────────────────────────────────────────────

/** Map a level to the console method Vercel routes to the right log stream. */
function sinkFor(level: LogLevel): (msg: string) => void {
  // eslint-disable-next-line no-console
  switch (level) {
    case "error":
      return console.error;
    case "warn":
      return console.warn;
    default:
      // info + debug → stdout. Vercel captures both.
      // eslint-disable-next-line no-console
      return console.log;
  }
}

/**
 * Emit one structured line: `{ ts, level, msg, ...ctx }`. The context is
 * redacted before serialization so no secret can ever reach the log stream.
 * JSON.stringify failures (circular refs that survive redaction, BigInt, etc.)
 * degrade to a plain string so an un-serializable ctx never drops the event.
 */
function emit(level: LogLevel, msg: string, ctx?: LogContext): void {
  const record: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg,
  };
  if (ctx && typeof ctx === "object") {
    const safe = redact(ctx);
    for (const [k, v] of Object.entries(safe as Record<string, unknown>)) {
      // Don't let ctx clobber the reserved trio.
      if (k === "ts" || k === "level" || k === "msg") continue;
      record[k] = v;
    }
  }

  let line: string;
  try {
    line = JSON.stringify(record);
  } catch {
    line = JSON.stringify({
      ts: record.ts,
      level,
      msg,
      _logError: "ctx not serializable",
    });
  }
  sinkFor(level)(line);
}

// ── Public logger surface ─────────────────────────────────────────────────────

/**
 * Structured JSON logger. Every method emits a single line so Vercel Runtime
 * Logs stay queryable. Pass structured context as the second arg — conventional
 * keys: `{ tenant, route, requestId, durationMs }`. Secrets are auto-redacted.
 *
 *   logger.info("dues.paid", { route: "/api/dues/webhook", tenant, amountCents });
 *   logger.error("checkout.failed", { route, tenant, err: e });
 */
export const logger = {
  debug(msg: string, ctx?: LogContext): void {
    // Only emit debug noise outside production to keep prod logs signal-dense.
    if (process.env.NODE_ENV === "production") return;
    emit("debug", msg, ctx);
  },
  info(msg: string, ctx?: LogContext): void {
    emit("info", msg, ctx);
  },
  warn(msg: string, ctx?: LogContext): void {
    emit("warn", msg, ctx);
  },
  error(msg: string, ctx?: LogContext): void {
    emit("error", msg, ctx);
  },
};

// ── Error chokepoint (Sentry-ready) ──────────────────────────────────────────

/**
 * The SINGLE error-reporting chokepoint for the app. Route every caught error
 * that matters through `errorSink(err, ctx)` instead of a bare `console.error`.
 *
 * Today it just emits a structured `logger.error` line (captured by Vercel
 * Runtime Logs). It is deliberately shaped as the one hook a future Sentry
 * (or any APM) integration plugs into — see the clearly-marked block below.
 *
 * @param err  The thrown value (Error or unknown). Normalized + redacted.
 * @param ctx  Structured context: `{ route, tenant, requestId, ... }`.
 */
export function errorSink(err: unknown, ctx?: LogContext): void {
  const normalized =
    err instanceof Error
      ? { name: err.name, message: err.message, stack: err.stack }
      : { message: typeof err === "string" ? err : safeStringify(err) };

  // Always log via the structured logger → Vercel Runtime Logs.
  logger.error(normalized.message || "unhandled error", {
    ...(ctx || {}),
    err: normalized,
  });

  // ── FUTURE SENTRY HOOK (no-op today) ──────────────────────────────────────
  // When the team adopts Sentry, this is the ONE place to forward errors — no
  // other call site changes. Intentionally NOT importing @sentry/* (it is not
  // a dependency; adding it is out of scope for this free, Vercel-native layer).
  //
  // To enable later:
  //   1. `npm i @sentry/nextjs` and add the standard instrumentation files.
  //   2. Uncomment + wire the guarded block below.
  //
  // if (process.env.SENTRY_DSN) {
  //   // import("@sentry/nextjs").then((Sentry) =>
  //   //   Sentry.captureException(err, { extra: redact(ctx) as Record<string, unknown> })
  //   // ).catch(() => {});  // never let telemetry failure surface to the request
  // }
  // TODO(sentry): activate the block above once @sentry/nextjs is installed and
  // SENTRY_DSN is configured in Vercel env. Until then this is a structured-log
  // no-op so error reporting is centralized and ready to upgrade.
}

/** JSON.stringify that never throws (used only for non-Error thrown values). */
function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(redact(v));
  } catch {
    return "unserializable error value";
  }
}
