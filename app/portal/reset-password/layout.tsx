// Server-component segment layout for /portal/reset-password.
//
// page.tsx is a Client Component ("use client") that renders the server
// <PublicFooter> (reads request headers via getSiteConfig()). A route segment
// config like `export const dynamic` is ignored in a client file, so it must be
// declared here (a Server Component) to keep `next build` from statically
// prerendering the request-bound footer and crashing with
// "Error: Not implemented (getCacheForType)".
export const dynamic = "force-dynamic";

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
