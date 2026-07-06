import { Prisma } from '@/prisma/generated/prisma-client/client';

/**
 * Copy/reset field lists for the actor replacement flows (#159).
 *
 * Kept in a module with no service/prisma-singleton imports so the unit-level
 * drift test (`__tests__/copyListDrift.test.ts`, run without a database) can
 * import them. The drift test asserts every Tenant scalar column is accounted
 * for — new columns fail CI until classified.
 */

/**
 * Tenant columns set from ReplaceTenantInput.newTenant when the row is reset
 * (everything else must appear in TENANT_REPLACEMENT_RESET or the drift test
 * fails).
 */
export const TENANT_REPLACEMENT_INPUT_FIELDS = [
  'tenantType',
  'email',
  'phone',
  'firstName',
  'companyName',
] as const;

/**
 * Blank-slate values applied to the tenant row on replacement. Every Tenant
 * scalar column must be listed here, in TENANT_REPLACEMENT_INPUT_FIELDS, or in
 * the drift test's system-column exclusions — otherwise the NEW tenant would
 * silently inherit the OLD tenant's value for that column (cross-tenant data
 * leak, the #159 failure mode).
 */
export const TENANT_REPLACEMENT_RESET = {
  middleName: null,
  paternalLastName: null,
  maternalLastName: null,
  companyRfc: null,
  rfc: null,
  curp: null,
  passport: null,
  nationality: 'MEXICAN',
  // Clear legal rep fields
  legalRepFirstName: null,
  legalRepMiddleName: null,
  legalRepPaternalLastName: null,
  legalRepMaternalLastName: null,
  legalRepId: null,
  legalRepPosition: null,
  legalRepRfc: null,
  legalRepPhone: null,
  legalRepEmail: null,
  companyAddress: null,
  // Clear contact fields
  workPhone: null,
  personalEmail: null,
  workEmail: null,
  // Clear address
  currentAddress: null,
  addressId: null,
  // Clear employment
  employmentStatus: null,
  occupation: null,
  employerName: null,
  employerAddress: null,
  employerAddressId: null,
  position: null,
  monthlyIncome: null,
  incomeSource: null,
  yearsAtJob: null,
  hasAdditionalIncome: false,
  additionalIncomeSource: null,
  additionalIncomeAmount: null,
  // Clear rental history
  previousLandlordName: null,
  previousLandlordPhone: null,
  previousLandlordEmail: null,
  previousRentAmount: null,
  previousRentalAddress: null,
  previousRentalAddressId: null,
  rentalHistoryYears: null,
  numberOfOccupants: null,
  reasonForMoving: null,
  hasPets: false,
  petDescription: null,
  // Clear payment preferences
  paymentMethod: null,
  requiresCFDI: false,
  cfdiData: null,
  // Reset status
  informationComplete: false,
  completedAt: null,
  verificationStatus: 'PENDING',
  verifiedAt: null,
  verifiedBy: null,
  rejectionReason: null,
  rejectedAt: null,
  // Clear token (will regenerate after)
  accessToken: null,
  tokenExpiry: null,
  additionalInfo: null,
} satisfies Prisma.TenantUncheckedUpdateInput;
