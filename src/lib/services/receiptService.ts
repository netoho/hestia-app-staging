import { BaseService } from './base/BaseService';
import { ReceiptType, ReceiptStatus, PolicyStatus, DocumentUploadStatus } from '@/prisma/generated/prisma-client/enums';
import type { TenantReceipt } from '@/prisma/generated/prisma-client/models/TenantReceipt';

/**
 * Maps PropertyDetails boolean fields to ReceiptType
 */
const SERVICE_TO_RECEIPT_TYPE: Record<string, ReceiptType> = {
  hasElectricity: ReceiptType.ELECTRICITY,
  hasWater: ReceiptType.WATER,
  hasGas: ReceiptType.GAS,
  hasInternet: ReceiptType.INTERNET,
  hasCableTV: ReceiptType.CABLE_TV,
  hasPhone: ReceiptType.PHONE,
};

/**
 * Maps service boolean to its "includedInRent" field
 */
const SERVICE_INCLUDED_MAP: Record<string, string> = {
  hasElectricity: 'electricityIncludedInRent',
  hasWater: 'waterIncludedInRent',
  hasGas: 'gasIncludedInRent',
  hasInternet: 'internetIncludedInRent',
  hasCableTV: 'cableTVIncludedInRent',
  hasPhone: 'phoneIncludedInRent',
};

interface PropertyServiceConfig {
  hasElectricity: boolean;
  hasWater: boolean;
  hasGas: boolean;
  hasInternet: boolean;
  hasCableTV: boolean;
  hasPhone: boolean;
  electricityIncludedInRent: boolean;
  waterIncludedInRent: boolean;
  gasIncludedInRent: boolean;
  internetIncludedInRent: boolean;
  cableTVIncludedInRent: boolean;
  phoneIncludedInRent: boolean;
}

interface PolicyServiceConfig {
  maintenanceFee: number | null;
  maintenanceIncludedInRent: boolean;
}

export interface ReceiptSlotStatus {
  receiptType: ReceiptType;
  status: 'pending' | 'uploaded' | 'not_applicable';
  receipt?: TenantReceipt;
}

export interface MonthReceiptSummary {
  year: number;
  month: number;
  required: ReceiptType[];
  slots: ReceiptSlotStatus[];
  uploaded: number;
  notApplicable: number;
  pending: number;
  total: number;
}

class ReceiptService extends BaseService {
  /**
   * Get the required receipt types for a property based on its services config
   * RENT is always required. Maintenance only if fee exists and not included in rent.
   * Each service only if enabled and not included in rent.
   */
  getRequiredReceiptTypes(
    propertyDetails: PropertyServiceConfig | null,
    policyConfig: PolicyServiceConfig | null
  ): ReceiptType[] {
    const types: ReceiptType[] = [ReceiptType.RENT];

    // Maintenance: required if there's a maintenance fee and it's not included in rent
    if (policyConfig?.maintenanceFee && policyConfig.maintenanceFee > 0 && !policyConfig.maintenanceIncludedInRent) {
      types.push(ReceiptType.MAINTENANCE);
    }

    if (!propertyDetails) return types;

    // Check each service
    for (const [serviceField, receiptType] of Object.entries(SERVICE_TO_RECEIPT_TYPE)) {
      const hasService = propertyDetails[serviceField as keyof PropertyServiceConfig];
      const includedField = SERVICE_INCLUDED_MAP[serviceField] as keyof PropertyServiceConfig;
      const includedInRent = propertyDetails[includedField];

      if (hasService && !includedInRent) {
        types.push(receiptType);
      }
    }

    return types;
  }

  /**
   * Get receipt status for a specific month, combining required types with existing receipts
   */
  async getMonthStatus(
    policyId: string,
    tenantId: string,
    year: number,
    month: number,
    requiredTypes: ReceiptType[]
  ): Promise<MonthReceiptSummary> {
    const receipts = await this.prisma.tenantReceipt.findMany({
      where: {
        policyId,
        tenantId,
        year,
        month,
        uploadStatus: { not: DocumentUploadStatus.PENDING },
      },
    });

    const receiptMap = new Map(receipts.map(r => [r.receiptType, r]));

    const slots: ReceiptSlotStatus[] = requiredTypes.map(type => {
      const receipt = receiptMap.get(type);
      if (!receipt) {
        return { receiptType: type, status: 'pending' as const };
      }
      if (receipt.status === ReceiptStatus.NOT_APPLICABLE) {
        return { receiptType: type, status: 'not_applicable' as const, receipt };
      }
      return { receiptType: type, status: 'uploaded' as const, receipt };
    });

    const uploaded = slots.filter(s => s.status === 'uploaded').length;
    const notApplicable = slots.filter(s => s.status === 'not_applicable').length;
    const pending = slots.filter(s => s.status === 'pending').length;

    return {
      year,
      month,
      required: requiredTypes,
      slots,
      uploaded,
      notApplicable,
      pending,
      total: requiredTypes.length,
    };
  }

  /**
   * Get receipt summaries for multiple months (for a policy)
   */
  async getMonthsStatus(
    policyId: string,
    tenantId: string,
    requiredTypes: ReceiptType[],
    fromYear: number,
    fromMonth: number,
    toYear: number,
    toMonth: number
  ): Promise<MonthReceiptSummary[]> {
    const summaries: MonthReceiptSummary[] = [];
    let y = fromYear;
    let m = fromMonth;

    while (y < toYear || (y === toYear && m <= toMonth)) {
      const summary = await this.getMonthStatus(policyId, tenantId, y, m, requiredTypes);
      summaries.push(summary);
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }

    return summaries;
  }

  /**
   * Find all tenant records linked to an email across approved policies
   */
  async findTenantsByEmail(email: string) {
    return this.prisma.tenant.findMany({
      where: {
        email: { equals: email, mode: 'insensitive' },
        policy: { status: PolicyStatus.APPROVED },
      },
      include: {
        policy: {
          include: {
            propertyDetails: {
              include: { propertyAddressDetails: true },
            },
          },
        },
      },
    });
  }

  /**
   * Get all receipts for a policy, grouped by month
   */
  async getReceiptsByPolicy(policyId: string) {
    return this.prisma.tenantReceipt.findMany({
      where: {
        policyId,
        OR: [
          { uploadStatus: DocumentUploadStatus.COMPLETE },
          { status: ReceiptStatus.NOT_APPLICABLE },
        ],
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { receiptType: 'asc' }],
    });
  }
}

export const receiptService = new ReceiptService();
