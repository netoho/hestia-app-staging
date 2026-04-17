import React from 'react';
import { Section, Heading } from '@react-email/components';
import {
  EmailLayout,
  EmailHeader,
  EmailSection,
  EmailFooter,
  EmailParagraph,
} from '../components';
import { PaymentCompletedData } from '@/lib/services/emailService';
import { brandColors } from '@/lib/config/brand';
import { formatDateLong } from '@/lib/utils/formatting';
import { formatCurrency } from '@/lib/utils/currency';

type PaymentCompletedEmailProps = Omit<PaymentCompletedData, 'email'>;

export const PaymentCompletedEmail: React.FC<PaymentCompletedEmailProps> = ({
  payerName,
  policyNumber,
  paymentType,
  amount,
  paidAt,
}) => {
  return (
    <EmailLayout>
      <EmailHeader title="Pago Confirmado" subtitle="Tu pago ha sido procesado exitosamente" />
      <EmailSection greeting={`¡Gracias${payerName ? `, ${payerName}` : ''}!`}>
        <EmailParagraph>
          Hemos recibido tu pago correctamente.
        </EmailParagraph>

        {/* Payment Details Box */}
        <Section style={{
          backgroundColor: '#f0fff4',
          border: '2px solid #9ae6b4',
          borderLeft: `4px solid ${brandColors.success}`,
          padding: '20px',
          borderRadius: '8px',
          margin: '20px 0'
        }}>
          <Heading style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: 600,
            color: brandColors.success
          }}>
            Detalles del Pago
          </Heading>
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px 0', color: brandColors.textSecondary }}>Poliza:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: brandColors.textPrimary, textAlign: 'right' }}>{policyNumber}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: brandColors.textSecondary }}>Concepto:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: brandColors.textPrimary, textAlign: 'right' }}>{paymentType}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: brandColors.textSecondary }}>Monto:</td>
                <td style={{ padding: '8px 0', fontWeight: 700, color: brandColors.success, textAlign: 'right', fontSize: '18px' }}>{formatCurrency(amount)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: brandColors.textSecondary }}>Fecha:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: brandColors.textPrimary, textAlign: 'right' }}>{formatDateLong(paidAt)}</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <EmailParagraph size="small">
          Si tienes alguna pregunta sobre tu pago, no dudes en contactarnos.
        </EmailParagraph>
      </EmailSection>
      <EmailFooter />
    </EmailLayout>
  );
};

export default PaymentCompletedEmail;
