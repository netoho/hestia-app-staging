/*
  Warnings:

  - You are about to drop the column `propertyAddress` on the `Policy` table. All the data in the column will be lost.
  - You are about to drop the column `propertyDescription` on the `Policy` table. All the data in the column will be lost.
  - You are about to drop the column `propertyType` on the `Policy` table. All the data in the column will be lost.

*/

-- 1. Add new columns to PropertyDetails FIRST
ALTER TABLE "PropertyDetails" ADD COLUMN "propertyDescription" TEXT,
ADD COLUMN "propertyType" "PropertyType";

-- 2. Create PropertyDetails records for policies that don't have them
INSERT INTO "PropertyDetails" ("id", "policyId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), p.id, NOW(), NOW()
FROM "Policy" p
WHERE NOT EXISTS (SELECT 1 FROM "PropertyDetails" pd WHERE pd."policyId" = p.id);

-- 3. Copy propertyType from Policy to PropertyDetails
UPDATE "PropertyDetails" pd
SET "propertyType" = p."propertyType"
FROM "Policy" p
WHERE pd."policyId" = p.id
  AND p."propertyType" IS NOT NULL;

-- 4. Drop columns from Policy
ALTER TABLE "Policy" DROP COLUMN "propertyAddress",
DROP COLUMN "propertyDescription",
DROP COLUMN "propertyType";
