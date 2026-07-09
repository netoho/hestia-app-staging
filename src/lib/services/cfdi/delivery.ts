/**
 * CFDI portal-link delivery (#214). When a CfdiRecord is created, email the
 * permanent micfdi portal link to the payer group:
 *   - TENANT-paid   → every tenant of the policy
 *   - LANDLORD-paid → every landlord (primary + co-owners)
 *   - JOINT_OBLIGOR / AVAL → no auto-recipient rule yet (#219); the record still
 *     exists and staff can resend / copy the link from PaymentsTab (T4).
 *
 * Returns the recipients it emailed (empty for the skip / no-email cases) so the
 * routing can be asserted by return value rather than by spying the send fn.
 * Fire-and-forget by nature — a send failure never affects the payment/record.
 */
import prisma from '@/lib/prisma';
import { PayerType } from '@/prisma/generated/prisma-client/enums';
import { sendCfdiPortalEmail } from '../emailService';
import {
  buildTenantRecipients,
  buildLandlordRecipients,
  type EmailRecipient,
} from '../paymentRecipients';

export interface CfdiDeliveryPayment {
  id: string;
  policyId: string;
  paidBy: PayerType;
  amount: number;
  description: string | null;
}

export async function deliverCfdiPortalLink(
  payment: CfdiDeliveryPayment,
  portalUrl: string | null,
): Promise<EmailRecipient[]> {
  if (!portalUrl) {
    console.warn(`CFDI portal link: no portal_url for payment ${payment.id}; skipping delivery`);
    return [];
  }

  let recipients: EmailRecipient[] = [];
  let policyNumber = '';

  if (payment.paidBy === PayerType.TENANT) {
    const policy = await prisma.policy.findUnique({
      where: { id: payment.policyId },
      select: {
        policyNumber: true,
        tenants: {
          where: { email: { not: '' } },
          select: { email: true, companyName: true, firstName: true, paternalLastName: true, maternalLastName: true },
        },
      },
    });
    if (policy) {
      policyNumber = policy.policyNumber;
      recipients = buildTenantRecipients(policy.tenants);
    }
  } else if (payment.paidBy === PayerType.LANDLORD) {
    const policy = await prisma.policy.findUnique({
      where: { id: payment.policyId },
      select: {
        policyNumber: true,
        landlords: {
          where: { email: { not: '' } },
          select: { email: true, isCompany: true, companyName: true, firstName: true, paternalLastName: true, maternalLastName: true },
        },
      },
    });
    if (policy) {
      policyNumber = policy.policyNumber;
      recipients = buildLandlordRecipients(policy.landlords);
    }
  } else {
    // JOINT_OBLIGOR / AVAL — no auto-recipient rule yet (#219).
    console.info(
      `CFDI portal link: no recipient rule for paidBy=${payment.paidBy} (payment ${payment.id}); skipping auto-send`,
    );
    return [];
  }

  if (recipients.length === 0) {
    console.warn(`CFDI portal link: no emailable recipients for payment ${payment.id}`);
    return [];
  }

  await Promise.all(
    recipients.map((r) =>
      sendCfdiPortalEmail({
        email: r.email,
        payerName: r.name || undefined,
        policyNumber,
        paymentDescription: payment.description ?? 'Pago - Protección de Arrendamiento',
        amount: payment.amount,
        portalUrl,
      }).catch((err) => console.error(`CFDI portal email failed for ${r.email}:`, err)),
    ),
  );

  return recipients;
}
