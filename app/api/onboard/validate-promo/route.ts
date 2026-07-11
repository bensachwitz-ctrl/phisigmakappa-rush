import { NextResponse } from "next/server";
import { classifyPromo } from "@/lib/promo-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SERVER-SIDE promo validation for the onboarding wizard. The wizard POSTs the
 * entered code here instead of validating it in the browser — this is what keeps
 * the full-fee-waiver code (a revenue secret) out of the client bundle. The
 * response only reveals whether the code is accepted and whether it is the full
 * waiver (so the wizard can render the "100% off" confirmation); it grants
 * nothing. The actual waiver is applied server-side in /api/onboard, bounded by
 * the allowlist + redemption cap + expiry (see lib/promo-server.ts).
 */
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, valid: false, waiver: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  // Bound the input so a huge/garbage payload can't be used to probe the server.
  const code =
    typeof body?.code === "string" && body.code.length <= 128 ? body.code : "";
  const { valid, waiver } = classifyPromo(code);
  return NextResponse.json({ ok: true, valid, waiver });
}
