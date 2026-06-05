// lib/sample-data.ts — one-click demo content seeder + reverser.
//
// PURPOSE
// A brand-new chapter admin lands on an empty app. Empty apps churn: there's
// nothing to click, nothing to "get". `seedSampleData()` instantly populates a
// believable, on-brand chapter — a rush pipeline mid-cycle, upcoming events, a
// roster with officers, a dues ledger with paid/unpaid rows, announcements, and
// a live poll — so the value is obvious in one screen. `clearSampleData()`
// removes EXACTLY what was added and nothing real, so a chapter can demo, then
// wipe back to a pristine slate before going live.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE MARKER (idempotency + reversibility contract)
// ─────────────────────────────────────────────────────────────────────────────
// Every sample row carries the literal sentinel string `[sample]` inside a
// REAL, already-existing text column on that model — never a new schema column.
// We deliberately do NOT add a `source`/`isSample` column (that would require a
// migration on every live tenant schema). Instead we piggy-back on a free-text
// field each model already has:
//
//   Model              Marker column   Placement
//   ─────────────────  ──────────────  ─────────────────────────────────────────
//   Rush               notes           prefixed  "[sample] …"
//   Event              description     suffixed  "… [sample]"
//   Brother            bio             suffixed  "… [sample]"
//   DuesPayment        notes           prefixed  "[sample] …"
//   Announcement       body            suffixed  "… [sample]"
//   Poll               question        suffixed  "… [sample]"
//   OfficerPosition    description     suffixed  "… [sample]"
//   OfficerAssignment  notes           prefixed  "[sample] …"
//
// Child rows that have no free-text field (Vote, PollVote, Attendance) are NOT
// marked individually — they hang off a marked parent via `onDelete: Cascade`
// in the schema, so deleting the marked parent removes them automatically.
//
// Sample Brother/Rush also use unmistakably-fake unique values so they can
// never collide with real data:
//   • emails end in `@sample.greekstack.local`
//   • Brother.name ends in " (sample)"  (Brother.name is @unique)
//
// IDEMPOTENCY: `seedSampleData()` first checks whether ANY sample rows already
// exist (via the marker). If so it is a no-op and reports the existing counts —
// clicking "Load sample data" twice never double-seeds.
//
// REVERSIBILITY: `clearSampleData()` deletes ONLY rows whose marker column
// `contains "[sample]"` (plus the fake-email/name guards), in FK-safe order.
//
// TENANT SAFETY: every query runs on the passed-in `prisma` (the Host-resolved
// tenant client). This module never imports a client itself and never touches
// another schema.

import type { PrismaClient } from "@prisma/client";

/** The single sentinel embedded in a real text column on every sample row. */
export const SAMPLE_MARKER = "[sample]";

/** Fake email domain for sample people — guarantees no collision with real
 *  unique emails and makes sample rows obvious in the DB. */
const SAMPLE_EMAIL_DOMAIN = "sample.greekstack.local";

/** Suffix appended to sample Brother.name (a @unique column). */
const SAMPLE_NAME_SUFFIX = " (sample)";

/** Counts shape returned by both entry points. */
type SeedCounts = Record<string, number>;

// ── small deterministic date helpers (no external deps) ──────────────────────
function daysFromNow(days: number, atHour = 19): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(atHour, 0, 0, 0);
  return d;
}
function daysAgo(days: number): Date {
  return daysFromNow(-days, 12);
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Populate the tenant with believable demo content. Idempotent: if sample rows
 * already exist this is a no-op and returns the existing counts.
 */
export async function seedSampleData(
  prisma: PrismaClient
): Promise<{ counts: SeedCounts }> {
  // ── Idempotency gate: bail if we've already seeded. ──────────────────────
  const already = await countSampleRows(prisma);
  const alreadyTotal = Object.values(already).reduce((a, b) => a + b, 0);
  if (alreadyTotal > 0) {
    return { counts: { ...already, alreadySeeded: 1 } };
  }

  const counts: SeedCounts = {
    rushes: 0,
    events: 0,
    brothers: 0,
    officerPositions: 0,
    officerAssignments: 0,
    duesPayments: 0,
    announcements: 0,
    polls: 0,
  };

  // ── 1) PNMs across the rush pipeline ─────────────────────────────────────
  // Statuses span the live pipeline enum: ACTIVE | BID_EXTENDED | ACCEPTED |
  // DECLINED | DROPPED. Notes are prefixed with the marker so clear can find
  // them; the human-readable tail makes the pipeline feel real.
  const rushSeeds: Array<{
    name: string;
    phone: string;
    hometown: string;
    major: string;
    year: string;
    status: string;
    note: string;
  }> = [
    { name: "Jordan Avery", phone: "+15125550101", hometown: "Austin, TX", major: "Finance", year: "Freshman", status: "ACTIVE", note: "Met at the cookout — super easy to talk to, knows three current brothers." },
    { name: "Marcus Cole", phone: "+13105550102", hometown: "Pasadena, CA", major: "Mechanical Engineering", year: "Sophomore", status: "ACTIVE", note: "Strong GPA, came to two events already. Rush chair is high on him." },
    { name: "Devin Park", phone: "+12065550103", hometown: "Seattle, WA", major: "Computer Science", year: "Freshman", status: "BID_EXTENDED", note: "Bid sent Tuesday — waiting on response. Great philanthropy energy." },
    { name: "Tyler Brooks", phone: "+16175550104", hometown: "Boston, MA", major: "Business Admin", year: "Junior", status: "ACCEPTED", note: "Accepted his bid! Pledge class paperwork started." },
    { name: "Sam Rivera", phone: "+14045550105", hometown: "Atlanta, GA", major: "Marketing", year: "Sophomore", status: "DECLINED", note: "Declined — went with another house. Keep warm for next cycle." },
    { name: "Chris Nguyen", phone: "+19495550106", hometown: "Irvine, CA", major: "Biology", year: "Freshman", status: "DROPPED", note: "Stopped showing up after the first week. Dropped from the pipeline." },
  ];
  for (const r of rushSeeds) {
    await prisma.rush.create({
      data: {
        name: r.name,
        email: emailFor(r.name),
        phone: r.phone,
        hometown: r.hometown,
        major: r.major,
        year: r.year,
        status: r.status,
        notes: `${SAMPLE_MARKER} ${r.note}`,
      },
    });
    counts.rushes++;
  }

  // ── 2) Upcoming events ───────────────────────────────────────────────────
  const eventSeeds: Array<{
    name: string;
    category: string;
    location: string;
    inDays: number;
    durationHrs: number;
    desc: string;
    audience?: string;
  }> = [
    { name: "Rush BBQ & Yard Games", category: "RUSH", location: "Chapter House Lawn", inDays: 3, durationHrs: 3, desc: "Open rush event — burgers, cornhole, and meet-the-brothers." },
    { name: "Chapter Meeting", category: "CHAPTER", location: "Main Lounge", inDays: 6, durationHrs: 1, desc: "Weekly required chapter meeting. Dues reminders + committee updates.", audience: "BROTHERS" },
    { name: "Philanthropy 5K Planning Night", category: "BROTHERHOOD", location: "Study Room B", inDays: 10, durationHrs: 2, desc: "Plan the spring charity 5K — route, sponsors, and sign-up table shifts." },
  ];
  for (const e of eventSeeds) {
    const startsAt = daysFromNow(e.inDays);
    const endsAt = new Date(startsAt.getTime() + e.durationHrs * 60 * 60 * 1000);
    await prisma.event.create({
      data: {
        name: e.name,
        description: `${e.desc} ${SAMPLE_MARKER}`,
        location: e.location,
        category: e.category,
        audience: e.audience ?? "ALL",
        startsAt,
        endsAt,
      },
    });
    counts.events++;
  }

  // ── 3) Members / brothers (a couple are officers) ────────────────────────
  // duesPaid here is the canonical boolean; we ALSO write a DuesPayment ledger
  // row per brother below so the Treasury view has real history. `position`
  // gives a couple brothers an officer title even without the OfficerPosition
  // catalog; we additionally wire OfficerAssignment rows for the two officers.
  const brotherSeeds: Array<{
    base: string;
    year: string;
    major: string;
    position?: string;
    pledgeClass: string;
    duesPaid: boolean;
    bio: string;
  }> = [
    { base: "Alex Thompson", year: "Senior", major: "Economics", position: "President", pledgeClass: "Alpha Phi", duesPaid: true, bio: "Chapter president. Third-year brother, runs exec and standards." },
    { base: "Brandon Lee", year: "Junior", major: "Accounting", position: "Treasurer", pledgeClass: "Beta Chi", duesPaid: true, bio: "Treasurer — keeps the books tight and the dues flowing." },
    { base: "Carlos Mendez", year: "Sophomore", major: "Kinesiology", pledgeClass: "Gamma Tau", duesPaid: false, bio: "Intramural captain. Owes spring dues." },
    { base: "Derek Wallace", year: "Junior", major: "Political Science", pledgeClass: "Beta Chi", duesPaid: true, bio: "Philanthropy committee lead." },
    { base: "Evan Foster", year: "Freshman", major: "Undecided", pledgeClass: "Gamma Tau", duesPaid: false, bio: "New initiate, still settling in. Dues pending." },
  ];

  // Keep the created brothers so we can attach officer assignments + dues.
  const createdBrothers: Array<{ id: string; name: string; position?: string }> = [];
  for (const b of brotherSeeds) {
    const name = `${b.base}${SAMPLE_NAME_SUFFIX}`;
    const created = await prisma.brother.create({
      data: {
        name,
        email: emailFor(b.base),
        year: b.year,
        major: b.major,
        position: b.position,
        pledgeClass: b.pledgeClass,
        pledgeClassName: b.pledgeClass,
        duesPaid: b.duesPaid,
        role: "MEMBER",
        status: "ACTIVE",
        bio: `${b.bio} ${SAMPLE_MARKER}`,
      },
      select: { id: true, name: true },
    });
    createdBrothers.push({ id: created.id, name: created.name, position: b.position });
    counts.brothers++;
  }

  // ── 3b) Officer roles via OfficerPosition + OfficerAssignment ─────────────
  // Self-contained: we create the two positions we need (marked in description)
  // rather than depending on the chapter having run the officer-catalog seed.
  // If a position with the same slug already exists (chapter ran the catalog
  // seed), reuse it but DON'T mark/alter it — we only own rows we create.
  const termCode = currentTermCode();
  const officerSpecs: Array<{ title: string; slug: string; brotherName: string }> = [
    { title: "President", slug: "president", brotherName: `Alex Thompson${SAMPLE_NAME_SUFFIX}` },
    { title: "Treasurer", slug: "treasurer", brotherName: `Brandon Lee${SAMPLE_NAME_SUFFIX}` },
  ];
  for (const spec of officerSpecs) {
    const brother = createdBrothers.find((x) => x.name === spec.brotherName);
    if (!brother) continue;

    // Reuse an existing catalog position if present; otherwise create a sample
    // one (marker in description) we can later clean up.
    let position = await prisma.officerPosition.findUnique({ where: { slug: spec.slug } });
    if (!position) {
      position = await prisma.officerPosition.create({
        data: {
          title: spec.title,
          slug: spec.slug,
          description: `${spec.title} role. ${SAMPLE_MARKER}`,
          // Minimal valid permissions JSON — the app reads this as a JSON blob.
          permissions: "{}",
          active: true,
        },
      });
      counts.officerPositions++;
    }

    await prisma.officerAssignment.create({
      data: {
        positionId: position.id,
        brotherId: brother.id,
        termCode,
        startDate: daysAgo(30),
        endDate: null, // currently active
        notes: `${SAMPLE_MARKER} Demo officer assignment.`,
      },
    });
    counts.officerAssignments++;
  }

  // ── 4) Dues ledger — mix of paid / unpaid ────────────────────────────────
  // One row per brother. PAID rows mirror brothers with duesPaid=true; the rest
  // are PENDING. method=MANUAL so we don't fabricate Stripe identifiers.
  const duesYear = currentDuesYear();
  for (const b of brotherSeeds) {
    const brother = createdBrothers.find(
      (x) => x.name === `${b.base}${SAMPLE_NAME_SUFFIX}`
    );
    if (!brother) continue;
    await prisma.duesPayment.create({
      data: {
        brotherId: brother.id,
        amountCents: 25000, // $250.00 chapter dues
        currency: "usd",
        year: duesYear,
        status: b.duesPaid ? "PAID" : "PENDING",
        method: "MANUAL",
        notes: `${SAMPLE_MARKER} ${b.duesPaid ? "Paid via Venmo." : "Awaiting payment."}`,
      },
    });
    counts.duesPayments++;
  }

  // ── 5) Announcements ─────────────────────────────────────────────────────
  const announcementSeeds: Array<{
    title: string;
    body: string;
    audience: string;
    pinned: boolean;
  }> = [
    {
      title: "Welcome to the chapter dashboard",
      body: "This is your new home base — events, roster, dues, and announcements all live here. Explore the tabs, then clear this sample data when you're ready to go live.",
      audience: "ALL",
      pinned: true,
    },
    {
      title: "Spring dues are due by the 15th",
      body: "Reminder: chapter dues for this term are due by the 15th. Pay online from the Dues tab or hand cash/Venmo to the treasurer.",
      audience: "BROTHERS",
      pinned: false,
    },
  ];
  for (const a of announcementSeeds) {
    await prisma.announcement.create({
      data: {
        title: a.title,
        body: `${a.body} ${SAMPLE_MARKER}`,
        audience: a.audience,
        pinned: a.pinned,
        authorId: null,
        status: "sent",
        sentAt: new Date(),
        channels: "inapp",
      },
    });
    counts.announcements++;
  }

  // ── 6) Poll (model exists) — created by an officer, with two votes ───────
  // Poll.createdById is required (FK to Brother). We attribute it to the sample
  // president. Options are the schema's JSON-string shape: [{id,label}].
  const president = createdBrothers.find(
    (x) => x.name === `Alex Thompson${SAMPLE_NAME_SUFFIX}`
  );
  if (president) {
    const optionA = { id: "opt_fri", label: "Friday night" };
    const optionB = { id: "opt_sat", label: "Saturday afternoon" };
    const poll = await prisma.poll.create({
      data: {
        question: `When should we hold the brotherhood retreat? ${SAMPLE_MARKER}`,
        options: JSON.stringify([optionA, optionB]),
        createdById: president.id,
        audience: "BROTHERS",
        closesAt: daysFromNow(7, 23),
      },
      select: { id: true },
    });
    counts.polls++;

    // A couple of votes so the tally isn't empty. These cascade-delete with the
    // poll, so they need no individual marker. Guard against the (impossible
    // here, but cheap) unique (pollId, brotherId) collision.
    const voters = createdBrothers.slice(0, 2);
    const voteOptions = [optionA.id, optionB.id];
    for (let i = 0; i < voters.length; i++) {
      await prisma.pollVote.create({
        data: {
          pollId: poll.id,
          brotherId: voters[i].id,
          optionId: voteOptions[i % voteOptions.length],
        },
      });
    }
  }

  return { counts };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLEAR
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Remove EXACTLY the rows seeded by `seedSampleData` — matched by the `[sample]`
 * marker in each model's marker column (plus fake-email/name guards). FK-safe
 * order: children-by-cascade first via their marked parents, then standalone
 * marked rows. Idempotent: clearing when nothing is seeded returns all-zero.
 */
export async function clearSampleData(
  prisma: PrismaClient
): Promise<{ counts: SeedCounts }> {
  const counts: SeedCounts = {
    rushes: 0,
    events: 0,
    brothers: 0,
    officerPositions: 0,
    officerAssignments: 0,
    duesPayments: 0,
    announcements: 0,
    polls: 0,
  };

  // Officer assignments (marked in notes). Delete BEFORE positions/brothers so
  // we don't rely solely on cascade ordering.
  counts.officerAssignments = (
    await prisma.officerAssignment.deleteMany({
      where: { notes: { contains: SAMPLE_MARKER } },
    })
  ).count;

  // Sample officer positions (marked in description). Catalog positions that
  // pre-existed are NOT marked, so they're untouched.
  counts.officerPositions = (
    await prisma.officerPosition.deleteMany({
      where: { description: { contains: SAMPLE_MARKER } },
    })
  ).count;

  // Polls (marked in question). PollVote rows cascade-delete with the poll.
  counts.polls = (
    await prisma.poll.deleteMany({
      where: { question: { contains: SAMPLE_MARKER } },
    })
  ).count;

  // Announcements (marked in body).
  counts.announcements = (
    await prisma.announcement.deleteMany({
      where: { body: { contains: SAMPLE_MARKER } },
    })
  ).count;

  // Dues payments (marked in notes). Also FK-children of Brother; delete before
  // brothers so removal never depends on cascade alone.
  counts.duesPayments = (
    await prisma.duesPayment.deleteMany({
      where: { notes: { contains: SAMPLE_MARKER } },
    })
  ).count;

  // Brothers (marked in bio, fake name + email as belt-and-suspenders). Any
  // remaining child rows (votes, RSVPs, etc.) cascade-delete per schema.
  counts.brothers = (
    await prisma.brother.deleteMany({
      where: {
        AND: [
          { bio: { contains: SAMPLE_MARKER } },
          { email: { endsWith: `@${SAMPLE_EMAIL_DOMAIN}` } },
        ],
      },
    })
  ).count;

  // Events (marked in description).
  counts.events = (
    await prisma.event.deleteMany({
      where: { description: { contains: SAMPLE_MARKER } },
    })
  ).count;

  // Rushes (marked in notes, fake email as second guard). Attendances/votes/
  // consents/impressions cascade-delete per schema.
  counts.rushes = (
    await prisma.rush.deleteMany({
      where: {
        AND: [
          { notes: { contains: SAMPLE_MARKER } },
          { email: { endsWith: `@${SAMPLE_EMAIL_DOMAIN}` } },
        ],
      },
    })
  ).count;

  return { counts };
}

// ─────────────────────────────────────────────────────────────────────────────
// internals
// ─────────────────────────────────────────────────────────────────────────────

/** Count existing sample rows per model (used by the seed idempotency gate). */
async function countSampleRows(prisma: PrismaClient): Promise<SeedCounts> {
  const [
    rushes,
    events,
    brothers,
    officerPositions,
    officerAssignments,
    duesPayments,
    announcements,
    polls,
  ] = await Promise.all([
    prisma.rush.count({ where: { notes: { contains: SAMPLE_MARKER } } }),
    prisma.event.count({ where: { description: { contains: SAMPLE_MARKER } } }),
    prisma.brother.count({ where: { bio: { contains: SAMPLE_MARKER } } }),
    prisma.officerPosition.count({ where: { description: { contains: SAMPLE_MARKER } } }),
    prisma.officerAssignment.count({ where: { notes: { contains: SAMPLE_MARKER } } }),
    prisma.duesPayment.count({ where: { notes: { contains: SAMPLE_MARKER } } }),
    prisma.announcement.count({ where: { body: { contains: SAMPLE_MARKER } } }),
    prisma.poll.count({ where: { question: { contains: SAMPLE_MARKER } } }),
  ]);
  return {
    rushes,
    events,
    brothers,
    officerPositions,
    officerAssignments,
    duesPayments,
    announcements,
    polls,
  };
}

/** Deterministic, collision-proof sample email from a person's name. */
function emailFor(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return `${slug}@${SAMPLE_EMAIL_DOMAIN}`;
}

/** Academic term code like "2026-FA" / "2026-SP" — used on OfficerAssignment. */
function currentTermCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  // Aug–Dec → Fall, else Spring (good enough for demo data).
  const term = now.getMonth() >= 7 ? "FA" : "SP";
  return `${year}-${term}`;
}

/** Dues period label like "2026-fall" / "2026-spring" — matches DuesPayment.year. */
function currentDuesYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const term = now.getMonth() >= 7 ? "fall" : "spring";
  return `${year}-${term}`;
}
