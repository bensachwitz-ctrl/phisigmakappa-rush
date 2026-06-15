/**
 * ────────────────────────────────────────────────────────────────────────────
 * CHATWOOT LIVE-CHAT SUPPORT — config resolver (pure, server-safe)
 * ────────────────────────────────────────────────────────────────────────────
 * Greekstack chapters can offer a free, self-hostable live-chat support desk
 * (Chatwoot, MIT-core) to their members + recruits without any paid SaaS. The
 * widget is wired through the SAME inert-adapter discipline as Plausible/Sentry:
 *
 *   • FULLY INERT WITHOUT CONFIG. If the two env vars below are unset (or
 *     malformed), `resolveChatwootConfig` returns `null`, the <Script> never
 *     renders, no SDK loads, and the output is byte-identical to before. A
 *     chapter that never touches Chatwoot pays nothing — no network, no JS.
 *
 *   • CONFIG LIVES ONLY IN ENV. Both values are read from process.env on the
 *     server (never committed, never echoed). They are PUBLISHABLE by design —
 *     the website token + base URL are embedded in the public widget snippet on
 *     every Chatwoot install — so they are safe to surface in client HTML, but
 *     we still validate them so a malformed/hostile value can't inject into the
 *     script src or the `run()` arguments.
 *
 *     CHATWOOT_BASE_URL       e.g. https://support.greekstack.app  (your install)
 *     CHATWOOT_WEBSITE_TOKEN  the inbox's website token from Chatwoot admin
 *
 * The resolver is intentionally a pure function of an env-like record so it is
 * unit-testable with no globals — see tests/chatwoot.test.ts.
 */

export interface ChatwootConfig {
  /** Origin of the Chatwoot install, scheme + host, no trailing slash. */
  baseUrl: string;
  /** The inbox website token (identifies which support inbox to open). */
  websiteToken: string;
}

/** The env shape this module reads. A plain record keeps it test-injectable. */
export type ChatwootEnv = Record<string, string | undefined>;

/**
 * Validate a Chatwoot base URL. Must be an absolute http(s) origin. Returns the
 * normalized origin (no trailing slash, no path/query/hash) or "" if invalid.
 * Rejecting non-http(s) schemes (javascript:, data:, file:) is the key guard —
 * the value lands in a <script src> and the SDK `baseUrl`.
 */
export function safeChatwootBaseUrl(input: string | undefined): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return "";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "";
  // Normalize to bare origin — drop any pasted path/query/hash so the SDK
  // loader always hits `${origin}/packs/js/sdk.js`.
  return url.origin;
}

/**
 * Validate a Chatwoot website token. Chatwoot tokens are URL-safe base62-ish
 * strings; we accept letters, digits, and the `-`/`_` separators, length-bounded
 * so a giant/garbage value can't bloat the rendered HTML. Returns the token or
 * "" if it doesn't match.
 */
export function safeChatwootToken(input: string | undefined): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (/^[A-Za-z0-9_-]{8,128}$/.test(trimmed)) return trimmed;
  return "";
}

/**
 * Resolve the live Chatwoot config from an env-like record. Returns a validated
 * `{ baseUrl, websiteToken }` ONLY when BOTH values are present and well-formed;
 * otherwise `null` (→ the widget stays inert). Reads `CHATWOOT_BASE_URL` and
 * `CHATWOOT_WEBSITE_TOKEN` (with a `NEXT_PUBLIC_`-prefixed fallback for each, so
 * the values can also be provided the Next-public way without code changes).
 */
export function resolveChatwootConfig(env: ChatwootEnv = process.env): ChatwootConfig | null {
  const baseUrl = safeChatwootBaseUrl(
    env.CHATWOOT_BASE_URL ?? env.NEXT_PUBLIC_CHATWOOT_BASE_URL,
  );
  const websiteToken = safeChatwootToken(
    env.CHATWOOT_WEBSITE_TOKEN ?? env.NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN,
  );
  if (!baseUrl || !websiteToken) return null;
  return { baseUrl, websiteToken };
}

/**
 * Build the small bootstrap script that configures + launches the widget once
 * the SDK has loaded. Kept as a pure string-builder so the exact emitted JS is
 * test-asserted and never drifts. `position`/`launcherColor` brand the floating
 * bubble to the chapter (royal-blue default). The values are interpolated from
 * ALREADY-VALIDATED config + a safe hex, so this never produces injectable HTML.
 */
export function buildChatwootBootstrap(
  cfg: ChatwootConfig,
  opts: { launcherColor?: string; position?: "left" | "right"; locale?: string } = {},
): string {
  const launcherColor = /^#([0-9a-fA-F]{3}){1,2}$/.test(opts.launcherColor ?? "")
    ? (opts.launcherColor as string)
    : "#2563eb";
  const position = opts.position === "left" ? "left" : "right";
  const locale = /^[a-zA-Z-]{2,5}$/.test(opts.locale ?? "") ? (opts.locale as string) : "en";
  const base = JSON.stringify(cfg.baseUrl);
  const token = JSON.stringify(cfg.websiteToken);
  return [
    "window.chatwootSettings={",
    `position:${JSON.stringify(position)},`,
    `launcherColor:${JSON.stringify(launcherColor)},`,
    `locale:${JSON.stringify(locale)},`,
    "type:'expanded_bubble',",
    "useBrowserLanguage:true",
    "};",
    "(function(d,t){",
    `var BASE_URL=${base};`,
    "var g=d.createElement(t),s=d.getElementsByTagName(t)[0];",
    'g.src=BASE_URL+"/packs/js/sdk.js";g.async=true;g.defer=true;',
    "s.parentNode.insertBefore(g,s);",
    "g.onload=function(){",
    `window.chatwootSDK.run({websiteToken:${token},baseUrl:BASE_URL});`,
    "};",
    '})(document,"script");',
  ].join("");
}
