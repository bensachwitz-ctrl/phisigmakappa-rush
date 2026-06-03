import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sqlFilePath = path.join(process.cwd(), "lib", "schema.sql");
  let sqlContent = fs.readFileSync(sqlFilePath, "utf8");
  
  // Strip Unicode BOM character if present
  if (sqlContent.startsWith('\uFEFF')) {
    sqlContent = sqlContent.slice(1);
  }

  // Parse statements correctly by removing comments and splitting by semicolon
  const statements = sqlContent
    .split(";")
    .map((s) => {
      return s
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim();
    })
    .filter((s) => s.length > 0);

  console.log("Total statements found:", statements.length);

  const schemaName = "schema_testtemp";
  try {
    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`);
    console.log(`Created schema ${schemaName}`);
    
    const baseUri = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";
    const separator = baseUri.includes("?") ? "&" : "?";
    
    // Set both the schema parameter and the search_path option for raw queries
    const tenantDbUrl = `${baseUri}${separator}schema=${schemaName}&options=-c%20search_path=${schemaName}`;
    
    console.log("Connecting with URL:", tenantDbUrl.replace(/:[^:@]+@/, ':***@'));
    
    const tenantPrisma = new PrismaClient({
      datasources: { db: { url: tenantDbUrl } }
    });
    
    console.log("Executing DDL statements sequentially...");
    for (const [index, stmt] of statements.entries()) {
      try {
        await tenantPrisma.$executeRawUnsafe(stmt);
      } catch (err) {
        // Ignore "already exists" errors, throw other failures
        if (!err.message?.includes("already exists")) {
          console.error(`Error at statement ${index}:`, err.message);
          throw err;
        }
      }
    }
    console.log("DDL executed successfully!");
    
    const tables = await prisma.$queryRawUnsafe(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema = '${schemaName}'
      ORDER BY table_name;
    `);
    console.log(`Tables in ${schemaName}:`, tables.map(t => t.table_name));
    
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE;`);
    console.log(`Cleaned up schema ${schemaName}`);
    
    await tenantPrisma.$disconnect();
  } catch (err) {
    console.error("DDL execution failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
