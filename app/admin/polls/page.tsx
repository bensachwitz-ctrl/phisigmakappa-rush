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
        {/* Page-level H1 — matches the size + weight of every other admin
            page header (text-3xl font-semibold). The PollsFeed component
            renders an H2 internally for the section title; together they
            create proper heading order. */}
        <header className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">
            Brotherhood polls
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quick votes for the chapter. Any brother can post a poll; results
            stay anonymous (tally only — never who picked what).
          </p>
        </header>
        <PollsFeed isAdmin={session.isAdmin} />
      </div>
    </main>
  );
}
