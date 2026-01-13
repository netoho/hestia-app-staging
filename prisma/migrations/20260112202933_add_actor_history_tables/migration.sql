-- CreateTable
CREATE TABLE "TenantHistory" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "tenantType" "TenantType" NOT NULL,
    "firstName" TEXT,
    "middleName" TEXT,
    "paternalLastName" TEXT,
    "maternalLastName" TEXT,
    "companyName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "rfc" TEXT,
    "employmentStatus" "EmploymentStatus",
    "occupation" TEXT,
    "employerName" TEXT,
    "monthlyIncome" DOUBLE PRECISION,
    "replacedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replacedById" TEXT,
    "replacementReason" TEXT NOT NULL,
    "verificationStatus" "ActorVerificationStatus" NOT NULL,
    "informationComplete" BOOLEAN NOT NULL,

    CONSTRAINT "TenantHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JointObligorHistory" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "jointObligorType" "JointObligorType",
    "firstName" TEXT,
    "middleName" TEXT,
    "paternalLastName" TEXT,
    "maternalLastName" TEXT,
    "companyName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "rfc" TEXT,
    "employmentStatus" TEXT,
    "occupation" TEXT,
    "employerName" TEXT,
    "monthlyIncome" DOUBLE PRECISION,
    "replacedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replacedById" TEXT,
    "replacementReason" TEXT NOT NULL,
    "verificationStatus" "ActorVerificationStatus" NOT NULL,
    "informationComplete" BOOLEAN NOT NULL,

    CONSTRAINT "JointObligorHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvalHistory" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "avalType" "AvalType",
    "firstName" TEXT,
    "middleName" TEXT,
    "paternalLastName" TEXT,
    "maternalLastName" TEXT,
    "companyName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "rfc" TEXT,
    "employmentStatus" TEXT,
    "occupation" TEXT,
    "employerName" TEXT,
    "monthlyIncome" DOUBLE PRECISION,
    "replacedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replacedById" TEXT,
    "replacementReason" TEXT NOT NULL,
    "verificationStatus" "ActorVerificationStatus" NOT NULL,
    "informationComplete" BOOLEAN NOT NULL,

    CONSTRAINT "AvalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantHistory_policyId_idx" ON "TenantHistory"("policyId");

-- CreateIndex
CREATE INDEX "JointObligorHistory_policyId_idx" ON "JointObligorHistory"("policyId");

-- CreateIndex
CREATE INDEX "AvalHistory_policyId_idx" ON "AvalHistory"("policyId");

-- AddForeignKey
ALTER TABLE "TenantHistory" ADD CONSTRAINT "TenantHistory_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JointObligorHistory" ADD CONSTRAINT "JointObligorHistory_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvalHistory" ADD CONSTRAINT "AvalHistory_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
