// Twitter share card. Shares the exact same per-tenant renderer as
// app/opengraph-image.tsx — re-exported so the two cards never drift. Both run
// on the nodejs runtime (Prisma-backed getSiteConfig) and both fall back to
// generic Greekstack branding on the marketing apex (no subdomain).
export { runtime, dynamic, alt, size, contentType, default } from "./opengraph-image";
