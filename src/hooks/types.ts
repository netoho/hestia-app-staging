/**
 * Standard types for form hooks
 * Provides consistent interfaces across all actor form implementations
 */

import { BaseActorData } from '@/lib/types/actor';

export interface ValidationResult {
  valid: boolean;
  errors?: Record<string, string>;
}

export interface UseActorFormReturn<T extends BaseActorData = BaseActorData> {
  // Form data
  formData: T;
  updateField: (field: keyof T | string, value: any) => void;

  // Errors
  errors: Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
  clearErrors: () => void;

  // Saving state
  saving: boolean;
  setSaving: (saving: boolean) => void;

  // Validation methods
  validateTab: (tabName: string) => ValidationResult;
  validatePersonalTab?: () => boolean | ValidationResult;
  validateEmploymentTab?: () => boolean | ValidationResult;
  validatePropertyTab?: () => boolean | ValidationResult;
  validateGuaranteeTab?: () => boolean | ValidationResult;
  validateFinancialTab?: () => boolean | ValidationResult;
  validateReferencesTab?: () => boolean | ValidationResult;

  // Save method
  saveTab: (token: string, tabName: string, additionalData?: any) => Promise<boolean>;
}

// Multi-actor variant for Landlord
export interface UseMultiActorFormReturn<T extends BaseActorData = BaseActorData> {
  // Array of actors
  actors: T[];
  updateActorField: (index: number, field: keyof T | string, value: any) => void;

  // Actor management
  addActor: () => void;
  removeActor: (index: number) => void;

  // Additional data (property, financial)
  propertyData?: any;
  policyFinancialData?: any;
  updatePropertyField?: (field: string, value: any) => void;
  updateFinancialField?: (field: string, value: any) => void;

  // Errors
  errors: Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
  clearErrors: () => void;

  // Saving state
  saving: boolean;
  setSaving: (saving: boolean) => void;

  // Validation methods
  validateTab: (tabName: string) => ValidationResult;
  validatePersonalTab?: () => ValidationResult;
  validatePropertyTab?: () => ValidationResult;
  validateFinancialTab?: () => ValidationResult;

  // Save method
  saveTab: (tabName: string, isPartial?: boolean) => Promise<boolean>;
}

// Wizard tabs hook return type
export interface UseFormWizardTabsReturn {
  tabs: TabConfig[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabSaved: Record<string, boolean>;
  markTabSaved: (tab: string) => void;
  savingTab: string | null;
  setSavingTab: (tab: string | null) => void;
  handleTabSave: (
    tabName: string,
    validate: () => boolean | ValidationResult,
    save: () => Promise<void>
  ) => Promise<boolean>;
  getProgress: () => { completed: number; total: number; percentage: number; isComplete: boolean };
}

export interface TabConfig {
  id: string;
  label: string;
  needsSave?: boolean;
  icon?: React.ComponentType;
}

// Reference types already defined in useActorReferences.ts
export type { PersonalReference, CommercialReference } from '@/hooks/useActorReferences';