// Twitter share card. Shares the exact same per-tenant renderer as
// app/opengraph-image.tsx — re-exported so the two cards never drift. Both run
// on the nodejs runtime (Prisma-backed getSiteConfig) and both fall back to
// generic Greekstack branding on the marketing apex (no subdomain).
//
// `runtime` and `dynamic` are declared as LITERALS here (not re-exported) so
// Next's static route analyzer reads concrete values instead of a re-export it
// can't resolve — this removes the build-time "Next.js can't recognize the
// exported `runtime` field" warning. They must match opengraph-image.tsx.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export { alt, size, contentType, default } from "./opengraph-image";
