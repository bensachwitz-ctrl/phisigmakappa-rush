// Server-component segment layout for /portal/alumni/register.
//
// WHY THIS EXISTS: page.tsx is a Client Component ("use client"), and a route
// segment config export like `export const dynamic` is IGNORED in a client file
// — Next only honors it in a Server Component. The page renders the server
// <PublicFooter>, which reads request headers via getSiteConfig(); without
// forcing dynamic, `next build` tries to statically prerender the route and
// crashes with "Error: Not implemented (getCacheForType)". Declaring the config
// here (a Server Component) applies it to the whole segment and is the canonical
// Next 14 way to force-dynamic a client page.
export const dynamic = "force-dynamic";

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
