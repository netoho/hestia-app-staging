/**
 * CFDI issuance orchestration (#212). On a completed, eligible payment:
 * register it with micfdi and persist a CfdiRecord. Idempotent (one record per
 * payment) and safe to call fire-and-forget — a micfdi failure is logged, never
 * thrown into the payment flow, and no record is written so a later completion
 * or manual resend (T4) can retry.
 *
 * resendForPayment (#215) is the interactive, staff-triggered counterpart: it
 * self-heals (registers with micfdi when the record is missing or link-less),
 * re-emails the payer group, and — unlike the fire-and-forget path — THROWS on
 * failure so the admin sees what went wrong.
 */
import { BaseService } from '../base/BaseService';
import { ServiceError, ErrorCode } from '../types/errors';
import { micfdiService } from '../micfdiService';
import { buildCfdiSubmission, isCfdiEligible } from './payloadBuilder';
import { deliverCfdiPortalLink } from './delivery';
import type { EmailRecipient } from '../paymentRecipients';

const CFDI_PAYMENT_SELECT = {
  id: true,
  status: true,
  type: true,
  subtotal: true,
  amount: true,
  description: true,
  method: true,
  satFormaPago: true,
  paidBy: true,
  policyId: true,
  // Ownership match facts for the partner search portal (#225).
  policy: {
    select: {
      policyNumber: true,
      contractStartDate: true,
    },
  },
} as const;

export interface CfdiResendResult {
  paymentId: string;
  /** true when the record had to be created (or re-registered) now. */
  generated: boolean;
  portalUrl: string | null;
  status: string;
  recipients: EmailRecipient[];
}

class CfdiIssuanceService extends BaseService {
  async issueForPayment(paymentId: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: CFDI_PAYMENT_SELECT,
    });

    if (!payment) {
      this.log('warn', 'CFDI issuance skipped: payment not found', { paymentId });
      return;
    }

    if (!isCfdiEligible(payment)) {
      return; // refund / not completed — never invoiced
    }

    // Business rule (#225): a paid policy MUST have its contract start date —
    // it is the client's ownership key at the partner search portal. Skip (no
    // record) so staff can self-heal via "Generar factura" once it's fixed.
    if (!payment.policy.contractStartDate) {
      this.log('error', 'CFDI issuance skipped: policy has no contractStartDate', {
        paymentId,
        policyNumber: payment.policy.policyNumber,
      });
      return;
    }

    // Idempotency: one CfdiRecord per payment. A duplicate completion is a
    // no-op; the paymentId unique constraint is the backstop against a race.
    const existing = await this.prisma.cfdiRecord.findUnique({
      where: { paymentId },
      select: { id: true },
    });
    if (existing) return;

    // Manually-recorded payments carry an admin-picked SAT forma de pago; Stripe
    // payments leave it null and fall back to the method-derived code.
    const submission = buildCfdiSubmission(
      { ...payment, policy: { ...payment.policy, contractStartDate: payment.policy.contractStartDate } },
      payment.satFormaPago ?? undefined,
    );

    try {
      const result = await micfdiService.submitPayment(submission);
      await this.prisma.cfdiRecord.create({
        data: {
          paymentId: payment.id,
          externalRef: submission.external_ref,
          micfdiRecordId: result.recordId,
          portalUrl: result.portalUrl,
          status: result.status,
          unitPrice: Number(submission.unit_price),
          paymentForm: submission.payment_form,
          description: submission.description,
          matchPolicyNumber: submission.match_fields.policy_number,
          matchContractStart: submission.match_fields.contract_start,
        },
      });
      this.log('info', 'CFDI record created', { paymentId, micfdiRecordId: result.recordId });

      // Deliver the portal link to the payer (#214). Isolated so a delivery
      // failure is logged but never masks the successful issuance above.
      try {
        await deliverCfdiPortalLink(
          {
            id: payment.id,
            policyId: payment.policyId,
            paidBy: payment.paidBy,
            amount: payment.amount,
            description: payment.description,
          },
          result.portalUrl,
        );
      } catch (deliveryError) {
        this.log('error', 'CFDI portal delivery failed', {
          paymentId,
          error: deliveryError instanceof Error ? deliveryError.message : String(deliveryError),
        });
      }
    } catch (error) {
      this.log('error', 'CFDI issuance failed', {
        paymentId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Staff "Reenviar factura" (#215). Self-healing across every record state:
   *   - no record            → register with micfdi, persist, email
   *   - record without link  → re-register (micfdi is idempotent on
   *                            external_ref), refresh the row, email
   *   - record with link     → re-email the existing permanent link (works for
   *                            invoiced records too — the link never expires)
   * Interactive: micfdi/eligibility failures THROW so the admin gets feedback.
   * The resend is logged as a PolicyActivity.
   */
  async resendForPayment(paymentId: string, resentById: string): Promise<CfdiResendResult> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: CFDI_PAYMENT_SELECT,
    });

    if (!payment) {
      throw new ServiceError(ErrorCode.NOT_FOUND, 'Payment not found', 404, { paymentId });
    }

    if (!isCfdiEligible(payment)) {
      throw new ServiceError(
        ErrorCode.VALIDATION_ERROR,
        'Solo los pagos completados pueden generar factura',
        400,
        { paymentId, status: payment.status, type: payment.type },
      );
    }

    const contractStartDate = payment.policy.contractStartDate;
    if (!contractStartDate) {
      // Ownership key for the partner search portal (#225) — cannot register
      // without it. Interactive path: tell the admin exactly what to fix.
      throw new ServiceError(
        ErrorCode.VALIDATION_ERROR,
        'La protección no tiene fecha de inicio de contrato — captúrala antes de generar la factura',
        400,
        { paymentId, policyNumber: payment.policy.policyNumber },
      );
    }

    const existing = await this.prisma.cfdiRecord.findUnique({ where: { paymentId } });

    let record = existing;
    const generated = !existing || !existing.portalUrl;
    if (generated) {
      const submission = buildCfdiSubmission(
        { ...payment, policy: { ...payment.policy, contractStartDate } },
        payment.satFormaPago ?? undefined,
      );
      // Throws on micfdi failure — surfaced to the admin, unlike the hooks.
      const result = await micfdiService.submitPayment(submission);
      record = await this.prisma.cfdiRecord.upsert({
        where: { paymentId },
        create: {
          paymentId: payment.id,
          externalRef: submission.external_ref,
          micfdiRecordId: result.recordId,
          portalUrl: result.portalUrl,
          status: result.status,
          unitPrice: Number(submission.unit_price),
          paymentForm: submission.payment_form,
          description: submission.description,
          matchPolicyNumber: submission.match_fields.policy_number,
          matchContractStart: submission.match_fields.contract_start,
        },
        update: {
          micfdiRecordId: result.recordId,
          portalUrl: result.portalUrl,
          status: result.status,
          errorMessage: null,
          unitPrice: Number(submission.unit_price),
          paymentForm: submission.payment_form,
          description: submission.description,
          matchPolicyNumber: submission.match_fields.policy_number,
          matchContractStart: submission.match_fields.contract_start,
        },
      });
    }

    // Email the same concept the CFDI was submitted with, not the raw payment
    // description, so the mail and the factura always agree.
    const recipients = await deliverCfdiPortalLink(
      {
        id: payment.id,
        policyId: payment.policyId,
        paidBy: payment.paidBy,
        amount: payment.amount,
        description: record!.description ?? payment.description,
      },
      record!.portalUrl,
    );

    await this.prisma.policyActivity.create({
      data: {
        policyId: payment.policyId,
        action: 'cfdi_link_resent',
        description: generated
          ? `Factura (CFDI) generada y enviada: ${payment.type}`
          : `Factura (CFDI) reenviada: ${payment.type}`,
        details: {
          paymentId,
          generated,
          portalUrl: record!.portalUrl,
          recipients: recipients.length,
        },
        performedById: resentById,
        performedByType: 'user',
      },
    });

    return {
      paymentId,
      generated,
      portalUrl: record!.portalUrl,
      status: record!.status,
      recipients,
    };
  }
}

export const cfdiIssuanceService = new CfdiIssuanceService();
