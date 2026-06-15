import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed the CENTRAL chapter registry (public."Tenant") so the iOS /app
 * School→Chapter picker is never empty on a fresh DB and the single-tenant
 * Phi-Sig flow has a real, routable chapter.
 *
 * Reuses the existing `Tenant` model — NO new columns, NO migration. Demo rows
 * are flagged with a "[Demo]" suffix in `name` (a naming convention) so the UI
 * can badge them "Demo" without an additive `isDemo` column. The canonical
 * Phi-Sig USC chapter uses the real production subdomain (`phisig`) so it appears
 * as a LIVE chapter, distinct from the inert `psk` demo in mock-data.ts.
 *
 * Idempotent: every row is upserted by its unique `subdomain`, so re-running the
 * seed updates in place and never duplicates or clobbers other registry rows.
 */
async function seedTenantRegistry() {
  // (a) The canonical LIVE chapter the production deploy serves. REAL — routes
  //     to the real per-chapter login + tenant-bound mobile auth.
  const liveChapters = [
    {
      subdomain: "phisig",
      name: "Phi Sigma Kappa",
      school: "University of South Carolina",
      isActive: true,
    },
  ];

  // (b) A few demo chapters across real, Greek-active schools so the picker
  //     groups by SCHOOL with a believable spread. The "[Demo]" suffix marks
  //     them for the UI badge; subdomains are deliberately distinct from the
  //     inert client-side DEMO_TENANTS ("psk"/"sigchi"/...) so a real DB seed and
  //     the no-DB fallback never collide.
  const demoChapters = [
    { subdomain: "demo-sigchi", name: "Sigma Chi [Demo]", school: "University of Southern California", isActive: true },
    { subdomain: "demo-kapsig", name: "Kappa Sigma [Demo]", school: "Clemson University", isActive: true },
    { subdomain: "demo-ato", name: "Alpha Tau Omega [Demo]", school: "University of Georgia", isActive: true },
    { subdomain: "demo-sae", name: "Sigma Alpha Epsilon [Demo]", school: "Auburn University", isActive: true },
  ];

  for (const t of [...liveChapters, ...demoChapters]) {
    await prisma.tenant.upsert({
      where: { subdomain: t.subdomain },
      update: { name: t.name, school: t.school, isActive: t.isActive },
      create: t,
    });
  }

  console.log(`Seeded tenant registry: ${liveChapters.length} live + ${demoChapters.length} demo chapters.`);
}

async function main() {
  await seedTenantRegistry();

  await prisma.event.deleteMany({});

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  await prisma.event.createMany({
    data: [
      {
        name: "Meet the Brothers — Cookout",
        description:
          "Open-house BBQ at the Phi Sig house. Meet active brothers, eat well, and get a feel for the chapter.",
        location: "Phi Sigma Kappa House — 1525 College St",
        dressCode: "Casual (shorts/t-shirt)",
        startsAt: new Date(now + 2 * day),
      },
      {
        name: "Tailgate at Williams-Brice",
        description: "Pre-game tailgate before the Gamecocks home opener.",
        location: "Williams-Brice Stadium — Lot 5",
        dressCode: "Garnet & Black gameday",
        startsAt: new Date(now + 5 * day),
      },
      {
        name: "Brotherhood Bowling Night",
        description: "Lanes booked for an evening of competition and meeting the chapter.",
        location: "AMF Columbia Lanes",
        dressCode: "Smart casual",
        startsAt: new Date(now + 9 * day),
      },
      {
        name: "Formal Dinner — Invite Only",
        description: "Sit-down dinner for select rushes. Invitation required.",
        location: "Capital City Club, downtown",
        dressCode: "Coat & tie",
        isPrivate: true,
        startsAt: new Date(now + 14 * day),
      },
      {
        name: "Bid Night",
        description: "Bid extension and welcome ceremony for accepting members.",
        location: "Phi Sigma Kappa House",
        dressCode: "Smart casual",
        isPrivate: true,
        startsAt: new Date(now + 18 * day),
      },
    ],
  });

  console.log("Seeded events.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
