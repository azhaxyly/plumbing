-- AlterTable: add ПДн consent fields to User model
ALTER TABLE "User" ADD COLUMN "pdnConsentAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "pdnConsentVersion" TEXT;
