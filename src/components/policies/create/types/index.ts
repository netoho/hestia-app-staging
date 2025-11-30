import { PropertyType, GuarantorType, TenantType } from "@/prisma/generated/prisma-client/enums";

/**
 * Property form data
 */
export interface PropertyFormData {
  // Basic info
  policyNumber: string;
  internalCode: string;
  propertyAddressDetails: any | null;
  propertyType: PropertyType;
  propertyDescription: string;

  // Financial
  rentAmount: string;
  depositAmount: string;
  contractLength: number;
  startDate: string;
  endDate: string;

  // Features
  parkingSpaces: number;
  parkingNumbers: string;
  isFurnished: boolean;
  hasPhone: boolean;
  hasElectricity: boolean;
  hasWater: boolean;
  hasGas: boolean;
  hasCableTV: boolean;
  hasInternet: boolean;
  utilitiesInLandlordName: boolean;

  // Financial details
  hasIVA: boolean;
  issuesTaxReceipts: boolean;
  securityDeposit: number;
  maintenanceFee: string;
  maintenanceIncludedInRent: boolean;
  rentIncreasePercentage: string;
  paymentMethod: string;

  // Additional
  hasInventory: boolean;
  hasRules: boolean;
  rulesType?: string;
  petsAllowed: boolean;
  propertyDeliveryDate: string;
  contractSigningDate: string;
  contractSigningAddressDetails: any | null;
}

/**
 * Pricing form data
 */
export interface PricingFormData {
  packageId: string;
  tenantPercentage: number;
  landlordPercentage: number;
  manualPrice: number | null;
  isManualOverride: boolean;
}

/**
 * Actor base form
 */
export interface ActorFormData {
  firstName: string;
  middleName?: string;
  paternalLastName: string;
  maternalLastName: string;
  email: string;
  phone: string;
  rfc?: string;
}

/**
 * Landlord form data
 */
export interface LandlordFormData extends Partial<ActorFormData> {
  isCompany: boolean;
  companyName?: string;
  companyRfc?: string;
  legalRepName?: string;
  legalRepPosition?: string;
  legalRepRfc?: string;
  legalRepPhone?: string;
  legalRepEmail?: string;
}

/**
 * Tenant form data
 */
export interface TenantFormData extends ActorFormData {
  tenantType: TenantType;
  companyName?: string;
}

/**
 * Complete policy creation form data
 */
export interface PolicyCreationFormData {
  property: PropertyFormData;
  pricing: PricingFormData;
  landlord: LandlordFormData;
  tenant: TenantFormData;
  guarantorType: GuarantorType;
  jointObligors: ActorFormData[];
  avals: ActorFormData[];
  sendInvitations: boolean;
}

/**
 * Wizard step definition
 */
export interface WizardStep {
  id: string;
  label: string;
  isComplete: boolean;
  isActive: boolean;
  isValid: boolean;
}

/**
 * Pricing calculation result
 */
export interface PricingCalculation {
  packagePrice: number;
  investigationFee: number;
  subtotal: number;
  iva: number;
  totalWithIva: number;
  total: number;
  tenantAmount?: number;
  landlordAmount?: number;
  calculationSummary?: {
    packageName: string;
    calculationMethod: 'percentage' | 'flat';
    percentage?: number;
    minimumAmount?: number;
    minimumApplied?: boolean;
    flatFee?: number;
    formula: string;
  };
  isManualOverride?: boolean;
}
