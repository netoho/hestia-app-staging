import prisma from '@/lib/prisma';
import { PolicyStatus, ReceiptStatus, DocumentUploadStatus } from '@/prisma/generated/prisma-client/enums';
import { receiptService } from '@/lib/services/receiptService';
import { actorTokenService } from '@/lib/services/actorTokenService';
import { sendReceiptReminder } from '@/lib/services/emailService';
import { formatFullName } from '@/lib/utils/names';
import { formatAddress } from '@/lib/utils/formatting';
import { receipts as t } from '@/lib/i18n/pages/receipts';

interface ReminderResult {
  policiesProcessed: number;
  remindersSent: number;
  skipped: number;
  errors: string[];
}

/**
 * Send monthly receipt reminders to tenants with APPROVED policies.
 * For each policy: check which receipts are missing for the current month,
 * generate/renew tenant token, send reminder email, log to ReminderLog.
 */
export async function sendMonthlyReceiptReminders(): Promise<ReminderResult> {
  const result: ReminderResult = {
    policiesProcessed: 0,
    remindersSent: 0,
    skipped: 0,
    errors: [],
  };

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthName = t.months[month] || String(month);

  try {
    // Find all APPROVED policies with tenants
    const policies = await prisma.policy.findMany({
      where: {
        status: PolicyStatus.APPROVED,
        activatedAt: { not: null },
      },
      include: {
        tenant: {
          select: {
            id: true,
            email: true,
            firstName: true,
            paternalLastName: true,
            maternalLastName: true,
            middleName: true,
            companyName: true,
          },
        },
        propertyDetails: {
          include: { propertyAddressDetails: true },
        },
      },
    });

    console.log(`[RECEIPT-REMINDER] Found ${policies.length} APPROVED policies`);

    for (const policy of policies) {
      result.policiesProcessed++;

      try {
        const tenant = policy.tenant;
        if (!tenant || !tenant.email) {
          console.log(`[RECEIPT-REMINDER] Policy ${policy.policyNumber}: no tenant or email, skipping`);
          result.skipped++;
          continue;
        }

        // Determine required receipt types
        const pd = policy.propertyDetails;
        const requiredTypes = receiptService.getRequiredReceiptTypes(
          pd ? {
            hasElectricity: pd.hasElectricity,
            hasWater: pd.hasWater,
            hasGas: pd.hasGas,
            hasInternet: pd.hasInternet,
            hasCableTV: pd.hasCableTV,
            hasPhone: pd.hasPhone,
            electricityIncludedInRent: pd.electricityIncludedInRent,
            waterIncludedInRent: pd.waterIncludedInRent,
            gasIncludedInRent: pd.gasIncludedInRent,
            internetIncludedInRent: pd.internetIncludedInRent,
            cableTVIncludedInRent: pd.cableTVIncludedInRent,
            phoneIncludedInRent: pd.phoneIncludedInRent,
          } : null,
          {
            maintenanceFee: policy.maintenanceFee,
            maintenanceIncludedInRent: policy.maintenanceIncludedInRent,
          },
        );

        if (requiredTypes.length === 0) {
          result.skipped++;
          continue;
        }

        // Check which receipts already exist for this month
        const existingReceipts = await prisma.tenantReceipt.findMany({
          where: {
            policyId: policy.id,
            year,
            month,
            OR: [
              { uploadStatus: DocumentUploadStatus.COMPLETE },
              { status: ReceiptStatus.NOT_APPLICABLE },
            ],
          },
          select: { receiptType: true },
        });

        const completedTypes = new Set(existingReceipts.map(r => r.receiptType));
        const pendingTypes = requiredTypes.filter(type => !completedTypes.has(type));

        if (pendingTypes.length === 0) {
          console.log(`[RECEIPT-REMINDER] Policy ${policy.policyNumber}: all receipts complete, skipping`);
          result.skipped++;
          continue;
        }

        // Generate/renew tenant token for portal access
        const { token } = await actorTokenService.generateTenantToken(tenant.id);
        const portalUrl = `${process.env.NEXTAUTH_URL}/portal/receipts/${token}`;

        // Build tenant name
        const tenantName = tenant.companyName ||
          formatFullName(
            tenant.firstName || '',
            tenant.paternalLastName || '',
            tenant.maternalLastName || '',
            tenant.middleName || undefined,
          );

        // Build property address
        const propertyAddress = formatAddress(pd?.propertyAddressDetails);

        // Send reminder
        const success = await sendReceiptReminder({
          tenantName,
          email: tenant.email,
          propertyAddress,
          policyNumber: policy.policyNumber,
          monthName,
          year,
          requiredReceipts: pendingTypes.map(type => t.types[type] || type),
          portalUrl,
        });

        if (success) {
          result.remindersSent++;
          console.log(`[RECEIPT-REMINDER] Sent to ${tenant.email} for policy ${policy.policyNumber} (${pendingTypes.length} pending)`);
        } else {
          throw new Error('Email send returned false');
        }

        // Log to ReminderLog
        await prisma.reminderLog.create({
          data: {
            reminderType: 'tenant_receipt',
            recipientEmail: tenant.email,
            recipientName: tenantName,
            policyId: policy.id,
            status: success ? 'sent' : 'failed',
            metadata: {
              year,
              month,
              pendingTypes,
              totalRequired: requiredTypes.length,
              alreadyCompleted: completedTypes.size,
            },
          },
        });

      } catch (error) {
        const msg = `Policy ${policy.policyNumber}: ${error instanceof Error ? error.message : error}`;
        console.error(`[RECEIPT-REMINDER] ${msg}`);
        result.errors.push(msg);

        // Log failure
        await prisma.reminderLog.create({
          data: {
            reminderType: 'tenant_receipt',
            recipientEmail: policy.tenant?.email || 'unknown',
            policyId: policy.id,
            status: 'failed',
            errorMessage: msg,
          },
        }).catch(() => {}); // Don't fail on log error
      }
    }

    return result;

  } catch (error) {
    console.error('[RECEIPT-REMINDER] Fatal error:', error);
    throw error;
  }
}
