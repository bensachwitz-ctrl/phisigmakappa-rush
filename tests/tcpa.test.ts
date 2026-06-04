import { describe, it, expect, afterEach, vi } from "vitest";
import { isWithinQuietHours } from "@/lib/tcpa";

// ---------------------------------------------------------------------------
// lib/tcpa.ts isWithinQuietHours — TCPA/CTIA SMS quiet-hours guard.
//
// The window is [8:00, 21:00) recipient-local. The function reads the real
// wall clock via Intl.DateTimeFormat in the target zone. We make it
// deterministic with vi.setSystemTime against a FIXED zone ("UTC") where the
// local hour equals the UTC hour, so the 8am / 9pm boundaries are exactly
// computable. Invalid timezones must FAIL OPEN (return true) so a bad cfg value
// never hard-blocks every send.
// ---------------------------------------------------------------------------

afterEach(() => {
  vi.useRealTimers();
});

/** Freeze the clock at a specific UTC hour so the UTC-zone hour is deterministic. */
function freezeUtcHour(hour: number, minute = 0) {
  vi.useFakeTimers();
  // 2025-06-15 is an arbitrary fixed date; only the hour matters for the guard.
  vi.setSystemTime(new Date(Date.UTC(2025, 5, 15, hour, minute, 0)));
}

describe("isWithinQuietHours — returns a boolean", () => {
  it("returns a boolean for the default (real time, default zone)", () => {
    expect(typeof isWithinQuietHours()).toBe("boolean");
  });

  it("returns a boolean for an explicit valid zone", () => {
    expect(typeof isWithinQuietHours("America/Los_Angeles")).toBe("boolean");
  });
});

describe("isWithinQuietHours — boundary behavior (zone=UTC, deterministic clock)", () => {
  it("is FALSE just before the 8:00 open (07:59 local)", () => {
    freezeUtcHour(7, 59);
    expect(isWithinQuietHours("UTC")).toBe(false);
  });

  it("is TRUE exactly at the 8:00 open", () => {
    freezeUtcHour(8, 0);
    expect(isWithinQuietHours("UTC")).toBe(true);
  });

  it("is TRUE mid-day (13:00 local)", () => {
    freezeUtcHour(13, 0);
    expect(isWithinQuietHours("UTC")).toBe(true);
  });

  it("is TRUE at 20:59 (last allowed minute)", () => {
    freezeUtcHour(20, 59);
    expect(isWithinQuietHours("UTC")).toBe(true);
  });

  it("is FALSE exactly at 21:00 (9pm close — window is half-open)", () => {
    freezeUtcHour(21, 0);
    expect(isWithinQuietHours("UTC")).toBe(false);
  });

  it("is FALSE deep overnight (03:00 local)", () => {
    freezeUtcHour(3, 0);
    expect(isWithinQuietHours("UTC")).toBe(false);
  });

  it("is FALSE at local midnight (00:00)", () => {
    freezeUtcHour(0, 0);
    expect(isWithinQuietHours("UTC")).toBe(false);
  });
});

describe("isWithinQuietHours — invalid timezone fails OPEN", () => {
  it("returns true for an obviously-bogus timezone string", () => {
    // A bad cfg value must not block messaging — it loses the guard, returns true.
    expect(isWithinQuietHours("Not/A_Real_Zone")).toBe(true);
  });

  it("returns true for a garbage tz even when the real clock is overnight", () => {
    freezeUtcHour(3, 0); // would be FALSE for a valid overnight zone
    expect(isWithinQuietHours("Totally/Invalid")).toBe(true);
  });
});
