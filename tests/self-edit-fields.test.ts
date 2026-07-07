// Unit test for the pure self-edit allowlist (lib/self-edit-fields), the guard
// behind the P0 #1 privilege-escalation fix. No route/prisma mocking needed.

import { describe, it, expect } from "vitest";
import { isSelfEditableField, pickSelfEditableFields } from "@/lib/self-edit-fields";

describe("pickSelfEditableFields — allowlist for member self-edit (P0 #1)", () => {
  const attacker = {
    name: "Legit Name",
    bio: "hi",
    email: "me@example.edu",
    position: "President", // privilege escalation → mobile exec
    status: "INITIATE", // escalation → initiate-only ritual docs
    role: "ADMIN",
    duesPaid: true,
    serviceHours: 999,
    studyHours: 50,
    academicStanding: "Good",
    pledgeLineNumber: 1,
    initiationDate: "2020-01-01",
    graduationYear: 2027,
  };

  it("keeps benign profile fields, drops every authz-sensitive field (no academic perm)", () => {
    const out = pickSelfEditableFields(attacker, { isAcademicWriter: false });
    expect(out).toEqual({ name: "Legit Name", bio: "hi", email: "me@example.edu" });
    // Explicit negatives for the fields that matter to the exploit.
    expect(out).not.toHaveProperty("position");
    expect(out).not.toHaveProperty("status");
    expect(out).not.toHaveProperty("role");
    expect(out).not.toHaveProperty("duesPaid");
    expect(out).not.toHaveProperty("serviceHours");
    expect(out).not.toHaveProperty("studyHours");
  });

  it("permits studyHours/academicStanding only with academic:write, still never position/status", () => {
    const out = pickSelfEditableFields(attacker, { isAcademicWriter: true });
    expect(out.studyHours).toBe(50);
    expect(out.academicStanding).toBe("Good");
    expect(out).not.toHaveProperty("position");
    expect(out).not.toHaveProperty("status");
    expect(out).not.toHaveProperty("role");
  });

  it("isSelfEditableField: position/status/role are never self-editable", () => {
    for (const bad of ["position", "status", "role", "duesPaid", "serviceHours", "pledgeLineNumber"]) {
      expect(isSelfEditableField(bad, { isAcademicWriter: true })).toBe(false);
    }
    for (const ok of ["name", "email", "phone", "year", "major", "bio", "headshotUrl", "pledgeClass"]) {
      expect(isSelfEditableField(ok, { isAcademicWriter: false })).toBe(true);
    }
  });

  it("does not mutate the input object", () => {
    const input = { name: "x", position: "President" };
    pickSelfEditableFields(input, { isAcademicWriter: false });
    expect(input).toEqual({ name: "x", position: "President" });
  });
});
