/*
  Warnings:

  - The values [DRAFT,UNDER_INVESTIGATION,INVESTIGATION_REJECTED,CONTRACT_PENDING,CONTRACT_SIGNED,ACTIVE,EXPIRED] on the enum `PolicyStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `currentStep` on the `Policy` table. All the data in the column will be lost.
  - You are about to drop the column `rejectedAt` on the `Policy` table. All the data in the column will be lost.
  - You are about to drop the column `rejectionReason` on the `Policy` table. All the data in the column will be lost.

*/
-- Migrate existing rows to new status values before altering the enum
UPDATE "Policy" SET "status" = 'COLLECTING_INFO' WHERE "status" IN ('DRAFT', 'UNDER_INVESTIGATION', 'INVESTIGATION_REJECTED');
UPDATE "Policy" SET "status" = 'APPROVED' WHERE "status" IN ('CONTRACT_PENDING', 'CONTRACT_SIGNED', 'ACTIVE', 'EXPIRED');

-- AlterEnum
BEGIN;
CREATE TYPE "PolicyStatus_new" AS ENUM ('COLLECTING_INFO', 'PENDING_APPROVAL', 'APPROVED', 'CANCELLED');
ALTER TABLE "public"."Policy" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Policy" ALTER COLUMN "status" TYPE "PolicyStatus_new" USING ("status"::text::"PolicyStatus_new");
ALTER TYPE "PolicyStatus" RENAME TO "PolicyStatus_old";
ALTER TYPE "PolicyStatus_new" RENAME TO "PolicyStatus";
DROP TYPE "public"."PolicyStatus_old";
ALTER TABLE "Policy" ALTER COLUMN "status" SET DEFAULT 'COLLECTING_INFO';
COMMIT;

-- AlterTable
ALTER TABLE "Policy" DROP COLUMN "currentStep",
DROP COLUMN "rejectedAt",
DROP COLUMN "rejectionReason",
ALTER COLUMN "status" SET DEFAULT 'COLLECTING_INFO';
