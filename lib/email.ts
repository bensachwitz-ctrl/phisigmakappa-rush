import { Resend } from "resend";
import { getChapterIdentity } from "./chapter-identity";
import { getResendConfig } from "./messaging-config";

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}) {
  // Per-tenant Resend creds (SiteConfig) with env fallback. apiKey is null
  // when the chapter hasn't configured Resend (or env is the re_xxxxx
  // placeholder), which keeps the mock path below.
  const { apiKey, fromEmail } = await getResendConfig();
  // NEUTRAL platform default for the from-ADDRESS so an unconfigured chapter
  // never sends from another chapter's domain (cross-brand leak). The
  // per-tenant resend.fromEmail / env override flows through getResendConfig.
  const fromAddr = fromEmail?.trim() || "no-reply@greekstack.vercel.app";

  // Chapter-aware from-NAME (kept): a configured chapter signs as itself; only
  // the address default is neutralized above.
  let fromName = "Greekstack";
  try {
    const identity = await getChapterIdentity();
    fromName = identity.chapterAttribution || identity.fraternityName || fromName;
  } catch (e) {
    // ignore
  }

  const from = `${fromName} <${fromAddr}>`;

  if (!apiKey) {
    console.log(`[Mock Email] to: ${opts.to}, subject: ${opts.subject}`);
    return { ok: true, mock: true };
  }

  try {
    const resend = new Resend(apiKey);
    const res = await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text || opts.subject,
      replyTo: opts.replyTo,
    });
    
    if ("error" in res && res.error) {
      console.error("Resend API error:", res.error);
      return { ok: false, error: res.error.message };
    }
    
    return { ok: true, id: (res as any).id };
  } catch (err: any) {
    console.error("Resend execution error:", err);
    return { ok: false, error: err?.message || "Unknown error" };
  }
}
