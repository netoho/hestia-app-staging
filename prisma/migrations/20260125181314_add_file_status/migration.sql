-- CreateEnum
CREATE TYPE "DocumentUploadStatus" AS ENUM ('PENDING', 'COMPLETE');

-- AlterTable
ALTER TABLE "ActorDocument" ADD COLUMN "uploadStatusNew" "DocumentUploadStatus" NOT NULL DEFAULT 'COMPLETE';


UPDATE "ActorDocument" SET "uploadStatusNew" = CASE
  WHEN "uploadStatus" = 'complete' THEN 'COMPLETE'::"DocumentUploadStatus"
  WHEN "uploadStatus" = 'pending' THEN 'PENDING'::"DocumentUploadStatus"
  ELSE 'COMPLETE'::"DocumentUploadStatus"
END;

ALTER TABLE "ActorDocument" DROP COLUMN "uploadStatus";
ALTER TABLE "ActorDocument" RENAME COLUMN "uploadStatusNew" TO "uploadStatus";
