import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── UX-hardening source-pins ──────────────────────────────────────────────────
// These lock in the login / onboarding / white-label polish so a later edit
// can't silently regress: (1) the annual-report export must read the chapter's
// own identity instead of the hardcoded reference chapter, (2) every login page
// must surface a working "Forgot password?" route to the reset flow, and (3) the
// member onboarding form must show inline per-field validation.
const ROOT = resolve(__dirname, "..");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

describe("white-label: annual-report export reads chapter identity, not a literal", () => {
  const src = read("app/api/admin/exports/run/route.ts");
  it("no longer hardcodes the reference chapter name", () => {
    expect(src).not.toContain("Phi Sigma Kappa — Gamma Triton");
    expect(src).not.toContain("Phi Sigma Kappa");
  });
  it("resolves chapterName from the chapter's own SiteConfig", () => {
    expect(src).toContain("chapterIdentityFromCfg");
    expect(src).toContain("chapterName: exportIdentity.chapterFullName");
  });
});

describe("login polish: every login page has a working forgot-password route", () => {
  it("admin login links a real reset route (Brother Portal OTP flow)", () => {
    const src = read("app/admin/login/login-client.tsx");
    expect(src).toContain("Forgot password?");
    expect(src).toContain('href="/portal/brothers"');
  });
  it("brothers login mounts the inline OTP reset flow", () => {
    const src = read("app/portal/brothers/BrothersLoginPage.tsx");
    expect(src).toContain("PortalForgotOtpFlow");
    expect(src).toContain("Forgot password?");
  });
  it("alumni login mounts the inline OTP reset flow", () => {
    const src = read("app/portal/alumni/AlumniLoginPage.tsx");
    expect(src).toContain("PortalForgotOtpFlow");
    expect(src).toContain("Forgot password?");
  });
});

describe("onboarding polish: member invite form has inline validation", () => {
  const src = read("components/site/onboarding-form.tsx");
  it("tracks and renders per-field errors", () => {
    expect(src).toContain("setErrors");
    expect(src).toContain("FieldError");
    expect(src).toContain('role="alert"');
  });
  it("disables submit while a headshot is uploading", () => {
    expect(src).toContain("disabled={busy || uploading}");
  });
});
