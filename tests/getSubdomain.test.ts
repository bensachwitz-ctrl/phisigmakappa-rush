import { describe, it, expect } from "vitest";
import { getSubdomain } from "@/lib/prisma";
import { SUBDOMAIN_CASES } from "./subdomain-cases";

// ---------------------------------------------------------------------------
// getSubdomain(host) — the host→tenant resolver. This is the load-bearing
// multi-tenant primitive: it decides which Postgres schema a request reads,
// and (via the auth layer) which signing key gates the session. A bug here is
// a cross-tenant data-leak class bug, so it is exhaustively pinned.
// ---------------------------------------------------------------------------

describe("getSubdomain — apex recognition (must return null)", () => {
  it("returns null for a null host", () => {
    expect(getSubdomain(null)).toBeNull();
  });

  it.each([
    "localhost",
    "greekstack.vercel.app",
    "greeklifesystems.vercel.app",
    "greek-life-systems.vercel.app",
    "www",
    "greekstack",
    "greeklifesystems",
  ])("returns null for apex host %s", (host) => {
    expect(getSubdomain(host)).toBeNull();
  });

  it("recognizes the apex host case-insensitively", () => {
    expect(getSubdomain("GREEKSTACK.VERCEL.APP")).toBeNull();
    expect(getSubdomain("Greekstack.Vercel.App")).toBeNull();
  });
});

describe("getSubdomain — tenant extraction + sanitization", () => {
  it("extracts the subdomain from an apex vercel host", () => {
    expect(getSubdomain("phisig.greekstack.vercel.app")).toBe("phisig");
  });

  it("extracts the subdomain from the alternate apex host", () => {
    expect(getSubdomain("phisig.greeklifesystems.vercel.app")).toBe("phisig");
  });

  it("extracts the subdomain from a localhost dev host (port 3001)", () => {
    expect(getSubdomain("phisig.localhost:3001")).toBe("phisig");
  });

  it("extracts the subdomain from a localhost dev host (port 3000)", () => {
    expect(getSubdomain("phisig.localhost:3000")).toBe("phisig");
  });

  it("strips the port and lowercases", () => {
    // Port is irrelevant; case must collapse so the schema name is stable.
    expect(getSubdomain("PhiSig.greekstack.vercel.app")).toBe("phisig");
  });

  it("replaces non-alphanumeric characters with underscores", () => {
    expect(getSubdomain("alpha-beta.greekstack.vercel.app")).toBe("alpha_beta");
    expect(getSubdomain("kappa.kappa.greekstack.vercel.app")).toBe("kappa_kappa");
  });
});

describe("getSubdomain — shared expectation table", () => {
  it.each(SUBDOMAIN_CASES)(
    "host=$host → $expected ($note)",
    ({ host, expected }) => {
      expect(getSubdomain(host)).toBe(expected);
    },
  );
});
