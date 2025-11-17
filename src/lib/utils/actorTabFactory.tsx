import React from 'react';
import { ActorType } from '@/lib/enums';
import { actorConfig } from '@/lib/constants/actorConfig';

// Type for tab component modules
type TabModule = {
  PersonalInfoTab?: React.ComponentType<any>;
  CompanyInfoTab?: React.ComponentType<any>;
  ContactInfoTab?: React.ComponentType<any>;
  FinancialInfoTab?: React.ComponentType<any>;
  BankInfoTab?: React.ComponentType<any>;
  PropertyInfoTab?: React.ComponentType<any>;
  PropertyGuaranteeTab?: React.ComponentType<any>;
  RentalHistoryTab?: React.ComponentType<any>;
  ReferencesTab?: React.ComponentType<any>;
  DocumentsTab?: React.ComponentType<any>;
  [key: string]: React.ComponentType<any> | undefined;
};

// Cache for loaded tab modules
const tabModuleCache: Record<ActorType, TabModule | null> = {
  tenant: null,
  aval: null,
  jointObligor: null,
  landlord: null,
};

/**
 * Load tab components for a specific actor type
 */
export async function loadTabComponents(actorType: ActorType): Promise<TabModule> {
  // Return cached module if available
  if (tabModuleCache[actorType]) {
    return tabModuleCache[actorType]!;
  }

  let module: TabModule;

  switch (actorType) {
    case 'tenant':
      module = await import('@/components/actor/tenant/tabs');
      break;
    case 'aval':
      module = await import('@/components/actor/aval/tabs');
      break;
    case 'jointObligor':
      module = await import('@/components/actor/joint-obligor/tabs');
      break;
    case 'landlord':
      module = await import('@/components/actor/landlord/tabs');
      break;
    default:
      throw new Error(`Unknown actor type: ${actorType}`);
  }

  // Cache the loaded module
  tabModuleCache[actorType] = module;
  return module;
}

/**
 * Get tab configuration for an actor type
 */
export function getActorTabs(actorType: ActorType, isCompany: boolean) {
  const config = actorConfig[actorType];
  if (!config) {
    throw new Error(`No configuration found for actor type: ${actorType}`);
  }

  return isCompany ? config.companyTabs : config.personTabs;
}

/**
 * Map tab ID to component name based on actor type
 */
export function getTabComponentName(actorType: ActorType, tabId: string): string {
  const componentMap: Record<string, Record<string, string>> = {
    tenant: {
      'personal-info': 'TenantPersonalInfoTab',
      'company-info': 'TenantCompanyInfoTab',
      'contact-info': 'TenantContactInfoTab',
      'financial-info': 'TenantFinancialInfoTab',
      'rental-history': 'TenantRentalHistoryTab',
      'references': 'TenantReferencesTab',
      'documents': 'TenantDocumentsTab',
    },
    aval: {
      'personal-info': 'AvalPersonalInfoTab',
      'company-info': 'AvalCompanyInfoTab',
      'contact-info': 'AvalContactInfoTab',
      'financial-info': 'AvalFinancialInfoTab',
      'property-guarantee': 'AvalPropertyGuaranteeTab',
      'references': 'AvalReferencesTab',
      'documents': 'AvalDocumentsTab',
    },
    jointObligor: {
      'personal-info': 'JointObligorPersonalInfoTab',
      'company-info': 'JointObligorCompanyInfoTab',
      'contact-info': 'JointObligorContactInfoTab',
      'financial-info': 'JointObligorFinancialInfoTab',
      'references': 'JointObligorReferencesTab',
      'documents': 'JointObligorDocumentsTab',
    },
    landlord: {
      'owner-info': 'LandlordOwnerInfoTab',
      'bank-info': 'LandlordBankInfoTab',
      'property-info': 'LandlordPropertyInfoTab',
      'financial-info': 'LandlordFinancialInfoTab',
      'documents': 'LandlordDocumentsTab',
    },
  };

  const actorMap = componentMap[actorType];
  if (!actorMap) {
    throw new Error(`No component mapping for actor type: ${actorType}`);
  }

  const componentName = actorMap[tabId];
  if (!componentName) {
    throw new Error(`No component mapping for tab: ${tabId} in actor type: ${actorType}`);
  }

  return componentName;
}

/**
 * Render a specific tab for an actor
 */
export function renderActorTab(
  actorType: ActorType,
  tabId: string,
  tabComponents: TabModule,
  props: any
): React.ReactElement | null {
  const componentName = getTabComponentName(actorType, tabId);
  const TabComponent = tabComponents[componentName];

  if (!TabComponent) {
    console.error(`Tab component not found: ${componentName}`);
    return null;
  }

  return <TabComponent {...props} />;
}

/**
 * Get validation function for a specific tab
 */
export function getTabValidation(
  actorType: ActorType,
  tabId: string,
  formData: any,
  isMultiActor: boolean
): () => boolean {
  // Import validation utilities
  const validatePersonalInfo = (data: any): boolean => {
    if (!data.firstName || !data.paternalLastName || !data.maternalLastName) {
      return false;
    }
    if (!data.rfc || !data.email || !data.phone) {
      return false;
    }
    return true;
  };

  const validateCompanyInfo = (data: any): boolean => {
    if (!data.companyName || !data.rfc) {
      return false;
    }
    if (!data.legalRepFirstName || !data.legalRepPaternalLastName) {
      return false;
    }
    return true;
  };

  const validateContactInfo = (data: any): boolean => {
    if (!data.currentAddress) {
      return false;
    }
    return true;
  };

  const validateFinancialInfo = (data: any): boolean => {
    if (!data.monthlyIncome || parseFloat(data.monthlyIncome) <= 0) {
      return false;
    }
    return true;
  };

  const validatePropertyInfo = (data: any): boolean => {
    if (!data.address || !data.propertyType) {
      return false;
    }
    return true;
  };

  const validateBankInfo = (data: any): boolean => {
    if (!data.bankName || !data.accountHolder || !data.clabe) {
      return false;
    }
    // Validate CLABE is 18 digits
    if (data.clabe.replace(/\D/g, '').length !== 18) {
      return false;
    }
    return true;
  };

  const validateReferences = (references: any[]): boolean => {
    const validRefs = references.filter(ref =>
      ref.name && ref.phone && ref.relationship
    );
    return validRefs.length >= 1; // At least 1 valid reference
  };

  // Return appropriate validation based on actor type and tab
  switch (tabId) {
    case 'personal-info':
      return () => {
        if (isMultiActor) {
          // Validate all actors for landlord
          return (formData as any[]).every(actor => validatePersonalInfo(actor));
        }
        return validatePersonalInfo(formData);
      };

    case 'company-info':
      return () => {
        if (isMultiActor) {
          return (formData as any[]).every(actor => validateCompanyInfo(actor));
        }
        return validateCompanyInfo(formData);
      };

    case 'owner-info': // Landlord specific
      return () => {
        return (formData as any[]).every(actor => {
          if (actor.isCompany) {
            return validateCompanyInfo(actor);
          }
          return validatePersonalInfo(actor);
        });
      };

    case 'contact-info':
      return () => validateContactInfo(formData);

    case 'financial-info':
      return () => {
        if (actorType === 'landlord') {
          // Validate policy financial data
          const data = formData.policyFinancialData || formData;
          return data.monthlyRent && parseFloat(data.monthlyRent) > 0;
        }
        return validateFinancialInfo(formData);
      };

    case 'bank-info':
      return () => {
        // For landlord, validate primary owner's bank info
        if (isMultiActor) {
          const primaryOwner = (formData as any[]).find(a => a.isPrimary);
          return primaryOwner ? validateBankInfo(primaryOwner) : false;
        }
        return validateBankInfo(formData);
      };

    case 'property-info':
      return () => {
        const data = formData.propertyData || formData;
        return validatePropertyInfo(data);
      };

    case 'property-guarantee':
      return () => {
        return formData.propertyAddress && formData.propertyValue;
      };

    case 'rental-history':
      return () => {
        // Optional tab, always valid
        return true;
      };

    case 'references':
      return () => {
        const refs = formData.references || [];
        return validateReferences(refs);
      };

    case 'documents':
      // Documents validation is handled separately
      return () => true;

    default:
      return () => true;
  }
}

/**
 * Get data for saving a specific tab
 */
export function getTabSaveData(
  actorType: ActorType,
  tabId: string,
  formData: any,
  additionalData?: any
): any {
  // For multi-actor (landlord), include all state
  if (actorType === 'landlord') {
    return {
      landlords: formData.actors || formData.landlords || formData,
      propertyData: formData.propertyData,
      policyFinancialData: formData.policyFinancialData,
      ...additionalData,
    };
  }

  // For single actors, include form data and additional data
  return {
    ...formData,
    ...additionalData,
  };
}