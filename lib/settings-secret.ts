/**
 * Single source of truth for which SiteConfig keys are SECRETS that must be
 * masked WRITE-ONLY before the chapter config is serialized to the client.
 *
 * Both the JSON read route (app/api/admin/settings GET) AND the server-rendered
 * settings page (app/admin/settings/page.tsx, which hands the config to the
 * client SettingsManager as props) run every key through `maskSecretConfig`, so a
 * secret value never crosses to the browser from either path. The client only
 * ever sees the mask ("set") or an empty string ("not set"); the real value stays
 * on the server and is only overwritten when an admin types a NEW value.
 *
 * The pattern covers:
 *   • anything containing "secret"     (dues.stripeWebhookSecret, notify.webhook.secret)
 *   • resend.apiKey / twilio.authToken (send-on-your-behalf provider creds)
 *   • the notify push destinations     (slack/teams/discord webhooks, telegram
 *     bot token, generic webhook url)  — a webhook URL / bot token is itself the
 *     bearer credential for that channel, so it must not leak to a member.
 */
export const SECRET_KEY_RE =
  /secret|resend\.apikey|twilio\.authtoken|notify\.(slack|teams|discord)\.webhook|notify\.webhook\.url|notify\.telegram\.bottoken/i;

/** The exact mask the client renders as a configured ("set") secret. */
export const SECRET_MASK = "••••••••";

/** True when a key holds a write-only secret. */
export function isSecretKey(key: string): boolean {
  return SECRET_KEY_RE.test(key);
}

/**
 * Return a copy of the config with every secret key masked: a present value
 * becomes SECRET_MASK, an absent one becomes "". Non-secret keys pass through
 * unchanged. Pure — safe to call on the server before sending to any client.
 */
export function maskSecretConfig(all: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(all)) {
    out[k] = isSecretKey(k) ? (v ? SECRET_MASK : "") : v;
  }
  return out;
}
