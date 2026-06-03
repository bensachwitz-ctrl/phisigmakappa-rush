import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Dropping schema_clemsonpikes CASCADE...");
  try {
    await prisma.$executeRawUnsafe("DROP SCHEMA IF EXISTS schema_clemsonpikes CASCADE;");
    console.log("Successfully dropped schema_clemsonpikes!");
  } catch (error) {
    console.error("Error dropping schema:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
