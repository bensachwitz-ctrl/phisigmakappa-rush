// actionMap — pure data: friendly verbs + default recipient roles per known
// system event. Extracted as a no-dep module so client components (audit-log
// viewer, super-admin filter dropdowns) can read the verb labels without
// dragging lib/notify.ts's Prisma + server deps along.
//
// lib/notify.ts re-exports `actionMap` from here so there's exactly one
// source of truth and no risk of drift. Adding a new event = one new entry
// here + opting the route into auditAndNotify().
//
// Verb convention: read as
//   "{actor.name} just {verb} {entity.name}{details}"
// e.g. "Catherine White just refunded a payment Spring 2026 Dues — John Doe"

export interface ActionMapEntry {
  /** Verb fragment slotted into the sentence template. */
  verb: string;
  /** Default recipient roles. Per-call rolesToNotify wins when provided. */
  rolesToNotify: string[];
}

export const actionMap: Record<string, ActionMapEntry> = {
  // ── Dues / payments (R43 + Brain W2 union) ──────────────────────────────
  "dues.refund": {
    verb: "refunded a payment",
    rolesToNotify: ["treasurer", "president", "super-admin"],
  },
  "dues.refund.failed": {
    verb: "tried to refund a payment but it failed for",
    rolesToNotify: ["treasurer", "president", "super-admin"],
  },
  "dues.mark_cash": {
    verb: "marked a cash payment for",
    rolesToNotify: ["treasurer", "president"],
  },
  "dues.assessment.publish": {
    verb: "published a dues assessment",
    rolesToNotify: ["treasurer", "president"],
  },
  "dues.assessment.create": {
    verb: "created a dues assessment",
    rolesToNotify: ["treasurer"],
  },
  "dues.assessment.update": {
    verb: "edited the dues assessment",
    rolesToNotify: ["treasurer"],
  },
  "dues.assessment.delete": {
    verb: "deleted the draft dues assessment",
    rolesToNotify: ["treasurer", "president"],
  },
  "dues.bulk_send": {
    verb: "sent bulk dues reminders for",
    rolesToNotify: ["treasurer", "president"],
  },
  "dues.payment.paid": {
    verb: "received a dues payment for",
    rolesToNotify: ["treasurer"],
  },

  // ── Incidents (risk lifecycle) ──────────────────────────────────────────
  "incident.create": {
    verb: "filed an incident report",
    rolesToNotify: ["risk-manager", "president"],
  },
  "incident.triage": {
    verb: "triaged incident",
    rolesToNotify: ["risk-manager", "president"],
  },
  "incident.resolve": {
    verb: "resolved incident",
    rolesToNotify: ["risk-manager", "president"],
  },
  "incident.escalate": {
    verb: "escalated incident",
    rolesToNotify: ["risk-manager", "president", "super-admin"],
  },

  // ── Membership / brothers ───────────────────────────────────────────────
  "member.status_change": {
    verb: "changed the membership status of",
    rolesToNotify: ["president", "secretary"],
  },
  "member.invite": {
    verb: "invited a new brother",
    rolesToNotify: ["president", "secretary"],
  },
  "member.delete": {
    verb: "removed brother",
    rolesToNotify: ["president", "super-admin"],
  },

  // ── Officer assignments ─────────────────────────────────────────────────
  "officer.assign": {
    verb: "assigned an officer position to",
    rolesToNotify: ["president", "super-admin"],
  },
  "officer.unassign": {
    verb: "removed an officer position from",
    rolesToNotify: ["president", "super-admin"],
  },
  "officer.position.update": {
    verb: "updated the officer position",
    rolesToNotify: ["president", "super-admin"],
  },

  // ── W3 meetings ─────────────────────────────────────────────────────────
  "meeting.create": {
    verb: "scheduled a chapter meeting",
    rolesToNotify: ["secretary", "president"],
  },
  "meeting.update": {
    verb: "updated the chapter meeting",
    rolesToNotify: ["secretary", "president"],
  },
  "meeting.cancel": {
    verb: "canceled the chapter meeting",
    rolesToNotify: ["secretary", "president"],
  },
  "meeting.delete": {
    verb: "deleted the chapter meeting",
    rolesToNotify: ["secretary", "president"],
  },
  "meeting.checkin": {
    verb: "checked in",
    rolesToNotify: ["secretary", "president"],
  },
  "meeting.bulk_mark": {
    verb: "bulk-marked attendance for",
    rolesToNotify: ["secretary", "president"],
  },
  "meeting.excuse_approve": {
    verb: "approved an excused absence for",
    rolesToNotify: ["secretary", "president"],
  },
  "meeting.excuse_deny": {
    verb: "denied an excused absence for",
    rolesToNotify: ["secretary", "president"],
  },

  // ── W3 chores ───────────────────────────────────────────────────────────
  "chores.rotate": {
    verb: "rotated chore assignments for",
    rolesToNotify: ["risk-manager", "president"],
  },
  "chores.task_create": {
    verb: "added a chore task",
    rolesToNotify: ["risk-manager", "president"],
  },
  "chores.grade": {
    verb: "graded a chore assignment",
    rolesToNotify: ["risk-manager", "president"],
  },

  // ── W3 service hours ────────────────────────────────────────────────────
  "service.hour_log": {
    verb: "logged service hours for",
    rolesToNotify: ["service-chair", "president", "secretary"],
  },
  "service.hour_log.approve": {
    verb: "approved service hours for",
    rolesToNotify: ["service-chair", "president", "secretary"],
  },
  "service.hour_log.reject": {
    verb: "rejected service hours for",
    rolesToNotify: ["service-chair", "president", "secretary"],
  },
  "service.event.create": {
    verb: "added a service event",
    rolesToNotify: ["service-chair", "president", "secretary"],
  },
  "service.partner.create": {
    verb: "added a service partner",
    rolesToNotify: ["service-chair", "president", "secretary"],
  },

  // ── W5 alumni ───────────────────────────────────────────────────────────
  "alumni.create": {
    verb: "added an alumnus",
    rolesToNotify: ["secretary", "president", "super-admin"],
  },
  "alumni.update": {
    verb: "updated alumnus",
    rolesToNotify: ["secretary", "president", "super-admin"],
  },
  "alumni.delete": {
    verb: "removed alumnus",
    rolesToNotify: ["secretary", "president", "super-admin"],
  },
  "alumni.donation.record": {
    verb: "recorded a donation from",
    rolesToNotify: ["secretary", "president", "super-admin"],
  },

  // ── W5 polls ────────────────────────────────────────────────────────────
  "poll.create": {
    verb: "drafted a new poll",
    rolesToNotify: ["president", "secretary"],
  },
  "poll.update": {
    verb: "updated the poll",
    rolesToNotify: ["president", "secretary"],
  },
  "poll.delete": {
    verb: "deleted the poll",
    rolesToNotify: ["president", "secretary"],
  },
  "poll.publish": {
    verb: "published the poll",
    rolesToNotify: ["president", "secretary"],
  },
  "poll.close": {
    verb: "closed the poll",
    rolesToNotify: ["president", "secretary"],
  },

  // ── W5 calendar (Google Calendar link lifecycle) ────────────────────────
  "calendar.link.create": {
    verb: "linked a Google calendar for",
    rolesToNotify: ["super-admin"],
  },
  "calendar.link.delete": {
    verb: "unlinked the Google calendar for",
    rolesToNotify: ["super-admin"],
  },
  "calendar.sync.run": {
    verb: "ran a Google Calendar sync —",
    rolesToNotify: ["super-admin"],
  },

  // ── W5 HQ exports ───────────────────────────────────────────────────────
  "hq.export.run": {
    verb: "generated the HQ export",
    rolesToNotify: ["super-admin", "president"],
  },

  // ── W4 announcements cron + lifecycle ───────────────────────────────────
  "announcements.cron.run": {
    verb: "fired scheduled announcements —",
    rolesToNotify: ["super-admin"],
  },
  "announcements.cron.failed": {
    verb: "scheduled-announcements cron failed —",
    rolesToNotify: ["super-admin", "president"],
  },
  "announcements.scheduled": {
    verb: "scheduled an announcement",
    rolesToNotify: ["president", "secretary"],
  },
  "announcements.rescheduled": {
    verb: "rescheduled an announcement",
    rolesToNotify: ["president", "secretary"],
  },
  "announcements.send_now": {
    verb: "sent an announcement",
    rolesToNotify: ["president", "secretary"],
  },
  "announcements.broadcast.send": {
    verb: "fan-out broadcast to",
    rolesToNotify: ["president", "secretary", "super-admin"],
  },
};
