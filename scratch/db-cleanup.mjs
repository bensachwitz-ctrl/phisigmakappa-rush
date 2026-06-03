import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up clemsonpikes...");
  try {
    const tenants = await prisma.tenant.findMany();
    console.log("Existing tenants:", tenants);
    
    // Delete tenant if exists
    const deleted = await prisma.tenant.deleteMany({
      where: { subdomain: "clemsonpikes" }
    });
    console.log("Deleted count:", deleted.count);
    
    // Also try to drop the schema
    try {
      await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS schema_clemsonpikes CASCADE;`);
      console.log("Dropped schema schema_clemsonpikes if it existed.");
    } catch (schemaErr) {
      console.error("Error dropping schema:", schemaErr.message);
    }
  } catch (error) {
    console.error("Prisma error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
