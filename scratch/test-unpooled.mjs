import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_UNPOOLED
    }
  }
});
async function main() {
  console.log("Connecting to unpooled URL...");
  try {
    const res = await prisma.$queryRawUnsafe("SELECT 1;");
    console.log("Success:", res);
  } catch (err) {
    console.error("Failed:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
