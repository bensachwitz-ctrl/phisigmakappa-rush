import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Capture client options during instantiation
const clientInstantiations: any[] = [];

vi.mock("@prisma/client", () => {
  return {
    PrismaClient: class MockPrismaClient {
      public options: any;
      public brother: any;
      constructor(options: any) {
        this.options = options;
        clientInstantiations.push(options);
        this.brother = {
          findMany: vi.fn().mockResolvedValue([]),
        };
      }
    },
  };
});

describe("Multi-tenant Isolation Security Tests", () => {
  beforeEach(() => {
    clientInstantiations.length = 0;
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/greekstack");
    vi.stubEnv("DATABASE_URL_UNPOOLED", "postgresql://user:pass@localhost:5432/greekstack");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("Tenant Subdomain Resolution & Sanitization", () => {
    it("returns null on host-less/apex-host requests, defaulting to centralDb", async () => {
      const { getSubdomain, getPrismaClient, centralDb } = await import("@/lib/prisma");
      expect(getSubdomain("greekstack.vercel.app")).toBeNull();
      expect(getPrismaClient()).toBe(centralDb);
    });

    it("extracts and sanitizes active subdomains correctly", async () => {
      const { getSubdomain } = await import("@/lib/prisma");
      expect(getSubdomain("PhiSig.greekstack.vercel.app")).toBe("phisig");
      expect(getSubdomain("kappa-alpha.localhost:3000")).toBe("kappa_alpha");
    });
  });

  describe("Dynamic Schema Resolution", () => {
    it("attaches schema parameter to the unpooled/pooled connection URL on dynamic lookup", async () => {
      const { getTenantClient } = await import("@/lib/prisma");
      
      const client = getTenantClient("phisig");
      
      const lastOptions = clientInstantiations[clientInstantiations.length - 1];
      expect(lastOptions).toBeDefined();
      expect(lastOptions.datasources.db.url).toContain("schema=schema_phisig");
    });

    it("respects TENANT_SCHEMA environment override (crons, scripts, webhooks)", async () => {
      vi.stubEnv("TENANT_SCHEMA", "schema_omega");
      const { getPrismaClient } = await import("@/lib/prisma");
      
      getPrismaClient();
      
      const lastOptions = clientInstantiations[clientInstantiations.length - 1];
      expect(lastOptions).toBeDefined();
      expect(lastOptions.datasources.db.url).toContain("schema=schema_omega");
    });
  });

  describe("Proxy Query Routing Integrity", () => {
    it("routes dynamic proxy queries to the current request's subdomain client", async () => {
      const { prisma, getPrismaClient } = await import("@/lib/prisma");
      const client = getPrismaClient();
      const mockFindMany = vi.fn().mockResolvedValue([]);
      client.brother.findMany = mockFindMany;

      await prisma.brother.findMany();
      expect(mockFindMany).toHaveBeenCalledTimes(1);
    });
  });
});
