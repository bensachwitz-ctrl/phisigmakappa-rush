-- CreateTable
CREATE TABLE "Rush" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "hometown" TEXT,
    "major" TEXT,
    "year" TEXT,
    "highSchoolInfo" TEXT,
    "backgroundInfo" TEXT,
    "headshotUrl" TEXT,
    "enrichmentData" TEXT,
    "enrichedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bidToken" TEXT,
    "bidTokenExpiresAt" TIMESTAMP(3),
    "bidRespondedAt" TIMESTAMP(3),
    "bidResponseChoice" TEXT,

    CONSTRAINT "Rush_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RushImpression" (
    "id" TEXT NOT NULL,
    "rushId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RushImpression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RushSubmitLog" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RushSubmitLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RushConsent" (
    "id" TEXT NOT NULL,
    "rushId" TEXT NOT NULL,
    "disclosureVersion" TEXT NOT NULL,
    "disclosureText" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "ageAttestation" TEXT NOT NULL,
    "smsConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "smsConfirmedAt" TIMESTAMP(3),
    "optedOut" BOOLEAN NOT NULL DEFAULT false,
    "optedOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RushConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "dressCode" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "checkInCode" TEXT,
    "audience" TEXT NOT NULL DEFAULT 'ALL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventCheckIn" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "rushId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrotherRSVP" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "brotherId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrotherRSVP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "rushId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brother" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "year" TEXT,
    "major" TEXT,
    "position" TEXT,
    "pledgeClass" TEXT,
    "hometown" TEXT,
    "gradYear" TEXT,
    "bio" TEXT,
    "headshotUrl" TEXT,
    "duesPaid" BOOLEAN NOT NULL DEFAULT false,
    "duesAmountCents" INTEGER,
    "duesYear" TEXT,
    "duesPaidAt" TIMESTAMP(3),
    "duesPaymentMethod" TEXT,
    "duesPaymentId" TEXT,
    "serviceHours" INTEGER NOT NULL DEFAULT 0,
    "studyHours" INTEGER NOT NULL DEFAULT 0,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "pledgeClassName" TEXT,
    "pledgeLineNumber" INTEGER,
    "initiationDate" TIMESTAMP(3),
    "graduationYear" INTEGER,
    "academicStanding" TEXT,
    "bigBrotherId" TEXT,

    CONSTRAINT "Brother_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuesPayment" (
    "id" TEXT NOT NULL,
    "brotherId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "year" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "method" TEXT NOT NULL,
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "receiptUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DuesPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable (Treasury tool — budget lines)
CREATE TABLE IF NOT EXISTS "BudgetLine" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "budgetedCents" INTEGER NOT NULL DEFAULT 0,
    "actualCents" INTEGER NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable (Treasury tool — expense / reimbursement requests)
CREATE TABLE IF NOT EXISTS "Expense" (
    "id" TEXT NOT NULL,
    "submittedById" TEXT,
    "submittedByName" TEXT,
    "amountCents" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "receiptUrl" TEXT,
    "decidedByName" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'ALL',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "channels" TEXT NOT NULL DEFAULT 'inapp',
    "totalRecipients" INTEGER,
    "pollId" TEXT,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementRead" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "brotherId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrotherInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "prefillName" TEXT,
    "invitedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "brotherId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BrotherInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlumniInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "prefillName" TEXT,
    "invitedBy" TEXT,
    "alumniId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AlumniInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visibility" TEXT NOT NULL DEFAULT 'MEMBERS',
    "fileName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "blobUrl" TEXT,
    "uploadedById" TEXT,
    "versionOfId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficerPosition" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfficerPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficerAssignment" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "brotherId" TEXT NOT NULL,
    "termCode" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfficerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberStatusChange" (
    "id" TEXT NOT NULL,
    "brotherId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT,
    "reasonCategory" TEXT,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberStatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteConfig" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "rushId" TEXT NOT NULL,
    "brotherId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "rushId" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "recipients" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'SENT',

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsLog" (
    "id" TEXT NOT NULL,
    "rushId" TEXT,
    "body" TEXT NOT NULL,
    "recipients" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'SENT',

    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Poll" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "closesAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "audience" TEXT NOT NULL DEFAULT 'BROTHERS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "brotherId" TEXT,
    "alumniId" TEXT,
    "optionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT,
    "subjectName" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Tamper-evidence hash chain (see lib/audit.ts). Nullable for forward-compat
    -- with rows written before the chain existed.
    "seq" INTEGER,
    "prevHash" TEXT,
    "hash" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChapterMeeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "location" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "requiredFor" JSONB NOT NULL DEFAULT '["ACTIVE","INITIATE","PLEDGE"]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChapterMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChapterMeetingAttendance" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'absent',
    "checkedInAt" TIMESTAMP(3),
    "excuseReason" TEXT,
    "excuseApprovedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChapterMeetingAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreWheelTask" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "rotationOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChoreWheelTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreWheelAssignment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "weekStarting" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "completedAt" TIMESTAMP(3),
    "grade" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChoreWheelAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentReport" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "reporterId" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3),
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receiptCode" TEXT NOT NULL,
    "assignedToId" TEXT,
    "resolutionNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentAcknowledgment" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "brotherId" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "IncidentAcknowledgment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "partnerOrg" TEXT,
    "partnerUrl" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "hoursPerSlot" DECIMAL(4,2),
    "approvedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceHourLog" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "serviceEventId" TEXT,
    "description" TEXT NOT NULL,
    "hoursLogged" DECIMAL(4,2) NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceHourLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePartnerOrg" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePartnerOrg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlumniProfile" (
    "id" TEXT NOT NULL,
    "brotherId" TEXT,
    "fullName" TEXT NOT NULL,
    "preferredName" TEXT,
    "graduationYear" INTEGER NOT NULL,
    "pledgeClass" TEXT,
    "initiationYear" INTEGER,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "state" TEXT,
    "employer" TEXT,
    "jobTitle" TEXT,
    "linkedinUrl" TEXT,
    "bio" TEXT,
    "optInDirectory" BOOLEAN NOT NULL DEFAULT true,
    "optInNewsletter" BOOLEAN NOT NULL DEFAULT true,
    "age" INTEGER,
    "major" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlumniProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlumniDonation" (
    "id" TEXT NOT NULL,
    "alumniId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "campaign" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "recordedById" TEXT,
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "AlumniDonation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleCalendarLink" (
    "id" TEXT NOT NULL,
    "brotherId" TEXT NOT NULL,
    "googleEmail" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "calendarId" TEXT,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleCalendarLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HqExportRun" (
    "id" TEXT NOT NULL,
    "exportType" TEXT NOT NULL,
    "termCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "fileUrl" TEXT,
    "rowCount" INTEGER,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "HqExportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalUser" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "brotherId" TEXT,
    "alumniId" TEXT,
    "magicToken" TEXT,
    "magicTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "PortalUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalDuesPayment" (
    "id" TEXT NOT NULL,
    "brotherId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "applicationFeeAmount" INTEGER,
    "destinationAccount" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,

    CONSTRAINT "PortalDuesPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlumniVouch" (
    "id" TEXT NOT NULL,
    "rushId" TEXT NOT NULL,
    "alumniId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlumniVouch_pkey" PRIMARY KEY ("id")
);

-- NOTE: the central "Tenant" registry table is intentionally NOT created here.
-- It lives ONLY in the public schema (centralDb.tenant, prisma model Tenant with
-- Stripe/subscription columns). This file is the PER-TENANT DDL, executed inside
-- each schema_<sub>; a per-tenant Tenant table was dead (no code reads/writes it
-- via a tenant-scoped client) and a stale, non-matching shell (it lacked the
-- stripeCustomerId/subscriptionStatus/plan columns the real model carries),
-- inviting accidental writes to the wrong schema. Removed.

-- CreateIndex
CREATE UNIQUE INDEX "Rush_email_key" ON "Rush"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Rush_bidToken_key" ON "Rush"("bidToken");

-- CreateIndex
CREATE INDEX "RushImpression_rushId_createdAt_idx" ON "RushImpression"("rushId", "createdAt");

-- CreateIndex
CREATE INDEX "RushSubmitLog_ipAddress_createdAt_idx" ON "RushSubmitLog"("ipAddress", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Event_checkInCode_key" ON "Event"("checkInCode");

-- CreateIndex
CREATE INDEX "EventCheckIn_eventId_createdAt_idx" ON "EventCheckIn"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "EventCheckIn_phone_idx" ON "EventCheckIn"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "EventCheckIn_eventId_phone_key" ON "EventCheckIn"("eventId", "phone");

-- CreateIndex
CREATE INDEX "BrotherRSVP_eventId_status_idx" ON "BrotherRSVP"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BrotherRSVP_eventId_brotherId_key" ON "BrotherRSVP"("eventId", "brotherId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_rushId_eventId_key" ON "Attendance"("rushId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Brother_name_key" ON "Brother"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Brother_email_key" ON "Brother"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DuesPayment_stripeSessionId_key" ON "DuesPayment"("stripeSessionId");

-- CreateIndex
CREATE INDEX "DuesPayment_brotherId_status_idx" ON "DuesPayment"("brotherId", "status");

-- CreateIndex
CREATE INDEX "Announcement_scheduledFor_idx" ON "Announcement"("scheduledFor");

-- CreateIndex
CREATE INDEX "Announcement_status_idx" ON "Announcement"("status");

-- CreateIndex
CREATE INDEX "AnnouncementRead_brotherId_readAt_idx" ON "AnnouncementRead"("brotherId", "readAt");

-- CreateIndex
CREATE INDEX "AnnouncementRead_announcementId_idx" ON "AnnouncementRead"("announcementId");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementRead_announcementId_brotherId_key" ON "AnnouncementRead"("announcementId", "brotherId");

-- CreateIndex
CREATE UNIQUE INDEX "BrotherInvite_token_key" ON "BrotherInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "BrotherInvite_brotherId_key" ON "BrotherInvite"("brotherId");

-- CreateIndex
CREATE UNIQUE INDEX "AlumniInvite_token_key" ON "AlumniInvite"("token");

-- CreateIndex
CREATE INDEX "AlumniInvite_status_idx" ON "AlumniInvite"("status");

-- CreateIndex
CREATE INDEX "AlumniInvite_alumniId_idx" ON "AlumniInvite"("alumniId");

-- CreateIndex
CREATE UNIQUE INDEX "OfficerPosition_slug_key" ON "OfficerPosition"("slug");

-- CreateIndex
CREATE INDEX "OfficerAssignment_brotherId_termCode_idx" ON "OfficerAssignment"("brotherId", "termCode");

-- CreateIndex
CREATE INDEX "OfficerAssignment_positionId_termCode_idx" ON "OfficerAssignment"("positionId", "termCode");

-- CreateIndex
CREATE INDEX "MemberStatusChange_brotherId_createdAt_idx" ON "MemberStatusChange"("brotherId", "createdAt");

-- CreateIndex
CREATE INDEX "MemberStatusChange_toStatus_reasonCategory_idx" ON "MemberStatusChange"("toStatus", "reasonCategory");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_rushId_brotherId_key" ON "Vote"("rushId", "brotherId");

-- CreateIndex
CREATE INDEX "Poll_createdAt_idx" ON "Poll"("createdAt");

-- CreateIndex
CREATE INDEX "Poll_closedAt_idx" ON "Poll"("closedAt");

-- CreateIndex
CREATE INDEX "PollVote_pollId_idx" ON "PollVote"("pollId");

-- CreateIndex
CREATE UNIQUE INDEX "PollVote_pollId_brotherId_key" ON "PollVote"("pollId", "brotherId");

-- CreateIndex
CREATE UNIQUE INDEX "PollVote_pollId_alumniId_key" ON "PollVote"("pollId", "alumniId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_subjectType_subjectId_idx" ON "AuditLog"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_seq_idx" ON "AuditLog"("seq");

-- CreateIndex
CREATE INDEX "ChapterMeeting_scheduledAt_idx" ON "ChapterMeeting"("scheduledAt");

-- CreateIndex
CREATE INDEX "ChapterMeetingAttendance_memberId_status_idx" ON "ChapterMeetingAttendance"("memberId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ChapterMeetingAttendance_meetingId_memberId_key" ON "ChapterMeetingAttendance"("meetingId", "memberId");

-- CreateIndex
CREATE INDEX "ChoreWheelAssignment_weekStarting_status_idx" ON "ChoreWheelAssignment"("weekStarting", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ChoreWheelAssignment_memberId_weekStarting_taskId_key" ON "ChoreWheelAssignment"("memberId", "weekStarting", "taskId");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentReport_receiptCode_key" ON "IncidentReport"("receiptCode");

-- CreateIndex
CREATE INDEX "IncidentReport_status_severity_idx" ON "IncidentReport"("status", "severity");

-- CreateIndex
CREATE INDEX "IncidentReport_reportedAt_idx" ON "IncidentReport"("reportedAt");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentAcknowledgment_incidentId_brotherId_key" ON "IncidentAcknowledgment"("incidentId", "brotherId");

-- CreateIndex
CREATE INDEX "ServiceEvent_eventDate_status_idx" ON "ServiceEvent"("eventDate", "status");

-- CreateIndex
CREATE INDEX "ServiceHourLog_memberId_status_idx" ON "ServiceHourLog"("memberId", "status");

-- CreateIndex
CREATE INDEX "ServiceHourLog_performedAt_idx" ON "ServiceHourLog"("performedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServicePartnerOrg_name_key" ON "ServicePartnerOrg"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AlumniProfile_brotherId_key" ON "AlumniProfile"("brotherId");

-- CreateIndex
CREATE INDEX "AlumniProfile_graduationYear_idx" ON "AlumniProfile"("graduationYear");

-- CreateIndex
CREATE UNIQUE INDEX "AlumniDonation_stripeSessionId_key" ON "AlumniDonation"("stripeSessionId");

-- CreateIndex
CREATE INDEX "AlumniDonation_alumniId_recordedAt_idx" ON "AlumniDonation"("alumniId", "recordedAt");

-- CreateIndex
CREATE INDEX "AlumniDonation_campaign_idx" ON "AlumniDonation"("campaign");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarLink_brotherId_key" ON "GoogleCalendarLink"("brotherId");

-- CreateIndex
CREATE INDEX "HqExportRun_exportType_termCode_idx" ON "HqExportRun"("exportType", "termCode");

-- CreateIndex
CREATE UNIQUE INDEX "PortalUser_email_key" ON "PortalUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PortalUser_magicToken_key" ON "PortalUser"("magicToken");

-- CreateIndex
CREATE INDEX "PortalUser_role_idx" ON "PortalUser"("role");

-- CreateIndex
CREATE INDEX "PortalUser_brotherId_idx" ON "PortalUser"("brotherId");

-- CreateIndex
CREATE INDEX "PortalUser_alumniId_idx" ON "PortalUser"("alumniId");

-- CreateIndex
CREATE UNIQUE INDEX "PortalDuesPayment_stripeSessionId_key" ON "PortalDuesPayment"("stripeSessionId");

-- CreateIndex
CREATE INDEX "PortalDuesPayment_brotherId_status_idx" ON "PortalDuesPayment"("brotherId", "status");

-- CreateIndex
CREATE INDEX "AlumniVouch_rushId_idx" ON "AlumniVouch"("rushId");

-- CreateIndex
CREATE INDEX "AlumniVouch_alumniId_idx" ON "AlumniVouch"("alumniId");

-- CreateIndex
CREATE UNIQUE INDEX "AlumniVouch_rushId_alumniId_key" ON "AlumniVouch"("rushId", "alumniId");

-- (Tenant_subdomain_key / Tenant_domain_key removed with the per-tenant Tenant
-- table above — the central registry's unique indexes live in the public schema.)

-- AddForeignKey
ALTER TABLE "RushImpression" ADD CONSTRAINT "RushImpression_rushId_fkey" FOREIGN KEY ("rushId") REFERENCES "Rush"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RushConsent" ADD CONSTRAINT "RushConsent_rushId_fkey" FOREIGN KEY ("rushId") REFERENCES "Rush"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCheckIn" ADD CONSTRAINT "EventCheckIn_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrotherRSVP" ADD CONSTRAINT "BrotherRSVP_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrotherRSVP" ADD CONSTRAINT "BrotherRSVP_brotherId_fkey" FOREIGN KEY ("brotherId") REFERENCES "Brother"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_rushId_fkey" FOREIGN KEY ("rushId") REFERENCES "Rush"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brother" ADD CONSTRAINT "Brother_bigBrotherId_fkey" FOREIGN KEY ("bigBrotherId") REFERENCES "Brother"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuesPayment" ADD CONSTRAINT "DuesPayment_brotherId_fkey" FOREIGN KEY ("brotherId") REFERENCES "Brother"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Brother"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_brotherId_fkey" FOREIGN KEY ("brotherId") REFERENCES "Brother"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "Brother"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_versionOfId_fkey" FOREIGN KEY ("versionOfId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficerAssignment" ADD CONSTRAINT "OfficerAssignment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "OfficerPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficerAssignment" ADD CONSTRAINT "OfficerAssignment_brotherId_fkey" FOREIGN KEY ("brotherId") REFERENCES "Brother"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberStatusChange" ADD CONSTRAINT "MemberStatusChange_brotherId_fkey" FOREIGN KEY ("brotherId") REFERENCES "Brother"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberStatusChange" ADD CONSTRAINT "MemberStatusChange_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "Brother"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_rushId_fkey" FOREIGN KEY ("rushId") REFERENCES "Rush"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_brotherId_fkey" FOREIGN KEY ("brotherId") REFERENCES "Brother"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_rushId_fkey" FOREIGN KEY ("rushId") REFERENCES "Rush"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsLog" ADD CONSTRAINT "SmsLog_rushId_fkey" FOREIGN KEY ("rushId") REFERENCES "Rush"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Brother"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_brotherId_fkey" FOREIGN KEY ("brotherId") REFERENCES "Brother"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "AlumniProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterMeetingAttendance" ADD CONSTRAINT "ChapterMeetingAttendance_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "ChapterMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterMeetingAttendance" ADD CONSTRAINT "ChapterMeetingAttendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Brother"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreWheelAssignment" ADD CONSTRAINT "ChoreWheelAssignment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ChoreWheelTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreWheelAssignment" ADD CONSTRAINT "ChoreWheelAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Brother"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "Brother"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentAcknowledgment" ADD CONSTRAINT "IncidentAcknowledgment_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "IncidentReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentAcknowledgment" ADD CONSTRAINT "IncidentAcknowledgment_brotherId_fkey" FOREIGN KEY ("brotherId") REFERENCES "Brother"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceHourLog" ADD CONSTRAINT "ServiceHourLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Brother"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceHourLog" ADD CONSTRAINT "ServiceHourLog_serviceEventId_fkey" FOREIGN KEY ("serviceEventId") REFERENCES "ServiceEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumniProfile" ADD CONSTRAINT "AlumniProfile_brotherId_fkey" FOREIGN KEY ("brotherId") REFERENCES "Brother"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumniDonation" ADD CONSTRAINT "AlumniDonation_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "AlumniProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleCalendarLink" ADD CONSTRAINT "GoogleCalendarLink_brotherId_fkey" FOREIGN KEY ("brotherId") REFERENCES "Brother"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumniVouch" ADD CONSTRAINT "AlumniVouch_rushId_fkey" FOREIGN KEY ("rushId") REFERENCES "Rush"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumniVouch" ADD CONSTRAINT "AlumniVouch_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "AlumniProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable (Member Directory tool — additive Brother columns, idempotent so a
-- re-run against a tenant schema created by an older copy of this DDL adds the
-- new columns without error and never duplicates them).
ALTER TABLE "Brother" ADD COLUMN IF NOT EXISTS "hometown" TEXT;
ALTER TABLE "Brother" ADD COLUMN IF NOT EXISTS "gradYear" TEXT;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "pollId" TEXT;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Officer Elections (secret ballot → seat winners into OfficerAssignment) ──
-- CreateTable
CREATE TABLE "Election" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "termCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "anonymous" BOOLEAN NOT NULL DEFAULT true,
    "audience" TEXT NOT NULL DEFAULT 'BROTHERS',
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Election_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectionSeat" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "positionId" TEXT,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "winnerCandidateId" TEXT,
    "winnerBrotherId" TEXT,
    "winnerName" TEXT,
    "seatedAssignmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElectionSeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectionCandidate" (
    "id" TEXT NOT NULL,
    "seatId" TEXT NOT NULL,
    "brotherId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "statement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElectionCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectionBallot" (
    "id" TEXT NOT NULL,
    "seatId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "voterBrotherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElectionBallot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Election_status_idx" ON "Election"("status");
CREATE INDEX "Election_termCode_idx" ON "Election"("termCode");
CREATE INDEX "ElectionSeat_electionId_idx" ON "ElectionSeat"("electionId");
CREATE UNIQUE INDEX "ElectionCandidate_seatId_brotherId_key" ON "ElectionCandidate"("seatId", "brotherId");
CREATE INDEX "ElectionCandidate_seatId_idx" ON "ElectionCandidate"("seatId");
CREATE UNIQUE INDEX "ElectionBallot_seatId_voterBrotherId_key" ON "ElectionBallot"("seatId", "voterBrotherId");
CREATE INDEX "ElectionBallot_seatId_idx" ON "ElectionBallot"("seatId");
CREATE INDEX "ElectionBallot_candidateId_idx" ON "ElectionBallot"("candidateId");

-- AddForeignKey
ALTER TABLE "ElectionSeat" ADD CONSTRAINT "ElectionSeat_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ElectionCandidate" ADD CONSTRAINT "ElectionCandidate_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "ElectionSeat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ElectionBallot" ADD CONSTRAINT "ElectionBallot_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "ElectionSeat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ElectionBallot" ADD CONSTRAINT "ElectionBallot_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "ElectionCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Alumni/brother career board (JobPosting) ────────────────────────────────
-- Backs the career/job board on the alumni + brother portals and the mobile
-- API (app/api/.../career/*). Was missing from the per-tenant DDL, so a
-- freshly-provisioned chapter would 500 the moment a member opened the board.
-- CreateTable
CREATE TABLE "JobPosting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT NOT NULL,
    "requirements" TEXT,
    "salary" TEXT,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "contactName" TEXT NOT NULL,
    "postedById" TEXT NOT NULL,
    "postedByName" TEXT NOT NULL,
    "postedByRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobPosting_postedById_idx" ON "JobPosting"("postedById");

-- ── Sober-driver schedule (SoberDriverShift) ────────────────────────────────
-- Backs the admin risk-management sober-driver schedule
-- (app/api/admin/sober-schedule). Was missing from the per-tenant DDL.
-- CreateTable
CREATE TABLE "SoberDriverShift" (
    "id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "shiftHours" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SoberDriverShift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SoberDriverShift_memberId_idx" ON "SoberDriverShift"("memberId");

-- AddForeignKey
ALTER TABLE "SoberDriverShift" ADD CONSTRAINT "SoberDriverShift_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Brother"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Section-builder foundation (Section + SectionContent) ───────────────────
-- Structured persistence for the public chapter-site section layout + per-section
-- content overrides. ADDITIVE + INERT: the landing page reads these tables only
-- when rows exist; with zero rows it falls back byte-for-byte to the legacy
-- SiteConfig-driven render. IF NOT EXISTS so re-running this DDL against a tenant
-- schema created by an older copy is a clean no-op.
-- CreateTable
CREATE TABLE IF NOT EXISTS "Section" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SectionContent" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SectionContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Section_key_key" ON "Section"("key");
CREATE INDEX IF NOT EXISTS "Section_sortOrder_idx" ON "Section"("sortOrder");
CREATE UNIQUE INDEX IF NOT EXISTS "SectionContent_sectionId_field_key" ON "SectionContent"("sectionId", "field");
CREATE INDEX IF NOT EXISTS "SectionContent_sectionId_idx" ON "SectionContent"("sectionId");

-- AddForeignKey. The provisioning runner (lib/provision.ts) splits this DDL on
-- ";" and swallows "already exists" errors, so a plain ADD CONSTRAINT is the
-- re-run-safe pattern used throughout this file (a DO/$$ block would be shredded
-- by the naive split). On a fresh schema this runs once; on a re-run it raises
-- "already exists" which the runner ignores.
ALTER TABLE "SectionContent" ADD CONSTRAINT "SectionContent_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Portal password reset (OTP flow) ────────────────────────────────────────
-- One-time 6-digit code reset for the member portal (brother/alumni). Mirrors
-- prisma model PortalPasswordReset (prisma/schema.prisma). Was MISSING from this
-- per-tenant DDL, so every provisioned tenant lacked the table and
-- /api/portal/reset/request silently no-op'd (the OTP was never persisted, so
-- reset/verify never found a row and reset could never complete). We store ONLY
-- the HMAC hash of the code, never the plaintext. IF NOT EXISTS so re-running
-- this DDL against a schema built by an older copy is a clean no-op.
-- CreateTable
CREATE TABLE IF NOT EXISTS "PortalPasswordReset" (
    "id" TEXT NOT NULL,
    "portalUserId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "requestIp" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalPasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PortalPasswordReset_portalUserId_createdAt_idx" ON "PortalPasswordReset"("portalUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "PortalPasswordReset_email_role_idx" ON "PortalPasswordReset"("email", "role");
CREATE INDEX IF NOT EXISTS "PortalPasswordReset_expiresAt_idx" ON "PortalPasswordReset"("expiresAt");

-- AddForeignKey (plain ADD CONSTRAINT — re-run-safe: raises "already exists"
-- which the provisioning runner ignores).
ALTER TABLE "PortalPasswordReset" ADD CONSTRAINT "PortalPasswordReset_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

