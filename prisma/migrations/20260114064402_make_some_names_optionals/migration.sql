-- AlterTable
ALTER TABLE "CommercialReference" ALTER COLUMN "contactMaternalLastName" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PersonalReference" ALTER COLUMN "maternalLastName" DROP NOT NULL;
