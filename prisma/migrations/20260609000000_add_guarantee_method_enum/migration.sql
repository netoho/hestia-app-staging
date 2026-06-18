-- Convert JointObligor.guaranteeMethod and Aval.guaranteeMethod from String? to the
-- GuaranteeMethod enum. The enum is UPPERCASE (INCOME | PROPERTY) to match the schema's
-- enum convention; existing column data is lowercase, so it is uppercased in-place first.

-- CreateEnum
CREATE TYPE "GuaranteeMethod" AS ENUM ('INCOME', 'PROPERTY');

-- Normalize existing data: uppercase known values, then null out anything outside
-- the enum (e.g. '' or stray strings) so the USING cast below cannot fail.
UPDATE "JointObligor" SET "guaranteeMethod" = UPPER("guaranteeMethod") WHERE "guaranteeMethod" IS NOT NULL;
UPDATE "JointObligor" SET "guaranteeMethod" = NULL
WHERE "guaranteeMethod" IS NOT NULL AND "guaranteeMethod" NOT IN ('INCOME', 'PROPERTY');

UPDATE "Aval" SET "guaranteeMethod" = UPPER("guaranteeMethod") WHERE "guaranteeMethod" IS NOT NULL;
UPDATE "Aval" SET "guaranteeMethod" = NULL
WHERE "guaranteeMethod" IS NOT NULL AND "guaranteeMethod" NOT IN ('INCOME', 'PROPERTY');

-- AlterTable: JointObligor.guaranteeMethod  String? -> GuaranteeMethod?
ALTER TABLE "JointObligor"
ALTER COLUMN "guaranteeMethod" TYPE "GuaranteeMethod"
USING ("guaranteeMethod"::"GuaranteeMethod");

-- AlterTable: Aval.guaranteeMethod  String? -> GuaranteeMethod?
ALTER TABLE "Aval"
ALTER COLUMN "guaranteeMethod" TYPE "GuaranteeMethod"
USING ("guaranteeMethod"::"GuaranteeMethod");
