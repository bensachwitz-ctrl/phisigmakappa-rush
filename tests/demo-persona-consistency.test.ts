import { describe, it, expect } from "vitest";
import {
  getMockDemoData,
  personaPosition,
  isOfficerPosition,
  DEMO_TENANTS,
  FRATERNITY_BRANDS,
} from "@/app/app/_demo/mock-data";

// ---------------------------------------------------------------------------
// Interactive demo (/app?demo=true) member↔exec consistency.
//
// THE invariant this guards: the persona the visitor SELECTED in the "VIEWING
// AS" switcher and the profile.position the phone renders must never disagree.
// A regular member (Active brother) must NEVER be shown as an officer
// ("President") — that mislabels a plain brother as exec and breaks the honest
// "what a regular brother sees" default of the showcase.
//
// The live symptom that prompted this: on a fresh load the switcher showed
// "Active brother" selected while the phone showed a PRESIDENT badge + unlocked
// Exec tools. Root cause was the localStorage-restore reconciler clobbering the
// freshly-seeded member position with a stale persisted "President" snapshot.
// ---------------------------------------------------------------------------

const tenant = DEMO_TENANTS[0]; // Phi Sigma Kappa
const brand = FRATERNITY_BRANDS[0];

describe("getMockDemoData — persona drives profile.position", () => {
  it("member persona seeds 'Active Member', NOT 'President'", () => {
    const data = getMockDemoData(tenant, brand, "member");
    expect(data.profile.position).toBe("Active Member");
    expect(data.profile.position).not.toBe("President");
  });

  it("defaults to the member experience when no persona is passed", () => {
    const data = getMockDemoData(tenant, brand);
    expect(data.profile.position).toBe("Active Member");
  });

  it("exec persona seeds 'President'", () => {
    expect(getMockDemoData(tenant, brand, "exec").profile.position).toBe("President");
  });

  it("alumni persona seeds 'Alumnus'", () => {
    expect(getMockDemoData(tenant, brand, "alumni").profile.position).toBe("Alumnus");
  });
});

describe("personaPosition — single source of truth for the label", () => {
  it("maps each persona to its display position", () => {
    expect(personaPosition("member")).toBe("Active Member");
    expect(personaPosition("exec")).toBe("President");
    expect(personaPosition("alumni")).toBe("Alumnus");
  });

  it("treats any unknown persona as a plain member (never an officer)", () => {
    expect(personaPosition("")).toBe("Active Member");
    expect(personaPosition("brother")).toBe("Active Member");
  });

  it("agrees with getMockDemoData for every persona", () => {
    for (const p of ["member", "exec", "alumni"] as const) {
      expect(getMockDemoData(tenant, brand, p).profile.position).toBe(personaPosition(p));
    }
  });
});

describe("isOfficerPosition — only officers unlock Exec tools", () => {
  it("the member persona's position is NOT an officer (Exec tools stay locked)", () => {
    expect(isOfficerPosition(personaPosition("member"))).toBe(false);
    expect(isOfficerPosition("Active Member")).toBe(false);
  });

  it("the exec persona's position IS an officer (Exec tools unlock)", () => {
    expect(isOfficerPosition(personaPosition("exec"))).toBe(true);
    expect(isOfficerPosition("President")).toBe(true);
  });

  it("the alumni persona's position is NOT an officer", () => {
    expect(isOfficerPosition(personaPosition("alumni"))).toBe(false);
  });
});

describe("localStorage-restore reconcile — selected persona wins over a stale snapshot", () => {
  // Mirrors MobileAppClient's demo restore effect: it reads a persisted demo
  // dashboard whose profile.position carries whatever persona was LAST viewed,
  // then forces profile.position back to the CURRENTLY selected persona so the
  // selector and the rendered position can never disagree on a fresh entry.
  const reconcilePosition = (
    restored: { profile: { position: string } },
    currentPersona: string,
  ): { profile: { position: string } } => ({
    ...restored,
    profile: { ...restored.profile, position: personaPosition(currentPersona) },
  });

  it("a persisted 'President' snapshot is reconciled to 'Active Member' when member is selected", () => {
    // Simulate: visitor explored Exec board (persisted President), then a fresh
    // /app?demo=true entry resets the switcher to the member persona.
    const stalePersistedExec = getMockDemoData(tenant, brand, "exec");
    expect(stalePersistedExec.profile.position).toBe("President");

    const reconciled = reconcilePosition(stalePersistedExec, "member");
    expect(reconciled.profile.position).toBe("Active Member");
    expect(isOfficerPosition(reconciled.profile.position)).toBe(false);
  });

  it("keeps 'President' when the current persona really is exec", () => {
    const restored = getMockDemoData(tenant, brand, "member");
    const reconciled = reconcilePosition(restored, "exec");
    expect(reconciled.profile.position).toBe("President");
  });

  it("reconciles to 'Alumnus' when the current persona is alumni", () => {
    const restored = getMockDemoData(tenant, brand, "exec");
    const reconciled = reconcilePosition(restored, "alumni");
    expect(reconciled.profile.position).toBe("Alumnus");
  });
});
