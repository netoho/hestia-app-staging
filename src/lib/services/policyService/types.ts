import {GuarantorType, PropertyType, TenantType} from "@/lib/enums";

export interface CreatePolicyData {
  policyNumber?: string; // Now custom policy number can be provided
  internalCode?: string; // Internal team code for classification
  propertyAddress: string;
  propertyType?: PropertyType;
  propertyDescription?: string;
  rentAmount: string | number;
  depositAmount?: string | number;
  contractLength?: number;
  startDate?: string;
  endDate?: string;
  guarantorType?: GuarantorType;
  packageId?: string;
  tenantPercentage?: number;
  landlordPercentage?: number;
  totalPrice?: number;
  createdById: string;
  landlord: {
    firstName?: string;
    middleName?: string;
    paternalLastName?: string;
    maternalLastName?: string;
    email: string;
    phone?: string;
    rfc?: string;
    // Company fields
    isCompany?: boolean;
    companyName?: string;
    companyRfc?: string;
    legalRepFirstName?: string;
    legalRepMiddleName?: string;
    legalRepPaternalLastName?: string;
    legalRepMaternalLastName?: string;
  };
  tenant: {
    tenantType?: TenantType;
    firstName?: string;
    middleName?: string;
    paternalLastName?: string;
    maternalLastName?: string;
    companyName?: string;
    email: string;
    phone?: string;
    rfc?: string;
  };
  jointObligors?: Array<{
    firstName: string;
    middleName?: string;
    paternalLastName: string;
    maternalLastName: string;
    email: string;
    phone?: string;
  }>;
  avals?: Array<{
    firstName: string;
    middleName?: string;
    paternalLastName: string;
    maternalLastName: string;
    email: string;
    phone?: string;
  }>;
  // Property details fields (optional, will be created separately)
  propertyDetails?: {
    parkingSpaces?: number;
    parkingNumbers?: string;
    isFurnished?: boolean;
    hasPhone?: boolean;
    hasElectricity?: boolean;
    hasWater?: boolean;
    hasGas?: boolean;
    hasCableTV?: boolean;
    hasInternet?: boolean;
    otherServices?: string;
    utilitiesInLandlordName?: boolean;
    hasIVA?: boolean;
    issuesTaxReceipts?: boolean;
    securityDeposit?: number;
    maintenanceFee?: number;
    maintenanceIncludedInRent?: boolean;
    rentIncreasePercentage?: number;
    paymentMethod?: string;
    hasInventory?: boolean;
    hasRules?: boolean;
    petsAllowed?: boolean;
    propertyDeliveryDate?: string;
    contractSigningDate?: string;
    contractSigningLocation?: string;
    propertyAddressDetails?: any;
  };
}


export interface logPolicyActivityParams {
  policyId: string;
  action: string;
  description: string;
  details?: any;
  performedById?: string;      // User ID or Actor ID
  performedByType?: string;     // "user", "landlord", "tenant", "aval", "joint_obligor"
  ipAddress?: string;
}

