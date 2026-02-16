import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { verifyWebhookSignature, updatePaymentById } from '@/lib/services/paymentService';
import { logPolicyActivity } from '@/lib/services/policyService';
import { sendPaymentCompletedEmail, sendAllPaymentsCompletedEmail } from '@/lib/services/emailService';
import { getActiveAdmins } from '@/lib/services/userService';
import prisma from '@/lib/prisma';
import { PaymentStatus } from '@/prisma/generated/prisma-client/enums';

// Lazy Stripe instance for webhook operations (expire sessions, etc.)
let _stripeInstance: Stripe | null = null;
async function getStripeForWebhook(): Promise<Stripe> {
  if (!_stripeInstance) {
    _stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil',
    });
  }
  return _stripeInstance;
}

const PAYMENT_TYPE_DESCRIPTIONS: Record<string, string> = {
  INVESTIGATION_FEE: 'Cuota de Investigación',
  TENANT_PORTION: 'Pago del Inquilino',
  LANDLORD_PORTION: 'Pago del Arrendador',
};

export async function POST(request: NextRequest) {
  let eventType: string | undefined;

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature and get event
    const event = await verifyWebhookSignature(body, signature);
    console.log(`Received Stripe webhook: ${event.type}`);
    console.log('Event data:', JSON.stringify(event.data.object));
    eventType = event.type;

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const paymentId = session.metadata?.paymentId;
        const paymentType = session.metadata?.paymentType;
        const paidBy = session.metadata?.paidBy;
        const policyId = session.metadata?.policyId;

        if (!paymentId) {
          console.error('Webhook: Missing paymentId in session metadata');
          return NextResponse.json({ received: true, error: 'Missing paymentId' });
        }

        // Atomic idempotency check: try to claim the payment by setting PROCESSING
        // This prevents race conditions when multiple webhooks fire simultaneously
        const claimResult = await prisma.payment.updateMany({
          where: {
            id: paymentId,
            status: PaymentStatus.PENDING, // Only claim if still PENDING
          },
          data: {
            status: PaymentStatus.PROCESSING,
          },
        });

        if (claimResult.count === 0) {
          // Payment already claimed by another webhook or already completed
          const existingPayment = await prisma.payment.findUnique({
            where: { id: paymentId },
            select: { status: true },
          });
          console.log(`Webhook idempotency: payment ${paymentId} status is ${existingPayment?.status}, skipping`);
          return NextResponse.json({ received: true, skipped: true });
        }

        // Update payment status to COMPLETED
        const payment = await updatePaymentById(
          paymentId,
          PaymentStatus.COMPLETED,
          {
            paidAt: new Date(),
            method: session.payment_method_types?.[0] || 'card',
            stripeIntentId: session.payment_intent,
          }
        );

        if (payment && policyId) {
          const typeDescription = PAYMENT_TYPE_DESCRIPTIONS[paymentType] || paymentType || 'Pago';
          const amount = session.amount_total / 100;

          // Log activity with payment type
          await logPolicyActivity({
            policyId,
            action: 'payment_completed',
            description: `Pago completado: ${typeDescription}`,
            performedById: 'system',
            details: {
              amount,
              currency: session.currency?.toUpperCase(),
              paymentType,
              paidBy,
              paymentMethod: session.payment_method_types?.[0] || 'card',
              stripeSessionId: session.id,
              paymentId,
            }
          });

          // Get policy info for email
          const policy = await prisma.policy.findUnique({
            where: { id: policyId },
            select: {
              policyNumber: true,
              tenant: { select: { email: true, firstName: true, paternalLastName: true, maternalLastName: true } },
              landlords: { where: { isPrimary: true }, select: { email: true, firstName: true, paternalLastName: true, maternalLastName: true } }
            }
          });

          // Send payment confirmation email to payer
          if (policy && session.customer_email) {
            const payerName = paidBy === 'TENANT'
              ? `${policy.tenant?.firstName || ''} ${policy.tenant?.paternalLastName || ''} ${policy.tenant?.maternalLastName || ''}`.trim()
              : policy.landlords?.[0] ? `${policy.landlords[0].firstName || ''} ${policy.landlords[0].paternalLastName || ''} ${policy.landlords[0].maternalLastName || ''}`.trim() : undefined;

            await sendPaymentCompletedEmail({
              email: session.customer_email || policy.tenant?.email,
              payerName: payerName || undefined,
              policyNumber: policy.policyNumber,
              paymentType: typeDescription,
              amount,
              paidAt: new Date()
            });
          }

          // Check if all payments are complete
          const allPayments = await prisma.payment.findMany({
            where: { policyId }
          });

          const allComplete = allPayments.length > 0 &&
            allPayments.every(p => p.status === PaymentStatus.COMPLETED);

          if (allComplete) {
            await logPolicyActivity({
              policyId,
              action: 'all_payments_completed',
              description: 'Todos los pagos de la póliza han sido completados',
              performedById: 'system',
              details: { totalPayments: allPayments.length }
            });

            // Send notification to all admin users
            const totalAmount = allPayments.reduce((sum, p) => sum + p.amount, 0);
            const admins = await getActiveAdmins();

            if (admins.length === 0) {
              console.warn('No active admin users found - skipping admin notification');
            } else {
              for (const admin of admins) {
                if (!admin.email) continue;
                await sendAllPaymentsCompletedEmail({
                  adminEmail: admin.email,
                  policyNumber: policy?.policyNumber || policyId,
                  totalPayments: allPayments.length,
                  totalAmount
                });
              }
            }
          }
        }
        break;
      }

      case 'checkout.session.expired': {
        // Session expired - just log it, DON'T mark payment as FAILED
        // User can create a new session via /payments/[id]
        const session = event.data.object as any;
        const paymentId = session.metadata?.paymentId;
        const paymentType = session.metadata?.paymentType;
        const policyId = session.metadata?.policyId;

        if (!paymentId) {
          console.warn('Webhook: checkout.session.expired missing paymentId in metadata', session.id);
        }

        if (policyId) {
          const typeDescription = PAYMENT_TYPE_DESCRIPTIONS[paymentType] || paymentType || 'Pago';

          await logPolicyActivity({
            policyId,
            action: 'checkout_session_expired',
            description: `Sesión de checkout expirada: ${typeDescription}`,
            performedById: 'system',
            details: {
              paymentType,
              stripeSessionId: session.id,
              paymentId,
            }
          });
        }
        break;
      }

      case 'charge.refunded': {
        // Handle refunds - update payment status to REFUNDED
        const charge = event.data.object as any;
        const paymentIntentId = charge.payment_intent;

        if (!paymentIntentId) {
          console.warn('Webhook: charge.refunded missing payment_intent', charge.id);
          break;
        }

        // Find payment by stripeIntentId
        const refundedPayment = await prisma.payment.findFirst({
          where: { stripeIntentId: paymentIntentId },
          select: { id: true, policyId: true, type: true, amount: true, status: true },
        });

        if (!refundedPayment) {
          console.warn(`Webhook: No payment found for payment_intent ${paymentIntentId}`);
          break;
        }

        // Atomic idempotency: only update if not already REFUNDED
        const refundResult = await prisma.payment.updateMany({
          where: {
            id: refundedPayment.id,
            status: { not: PaymentStatus.REFUNDED },
          },
          data: {
            status: PaymentStatus.REFUNDED,
            refundedAt: new Date(),
            refundAmount: charge.amount_refunded / 100,
          },
        });

        if (refundResult.count === 0) {
          // Already refunded, skip duplicate processing
          break;
        }

        // Log activity
        const refundTypeDescription = PAYMENT_TYPE_DESCRIPTIONS[refundedPayment.type] || refundedPayment.type || 'Pago';
        await logPolicyActivity({
          policyId: refundedPayment.policyId,
          action: 'payment_refunded',
          description: `Reembolso procesado: ${refundTypeDescription}`,
          performedById: 'system',
          details: {
            paymentId: refundedPayment.id,
            chargeId: charge.id,
            originalAmount: refundedPayment.amount,
            refundAmount: charge.amount_refunded / 100,
            paymentType: refundedPayment.type,
          },
        });

        console.log(`Webhook: Payment ${refundedPayment.id} marked as REFUNDED (${charge.amount_refunded / 100} MXN)`);
        break;
      }

      // SPEI (Bank Transfer) events
      case 'payment_intent.partially_funded': {
        const intent = event.data.object as any;
        const paymentId = intent.metadata?.paymentId;
        const policyId = intent.metadata?.policyId;
        const isSpei = intent.metadata?.isSpei === 'true';

        if (!paymentId || !isSpei) {
          console.log('Webhook: payment_intent.partially_funded - not a SPEI payment, skipping');
          break;
        }

        const totalAmount = (intent.amount || 0) / 100;
        const amountRemaining = (intent.next_action?.display_bank_transfer_instructions?.amount_remaining ?? intent.amount) / 100;
        const newCumulativeAmount = totalAmount - amountRemaining;

        // Atomic: read previous funded amount, create transfer record, update funded amount
        try {
          await prisma.$transaction(async (tx) => {
            const payment = await tx.payment.findUnique({
              where: { id: paymentId },
              select: { speiFundedAmount: true, speiPaymentIntentId: true },
            });

            if (!payment || payment.speiPaymentIntentId !== intent.id) return;

            const previousAmount = payment.speiFundedAmount || 0;
            const deltaAmount = newCumulativeAmount - previousAmount;

            if (deltaAmount <= 0) return; // Already processed or no new funds

            // Create transfer record (stripeEventId unique = idempotency)
            await tx.paymentTransfer.create({
              data: {
                paymentId,
                amount: deltaAmount,
                cumulativeAmount: newCumulativeAmount,
                stripeEventId: event.id,
                receivedAt: new Date(event.created * 1000),
              },
            });

            await tx.payment.update({
              where: { id: paymentId },
              data: { speiFundedAmount: newCumulativeAmount },
            });
          });
        } catch (e: any) {
          // Ignore unique constraint violation on stripeEventId (Stripe retry)
          if (e.code !== 'P2002') throw e;
          console.log(`Webhook: Duplicate partially_funded event ${event.id}, skipping`);
        }

        if (policyId) {
          await logPolicyActivity({
            policyId,
            action: 'spei_partial_payment',
            description: `Transferencia parcial recibida: $${newCumulativeAmount.toLocaleString()} de $${totalAmount.toLocaleString()} MXN`,
            performedById: 'system',
            details: {
              paymentId,
              fundedAmount: newCumulativeAmount,
              totalAmount,
              remaining: totalAmount - newCumulativeAmount,
            },
          });
        }

        console.log(`Webhook: SPEI partial payment ${paymentId}: $${newCumulativeAmount} of $${totalAmount}`);
        break;
      }

      case 'payment_intent.succeeded': {
        const intent = event.data.object as any;
        const paymentId = intent.metadata?.paymentId;
        const paymentType = intent.metadata?.paymentType;
        const paidBy = intent.metadata?.paidBy;
        const policyId = intent.metadata?.policyId;
        const isSpei = intent.metadata?.isSpei === 'true';

        if (!paymentId || !isSpei) {
          // Not a SPEI payment — card payments are handled by checkout.session.completed
          break;
        }

        // Verify this is actually a SPEI payment by checking speiPaymentIntentId
        const speiPayment = await prisma.payment.findFirst({
          where: { id: paymentId, speiPaymentIntentId: intent.id },
          select: { id: true, status: true, stripeSessionId: true, amount: true, speiFundedAmount: true, stripeCustomerId: true },
        });

        if (!speiPayment) {
          console.warn(`Webhook: SPEI payment_intent.succeeded but no matching payment for ${paymentId}`);
          break;
        }

        // Atomic idempotency check: claim the payment
        const claimResult = await prisma.payment.updateMany({
          where: {
            id: paymentId,
            status: PaymentStatus.PENDING,
          },
          data: {
            status: PaymentStatus.PROCESSING,
          },
        });

        if (claimResult.count === 0) {
          console.log(`Webhook SPEI idempotency: payment ${paymentId} already processed, skipping`);
          break;
        }

        // Create transfer record for final (or single full) transfer
        const speiAmountRemaining = (intent.next_action?.display_bank_transfer_instructions?.amount_remaining ?? 0) / 100;
        const finalAmount = ((intent.amount || 0) / 100) - speiAmountRemaining;
        const previousFunded = speiPayment.speiFundedAmount || 0;
        const deltaAmount = finalAmount - previousFunded;

        if (deltaAmount > 0) {
          try {
            await prisma.paymentTransfer.create({
              data: {
                paymentId,
                amount: deltaAmount,
                cumulativeAmount: finalAmount,
                stripeEventId: event.id,
                receivedAt: new Date(event.created * 1000),
              },
            });
          } catch (e: any) {
            // Ignore unique constraint violation on stripeEventId (Stripe retry)
            if (e.code !== 'P2002') throw e;
          }
        }

        // Mark as COMPLETED
        await updatePaymentById(
          paymentId,
          PaymentStatus.COMPLETED,
          {
            paidAt: new Date(),
            method: 'bank_transfer',
            stripeIntentId: intent.id,
          }
        );

        // Update funded amount to full amount
        await prisma.payment.update({
          where: { id: paymentId },
          data: { speiFundedAmount: speiPayment.amount },
        });

        // Check for overpayment via customer cash balance
        if (speiPayment.stripeCustomerId) {
          try {
            const stripeInstance = await getStripeForWebhook();
            const customer = await stripeInstance.customers.retrieve(
              speiPayment.stripeCustomerId,
              { expand: ['cash_balance'] }
            ) as Stripe.Customer;

            const excessBalance = (customer.cash_balance?.available?.mxn || 0) / 100;
            if (excessBalance > 0) {
              await prisma.payment.update({
                where: { id: paymentId },
                data: { overpaymentAmount: excessBalance },
              });

              if (policyId) {
                await logPolicyActivity({
                  policyId,
                  action: 'spei_overpayment_detected',
                  description: `Sobrepago detectado: $${excessBalance.toLocaleString()} MXN`,
                  performedById: 'system',
                  details: { paymentId, overpaymentAmount: excessBalance, customerId: speiPayment.stripeCustomerId },
                });
              }

              console.log(`Webhook: SPEI overpayment detected for ${paymentId}: $${excessBalance} MXN`);
            }
          } catch (error) {
            console.warn('Failed to check customer balance for overpayment:', error);
          }
        }

        // Try to expire the card checkout session if one exists
        if (speiPayment.stripeSessionId) {
          try {
            const stripeInstance = await getStripeForWebhook();
            await stripeInstance.checkout.sessions.expire(speiPayment.stripeSessionId);
          } catch (error) {
            console.warn('Failed to expire card checkout session after SPEI completion:', error);
          }
        }

        if (policyId) {
          const typeDescription = PAYMENT_TYPE_DESCRIPTIONS[paymentType] || paymentType || 'Pago';
          const amount = (intent.amount || 0) / 100;

          await logPolicyActivity({
            policyId,
            action: 'payment_completed',
            description: `Pago completado por SPEI: ${typeDescription}`,
            performedById: 'system',
            details: {
              amount,
              currency: 'MXN',
              paymentType,
              paidBy,
              paymentMethod: 'bank_transfer',
              paymentId,
            },
          });

          // Get policy info for email
          const policy = await prisma.policy.findUnique({
            where: { id: policyId },
            select: {
              policyNumber: true,
              tenant: { select: { email: true, firstName: true, paternalLastName: true, maternalLastName: true } },
              landlords: { where: { isPrimary: true }, select: { email: true, firstName: true, paternalLastName: true, maternalLastName: true } },
            },
          });

          // Send payment confirmation email
          if (policy) {
            const payerEmail = paidBy === 'TENANT' ? policy.tenant?.email : policy.landlords?.[0]?.email;
            const payerName = paidBy === 'TENANT'
              ? `${policy.tenant?.firstName || ''} ${policy.tenant?.paternalLastName || ''} ${policy.tenant?.maternalLastName || ''}`.trim()
              : policy.landlords?.[0] ? `${policy.landlords[0].firstName || ''} ${policy.landlords[0].paternalLastName || ''} ${policy.landlords[0].maternalLastName || ''}`.trim() : undefined;

            if (payerEmail) {
              await sendPaymentCompletedEmail({
                email: payerEmail,
                payerName: payerName || undefined,
                policyNumber: policy.policyNumber,
                paymentType: typeDescription,
                amount,
                paidAt: new Date(),
              });
            }
          }

          // Check if all payments are complete
          const allPayments = await prisma.payment.findMany({
            where: { policyId },
          });

          const allComplete = allPayments.length > 0 &&
            allPayments.every(p => p.status === PaymentStatus.COMPLETED);

          if (allComplete) {
            await logPolicyActivity({
              policyId,
              action: 'all_payments_completed',
              description: 'Todos los pagos de la póliza han sido completados',
              performedById: 'system',
              details: { totalPayments: allPayments.length },
            });

            const totalAmount = allPayments.reduce((sum, p) => sum + p.amount, 0);
            const admins = await getActiveAdmins();

            for (const admin of admins) {
              if (!admin.email) continue;
              await sendAllPaymentsCompletedEmail({
                adminEmail: admin.email,
                policyNumber: policy?.policyNumber || policyId,
                totalPayments: allPayments.length,
                totalAmount,
              });
            }
          }
        }

        console.log(`Webhook: SPEI payment ${paymentId} completed`);
        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error(`Webhook error (event: ${eventType || 'unknown'}):`, error);
    // Return 500 so Stripe will retry
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
