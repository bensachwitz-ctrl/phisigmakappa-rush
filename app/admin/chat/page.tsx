import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/auth";
import { ChapterChat } from "@/components/chat/chapter-chat";

export const dynamic = "force-dynamic";

/**
 * Officers' chapter chat. Lives inside the /admin shell (nav + command palette
 * come from app/admin/layout.tsx). Any signed-in admin/officer session may open
 * it — chat is a chapter-wide surface, not a role-restricted console, so we gate
 * on "is there an admin-area session" (isAdminAuthed) rather than isAdminRole.
 *
 * The actual Stream connection + tenant-scoping happens client-side in
 * <ChapterChat>, which fetches /api/chat/token. When Stream is unconfigured the
 * component renders a tasteful disabled empty-state — this page never crashes.
 */
export default function AdminChatPage() {
  if (!isAdminAuthed()) redirect("/admin/login?from=%2Fadmin%2Fchat");

  return (
    <main className="container py-8">
      <ChapterChat surface="admin" />
    </main>
  );
}
