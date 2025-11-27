-- AlterTable
ALTER TABLE "JointObligor" ALTER COLUMN "jointObligorType" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "additionalIncomeAmount" DOUBLE PRECISION,
ADD COLUMN     "additionalIncomeSource" TEXT,
ADD COLUMN     "hasAdditionalIncome" BOOLEAN DEFAULT false,
ADD COLUMN     "yearsAtJob" INTEGER;
