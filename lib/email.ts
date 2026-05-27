import { Resend } from "resend";
import { getChapterIdentity } from "./chapter-identity";

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddr = process.env.RESEND_FROM_EMAIL || "rush@phisig-usc.com";
  
  let fromName = "Phi Sigma Kappa";
  try {
    const identity = await getChapterIdentity();
    fromName = identity.chapterAttribution || identity.fraternityName || fromName;
  } catch (e) {
    // ignore
  }
  
  const from = `${fromName} <${fromAddr}>`;

  if (!apiKey || apiKey.startsWith("re_xxxxx") || !apiKey.trim()) {
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
