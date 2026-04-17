import prisma from '@/lib/prisma';
import { PolicyStatus } from '@/prisma/generated/prisma-client/enums';
import { addDays, startOfDay } from 'date-fns';
import {
  sendPolicyExpirationReminder,
  type PolicyExpirationReminderData,
  type PolicyExpirationTier,
} from '@/lib/services/emailService';
import { buildWhatsAppUrl } from '@/templates/email/components/whatsappUrl';
import { getActiveAdmins } from '@/lib/services/userService';
import { formatFullName } from '@/lib/utils/names';
import { formatAddress } from '@/lib/utils/formatting';
import { brandInfo } from '@/lib/config/brand';

const TIERS: PolicyExpirationTier[] = [60, 45, 30, 14, 1];

interface TierResult {
  tier: PolicyExpirationTier;
  policiesProcessed: number;
  remindersSent: number;
  skipped: number;
  errors: string[];
}

export interface ExpirationReminderResult {
  tiers: TierResult[];
  totalRemindersSent: number;
  totalErrors: number;
}

function reminderTypeFor(tier: PolicyExpirationTier): string {
  return `policy_expiration_tier_${tier}`;
}

function landlordDisplayName(landlord: {
  isCompany: boolean;
  companyName: string | null;
  firstName: string | null;
  middleName: string | null;
  paternalLastName: string | null;
  maternalLastName: string | null;
  legalRepFirstName: string | null;
  legalRepPaternalLastName: string | null;
}): string {
  if (landlord.isCompany) {
    return (
      landlord.companyName ||
      formatFullName({
        firstName: landlord.legalRepFirstName,
        paternalLastName: landlord.legalRepPaternalLastName,
      }) ||
      'Arrendador'
    );
  }
  return (
    formatFullName({
      firstName: landlord.firstName,
      middleName: landlord.middleName,
      paternalLastName: landlord.paternalLastName,
      maternalLastName: landlord.maternalLastName,
    }) || 'Arrendador'
  );
}

/**
 * Daily cron: for each tier (60, 45, 30, 14, 1 days), find ACTIVE non-renewed
 * policies expiring in that window and email the primary landlord. Tier 1 also
 * notifies the broker (managedBy) and all active admins. Idempotent via ReminderLog.
 */
export async function sendPolicyExpirationReminders(): Promise<ExpirationReminderResult> {
  const results: TierResult[] = [];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const today = startOfDay(new Date());

  for (const tier of TIERS) {
    const tierResult: TierResult = {
      tier,
      policiesProcessed: 0,
      remindersSent: 0,
      skipped: 0,
      errors: [],
    };
    const reminderType = reminderTypeFor(tier);

    // ±1 day window absorbs cron drift and ensures a missed day doesn't skip a policy
    const windowStart = addDays(today, tier - 1);
    const windowEnd = addDays(today, tier + 1);

    try {
      const policies = await prisma.policy.findMany({
        where: {
          status: PolicyStatus.ACTIVE,
          renewedToId: null,
          expiresAt: { gte: windowStart, lt: windowEnd },
        },
        include: {
          landlords: { where: { isPrimary: true }, take: 1 },
          managedBy: { select: { id: true, email: true, name: true } },
          propertyDetails: {
            include: { propertyAddressDetails: true },
          },
        },
      });

      console.log(`[EXPIRATION-REMINDER] Tier ${tier}d: ${policies.length} policies in window`);

      for (const policy of policies) {
        tierResult.policiesProcessed++;

        try {
          const primary = policy.landlords[0];
          if (!primary || !primary.email) {
            tierResult.skipped++;
            continue;
          }

          // Idempotency: skip if already sent for this (tier, policy)
          const alreadySent = await prisma.reminderLog.findFirst({
            where: {
              reminderType,
              policyId: policy.id,
              status: 'sent',
            },
            select: { id: true },
          });
          if (alreadySent) {
            tierResult.skipped++;
            continue;
          }

          const propertyAddress =
            formatAddress(policy.propertyDetails?.propertyAddressDetails) || 'N/A';
          const policyUrl = `${appUrl}/dashboard/policies/${policy.id}`;
          const mailtoUrl = `mailto:${brandInfo.supportEmail}?subject=${encodeURIComponent(
            `Consulta sobre mi protección ${policy.policyNumber}`,
          )}`;
          const whatsappUrl = buildWhatsAppUrl(
            `Hola, me gustaría renovar la protección #${policy.policyNumber}.`,
          );

          const recipients: Array<{ email: string; name: string }> = [];

          // Tier 1-60: always primary landlord
          const landlordName = landlordDisplayName(primary);
          recipients.push({ email: primary.email, name: landlordName });

          // Tier 1 (1-day): also broker + admins
          if (tier === 1) {
            if (policy.managedBy?.email) {
              recipients.push({
                email: policy.managedBy.email,
                name: policy.managedBy.name || 'Equipo',
              });
            }
            const admins = await getActiveAdmins();
            for (const admin of admins) {
              if (admin.email && !recipients.some((r) => r.email === admin.email)) {
                recipients.push({ email: admin.email, name: admin.name || 'Administrador' });
              }
            }
          }

          for (const recipient of recipients) {
            const payload: PolicyExpirationReminderData = {
              email: recipient.email,
              recipientName: recipient.name,
              policyNumber: policy.policyNumber,
              propertyAddress,
              expiresAt: policy.expiresAt!,
              tier,
              policyUrl,
              mailtoUrl,
              whatsappUrl,
            };

            const ok = await sendPolicyExpirationReminder(payload);

            await prisma.reminderLog.create({
              data: {
                reminderType,
                recipientEmail: recipient.email,
                recipientName: recipient.name,
                policyId: policy.id,
                status: ok ? 'sent' : 'failed',
                metadata: { tier, expiresAt: policy.expiresAt?.toISOString() },
              },
            });

            if (ok) tierResult.remindersSent++;
            else tierResult.errors.push(`${recipient.email}: send returned false`);
          }
        } catch (err) {
          const msg = `Policy ${policy.policyNumber}: ${err instanceof Error ? err.message : err}`;
          console.error(`[EXPIRATION-REMINDER] ${msg}`);
          tierResult.errors.push(msg);
        }
      }
    } catch (err) {
      const msg = `Tier ${tier}: ${err instanceof Error ? err.message : err}`;
      console.error(`[EXPIRATION-REMINDER] ${msg}`);
      tierResult.errors.push(msg);
    }

    results.push(tierResult);
  }

  return {
    tiers: results,
    totalRemindersSent: results.reduce((sum, r) => sum + r.remindersSent, 0),
    totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
  };
}
