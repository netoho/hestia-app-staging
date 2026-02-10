/*
  Warnings:

  - You are about to drop the column `riskLevel` on the `ActorInvestigation` table. All the data in the column will be lost.
  - You are about to drop the column `verdict` on the `ActorInvestigation` table. All the data in the column will be lost.
  - You are about to drop the `Investigation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Investigation" DROP CONSTRAINT "Investigation_policyId_fkey";

-- AlterTable
ALTER TABLE "ActorInvestigation" DROP COLUMN "riskLevel",
DROP COLUMN "verdict";

-- DropTable
DROP TABLE "Investigation";

-- DropEnum
DROP TYPE "InvestigationVerdict";

-- DropEnum
DROP TYPE "RiskLevel";
