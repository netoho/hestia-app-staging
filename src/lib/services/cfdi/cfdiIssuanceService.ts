/**
 * CFDI issuance orchestration (#212). On a completed, eligible payment:
 * register it with micfdi and persist a CfdiRecord. Idempotent (one record per
 * payment) and safe to call fire-and-forget — a micfdi failure is logged, never
 * thrown into the payment flow, and no record is written so a later completion
 * or manual resend (T4) can retry.
 */
import { BaseService } from '../base/BaseService';
import { micfdiService } from '../micfdiService';
import { buildCfdiSubmission, isCfdiEligible } from './payloadBuilder';

class CfdiIssuanceService extends BaseService {
  async issueForPayment(paymentId: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        status: true,
        type: true,
        subtotal: true,
        amount: true,
        description: true,
        method: true,
        satFormaPago: true,
      },
    });

    if (!payment) {
      this.log('warn', 'CFDI issuance skipped: payment not found', { paymentId });
      return;
    }

    if (!isCfdiEligible(payment)) {
      return; // refund / partial / not completed — never invoiced
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
    const submission = buildCfdiSubmission(payment, payment.satFormaPago ?? undefined);

    try {
      const result = await micfdiService.submitPayment(submission);
      await this.prisma.cfdiRecord.create({
        data: {
          paymentId: payment.id,
          externalRef: submission.external_ref,
          micfdiRecordId: result.recordId,
          portalUrl: result.portalUrl,
          status: result.status,
          unitPrice: submission.unit_price,
          paymentForm: submission.payment_form,
          description: submission.description,
        },
      });
      this.log('info', 'CFDI record created', { paymentId, micfdiRecordId: result.recordId });
    } catch (error) {
      this.log('error', 'CFDI issuance failed', {
        paymentId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export const cfdiIssuanceService = new CfdiIssuanceService();
