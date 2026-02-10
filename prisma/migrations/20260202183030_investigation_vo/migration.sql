-- CreateEnum
CREATE TYPE "InvestigatedActorType" AS ENUM ('TENANT', 'JOINT_OBLIGOR', 'AVAL');

-- CreateEnum
CREATE TYPE "ActorInvestigationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApproverType" AS ENUM ('BROKER', 'LANDLORD');

-- CreateTable
CREATE TABLE "ActorInvestigation" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "actorType" "InvestigatedActorType" NOT NULL,
    "actorId" TEXT NOT NULL,
    "findings" TEXT,
    "verdict" "InvestigationVerdict",
    "riskLevel" "RiskLevel",
    "submittedBy" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "status" "ActorInvestigationStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedByType" "ApproverType",
    "approvedAt" TIMESTAMP(3),
    "approvalNotes" TEXT,
    "rejectionReason" TEXT,
    "brokerToken" TEXT,
    "landlordToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActorInvestigation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActorInvestigationDocument" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3Bucket" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActorInvestigationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActorInvestigation_brokerToken_key" ON "ActorInvestigation"("brokerToken");

-- CreateIndex
CREATE UNIQUE INDEX "ActorInvestigation_landlordToken_key" ON "ActorInvestigation"("landlordToken");

-- CreateIndex
CREATE INDEX "ActorInvestigation_policyId_idx" ON "ActorInvestigation"("policyId");

-- CreateIndex
CREATE INDEX "ActorInvestigation_actorType_actorId_idx" ON "ActorInvestigation"("actorType", "actorId");

-- CreateIndex
CREATE INDEX "ActorInvestigation_brokerToken_idx" ON "ActorInvestigation"("brokerToken");

-- CreateIndex
CREATE INDEX "ActorInvestigation_landlordToken_idx" ON "ActorInvestigation"("landlordToken");

-- CreateIndex
CREATE UNIQUE INDEX "ActorInvestigationDocument_s3Key_key" ON "ActorInvestigationDocument"("s3Key");

-- CreateIndex
CREATE INDEX "ActorInvestigationDocument_investigationId_idx" ON "ActorInvestigationDocument"("investigationId");

-- AddForeignKey
ALTER TABLE "ActorInvestigation" ADD CONSTRAINT "ActorInvestigation_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActorInvestigationDocument" ADD CONSTRAINT "ActorInvestigationDocument_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "ActorInvestigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
