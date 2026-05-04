import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Shirt, Lock } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";

export async function ScheduleList() {
  let events: Awaited<ReturnType<typeof prisma.event.findMany>> = [];
  try {
    events = await prisma.event.findMany({
      where: { isPrivate: false, startsAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24) } },
      orderBy: { startsAt: "asc" },
    });
  } catch {
    events = [];
  }

  if (!events.length) {
    return (
      <Card className="relative overflow-hidden border-phisig-red/20 bg-gradient-to-br from-phisig-red-soft/40 via-white to-white">
        <div className="absolute -top-8 -right-8 opacity-10 select-none">
          <span className="text-[140px] font-serif font-bold text-phisig-red leading-none">ΦΣΚ</span>
        </div>
        <CardContent className="relative py-12 px-6 sm:px-10">
          <div className="max-w-md">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-phisig-red/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
              <CalendarDays className="h-3 w-3" /> Coming in August
            </span>
            <h3 className="mt-3 text-xl sm:text-2xl font-semibold tracking-tight">
              Fall '26 schedule drops mid-August.
            </h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              We're locking in dates with the chapter house, the e-board, and our partner venues.
              Sign up above and we'll text you the second every event goes live — cookouts,
              tailgates, philanthropy, and Bid Night.
            </p>
            <ul className="mt-5 grid sm:grid-cols-2 gap-2 text-xs">
              {[
                "Meet the Brothers cookout",
                "Williams-Brice dry tailgate",
                "Brotherhood paintball",
                "Service dinner fundraiser",
                "Formal dinner (invite-only)",
                "Bid Night",
              ].map((label) => (
                <li key={label} className="inline-flex items-center gap-2 rounded-md bg-white border border-border px-2.5 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-phisig-red" />
                  <span className="font-medium">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ol className="relative space-y-4">
      {events.map((e, i) => (
        <li key={e.id}>
          <Card className="overflow-hidden hover:border-phisig-red/40 transition-colors">
            <CardContent className="p-0">
              <div className="grid grid-cols-[88px_1fr] sm:grid-cols-[120px_1fr]">
                <div className="bg-phisig-red text-white flex flex-col items-center justify-center text-center p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] opacity-85">
                    {new Date(e.startsAt).toLocaleDateString("en-US", { month: "short" })}
                  </div>
                  <div className="text-3xl sm:text-4xl font-semibold leading-none mt-1">
                    {new Date(e.startsAt).getDate()}
                  </div>
                  <div className="text-[11px] mt-1 opacity-85">
                    {new Date(e.startsAt).toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base sm:text-lg font-semibold leading-tight">
                      {e.name}
                    </h3>
                    {e.isPrivate && (
                      <Badge className="bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200">
                        <Lock className="h-3 w-3 mr-1" /> Invite only
                      </Badge>
                    )}
                  </div>
                  {e.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {e.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" /> {formatTime(e.startsAt)}
                      {e.endsAt && <> – {formatTime(e.endsAt)}</>}
                    </span>
                    {e.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> {e.location}
                      </span>
                    )}
                    {e.dressCode && (
                      <span className="inline-flex items-center gap-1.5">
                        <Shirt className="h-3.5 w-3.5" /> {e.dressCode}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ol>
  );
}
