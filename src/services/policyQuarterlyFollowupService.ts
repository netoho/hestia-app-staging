import prisma from '@/lib/prisma';
import { PolicyStatus } from '@/prisma/generated/prisma-client/enums';
import { subDays } from 'date-fns';
import {
  sendPolicyQuarterlyFollowup,
  type PolicyQuarterlyFollowupData,
} from '@/lib/services/emailService';
import { buildWhatsAppUrl } from '@/templates/email/components/whatsappUrl';
import { formatFullName } from '@/lib/utils/names';
import { brandInfo } from '@/lib/config/brand';

const REMINDER_TYPE = 'policy_quarterly_followup';
const QUARTER_DAYS = 90;
const BATCH_LIMIT = 200;

export interface QuarterlyFollowupResult {
  policiesProcessed: number;
  remindersSent: number;
  skipped: number;
  errors: string[];
}

function recipientName(landlord: {
  isCompany: boolean;
  firstName: string | null;
  middleName: string | null;
  paternalLastName: string | null;
  maternalLastName: string | null;
  legalRepFirstName: string | null;
  legalRepMiddleName: string | null;
  legalRepPaternalLastName: string | null;
  legalRepMaternalLastName: string | null;
}): string {
  if (landlord.isCompany) {
    return (
      formatFullName({
        firstName: landlord.legalRepFirstName,
        middleName: landlord.legalRepMiddleName,
        paternalLastName: landlord.legalRepPaternalLastName,
        maternalLastName: landlord.legalRepMaternalLastName,
      }) || 'Representante legal'
    );
  }
  return (
    formatFullName({
      firstName: landlord.firstName,
      middleName: landlord.middleName,
      paternalLastName: landlord.paternalLastName,
      maternalLastName: landlord.maternalLastName,
    }) || 'Cliente'
  );
}

/**
 * Daily cron: send quarterly follow-up to the primary landlord of every ACTIVE
 * non-renewed policy whose last `policy_quarterly_followup` ReminderLog is older
 * than 90 days (or nonexistent). Processes up to BATCH_LIMIT policies per run.
 */
export async function sendPolicyQuarterlyFollowups(): Promise<QuarterlyFollowupResult> {
  const result: QuarterlyFollowupResult = {
    policiesProcessed: 0,
    remindersSent: 0,
    skipped: 0,
    errors: [],
  };

  const cutoff = subDays(new Date(), QUARTER_DAYS);

  try {
    // Fetch ACTIVE policies with a primary landlord that has an email
    const candidates = await prisma.policy.findMany({
      where: {
        status: PolicyStatus.ACTIVE,
        // Skip already-renewed, but resume follow-up if renewal was cancelled.
        OR: [
          { renewedToId: null },
          { renewedTo: { status: PolicyStatus.CANCELLED } },
        ],
        landlords: { some: { isPrimary: true, email: { not: '' } } },
      },
      include: {
        landlords: { where: { isPrimary: true }, take: 1 },
      },
      take: BATCH_LIMIT,
      orderBy: { activatedAt: 'asc' },
    });

    console.log(`[QUARTERLY-FOLLOWUP] Evaluating ${candidates.length} ACTIVE policies`);

    for (const policy of candidates) {
      result.policiesProcessed++;

      try {
        const primary = policy.landlords[0];
        if (!primary || !primary.email) {
          result.skipped++;
          continue;
        }

        const recent = await prisma.reminderLog.findFirst({
          where: {
            reminderType: REMINDER_TYPE,
            policyId: policy.id,
            status: 'sent',
            sentAt: { gte: cutoff },
          },
          select: { id: true },
        });
        if (recent) {
          result.skipped++;
          continue;
        }

        const name = recipientName(primary);
        const mailtoUrl = `mailto:${brandInfo.supportEmail}?subject=${encodeURIComponent(
          `Consulta sobre mi protección ${policy.policyNumber}`,
        )}`;
        const whatsappUrl = buildWhatsAppUrl(
          `Hola, tengo una consulta sobre mi protección #${policy.policyNumber}.`,
        );

        const payload: PolicyQuarterlyFollowupData = {
          email: primary.email,
          recipientName: name,
          policyNumber: policy.policyNumber,
          isCompany: primary.isCompany,
          companyName: primary.companyName,
          mailtoUrl,
          whatsappUrl,
        };

        const ok = await sendPolicyQuarterlyFollowup(payload);

        await prisma.reminderLog.create({
          data: {
            reminderType: REMINDER_TYPE,
            recipientEmail: primary.email,
            recipientName: name,
            policyId: policy.id,
            status: ok ? 'sent' : 'failed',
            metadata: { isCompany: primary.isCompany },
          },
        });

        if (ok) result.remindersSent++;
        else result.errors.push(`${primary.email}: send returned false`);
      } catch (err) {
        const msg = `Policy ${policy.policyNumber}: ${err instanceof Error ? err.message : err}`;
        console.error(`[QUARTERLY-FOLLOWUP] ${msg}`);
        result.errors.push(msg);
      }
    }
  } catch (err) {
    console.error('[QUARTERLY-FOLLOWUP] Fatal error:', err);
    throw err;
  }

  return result;
}
