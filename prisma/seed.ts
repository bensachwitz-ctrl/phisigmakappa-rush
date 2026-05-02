import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing demo events
  await prisma.event.deleteMany({});

  await prisma.event.createMany({
    data: [
      {
        name: "Meet the Brothers — Cookout",
        description:
          "Open-house BBQ at the Phi Sig house. Meet active brothers, eat well, and get a feel for the chapter.",
        location: "Phi Sigma Kappa House — 800 Lincoln St",
        dressCode: "Casual (shorts/t-shirt)",
        startsAt: new Date(new Date().setDate(new Date().getDate() + 2)),
      },
      {
        name: "Tailgate at Williams-Brice",
        description: "Pre-game tailgate before the Gamecocks home opener.",
        location: "Williams-Brice Stadium — Lot 5",
        dressCode: "Garnet & Black gameday",
        startsAt: new Date(new Date().setDate(new Date().getDate() + 5)),
      },
      {
        name: "Brotherhood Bowling Night",
        description: "Lanes booked for an evening of competition and meeting the chapter.",
        location: "AMF Columbia Lanes",
        dressCode: "Smart casual",
        startsAt: new Date(new Date().setDate(new Date().getDate() + 9)),
      },
      {
        name: "Formal Dinner — Invite Only",
        description: "Sit-down dinner for select rushes. Invitation required.",
        location: "Capital City Club, downtown",
        dressCode: "Coat & tie",
        isPrivate: true,
        startsAt: new Date(new Date().setDate(new Date().getDate() + 14)),
      },
      {
        name: "Bid Night",
        description: "Bid extension and welcome ceremony for accepting members.",
        location: "Phi Sigma Kappa House",
        dressCode: "Smart casual",
        isPrivate: true,
        startsAt: new Date(new Date().setDate(new Date().getDate() + 18)),
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
