/*
  Warnings:

  - You are about to drop the column `isCompany` on the `Aval` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AvalType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- AlterTable
ALTER TABLE "Aval" ADD COLUMN  "avalType" "AvalType" NOT NULL DEFAULT 'INDIVIDUAL';

-- Copy and transform data from old column to new column
UPDATE "Aval"
SET "avalType" =
        CASE
            WHEN "isCompany" = true THEN 'COMPANY'::"AvalType"
            WHEN "isCompany" = false THEN 'INDIVIDUAL'::"AvalType"
            END;

-- DropColumn
ALTER TABLE "Aval" DROP COLUMN "isCompany";
