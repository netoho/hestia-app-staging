-- CreateEnum
CREATE TYPE "InvestigationArchiveReason" AS ENUM ('OUTDATED', 'ERROR', 'SUPERSEDED', 'OTHER');

-- AlterEnum
ALTER TYPE "ActorInvestigationStatus" ADD VALUE 'ARCHIVED';

-- AlterTable
ALTER TABLE "ActorInvestigation" ADD COLUMN     "archiveComment" TEXT,
ADD COLUMN     "archiveReason" "InvestigationArchiveReason",
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedBy" TEXT;
