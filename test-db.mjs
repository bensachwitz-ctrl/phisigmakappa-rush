import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Testing Prisma connection...");
  try {
    const count = await prisma.siteConfig.count();
    console.log("Connection successful! siteConfig count:", count);
  } catch (error) {
    console.error("Prisma error details:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
