-- AlterTable
ALTER TABLE "event_registrations" ADD COLUMN "registrantName" TEXT;
ALTER TABLE "event_registrations" ADD COLUMN "registrantGroup" TEXT;
ALTER TABLE "event_registrations" ADD COLUMN "registrantPhone" TEXT;
ALTER TABLE "event_registrations" ADD COLUMN "privacyConsent" BOOLEAN NOT NULL DEFAULT false;
