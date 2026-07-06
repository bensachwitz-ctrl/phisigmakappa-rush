import { redirect } from "next/navigation";
import { Vote } from "lucide-react";
import { getCurrentSession } from "@/lib/auth";
import { PollsFeed } from "@/components/brother/polls-feed";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Chapter polls",
};

export default async function AdminPollsPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/admin/login");
  }
  return (
    <div className="container py-8">
      <div className="mx-auto max-w-2xl">
        {/* AdminPageHeader renders the page H1; PollsFeed renders an H2 for the
            section title, so heading order stays correct. */}
        <AdminPageHeader
          icon={Vote}
          title="Chapter polls"
          subtitle="Quick votes for the chapter. Any member can post a poll; results stay anonymous (tally only - never who picked what)."
        />
        <PollsFeed isAdmin={session.isAdmin} />
      </div>
    </div>
  );
}
