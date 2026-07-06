import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, ArrowLeft } from "lucide-react";

/**
 * Graceful "you don't have access to this domain" card for /admin/* pages.
 *
 * GATE-3 FIX 4: several admin domain pages gated their READ with
 * `requireOfficerPermission(domain, "read")`, which THROWS a 403 — crashing a
 * signed-in officer who lacks that domain into the global app/admin/error.tsx
 * boundary. That is the wrong UX for a permission gap. Pages now resolve access
 * with the non-throwing `checkOfficerPermission(...)` and render THIS card when
 * the viewer can't read the domain — exactly the pattern app/admin/elections
 * already used. (Middleware + the admin layout already keep unauthenticated and
 * non-officer users out of /admin entirely; this only handles the
 * authenticated-officer-missing-one-domain case.)
 *
 * `title` is the human domain name ("Academic", "Risk Desk", …) and `permission`
 * is the permission a chapter admin would grant ("Academic", "Risk", …) so the
 * copy reads naturally per page.
 */
export function OfficerAccessRequired({
  title,
  permission,
}: {
  title: string;
  permission: string;
}) {
  return (
    <div className="container py-8">
      <div className="mx-auto max-w-lg">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <ShieldAlert className="h-6 w-6" />
            </span>
            <div className="space-y-1.5">
              <h1 className="text-xl font-semibold tracking-tight">{title} access required</h1>
              <p className="text-sm text-muted-foreground">
                Only a chapter administrator or an officer with the {permission}{" "}
                permission can open this section. Ask your chapter admin to grant it.
              </p>
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary hover:border-phisig-red/40 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
