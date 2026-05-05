import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { PollsFeed } from "@/components/brother/polls-feed";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Brotherhood polls",
};

export default async function AdminPollsPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/admin/login");
  }
  return (
    <main className="container py-8">
      <div className="mx-auto max-w-2xl">
        <PollsFeed isAdmin={session.isAdmin} />
      </div>
    </main>
  );
}
