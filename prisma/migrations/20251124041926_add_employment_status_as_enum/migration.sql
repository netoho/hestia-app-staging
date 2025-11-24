/*
  Warnings:

  - The `employmentStatus` column on the `Tenant` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('EMPLOYED', 'SELF_EMPLOYED', 'BUSINESS_OWNER', 'RETIRED', 'STUDENT', 'UNEMPLOYED', 'OTHER');

-- 1. Rename the existing column
ALTER TABLE "Tenant"
    RENAME COLUMN "employmentStatus" TO "oldEmploymentStatus";

-- 2. Add the new column with the enum type
ALTER TABLE "Tenant"
    ADD COLUMN "employmentStatus" "EmploymentStatus";

-- 3. Copy and transform the data from old column to new column
UPDATE "Tenant"
SET "employmentStatus" =
        CASE
            WHEN "oldEmploymentStatus" = 'employed' THEN 'EMPLOYED'::"EmploymentStatus"
            WHEN "oldEmploymentStatus" = 'self_employed' THEN 'SELF_EMPLOYED'::"EmploymentStatus"
            WHEN "oldEmploymentStatus" = 'business_owner' THEN 'BUSINESS_OWNER'::"EmploymentStatus"
            WHEN "oldEmploymentStatus" = 'retired' THEN 'RETIRED'::"EmploymentStatus"
            WHEN "oldEmploymentStatus" = 'student' THEN 'STUDENT'::"EmploymentStatus"
            WHEN "oldEmploymentStatus" = 'unemployed' THEN 'UNEMPLOYED'::"EmploymentStatus"
            WHEN "oldEmploymentStatus" = 'other' THEN 'OTHER'::"EmploymentStatus"

            END;

-- 4. Drop the old column
ALTER TABLE "Tenant" DROP COLUMN "oldEmploymentStatus";
