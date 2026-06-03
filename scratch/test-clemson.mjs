import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const tenants = await prisma.tenant.findMany();
  console.log("Central tenants:", tenants);

  const tables = await prisma.$queryRawUnsafe("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema = 'schema_clemsonpikes' ORDER BY table_name;");
  console.log("Tables in schema_clemsonpikes count:", tables.length);
  console.log("Table names:", tables.map(t => t.table_name));

  // Query some config values from the tenant schema
  const tenantUrl = process.env.DATABASE_URL + "&schema=schema_clemsonpikes&options=-c%20search_path=schema_clemsonpikes";
  const tenantPrisma = new PrismaClient({
    datasources: { db: { url: tenantUrl } }
  });
  
  const siteConfig = await tenantPrisma.siteConfig.findMany();
  console.log("Site config seeded:", siteConfig);
  
  const brothers = await tenantPrisma.brother.findMany();
  console.log("Brothers seeded:", brothers);
  
  const portalUsers = await tenantPrisma.portalUser.findMany();
  console.log("Portal users seeded:", portalUsers);

  await tenantPrisma.$disconnect();
  await prisma.$disconnect();
}
main();
