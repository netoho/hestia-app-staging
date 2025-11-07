-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF', 'BROKER');

-- CreateEnum
CREATE TYPE "TenantType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "GuarantorType" AS ENUM ('NONE', 'JOINT_OBLIGOR', 'AVAL', 'BOTH');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('HOUSE', 'APARTMENT', 'COMMERCIAL', 'OFFICE', 'WAREHOUSE', 'OTHER');

-- CreateEnum
CREATE TYPE "NationalityType" AS ENUM ('MEXICAN', 'FOREIGN');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('DRAFT', 'COLLECTING_INFO', 'UNDER_INVESTIGATION', 'INVESTIGATION_REJECTED', 'PENDING_APPROVAL', 'APPROVED', 'CONTRACT_PENDING', 'CONTRACT_SIGNED', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('IDENTIFICATION', 'INCOME_PROOF', 'ADDRESS_PROOF', 'BANK_STATEMENT', 'PROPERTY_DEED', 'TAX_RETURN', 'EMPLOYMENT_LETTER', 'PROPERTY_TAX_STATEMENT', 'MARRIAGE_CERTIFICATE', 'COMPANY_CONSTITUTION', 'LEGAL_POWERS', 'TAX_STATUS_CERTIFICATE', 'CREDIT_REPORT', 'PROPERTY_REGISTRY', 'PROPERTY_APPRAISAL', 'PASSPORT', 'IMMIGRATION_DOCUMENT', 'UTILITY_BILL', 'PAYROLL_RECEIPT', 'OTHER');

-- CreateEnum
CREATE TYPE "InvestigationVerdict" AS ENUM ('APPROVED', 'REJECTED', 'HIGH_RISK', 'CONDITIONAL');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'BANK_TRANSFER', 'CASH', 'STRIPE', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('INVESTIGATION_FEE', 'POLICY_PREMIUM', 'PARTIAL_PAYMENT', 'INCIDENT_PAYMENT', 'REFUND');

-- CreateEnum
CREATE TYPE "PayerType" AS ENUM ('TENANT', 'LANDLORD', 'JOINT_OBLIGOR', 'AVAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "ReporterType" AS ENUM ('TENANT', 'LANDLORD', 'JOINT_OBLIGOR', 'AVAL', 'STAFF', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "ActorVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'IN_REVIEW');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'IN_REVIEW');

-- CreateEnum
CREATE TYPE "RulesType" AS ENUM ('CONDOMINIOS', 'COLONOS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "phone" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "invitationToken" TEXT,
    "invitationTokenExpiry" TIMESTAMP(3),
    "passwordSetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "investigationFee" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "defaultTokenExpiry" INTEGER NOT NULL DEFAULT 7,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "features" TEXT NOT NULL,
    "ctaText" TEXT NOT NULL,
    "ctaLink" TEXT NOT NULL,
    "highlight" BOOLEAN NOT NULL,
    "percentage" DOUBLE PRECISION,
    "minAmount" DOUBLE PRECISION,
    "shortDescription" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "internalCode" TEXT,
    "propertyAddress" TEXT NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "propertyDescription" TEXT,
    "rentAmount" DOUBLE PRECISION NOT NULL,
    "contractLength" INTEGER NOT NULL DEFAULT 12,
    "guarantorType" "GuarantorType" NOT NULL,
    "packageId" TEXT,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "tenantPercentage" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "landlordPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tenantPaymentMethod" TEXT,
    "tenantRequiresCFDI" BOOLEAN NOT NULL DEFAULT false,
    "tenantCFDIData" TEXT,
    "hasIVA" BOOLEAN NOT NULL DEFAULT false,
    "issuesTaxReceipts" BOOLEAN NOT NULL DEFAULT false,
    "securityDeposit" DOUBLE PRECISION,
    "maintenanceFee" DOUBLE PRECISION,
    "maintenanceIncludedInRent" BOOLEAN NOT NULL DEFAULT false,
    "rentIncreasePercentage" DOUBLE PRECISION,
    "paymentMethod" TEXT,
    "createdById" TEXT NOT NULL,
    "managedById" TEXT,
    "status" "PolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "currentStep" TEXT NOT NULL DEFAULT 'initial',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyDetails" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "propertyAddressId" TEXT,
    "parkingSpaces" INTEGER,
    "parkingNumbers" TEXT,
    "isFurnished" BOOLEAN NOT NULL DEFAULT false,
    "hasPhone" BOOLEAN NOT NULL DEFAULT false,
    "hasElectricity" BOOLEAN NOT NULL DEFAULT true,
    "hasWater" BOOLEAN NOT NULL DEFAULT true,
    "hasGas" BOOLEAN NOT NULL DEFAULT false,
    "hasCableTV" BOOLEAN NOT NULL DEFAULT false,
    "hasInternet" BOOLEAN NOT NULL DEFAULT false,
    "otherServices" TEXT,
    "utilitiesInLandlordName" BOOLEAN NOT NULL DEFAULT false,
    "hasInventory" BOOLEAN NOT NULL DEFAULT false,
    "hasRules" BOOLEAN NOT NULL DEFAULT false,
    "rulesType" "RulesType",
    "petsAllowed" BOOLEAN NOT NULL DEFAULT false,
    "propertyDeliveryDate" TIMESTAMP(3),
    "contractSigningDate" TIMESTAMP(3),
    "contractSigningAddressId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Landlord" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isCompany" BOOLEAN NOT NULL DEFAULT false,
    "firstName" TEXT,
    "middleName" TEXT,
    "paternalLastName" TEXT,
    "maternalLastName" TEXT,
    "rfc" TEXT,
    "curp" TEXT,
    "companyName" TEXT,
    "companyRfc" TEXT,
    "legalRepFirstName" TEXT,
    "legalRepMiddleName" TEXT,
    "legalRepPaternalLastName" TEXT,
    "legalRepMaternalLastName" TEXT,
    "legalRepPosition" TEXT,
    "legalRepRfc" TEXT,
    "legalRepPhone" TEXT,
    "legalRepEmail" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "workPhone" TEXT,
    "personalEmail" TEXT,
    "workEmail" TEXT,
    "address" TEXT NOT NULL,
    "addressId" TEXT,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "clabe" TEXT,
    "accountHolder" TEXT,
    "occupation" TEXT,
    "employerName" TEXT,
    "monthlyIncome" DOUBLE PRECISION,
    "propertyDeedNumber" TEXT,
    "propertyRegistryFolio" TEXT,
    "requiresCFDI" BOOLEAN NOT NULL DEFAULT false,
    "cfdiData" TEXT,
    "accessToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "informationComplete" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "verificationStatus" "ActorVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "rejectionReason" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "additionalInfo" CHAR(1000),

    CONSTRAINT "Landlord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "tenantType" "TenantType" NOT NULL DEFAULT 'INDIVIDUAL',
    "firstName" TEXT,
    "middleName" TEXT,
    "paternalLastName" TEXT,
    "maternalLastName" TEXT,
    "nationality" "NationalityType",
    "curp" TEXT,
    "rfc" TEXT,
    "passport" TEXT,
    "companyName" TEXT,
    "companyRfc" TEXT,
    "legalRepFirstName" TEXT,
    "legalRepMiddleName" TEXT,
    "legalRepPaternalLastName" TEXT,
    "legalRepMaternalLastName" TEXT,
    "legalRepId" TEXT,
    "legalRepPosition" TEXT,
    "legalRepRfc" TEXT,
    "legalRepPhone" TEXT,
    "legalRepEmail" TEXT,
    "companyAddress" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "workPhone" TEXT,
    "personalEmail" TEXT,
    "workEmail" TEXT,
    "currentAddress" TEXT,
    "addressId" TEXT,
    "employmentStatus" TEXT,
    "occupation" TEXT,
    "employerName" TEXT,
    "employerAddress" TEXT,
    "employerAddressId" TEXT,
    "position" TEXT,
    "monthlyIncome" DOUBLE PRECISION,
    "incomeSource" TEXT,
    "previousLandlordName" TEXT,
    "previousLandlordPhone" TEXT,
    "previousLandlordEmail" TEXT,
    "previousRentAmount" DOUBLE PRECISION,
    "previousRentalAddress" TEXT,
    "previousRentalAddressId" TEXT,
    "rentalHistoryYears" INTEGER,
    "paymentMethod" TEXT,
    "requiresCFDI" BOOLEAN NOT NULL DEFAULT false,
    "cfdiData" TEXT,
    "accessToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "informationComplete" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "verificationStatus" "ActorVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "rejectionReason" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "additionalInfo" CHAR(1000),

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JointObligor" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "isCompany" BOOLEAN NOT NULL DEFAULT false,
    "firstName" TEXT,
    "middleName" TEXT,
    "paternalLastName" TEXT,
    "maternalLastName" TEXT,
    "nationality" "NationalityType",
    "curp" TEXT,
    "rfc" TEXT,
    "passport" TEXT,
    "relationshipToTenant" TEXT,
    "companyName" TEXT,
    "companyRfc" TEXT,
    "legalRepFirstName" TEXT,
    "legalRepMiddleName" TEXT,
    "legalRepPaternalLastName" TEXT,
    "legalRepMaternalLastName" TEXT,
    "legalRepPosition" TEXT,
    "legalRepRfc" TEXT,
    "legalRepPhone" TEXT,
    "legalRepEmail" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "workPhone" TEXT,
    "personalEmail" TEXT,
    "workEmail" TEXT,
    "address" TEXT,
    "addressId" TEXT,
    "employmentStatus" TEXT,
    "occupation" TEXT,
    "employerName" TEXT,
    "employerAddress" TEXT,
    "employerAddressId" TEXT,
    "position" TEXT,
    "monthlyIncome" DOUBLE PRECISION,
    "incomeSource" TEXT,
    "guaranteeMethod" TEXT,
    "hasPropertyGuarantee" BOOLEAN NOT NULL DEFAULT false,
    "propertyAddress" TEXT,
    "guaranteePropertyAddressId" TEXT,
    "propertyValue" DOUBLE PRECISION,
    "propertyDeedNumber" TEXT,
    "propertyRegistry" TEXT,
    "propertyTaxAccount" TEXT,
    "propertyUnderLegalProceeding" BOOLEAN NOT NULL DEFAULT false,
    "bankName" TEXT,
    "accountHolder" TEXT,
    "hasProperties" BOOLEAN NOT NULL DEFAULT false,
    "maritalStatus" TEXT,
    "spouseName" TEXT,
    "spouseRfc" TEXT,
    "spouseCurp" TEXT,
    "accessToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "informationComplete" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "verificationStatus" "ActorVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "rejectionReason" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "additionalInfo" CHAR(1000),

    CONSTRAINT "JointObligor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aval" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "isCompany" BOOLEAN NOT NULL DEFAULT false,
    "firstName" TEXT,
    "middleName" TEXT,
    "paternalLastName" TEXT,
    "maternalLastName" TEXT,
    "nationality" "NationalityType",
    "curp" TEXT,
    "rfc" TEXT,
    "passport" TEXT,
    "relationshipToTenant" TEXT,
    "companyName" TEXT,
    "companyRfc" TEXT,
    "legalRepFirstName" TEXT,
    "legalRepMiddleName" TEXT,
    "legalRepPaternalLastName" TEXT,
    "legalRepMaternalLastName" TEXT,
    "legalRepPosition" TEXT,
    "legalRepRfc" TEXT,
    "legalRepPhone" TEXT,
    "legalRepEmail" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "workPhone" TEXT,
    "personalEmail" TEXT,
    "workEmail" TEXT,
    "address" TEXT,
    "addressId" TEXT,
    "employmentStatus" TEXT,
    "occupation" TEXT,
    "employerName" TEXT,
    "employerAddress" TEXT,
    "employerAddressId" TEXT,
    "position" TEXT,
    "monthlyIncome" DOUBLE PRECISION,
    "incomeSource" TEXT,
    "propertyAddress" TEXT,
    "guaranteePropertyAddressId" TEXT,
    "propertyValue" DOUBLE PRECISION,
    "propertyDeedNumber" TEXT,
    "propertyRegistry" TEXT,
    "propertyTaxAccount" TEXT,
    "propertyUnderLegalProceeding" BOOLEAN NOT NULL DEFAULT false,
    "maritalStatus" TEXT,
    "spouseName" TEXT,
    "spouseRfc" TEXT,
    "spouseCurp" TEXT,
    "guaranteeMethod" TEXT,
    "hasPropertyGuarantee" BOOLEAN NOT NULL DEFAULT true,
    "accessToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "informationComplete" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "verificationStatus" "ActorVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "rejectionReason" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "additionalInfo" CHAR(1000),

    CONSTRAINT "Aval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalReference" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "paternalLastName" TEXT NOT NULL,
    "maternalLastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "homePhone" TEXT,
    "cellPhone" TEXT,
    "email" TEXT,
    "relationship" TEXT NOT NULL,
    "occupation" TEXT,
    "address" TEXT,
    "tenantId" TEXT,
    "jointObligorId" TEXT,
    "avalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialReference" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactFirstName" TEXT NOT NULL,
    "contactMiddleName" TEXT,
    "contactPaternalLastName" TEXT NOT NULL,
    "contactMaternalLastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "relationship" TEXT NOT NULL,
    "yearsOfRelationship" INTEGER,
    "tenantId" TEXT,
    "jointObligorId" TEXT,
    "avalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyAddress" (
    "id" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "exteriorNumber" TEXT NOT NULL,
    "interiorNumber" TEXT,
    "neighborhood" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "municipality" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'México',
    "placeId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "formattedAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActorDocument" (
    "id" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3Bucket" TEXT NOT NULL,
    "s3Region" TEXT,
    "landlordId" TEXT,
    "tenantId" TEXT,
    "jointObligorId" TEXT,
    "avalId" TEXT,
    "uploadedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActorDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyDocument" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3Bucket" TEXT NOT NULL,
    "s3Region" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyActivity" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "details" JSONB,
    "performedById" TEXT,
    "performedByType" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investigation" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "verdict" "InvestigationVerdict",
    "riskLevel" "RiskLevel",
    "score" INTEGER,
    "notes" TEXT,
    "findings" JSONB,
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "assignedToId" TEXT,
    "assignedToName" TEXT,
    "completedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "responseTimeHours" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investigation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3Bucket" TEXT NOT NULL,
    "s3Region" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "signedAt" TIMESTAMP(3),
    "signedBy" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" "PaymentMethod",
    "type" "PaymentType" NOT NULL,
    "paidBy" "PayerType" NOT NULL,
    "stripeIntentId" TEXT,
    "stripeSessionId" TEXT,
    "stripeCustomerId" TEXT,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "reference" TEXT,
    "receiptUrl" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "errorMessage" TEXT,
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "refundAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "reportedBy" "ReporterType" NOT NULL,
    "reporterName" TEXT NOT NULL,
    "reporterContact" TEXT NOT NULL,
    "incidentType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "incidentDate" TIMESTAMP(3) NOT NULL,
    "resolution" TEXT,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "requiresPayment" BOOLEAN NOT NULL DEFAULT false,
    "paymentAmount" DOUBLE PRECISION,
    "isCoveredByPolicy" BOOLEAN NOT NULL DEFAULT true,
    "assignedTo" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActorSectionValidation" (
    "id" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "status" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "validatedBy" TEXT,
    "validatedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActorSectionValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentValidation" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "status" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "validatedBy" TEXT,
    "validatedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewNote" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "actorType" TEXT,
    "actorId" TEXT,
    "documentId" TEXT,
    "note" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_invitationToken_key" ON "User"("invitationToken");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Policy_policyNumber_key" ON "Policy"("policyNumber");

-- CreateIndex
CREATE INDEX "Policy_status_idx" ON "Policy"("status");

-- CreateIndex
CREATE INDEX "Policy_createdById_idx" ON "Policy"("createdById");

-- CreateIndex
CREATE INDEX "Policy_managedById_idx" ON "Policy"("managedById");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyDetails_policyId_key" ON "PropertyDetails"("policyId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyDetails_propertyAddressId_key" ON "PropertyDetails"("propertyAddressId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyDetails_contractSigningAddressId_key" ON "PropertyDetails"("contractSigningAddressId");

-- CreateIndex
CREATE UNIQUE INDEX "Landlord_addressId_key" ON "Landlord"("addressId");

-- CreateIndex
CREATE UNIQUE INDEX "Landlord_accessToken_key" ON "Landlord"("accessToken");

-- CreateIndex
CREATE INDEX "Landlord_policyId_idx" ON "Landlord"("policyId");

-- CreateIndex
CREATE INDEX "Landlord_policyId_isPrimary_idx" ON "Landlord"("policyId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_policyId_key" ON "Tenant"("policyId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_addressId_key" ON "Tenant"("addressId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_employerAddressId_key" ON "Tenant"("employerAddressId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_previousRentalAddressId_key" ON "Tenant"("previousRentalAddressId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_accessToken_key" ON "Tenant"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "JointObligor_addressId_key" ON "JointObligor"("addressId");

-- CreateIndex
CREATE UNIQUE INDEX "JointObligor_employerAddressId_key" ON "JointObligor"("employerAddressId");

-- CreateIndex
CREATE UNIQUE INDEX "JointObligor_guaranteePropertyAddressId_key" ON "JointObligor"("guaranteePropertyAddressId");

-- CreateIndex
CREATE UNIQUE INDEX "JointObligor_accessToken_key" ON "JointObligor"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "Aval_addressId_key" ON "Aval"("addressId");

-- CreateIndex
CREATE UNIQUE INDEX "Aval_employerAddressId_key" ON "Aval"("employerAddressId");

-- CreateIndex
CREATE UNIQUE INDEX "Aval_guaranteePropertyAddressId_key" ON "Aval"("guaranteePropertyAddressId");

-- CreateIndex
CREATE UNIQUE INDEX "Aval_accessToken_key" ON "Aval"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "ActorDocument_s3Key_key" ON "ActorDocument"("s3Key");

-- CreateIndex
CREATE INDEX "ActorDocument_s3Key_idx" ON "ActorDocument"("s3Key");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyDocument_s3Key_key" ON "PolicyDocument"("s3Key");

-- CreateIndex
CREATE INDEX "PolicyActivity_performedById_performedByType_idx" ON "PolicyActivity"("performedById", "performedByType");

-- CreateIndex
CREATE INDEX "PolicyActivity_policyId_idx" ON "PolicyActivity"("policyId");

-- CreateIndex
CREATE UNIQUE INDEX "Investigation_policyId_key" ON "Investigation"("policyId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_s3Key_key" ON "Contract"("s3Key");

-- CreateIndex
CREATE INDEX "Contract_policyId_version_idx" ON "Contract"("policyId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeIntentId_key" ON "Payment"("stripeIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeSessionId_key" ON "Payment"("stripeSessionId");

-- CreateIndex
CREATE INDEX "ActorSectionValidation_actorId_actorType_idx" ON "ActorSectionValidation"("actorId", "actorType");

-- CreateIndex
CREATE UNIQUE INDEX "ActorSectionValidation_actorType_actorId_section_key" ON "ActorSectionValidation"("actorType", "actorId", "section");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentValidation_documentId_key" ON "DocumentValidation"("documentId");

-- CreateIndex
CREATE INDEX "ReviewNote_policyId_idx" ON "ReviewNote"("policyId");

-- CreateIndex
CREATE INDEX "ReviewNote_actorId_actorType_idx" ON "ReviewNote"("actorId", "actorType");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_managedById_fkey" FOREIGN KEY ("managedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyDetails" ADD CONSTRAINT "PropertyDetails_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyDetails" ADD CONSTRAINT "PropertyDetails_propertyAddressId_fkey" FOREIGN KEY ("propertyAddressId") REFERENCES "PropertyAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyDetails" ADD CONSTRAINT "PropertyDetails_contractSigningAddressId_fkey" FOREIGN KEY ("contractSigningAddressId") REFERENCES "PropertyAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Landlord" ADD CONSTRAINT "Landlord_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "PropertyAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Landlord" ADD CONSTRAINT "Landlord_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "PropertyAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_employerAddressId_fkey" FOREIGN KEY ("employerAddressId") REFERENCES "PropertyAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_previousRentalAddressId_fkey" FOREIGN KEY ("previousRentalAddressId") REFERENCES "PropertyAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JointObligor" ADD CONSTRAINT "JointObligor_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "PropertyAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JointObligor" ADD CONSTRAINT "JointObligor_employerAddressId_fkey" FOREIGN KEY ("employerAddressId") REFERENCES "PropertyAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JointObligor" ADD CONSTRAINT "JointObligor_guaranteePropertyAddressId_fkey" FOREIGN KEY ("guaranteePropertyAddressId") REFERENCES "PropertyAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JointObligor" ADD CONSTRAINT "JointObligor_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aval" ADD CONSTRAINT "Aval_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "PropertyAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aval" ADD CONSTRAINT "Aval_employerAddressId_fkey" FOREIGN KEY ("employerAddressId") REFERENCES "PropertyAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aval" ADD CONSTRAINT "Aval_guaranteePropertyAddressId_fkey" FOREIGN KEY ("guaranteePropertyAddressId") REFERENCES "PropertyAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aval" ADD CONSTRAINT "Aval_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalReference" ADD CONSTRAINT "PersonalReference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalReference" ADD CONSTRAINT "PersonalReference_jointObligorId_fkey" FOREIGN KEY ("jointObligorId") REFERENCES "JointObligor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalReference" ADD CONSTRAINT "PersonalReference_avalId_fkey" FOREIGN KEY ("avalId") REFERENCES "Aval"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialReference" ADD CONSTRAINT "CommercialReference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialReference" ADD CONSTRAINT "CommercialReference_jointObligorId_fkey" FOREIGN KEY ("jointObligorId") REFERENCES "JointObligor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialReference" ADD CONSTRAINT "CommercialReference_avalId_fkey" FOREIGN KEY ("avalId") REFERENCES "Aval"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActorDocument" ADD CONSTRAINT "ActorDocument_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActorDocument" ADD CONSTRAINT "ActorDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActorDocument" ADD CONSTRAINT "ActorDocument_jointObligorId_fkey" FOREIGN KEY ("jointObligorId") REFERENCES "JointObligor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActorDocument" ADD CONSTRAINT "ActorDocument_avalId_fkey" FOREIGN KEY ("avalId") REFERENCES "Aval"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyDocument" ADD CONSTRAINT "PolicyDocument_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyActivity" ADD CONSTRAINT "PolicyActivity_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investigation" ADD CONSTRAINT "Investigation_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewNote" ADD CONSTRAINT "ReviewNote_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
