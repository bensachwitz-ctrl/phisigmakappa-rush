


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."AlumniDonation" (
    "id" "text" NOT NULL,
    "alumniId" "text" NOT NULL,
    "amountCents" integer NOT NULL,
    "campaign" "text",
    "recordedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "notes" "text",
    "recordedById" "text",
    "stripeSessionId" "text",
    "stripePaymentIntentId" "text",
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL
);


ALTER TABLE "public"."AlumniDonation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."AlumniInvite" (
    "id" "text" NOT NULL,
    "token" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "prefillName" "text",
    "invitedBy" "text",
    "alumniId" "text",
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone
);


ALTER TABLE "public"."AlumniInvite" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."AlumniProfile" (
    "id" "text" NOT NULL,
    "brotherId" "text",
    "fullName" "text" NOT NULL,
    "preferredName" "text",
    "graduationYear" integer NOT NULL,
    "pledgeClass" "text",
    "initiationYear" integer,
    "email" "text",
    "phone" "text",
    "city" "text",
    "state" "text",
    "employer" "text",
    "jobTitle" "text",
    "linkedinUrl" "text",
    "bio" "text",
    "optInDirectory" boolean DEFAULT true NOT NULL,
    "optInNewsletter" boolean DEFAULT true NOT NULL,
    "age" integer,
    "major" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."AlumniProfile" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."AlumniVouch" (
    "id" "text" NOT NULL,
    "rushId" "text" NOT NULL,
    "alumniId" "text" NOT NULL,
    "note" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."AlumniVouch" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Announcement" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "audience" "text" DEFAULT 'ALL'::"text" NOT NULL,
    "pinned" boolean DEFAULT false NOT NULL,
    "authorId" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "status" "text" DEFAULT 'sent'::"text" NOT NULL,
    "scheduledFor" timestamp(3) without time zone,
    "sentAt" timestamp(3) without time zone,
    "failureReason" "text",
    "channels" "text" DEFAULT 'inapp'::"text" NOT NULL,
    "totalRecipients" integer,
    "pollId" "text"
);


ALTER TABLE "public"."Announcement" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."AnnouncementRead" (
    "id" "text" NOT NULL,
    "announcementId" "text" NOT NULL,
    "brotherId" "text" NOT NULL,
    "readAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."AnnouncementRead" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Attendance" (
    "id" "text" NOT NULL,
    "rushId" "text" NOT NULL,
    "eventId" "text" NOT NULL,
    "attended" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."Attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."AuditLog" (
    "id" "text" NOT NULL,
    "actorId" "text",
    "actorName" "text" NOT NULL,
    "action" "text" NOT NULL,
    "subjectType" "text" NOT NULL,
    "subjectId" "text",
    "subjectName" "text",
    "details" "text",
    "ipAddress" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "seq" integer,
    "prevHash" "text",
    "hash" "text"
);


ALTER TABLE "public"."AuditLog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Brother" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "year" "text",
    "major" "text",
    "position" "text",
    "pledgeClass" "text",
    "hometown" "text",
    "gradYear" "text",
    "bio" "text",
    "headshotUrl" "text",
    "duesPaid" boolean DEFAULT false NOT NULL,
    "duesAmountCents" integer,
    "duesYear" "text",
    "duesPaidAt" timestamp(3) without time zone,
    "duesPaymentMethod" "text",
    "duesPaymentId" "text",
    "serviceHours" integer DEFAULT 0 NOT NULL,
    "studyHours" integer DEFAULT 0 NOT NULL,
    "role" "text" DEFAULT 'MEMBER'::"text" NOT NULL,
    "passwordHash" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastSeen" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "status" "text" DEFAULT 'ACTIVE'::"text" NOT NULL,
    "pledgeClassName" "text",
    "pledgeLineNumber" integer,
    "initiationDate" timestamp(3) without time zone,
    "graduationYear" integer,
    "academicStanding" "text",
    "bigBrotherId" "text"
);


ALTER TABLE "public"."Brother" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."BrotherInvite" (
    "id" "text" NOT NULL,
    "token" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "prefillName" "text",
    "invitedBy" "text",
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "brotherId" "text",
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone
);


ALTER TABLE "public"."BrotherInvite" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."BrotherRSVP" (
    "id" "text" NOT NULL,
    "eventId" "text" NOT NULL,
    "brotherId" "text" NOT NULL,
    "status" "text" NOT NULL,
    "note" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."BrotherRSVP" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."BudgetLine" (
    "id" "text" NOT NULL,
    "category" "text" NOT NULL,
    "label" "text" NOT NULL,
    "budgetedCents" integer DEFAULT 0 NOT NULL,
    "actualCents" integer DEFAULT 0 NOT NULL,
    "period" "text" NOT NULL,
    "notes" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."BudgetLine" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ChapterMeeting" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "scheduledAt" timestamp(3) without time zone NOT NULL,
    "duration" integer DEFAULT 60 NOT NULL,
    "location" "text",
    "notes" "text",
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "requiredFor" "jsonb" DEFAULT '["ACTIVE", "INITIATE", "PLEDGE"]'::"jsonb" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."ChapterMeeting" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ChapterMeetingAttendance" (
    "id" "text" NOT NULL,
    "meetingId" "text" NOT NULL,
    "memberId" "text" NOT NULL,
    "status" "text" DEFAULT 'absent'::"text" NOT NULL,
    "checkedInAt" timestamp(3) without time zone,
    "excuseReason" "text",
    "excuseApprovedById" "text",
    "notes" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."ChapterMeetingAttendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ChoreWheelAssignment" (
    "id" "text" NOT NULL,
    "taskId" "text" NOT NULL,
    "memberId" "text" NOT NULL,
    "weekStarting" timestamp(3) without time zone NOT NULL,
    "status" "text" DEFAULT 'assigned'::"text" NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "grade" "text",
    "notes" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."ChoreWheelAssignment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ChoreWheelTask" (
    "id" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "rotationOrder" integer NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."ChoreWheelTask" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Document" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "url" "text" NOT NULL,
    "category" "text" DEFAULT 'GENERAL'::"text" NOT NULL,
    "size" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "visibility" "text" DEFAULT 'MEMBERS'::"text" NOT NULL,
    "fileName" "text",
    "fileSize" integer,
    "mimeType" "text",
    "blobUrl" "text",
    "uploadedById" "text",
    "versionOfId" "text",
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."Document" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."DuesPayment" (
    "id" "text" NOT NULL,
    "brotherId" "text" NOT NULL,
    "amountCents" integer NOT NULL,
    "currency" "text" DEFAULT 'usd'::"text" NOT NULL,
    "year" "text" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "method" "text" NOT NULL,
    "stripeSessionId" "text",
    "stripePaymentIntentId" "text",
    "receiptUrl" "text",
    "notes" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."DuesPayment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Election" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "termCode" "text" NOT NULL,
    "status" "text" DEFAULT 'DRAFT'::"text" NOT NULL,
    "anonymous" boolean DEFAULT true NOT NULL,
    "audience" "text" DEFAULT 'BROTHERS'::"text" NOT NULL,
    "opensAt" timestamp(3) without time zone,
    "closesAt" timestamp(3) without time zone,
    "closedAt" timestamp(3) without time zone,
    "createdById" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."Election" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ElectionBallot" (
    "id" "text" NOT NULL,
    "seatId" "text" NOT NULL,
    "candidateId" "text" NOT NULL,
    "voterBrotherId" "text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."ElectionBallot" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ElectionCandidate" (
    "id" "text" NOT NULL,
    "seatId" "text" NOT NULL,
    "brotherId" "text" NOT NULL,
    "name" "text" NOT NULL,
    "statement" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."ElectionCandidate" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ElectionSeat" (
    "id" "text" NOT NULL,
    "electionId" "text" NOT NULL,
    "positionId" "text",
    "title" "text" NOT NULL,
    "sortOrder" integer DEFAULT 100 NOT NULL,
    "winnerCandidateId" "text",
    "winnerBrotherId" "text",
    "winnerName" "text",
    "seatedAssignmentId" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."ElectionSeat" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."EmailLog" (
    "id" "text" NOT NULL,
    "rushId" "text",
    "subject" "text" NOT NULL,
    "body" "text" NOT NULL,
    "recipients" "text" NOT NULL,
    "sentAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "status" "text" DEFAULT 'SENT'::"text" NOT NULL
);


ALTER TABLE "public"."EmailLog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Event" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "location" "text",
    "dressCode" "text",
    "startsAt" timestamp(3) without time zone NOT NULL,
    "endsAt" timestamp(3) without time zone,
    "isPrivate" boolean DEFAULT false NOT NULL,
    "category" "text" DEFAULT 'OTHER'::"text" NOT NULL,
    "checkInCode" "text",
    "audience" "text" DEFAULT 'ALL'::"text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."Event" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."EventCheckIn" (
    "id" "text" NOT NULL,
    "eventId" "text" NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "rushId" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."EventCheckIn" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Expense" (
    "id" "text" NOT NULL,
    "submittedById" "text",
    "submittedByName" "text",
    "amountCents" integer NOT NULL,
    "category" "text" NOT NULL,
    "description" "text" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "receiptUrl" "text",
    "decidedByName" "text",
    "decidedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."Expense" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."GoogleCalendarLink" (
    "id" "text" NOT NULL,
    "brotherId" "text" NOT NULL,
    "googleEmail" "text" NOT NULL,
    "refreshToken" "text" NOT NULL,
    "calendarId" "text",
    "syncEnabled" boolean DEFAULT true NOT NULL,
    "lastSyncedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."GoogleCalendarLink" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."HqExportRun" (
    "id" "text" NOT NULL,
    "exportType" "text" NOT NULL,
    "termCode" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "fileUrl" "text",
    "rowCount" integer,
    "createdById" "text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "errorMessage" "text"
);


ALTER TABLE "public"."HqExportRun" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."IncidentAcknowledgment" (
    "id" "text" NOT NULL,
    "incidentId" "text" NOT NULL,
    "brotherId" "text" NOT NULL,
    "acknowledgedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."IncidentAcknowledgment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."IncidentReport" (
    "id" "text" NOT NULL,
    "category" "text" NOT NULL,
    "severity" "text" DEFAULT 'medium'::"text" NOT NULL,
    "status" "text" DEFAULT 'submitted'::"text" NOT NULL,
    "reporterId" "text",
    "isAnonymous" boolean DEFAULT false NOT NULL,
    "subject" "text" NOT NULL,
    "body" "text" NOT NULL,
    "occurredAt" timestamp(3) without time zone,
    "reportedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "receiptCode" "text" NOT NULL,
    "assignedToId" "text",
    "resolutionNotes" "text",
    "resolvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."IncidentReport" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."JobPosting" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "company" "text" NOT NULL,
    "location" "text",
    "description" "text" NOT NULL,
    "requirements" "text",
    "salary" "text",
    "contactEmail" "text" NOT NULL,
    "contactPhone" "text",
    "contactName" "text" NOT NULL,
    "postedById" "text" NOT NULL,
    "postedByName" "text" NOT NULL,
    "postedByRole" "text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."JobPosting" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."MemberStatusChange" (
    "id" "text" NOT NULL,
    "brotherId" "text" NOT NULL,
    "fromStatus" "text",
    "toStatus" "text" NOT NULL,
    "reason" "text",
    "reasonCategory" "text",
    "changedById" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."MemberStatusChange" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."OfficerAssignment" (
    "id" "text" NOT NULL,
    "positionId" "text" NOT NULL,
    "brotherId" "text" NOT NULL,
    "termCode" "text" NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    "notes" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."OfficerAssignment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."OfficerPosition" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "permissions" "text" NOT NULL,
    "sortOrder" integer DEFAULT 100 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."OfficerPosition" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."OnboardAttempt" (
    "id" "text" NOT NULL,
    "ipAddress" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."OnboardAttempt" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Poll" (
    "id" "text" NOT NULL,
    "question" "text" NOT NULL,
    "options" "text" NOT NULL,
    "createdById" "text" NOT NULL,
    "closesAt" timestamp(3) without time zone,
    "closedAt" timestamp(3) without time zone,
    "audience" "text" DEFAULT 'BROTHERS'::"text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."Poll" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."PollVote" (
    "id" "text" NOT NULL,
    "pollId" "text" NOT NULL,
    "brotherId" "text",
    "alumniId" "text",
    "optionId" "text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."PollVote" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."PortalDuesPayment" (
    "id" "text" NOT NULL,
    "brotherId" "text" NOT NULL,
    "amount" integer NOT NULL,
    "stripeSessionId" "text",
    "stripePaymentIntentId" "text",
    "applicationFeeAmount" integer,
    "destinationAccount" "text",
    "paidAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "status" "text" NOT NULL
);


ALTER TABLE "public"."PortalDuesPayment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."PortalUser" (
    "id" "text" NOT NULL,
    "role" "text" NOT NULL,
    "email" "text" NOT NULL,
    "passwordHash" "text",
    "brotherId" "text",
    "alumniId" "text",
    "magicToken" "text",
    "magicTokenExpiresAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastLoginAt" timestamp(3) without time zone
);


ALTER TABLE "public"."PortalUser" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Rush" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "hometown" "text",
    "major" "text",
    "year" "text",
    "highSchoolInfo" "text",
    "backgroundInfo" "text",
    "headshotUrl" "text",
    "enrichmentData" "text",
    "enrichedAt" timestamp(3) without time zone,
    "status" "text" DEFAULT 'ACTIVE'::"text" NOT NULL,
    "notes" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "bidToken" "text",
    "bidTokenExpiresAt" timestamp(3) without time zone,
    "bidRespondedAt" timestamp(3) without time zone,
    "bidResponseChoice" "text"
);


ALTER TABLE "public"."Rush" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."RushConsent" (
    "id" "text" NOT NULL,
    "rushId" "text" NOT NULL,
    "disclosureVersion" "text" NOT NULL,
    "disclosureText" "text" NOT NULL,
    "ipAddress" "text",
    "userAgent" "text",
    "ageAttestation" "text" NOT NULL,
    "smsConfirmed" boolean DEFAULT false NOT NULL,
    "smsConfirmedAt" timestamp(3) without time zone,
    "optedOut" boolean DEFAULT false NOT NULL,
    "optedOutAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."RushConsent" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."RushImpression" (
    "id" "text" NOT NULL,
    "rushId" "text" NOT NULL,
    "authorName" "text" NOT NULL,
    "tone" "text" NOT NULL,
    "note" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."RushImpression" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."RushSubmitLog" (
    "id" "text" NOT NULL,
    "ipAddress" "text",
    "email" "text",
    "status" "text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."RushSubmitLog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Section" (
    "id" "text" NOT NULL,
    "key" "text" NOT NULL,
    "sortOrder" integer DEFAULT 100 NOT NULL,
    "visible" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."Section" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."SectionContent" (
    "id" "text" NOT NULL,
    "sectionId" "text" NOT NULL,
    "field" "text" NOT NULL,
    "value" "text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."SectionContent" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ServiceEvent" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "partnerOrg" "text",
    "partnerUrl" "text",
    "eventDate" timestamp(3) without time zone NOT NULL,
    "hoursPerSlot" numeric(4,2),
    "approvedById" "text",
    "status" "text" DEFAULT 'proposed'::"text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."ServiceEvent" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ServiceHourLog" (
    "id" "text" NOT NULL,
    "memberId" "text" NOT NULL,
    "serviceEventId" "text",
    "description" "text" NOT NULL,
    "hoursLogged" numeric(4,2) NOT NULL,
    "performedAt" timestamp(3) without time zone NOT NULL,
    "status" "text" DEFAULT 'submitted'::"text" NOT NULL,
    "approvedById" "text",
    "approvedAt" timestamp(3) without time zone,
    "rejectionReason" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."ServiceHourLog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ServicePartnerOrg" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "website" "text",
    "contactEmail" "text",
    "contactPhone" "text",
    "description" "text",
    "active" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."ServicePartnerOrg" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."SiteConfig" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."SiteConfig" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."SmsLog" (
    "id" "text" NOT NULL,
    "rushId" "text",
    "body" "text" NOT NULL,
    "recipients" "text" NOT NULL,
    "sentAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "status" "text" DEFAULT 'SENT'::"text" NOT NULL
);


ALTER TABLE "public"."SmsLog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."SoberDriverShift" (
    "id" "text" NOT NULL,
    "day" "text" NOT NULL,
    "shiftHours" "text" NOT NULL,
    "memberId" "text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."SoberDriverShift" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Tenant" (
    "id" "text" NOT NULL,
    "subdomain" "text" NOT NULL,
    "domain" "text",
    "name" "text",
    "school" "text",
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "stripeCustomerId" "text",
    "stripeSubscriptionId" "text",
    "subscriptionStatus" "text",
    "trialEndsAt" timestamp(3) without time zone,
    "plan" "text"
);


ALTER TABLE "public"."Tenant" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Vote" (
    "id" "text" NOT NULL,
    "rushId" "text" NOT NULL,
    "brotherId" "text" NOT NULL,
    "value" integer NOT NULL,
    "comment" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."Vote" OWNER TO "postgres";


ALTER TABLE ONLY "public"."AlumniDonation"
    ADD CONSTRAINT "AlumniDonation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AlumniInvite"
    ADD CONSTRAINT "AlumniInvite_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AlumniProfile"
    ADD CONSTRAINT "AlumniProfile_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AlumniVouch"
    ADD CONSTRAINT "AlumniVouch_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AnnouncementRead"
    ADD CONSTRAINT "AnnouncementRead_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Announcement"
    ADD CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Attendance"
    ADD CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."BrotherInvite"
    ADD CONSTRAINT "BrotherInvite_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."BrotherRSVP"
    ADD CONSTRAINT "BrotherRSVP_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Brother"
    ADD CONSTRAINT "Brother_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."BudgetLine"
    ADD CONSTRAINT "BudgetLine_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ChapterMeetingAttendance"
    ADD CONSTRAINT "ChapterMeetingAttendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ChapterMeeting"
    ADD CONSTRAINT "ChapterMeeting_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ChoreWheelAssignment"
    ADD CONSTRAINT "ChoreWheelAssignment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ChoreWheelTask"
    ADD CONSTRAINT "ChoreWheelTask_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Document"
    ADD CONSTRAINT "Document_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."DuesPayment"
    ADD CONSTRAINT "DuesPayment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ElectionBallot"
    ADD CONSTRAINT "ElectionBallot_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ElectionCandidate"
    ADD CONSTRAINT "ElectionCandidate_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ElectionSeat"
    ADD CONSTRAINT "ElectionSeat_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Election"
    ADD CONSTRAINT "Election_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."EmailLog"
    ADD CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."EventCheckIn"
    ADD CONSTRAINT "EventCheckIn_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Event"
    ADD CONSTRAINT "Event_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Expense"
    ADD CONSTRAINT "Expense_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."GoogleCalendarLink"
    ADD CONSTRAINT "GoogleCalendarLink_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."HqExportRun"
    ADD CONSTRAINT "HqExportRun_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."IncidentAcknowledgment"
    ADD CONSTRAINT "IncidentAcknowledgment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."IncidentReport"
    ADD CONSTRAINT "IncidentReport_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."JobPosting"
    ADD CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."MemberStatusChange"
    ADD CONSTRAINT "MemberStatusChange_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."OfficerAssignment"
    ADD CONSTRAINT "OfficerAssignment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."OfficerPosition"
    ADD CONSTRAINT "OfficerPosition_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."OnboardAttempt"
    ADD CONSTRAINT "OnboardAttempt_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."PollVote"
    ADD CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Poll"
    ADD CONSTRAINT "Poll_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."PortalDuesPayment"
    ADD CONSTRAINT "PortalDuesPayment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."PortalUser"
    ADD CONSTRAINT "PortalUser_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."RushConsent"
    ADD CONSTRAINT "RushConsent_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."RushImpression"
    ADD CONSTRAINT "RushImpression_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."RushSubmitLog"
    ADD CONSTRAINT "RushSubmitLog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Rush"
    ADD CONSTRAINT "Rush_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."SectionContent"
    ADD CONSTRAINT "SectionContent_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Section"
    ADD CONSTRAINT "Section_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ServiceEvent"
    ADD CONSTRAINT "ServiceEvent_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ServiceHourLog"
    ADD CONSTRAINT "ServiceHourLog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ServicePartnerOrg"
    ADD CONSTRAINT "ServicePartnerOrg_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."SiteConfig"
    ADD CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."SmsLog"
    ADD CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."SoberDriverShift"
    ADD CONSTRAINT "SoberDriverShift_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Tenant"
    ADD CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Vote"
    ADD CONSTRAINT "Vote_pkey" PRIMARY KEY ("id");



CREATE INDEX "AlumniDonation_alumniId_recordedAt_idx" ON "public"."AlumniDonation" USING "btree" ("alumniId", "recordedAt");



CREATE INDEX "AlumniDonation_campaign_idx" ON "public"."AlumniDonation" USING "btree" ("campaign");



CREATE UNIQUE INDEX "AlumniDonation_stripeSessionId_key" ON "public"."AlumniDonation" USING "btree" ("stripeSessionId");



CREATE INDEX "AlumniInvite_alumniId_idx" ON "public"."AlumniInvite" USING "btree" ("alumniId");



CREATE INDEX "AlumniInvite_status_idx" ON "public"."AlumniInvite" USING "btree" ("status");



CREATE UNIQUE INDEX "AlumniInvite_token_key" ON "public"."AlumniInvite" USING "btree" ("token");



CREATE UNIQUE INDEX "AlumniProfile_brotherId_key" ON "public"."AlumniProfile" USING "btree" ("brotherId");



CREATE INDEX "AlumniProfile_graduationYear_idx" ON "public"."AlumniProfile" USING "btree" ("graduationYear");



CREATE INDEX "AlumniVouch_alumniId_idx" ON "public"."AlumniVouch" USING "btree" ("alumniId");



CREATE UNIQUE INDEX "AlumniVouch_rushId_alumniId_key" ON "public"."AlumniVouch" USING "btree" ("rushId", "alumniId");



CREATE INDEX "AlumniVouch_rushId_idx" ON "public"."AlumniVouch" USING "btree" ("rushId");



CREATE UNIQUE INDEX "AnnouncementRead_announcementId_brotherId_key" ON "public"."AnnouncementRead" USING "btree" ("announcementId", "brotherId");



CREATE INDEX "AnnouncementRead_announcementId_idx" ON "public"."AnnouncementRead" USING "btree" ("announcementId");



CREATE INDEX "AnnouncementRead_brotherId_readAt_idx" ON "public"."AnnouncementRead" USING "btree" ("brotherId", "readAt");



CREATE INDEX "Announcement_scheduledFor_idx" ON "public"."Announcement" USING "btree" ("scheduledFor");



CREATE INDEX "Announcement_status_idx" ON "public"."Announcement" USING "btree" ("status");



CREATE UNIQUE INDEX "Attendance_rushId_eventId_key" ON "public"."Attendance" USING "btree" ("rushId", "eventId");



CREATE INDEX "AuditLog_actorId_idx" ON "public"."AuditLog" USING "btree" ("actorId");



CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog" USING "btree" ("createdAt");



CREATE INDEX "AuditLog_seq_idx" ON "public"."AuditLog" USING "btree" ("seq");



CREATE INDEX "AuditLog_subjectType_subjectId_idx" ON "public"."AuditLog" USING "btree" ("subjectType", "subjectId");



CREATE UNIQUE INDEX "BrotherInvite_brotherId_key" ON "public"."BrotherInvite" USING "btree" ("brotherId");



CREATE UNIQUE INDEX "BrotherInvite_token_key" ON "public"."BrotherInvite" USING "btree" ("token");



CREATE UNIQUE INDEX "BrotherRSVP_eventId_brotherId_key" ON "public"."BrotherRSVP" USING "btree" ("eventId", "brotherId");



CREATE INDEX "BrotherRSVP_eventId_status_idx" ON "public"."BrotherRSVP" USING "btree" ("eventId", "status");



CREATE UNIQUE INDEX "Brother_email_key" ON "public"."Brother" USING "btree" ("email");



CREATE UNIQUE INDEX "Brother_name_key" ON "public"."Brother" USING "btree" ("name");



CREATE UNIQUE INDEX "ChapterMeetingAttendance_meetingId_memberId_key" ON "public"."ChapterMeetingAttendance" USING "btree" ("meetingId", "memberId");



CREATE INDEX "ChapterMeetingAttendance_memberId_status_idx" ON "public"."ChapterMeetingAttendance" USING "btree" ("memberId", "status");



CREATE INDEX "ChapterMeeting_scheduledAt_idx" ON "public"."ChapterMeeting" USING "btree" ("scheduledAt");



CREATE UNIQUE INDEX "ChoreWheelAssignment_memberId_weekStarting_taskId_key" ON "public"."ChoreWheelAssignment" USING "btree" ("memberId", "weekStarting", "taskId");



CREATE INDEX "ChoreWheelAssignment_weekStarting_status_idx" ON "public"."ChoreWheelAssignment" USING "btree" ("weekStarting", "status");



CREATE INDEX "DuesPayment_brotherId_status_idx" ON "public"."DuesPayment" USING "btree" ("brotherId", "status");



CREATE UNIQUE INDEX "DuesPayment_stripeSessionId_key" ON "public"."DuesPayment" USING "btree" ("stripeSessionId");



CREATE INDEX "ElectionBallot_candidateId_idx" ON "public"."ElectionBallot" USING "btree" ("candidateId");



CREATE INDEX "ElectionBallot_seatId_idx" ON "public"."ElectionBallot" USING "btree" ("seatId");



CREATE UNIQUE INDEX "ElectionBallot_seatId_voterBrotherId_key" ON "public"."ElectionBallot" USING "btree" ("seatId", "voterBrotherId");



CREATE UNIQUE INDEX "ElectionCandidate_seatId_brotherId_key" ON "public"."ElectionCandidate" USING "btree" ("seatId", "brotherId");



CREATE INDEX "ElectionCandidate_seatId_idx" ON "public"."ElectionCandidate" USING "btree" ("seatId");



CREATE INDEX "ElectionSeat_electionId_idx" ON "public"."ElectionSeat" USING "btree" ("electionId");



CREATE INDEX "Election_status_idx" ON "public"."Election" USING "btree" ("status");



CREATE INDEX "Election_termCode_idx" ON "public"."Election" USING "btree" ("termCode");



CREATE INDEX "EventCheckIn_eventId_createdAt_idx" ON "public"."EventCheckIn" USING "btree" ("eventId", "createdAt");



CREATE UNIQUE INDEX "EventCheckIn_eventId_phone_key" ON "public"."EventCheckIn" USING "btree" ("eventId", "phone");



CREATE INDEX "EventCheckIn_phone_idx" ON "public"."EventCheckIn" USING "btree" ("phone");



CREATE UNIQUE INDEX "Event_checkInCode_key" ON "public"."Event" USING "btree" ("checkInCode");



CREATE UNIQUE INDEX "GoogleCalendarLink_brotherId_key" ON "public"."GoogleCalendarLink" USING "btree" ("brotherId");



CREATE INDEX "HqExportRun_exportType_termCode_idx" ON "public"."HqExportRun" USING "btree" ("exportType", "termCode");



CREATE UNIQUE INDEX "IncidentAcknowledgment_incidentId_brotherId_key" ON "public"."IncidentAcknowledgment" USING "btree" ("incidentId", "brotherId");



CREATE UNIQUE INDEX "IncidentReport_receiptCode_key" ON "public"."IncidentReport" USING "btree" ("receiptCode");



CREATE INDEX "IncidentReport_reportedAt_idx" ON "public"."IncidentReport" USING "btree" ("reportedAt");



CREATE INDEX "IncidentReport_status_severity_idx" ON "public"."IncidentReport" USING "btree" ("status", "severity");



CREATE INDEX "JobPosting_postedById_idx" ON "public"."JobPosting" USING "btree" ("postedById");



CREATE INDEX "MemberStatusChange_brotherId_createdAt_idx" ON "public"."MemberStatusChange" USING "btree" ("brotherId", "createdAt");



CREATE INDEX "MemberStatusChange_toStatus_reasonCategory_idx" ON "public"."MemberStatusChange" USING "btree" ("toStatus", "reasonCategory");



CREATE INDEX "OfficerAssignment_brotherId_termCode_idx" ON "public"."OfficerAssignment" USING "btree" ("brotherId", "termCode");



CREATE INDEX "OfficerAssignment_positionId_termCode_idx" ON "public"."OfficerAssignment" USING "btree" ("positionId", "termCode");



CREATE UNIQUE INDEX "OfficerPosition_slug_key" ON "public"."OfficerPosition" USING "btree" ("slug");



CREATE INDEX "OnboardAttempt_ipAddress_createdAt_idx" ON "public"."OnboardAttempt" USING "btree" ("ipAddress", "createdAt");



CREATE UNIQUE INDEX "PollVote_pollId_alumniId_key" ON "public"."PollVote" USING "btree" ("pollId", "alumniId");



CREATE UNIQUE INDEX "PollVote_pollId_brotherId_key" ON "public"."PollVote" USING "btree" ("pollId", "brotherId");



CREATE INDEX "PollVote_pollId_idx" ON "public"."PollVote" USING "btree" ("pollId");



CREATE INDEX "Poll_closedAt_idx" ON "public"."Poll" USING "btree" ("closedAt");



CREATE INDEX "Poll_createdAt_idx" ON "public"."Poll" USING "btree" ("createdAt");



CREATE INDEX "PortalDuesPayment_brotherId_status_idx" ON "public"."PortalDuesPayment" USING "btree" ("brotherId", "status");



CREATE UNIQUE INDEX "PortalDuesPayment_stripeSessionId_key" ON "public"."PortalDuesPayment" USING "btree" ("stripeSessionId");



CREATE INDEX "PortalUser_alumniId_idx" ON "public"."PortalUser" USING "btree" ("alumniId");



CREATE INDEX "PortalUser_brotherId_idx" ON "public"."PortalUser" USING "btree" ("brotherId");



CREATE UNIQUE INDEX "PortalUser_email_key" ON "public"."PortalUser" USING "btree" ("email");



CREATE UNIQUE INDEX "PortalUser_magicToken_key" ON "public"."PortalUser" USING "btree" ("magicToken");



CREATE INDEX "PortalUser_role_idx" ON "public"."PortalUser" USING "btree" ("role");



CREATE INDEX "RushImpression_rushId_createdAt_idx" ON "public"."RushImpression" USING "btree" ("rushId", "createdAt");



CREATE INDEX "RushSubmitLog_ipAddress_createdAt_idx" ON "public"."RushSubmitLog" USING "btree" ("ipAddress", "createdAt");



CREATE UNIQUE INDEX "Rush_bidToken_key" ON "public"."Rush" USING "btree" ("bidToken");



CREATE UNIQUE INDEX "Rush_email_key" ON "public"."Rush" USING "btree" ("email");



CREATE UNIQUE INDEX "SectionContent_sectionId_field_key" ON "public"."SectionContent" USING "btree" ("sectionId", "field");



CREATE INDEX "SectionContent_sectionId_idx" ON "public"."SectionContent" USING "btree" ("sectionId");



CREATE UNIQUE INDEX "Section_key_key" ON "public"."Section" USING "btree" ("key");



CREATE INDEX "Section_sortOrder_idx" ON "public"."Section" USING "btree" ("sortOrder");



CREATE INDEX "ServiceEvent_eventDate_status_idx" ON "public"."ServiceEvent" USING "btree" ("eventDate", "status");



CREATE INDEX "ServiceHourLog_memberId_status_idx" ON "public"."ServiceHourLog" USING "btree" ("memberId", "status");



CREATE INDEX "ServiceHourLog_performedAt_idx" ON "public"."ServiceHourLog" USING "btree" ("performedAt");



CREATE UNIQUE INDEX "ServicePartnerOrg_name_key" ON "public"."ServicePartnerOrg" USING "btree" ("name");



CREATE INDEX "SoberDriverShift_memberId_idx" ON "public"."SoberDriverShift" USING "btree" ("memberId");



CREATE UNIQUE INDEX "Tenant_domain_key" ON "public"."Tenant" USING "btree" ("domain");



CREATE INDEX "Tenant_stripeCustomerId_idx" ON "public"."Tenant" USING "btree" ("stripeCustomerId");



CREATE UNIQUE INDEX "Tenant_subdomain_key" ON "public"."Tenant" USING "btree" ("subdomain");



CREATE UNIQUE INDEX "Vote_rushId_brotherId_key" ON "public"."Vote" USING "btree" ("rushId", "brotherId");



ALTER TABLE ONLY "public"."AlumniDonation"
    ADD CONSTRAINT "AlumniDonation_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "public"."AlumniProfile"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."AlumniProfile"
    ADD CONSTRAINT "AlumniProfile_brotherId_fkey" FOREIGN KEY ("brotherId") REFERENCES "public"."Brother"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."AlumniVouch"
    ADD CONSTRAINT "AlumniVouch_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "public"."AlumniProfile"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."AlumniVouch"
    ADD CONSTRAINT "AlumniVouch_rushId_fkey" FOREIGN KEY ("rushId") REFERENCES "public"."Rush"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."AnnouncementRead"
    ADD CONSTRAINT "AnnouncementRead_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "public"."Announcement"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."AnnouncementRead"
    ADD CONSTRAINT "AnnouncementRead_brotherId_fkey" FOREIGN KEY ("brotherId") REFERENCES "public"."Brother"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Announcement"
    ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."Brother"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."Announcement"
    ADD CONSTRAINT "Announcement_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "public"."Poll"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."Attendance"
    ADD CONSTRAINT "Attendance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Attendance"
    ADD CONSTRAINT "Attendance_rushId_fkey" FOREIGN KEY ("rushId") REFERENCES "public"."Rush"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."BrotherRSVP"
    ADD CONSTRAINT "BrotherRSVP_brotherId_fkey" FOREIGN KEY ("brotherId") REFERENCES "public"."Brother"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."BrotherRSVP"
    ADD CONSTRAINT "BrotherRSVP_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Brother"
    ADD CONSTRAINT "Brother_bigBrotherId_fkey" FOREIGN KEY ("bigBrotherId") REFERENCES "public"."Brother"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ChapterMeetingAttendance"
    ADD CONSTRAINT "ChapterMeetingAttendance_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "public"."ChapterMeeting"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ChapterMeetingAttendance"
    ADD CONSTRAINT "ChapterMeetingAttendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Brother"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ChoreWheelAssignment"
    ADD CONSTRAINT "ChoreWheelAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Brother"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ChoreWheelAssignment"
    ADD CONSTRAINT "ChoreWheelAssignment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."ChoreWheelTask"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Document"
    ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."Brother"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."Document"
    ADD CONSTRAINT "Document_versionOfId_fkey" FOREIGN KEY ("versionOfId") REFERENCES "public"."Document"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."DuesPayment"
    ADD CONSTRAINT "DuesPayment_brotherId_fkey" FOREIGN KEY ("brotherId") REFERENCES "public"."Brother"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ElectionBallot"
    ADD CONSTRAINT "ElectionBallot_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "public"."ElectionCandidate"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ElectionBallot"
    ADD CONSTRAINT "ElectionBallot_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "public"."ElectionSeat"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ElectionCandidate"
    ADD CONSTRAINT "ElectionCandidate_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "public"."ElectionSeat"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ElectionSeat"
    ADD CONSTRAINT "ElectionSeat_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "public"."Election"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."EmailLog"
    ADD CONSTRAINT "EmailLog_rushId_fkey" FOREIGN KEY ("rushId") REFERENCES "public"."Rush"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."EventCheckIn"
    ADD CONSTRAINT "EventCheckIn_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."GoogleCalendarLink"
    ADD CONSTRAINT "GoogleCalendarLink_brotherId_fkey" FOREIGN KEY ("brotherId") REFERENCES "public"."Brother"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."IncidentAcknowledgment"
    ADD CONSTRAINT "IncidentAcknowledgment_brotherId_fkey" FOREIGN KEY ("brotherId") REFERENCES "public"."Brother"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."IncidentAcknowledgment"
    ADD CONSTRAINT "IncidentAcknowledgment_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "public"."IncidentReport"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."IncidentReport"
    ADD CONSTRAINT "IncidentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "public"."Brother"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."MemberStatusChange"
    ADD CONSTRAINT "MemberStatusChange_brotherId_fkey" FOREIGN KEY ("brotherId") REFERENCES "public"."Brother"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."MemberStatusChange"
    ADD CONSTRAINT "MemberStatusChange_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "public"."Brother"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."OfficerAssignment"
    ADD CONSTRAINT "OfficerAssignment_brotherId_fkey" FOREIGN KEY ("brotherId") REFERENCES "public"."Brother"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."OfficerAssignment"
    ADD CONSTRAINT "OfficerAssignment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "public"."OfficerPosition"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."PollVote"
    ADD CONSTRAINT "PollVote_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "public"."AlumniProfile"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."PollVote"
    ADD CONSTRAINT "PollVote_brotherId_fkey" FOREIGN KEY ("brotherId") REFERENCES "public"."Brother"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."PollVote"
    ADD CONSTRAINT "PollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "public"."Poll"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Poll"
    ADD CONSTRAINT "Poll_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."Brother"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."RushConsent"
    ADD CONSTRAINT "RushConsent_rushId_fkey" FOREIGN KEY ("rushId") REFERENCES "public"."Rush"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."RushImpression"
    ADD CONSTRAINT "RushImpression_rushId_fkey" FOREIGN KEY ("rushId") REFERENCES "public"."Rush"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."SectionContent"
    ADD CONSTRAINT "SectionContent_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."Section"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ServiceHourLog"
    ADD CONSTRAINT "ServiceHourLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Brother"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ServiceHourLog"
    ADD CONSTRAINT "ServiceHourLog_serviceEventId_fkey" FOREIGN KEY ("serviceEventId") REFERENCES "public"."ServiceEvent"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."SmsLog"
    ADD CONSTRAINT "SmsLog_rushId_fkey" FOREIGN KEY ("rushId") REFERENCES "public"."Rush"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."SoberDriverShift"
    ADD CONSTRAINT "SoberDriverShift_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Brother"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Vote"
    ADD CONSTRAINT "Vote_brotherId_fkey" FOREIGN KEY ("brotherId") REFERENCES "public"."Brother"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Vote"
    ADD CONSTRAINT "Vote_rushId_fkey" FOREIGN KEY ("rushId") REFERENCES "public"."Rush"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE "public"."AlumniDonation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."AlumniInvite" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."AlumniProfile" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."AlumniVouch" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Announcement" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."AnnouncementRead" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."AuditLog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Brother" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."BrotherInvite" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."BrotherRSVP" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."BudgetLine" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ChapterMeeting" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ChapterMeetingAttendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ChoreWheelAssignment" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ChoreWheelTask" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Document" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."DuesPayment" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Election" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ElectionBallot" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ElectionCandidate" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ElectionSeat" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."EmailLog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Event" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."EventCheckIn" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Expense" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."GoogleCalendarLink" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."HqExportRun" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."IncidentAcknowledgment" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."IncidentReport" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."JobPosting" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."MemberStatusChange" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."OfficerAssignment" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."OfficerPosition" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."OnboardAttempt" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Poll" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."PollVote" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."PortalDuesPayment" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."PortalUser" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Rush" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."RushConsent" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."RushImpression" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."RushSubmitLog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Section" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."SectionContent" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ServiceEvent" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ServiceHourLog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ServicePartnerOrg" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."SiteConfig" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."SmsLog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."SoberDriverShift" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Tenant" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Vote" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";


















GRANT ALL ON TABLE "public"."AlumniDonation" TO "anon";
GRANT ALL ON TABLE "public"."AlumniDonation" TO "authenticated";
GRANT ALL ON TABLE "public"."AlumniDonation" TO "service_role";



GRANT ALL ON TABLE "public"."AlumniInvite" TO "anon";
GRANT ALL ON TABLE "public"."AlumniInvite" TO "authenticated";
GRANT ALL ON TABLE "public"."AlumniInvite" TO "service_role";



GRANT ALL ON TABLE "public"."AlumniProfile" TO "anon";
GRANT ALL ON TABLE "public"."AlumniProfile" TO "authenticated";
GRANT ALL ON TABLE "public"."AlumniProfile" TO "service_role";



GRANT ALL ON TABLE "public"."AlumniVouch" TO "anon";
GRANT ALL ON TABLE "public"."AlumniVouch" TO "authenticated";
GRANT ALL ON TABLE "public"."AlumniVouch" TO "service_role";



GRANT ALL ON TABLE "public"."Announcement" TO "anon";
GRANT ALL ON TABLE "public"."Announcement" TO "authenticated";
GRANT ALL ON TABLE "public"."Announcement" TO "service_role";



GRANT ALL ON TABLE "public"."AnnouncementRead" TO "anon";
GRANT ALL ON TABLE "public"."AnnouncementRead" TO "authenticated";
GRANT ALL ON TABLE "public"."AnnouncementRead" TO "service_role";



GRANT ALL ON TABLE "public"."Attendance" TO "anon";
GRANT ALL ON TABLE "public"."Attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."Attendance" TO "service_role";



GRANT ALL ON TABLE "public"."AuditLog" TO "anon";
GRANT ALL ON TABLE "public"."AuditLog" TO "authenticated";
GRANT ALL ON TABLE "public"."AuditLog" TO "service_role";



GRANT ALL ON TABLE "public"."Brother" TO "anon";
GRANT ALL ON TABLE "public"."Brother" TO "authenticated";
GRANT ALL ON TABLE "public"."Brother" TO "service_role";



GRANT ALL ON TABLE "public"."BrotherInvite" TO "anon";
GRANT ALL ON TABLE "public"."BrotherInvite" TO "authenticated";
GRANT ALL ON TABLE "public"."BrotherInvite" TO "service_role";



GRANT ALL ON TABLE "public"."BrotherRSVP" TO "anon";
GRANT ALL ON TABLE "public"."BrotherRSVP" TO "authenticated";
GRANT ALL ON TABLE "public"."BrotherRSVP" TO "service_role";



GRANT ALL ON TABLE "public"."BudgetLine" TO "anon";
GRANT ALL ON TABLE "public"."BudgetLine" TO "authenticated";
GRANT ALL ON TABLE "public"."BudgetLine" TO "service_role";



GRANT ALL ON TABLE "public"."ChapterMeeting" TO "anon";
GRANT ALL ON TABLE "public"."ChapterMeeting" TO "authenticated";
GRANT ALL ON TABLE "public"."ChapterMeeting" TO "service_role";



GRANT ALL ON TABLE "public"."ChapterMeetingAttendance" TO "anon";
GRANT ALL ON TABLE "public"."ChapterMeetingAttendance" TO "authenticated";
GRANT ALL ON TABLE "public"."ChapterMeetingAttendance" TO "service_role";



GRANT ALL ON TABLE "public"."ChoreWheelAssignment" TO "anon";
GRANT ALL ON TABLE "public"."ChoreWheelAssignment" TO "authenticated";
GRANT ALL ON TABLE "public"."ChoreWheelAssignment" TO "service_role";



GRANT ALL ON TABLE "public"."ChoreWheelTask" TO "anon";
GRANT ALL ON TABLE "public"."ChoreWheelTask" TO "authenticated";
GRANT ALL ON TABLE "public"."ChoreWheelTask" TO "service_role";



GRANT ALL ON TABLE "public"."Document" TO "anon";
GRANT ALL ON TABLE "public"."Document" TO "authenticated";
GRANT ALL ON TABLE "public"."Document" TO "service_role";



GRANT ALL ON TABLE "public"."DuesPayment" TO "anon";
GRANT ALL ON TABLE "public"."DuesPayment" TO "authenticated";
GRANT ALL ON TABLE "public"."DuesPayment" TO "service_role";



GRANT ALL ON TABLE "public"."Election" TO "anon";
GRANT ALL ON TABLE "public"."Election" TO "authenticated";
GRANT ALL ON TABLE "public"."Election" TO "service_role";



GRANT ALL ON TABLE "public"."ElectionBallot" TO "anon";
GRANT ALL ON TABLE "public"."ElectionBallot" TO "authenticated";
GRANT ALL ON TABLE "public"."ElectionBallot" TO "service_role";



GRANT ALL ON TABLE "public"."ElectionCandidate" TO "anon";
GRANT ALL ON TABLE "public"."ElectionCandidate" TO "authenticated";
GRANT ALL ON TABLE "public"."ElectionCandidate" TO "service_role";



GRANT ALL ON TABLE "public"."ElectionSeat" TO "anon";
GRANT ALL ON TABLE "public"."ElectionSeat" TO "authenticated";
GRANT ALL ON TABLE "public"."ElectionSeat" TO "service_role";



GRANT ALL ON TABLE "public"."EmailLog" TO "anon";
GRANT ALL ON TABLE "public"."EmailLog" TO "authenticated";
GRANT ALL ON TABLE "public"."EmailLog" TO "service_role";



GRANT ALL ON TABLE "public"."Event" TO "anon";
GRANT ALL ON TABLE "public"."Event" TO "authenticated";
GRANT ALL ON TABLE "public"."Event" TO "service_role";



GRANT ALL ON TABLE "public"."EventCheckIn" TO "anon";
GRANT ALL ON TABLE "public"."EventCheckIn" TO "authenticated";
GRANT ALL ON TABLE "public"."EventCheckIn" TO "service_role";



GRANT ALL ON TABLE "public"."Expense" TO "anon";
GRANT ALL ON TABLE "public"."Expense" TO "authenticated";
GRANT ALL ON TABLE "public"."Expense" TO "service_role";



GRANT ALL ON TABLE "public"."GoogleCalendarLink" TO "anon";
GRANT ALL ON TABLE "public"."GoogleCalendarLink" TO "authenticated";
GRANT ALL ON TABLE "public"."GoogleCalendarLink" TO "service_role";



GRANT ALL ON TABLE "public"."HqExportRun" TO "anon";
GRANT ALL ON TABLE "public"."HqExportRun" TO "authenticated";
GRANT ALL ON TABLE "public"."HqExportRun" TO "service_role";



GRANT ALL ON TABLE "public"."IncidentAcknowledgment" TO "anon";
GRANT ALL ON TABLE "public"."IncidentAcknowledgment" TO "authenticated";
GRANT ALL ON TABLE "public"."IncidentAcknowledgment" TO "service_role";



GRANT ALL ON TABLE "public"."IncidentReport" TO "anon";
GRANT ALL ON TABLE "public"."IncidentReport" TO "authenticated";
GRANT ALL ON TABLE "public"."IncidentReport" TO "service_role";



GRANT ALL ON TABLE "public"."JobPosting" TO "anon";
GRANT ALL ON TABLE "public"."JobPosting" TO "authenticated";
GRANT ALL ON TABLE "public"."JobPosting" TO "service_role";



GRANT ALL ON TABLE "public"."MemberStatusChange" TO "anon";
GRANT ALL ON TABLE "public"."MemberStatusChange" TO "authenticated";
GRANT ALL ON TABLE "public"."MemberStatusChange" TO "service_role";



GRANT ALL ON TABLE "public"."OfficerAssignment" TO "anon";
GRANT ALL ON TABLE "public"."OfficerAssignment" TO "authenticated";
GRANT ALL ON TABLE "public"."OfficerAssignment" TO "service_role";



GRANT ALL ON TABLE "public"."OfficerPosition" TO "anon";
GRANT ALL ON TABLE "public"."OfficerPosition" TO "authenticated";
GRANT ALL ON TABLE "public"."OfficerPosition" TO "service_role";



GRANT ALL ON TABLE "public"."OnboardAttempt" TO "anon";
GRANT ALL ON TABLE "public"."OnboardAttempt" TO "authenticated";
GRANT ALL ON TABLE "public"."OnboardAttempt" TO "service_role";



GRANT ALL ON TABLE "public"."Poll" TO "anon";
GRANT ALL ON TABLE "public"."Poll" TO "authenticated";
GRANT ALL ON TABLE "public"."Poll" TO "service_role";



GRANT ALL ON TABLE "public"."PollVote" TO "anon";
GRANT ALL ON TABLE "public"."PollVote" TO "authenticated";
GRANT ALL ON TABLE "public"."PollVote" TO "service_role";



GRANT ALL ON TABLE "public"."PortalDuesPayment" TO "anon";
GRANT ALL ON TABLE "public"."PortalDuesPayment" TO "authenticated";
GRANT ALL ON TABLE "public"."PortalDuesPayment" TO "service_role";



GRANT ALL ON TABLE "public"."PortalUser" TO "anon";
GRANT ALL ON TABLE "public"."PortalUser" TO "authenticated";
GRANT ALL ON TABLE "public"."PortalUser" TO "service_role";



GRANT ALL ON TABLE "public"."Rush" TO "anon";
GRANT ALL ON TABLE "public"."Rush" TO "authenticated";
GRANT ALL ON TABLE "public"."Rush" TO "service_role";



GRANT ALL ON TABLE "public"."RushConsent" TO "anon";
GRANT ALL ON TABLE "public"."RushConsent" TO "authenticated";
GRANT ALL ON TABLE "public"."RushConsent" TO "service_role";



GRANT ALL ON TABLE "public"."RushImpression" TO "anon";
GRANT ALL ON TABLE "public"."RushImpression" TO "authenticated";
GRANT ALL ON TABLE "public"."RushImpression" TO "service_role";



GRANT ALL ON TABLE "public"."RushSubmitLog" TO "anon";
GRANT ALL ON TABLE "public"."RushSubmitLog" TO "authenticated";
GRANT ALL ON TABLE "public"."RushSubmitLog" TO "service_role";



GRANT ALL ON TABLE "public"."Section" TO "anon";
GRANT ALL ON TABLE "public"."Section" TO "authenticated";
GRANT ALL ON TABLE "public"."Section" TO "service_role";



GRANT ALL ON TABLE "public"."SectionContent" TO "anon";
GRANT ALL ON TABLE "public"."SectionContent" TO "authenticated";
GRANT ALL ON TABLE "public"."SectionContent" TO "service_role";



GRANT ALL ON TABLE "public"."ServiceEvent" TO "anon";
GRANT ALL ON TABLE "public"."ServiceEvent" TO "authenticated";
GRANT ALL ON TABLE "public"."ServiceEvent" TO "service_role";



GRANT ALL ON TABLE "public"."ServiceHourLog" TO "anon";
GRANT ALL ON TABLE "public"."ServiceHourLog" TO "authenticated";
GRANT ALL ON TABLE "public"."ServiceHourLog" TO "service_role";



GRANT ALL ON TABLE "public"."ServicePartnerOrg" TO "anon";
GRANT ALL ON TABLE "public"."ServicePartnerOrg" TO "authenticated";
GRANT ALL ON TABLE "public"."ServicePartnerOrg" TO "service_role";



GRANT ALL ON TABLE "public"."SiteConfig" TO "anon";
GRANT ALL ON TABLE "public"."SiteConfig" TO "authenticated";
GRANT ALL ON TABLE "public"."SiteConfig" TO "service_role";



GRANT ALL ON TABLE "public"."SmsLog" TO "anon";
GRANT ALL ON TABLE "public"."SmsLog" TO "authenticated";
GRANT ALL ON TABLE "public"."SmsLog" TO "service_role";



GRANT ALL ON TABLE "public"."SoberDriverShift" TO "anon";
GRANT ALL ON TABLE "public"."SoberDriverShift" TO "authenticated";
GRANT ALL ON TABLE "public"."SoberDriverShift" TO "service_role";



GRANT ALL ON TABLE "public"."Tenant" TO "anon";
GRANT ALL ON TABLE "public"."Tenant" TO "authenticated";
GRANT ALL ON TABLE "public"."Tenant" TO "service_role";



GRANT ALL ON TABLE "public"."Vote" TO "anon";
GRANT ALL ON TABLE "public"."Vote" TO "authenticated";
GRANT ALL ON TABLE "public"."Vote" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































