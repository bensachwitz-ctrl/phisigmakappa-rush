import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Apple App Site Association (AASA) — universal links ───────────────────────
// Tapping https://greekstack.com/app?chapter=… (or the vercel host) opens the
// native app straight into that chapter instead of Safari. iOS fetches this file
// over HTTPS at the domain root as `application/json` with NO `.json` extension.
// The associated-domains entitlement (applinks:greekstack.com etc. in
// App.entitlements) is inert until this file is served.
//
// SINGLE SOURCE OF TRUTH: this route REPLACES the former static file at
// public/.well-known/apple-app-site-association so the Apple Developer Team ID
// is env-driven (process.env.APPLE_TEAM_ID) instead of hardcoded into a
// committed artifact. The route sets its own Content-Type, so there is no longer
// a next.config.js header forcing application/json on the static path.
//
// HONEST INERT STATE: if APPLE_TEAM_ID resolves empty we return 404 rather than
// serving a file with a placeholder/wrong appID (a broken AASA is worse than an
// absent one — iOS would cache an invalid association). The real, on-hand team
// id (QFC852BYB6, account BENJAMIN FRANCIS SACHWITZ) is the default so universal
// links keep working out of the box; set APPLE_TEAM_ID in the env to override.
const DEFAULT_APPLE_TEAM_ID = "QFC852BYB6";

// Bundle id of the iOS app (capacitor.config.ts → appId). Constant, not secret.
const BUNDLE_ID = "com.greekstack.app";

// The deep-link namespaces the app claims: the member app entry (/app + /app/*),
// short links (/r/*), and the public namespace (/public/*). Scoped deliberately
// so chapter marketing pages do NOT all try to bounce into the app — preserving
// the exact paths the prior static AASA served.
const APP_PATHS = ["/app", "/app/*", "/r/*", "/public/*"];

export async function GET() {
  const teamId = (process.env.APPLE_TEAM_ID || DEFAULT_APPLE_TEAM_ID).trim();

  // No team id configured (explicitly blanked) → honestly inert: serve nothing
  // rather than a broken association with no/placeholder appID.
  if (!teamId) {
    return new NextResponse("Not found", { status: 404 });
  }

  const body = {
    applinks: {
      apps: [],
      details: [
        {
          appID: `${teamId}.${BUNDLE_ID}`,
          paths: APP_PATHS,
        },
      ],
    },
  };

  return NextResponse.json(body, {
    headers: {
      // iOS requires application/json; the extension-less path would otherwise
      // be served as octet-stream and rejected.
      "Content-Type": "application/json",
      // Short cache so a TEAMID change propagates within the hour.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
