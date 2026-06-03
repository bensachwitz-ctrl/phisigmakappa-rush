import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const schemas = await prisma.$queryRawUnsafe("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'schema_%' OR schema_name = 'public';");
  console.log("Schemas in database:", schemas);

  const tables = await prisma.$queryRawUnsafe("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema LIKE 'schema_%' OR table_schema = 'public' ORDER BY table_schema, table_name;");
  console.log("Tables in database:", tables);
  await prisma.$disconnect();
}
main();
