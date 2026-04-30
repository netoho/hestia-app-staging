import React from 'react';
import { Section, Heading } from '@react-email/components';
import {
  EmailLayout,
  EmailHeader,
  EmailSection,
  EmailFooter,
  EmailButton,
  EmailParagraph,
} from '../components';
import { AllPaymentsCompletedData } from '@/lib/services/emailService';
import { brandColors, brandUrls } from '@/lib/config/brand';
import { formatCurrency } from '@/lib/utils/currency';

type AllPaymentsCompletedEmailProps = Omit<AllPaymentsCompletedData, 'adminEmail'>;

export const AllPaymentsCompletedEmail: React.FC<AllPaymentsCompletedEmailProps> = ({
  policyNumber,
  totalPayments,
  totalAmount,
}) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || brandUrls.production;

  return (
    <EmailLayout>
      <EmailHeader title="Pagos Completados" subtitle="Notificación de administrador" />
      <EmailSection greeting="Póliza Lista para Activar">
        <EmailParagraph>
          Todos los pagos de la poliza <strong>{policyNumber}</strong> han sido completados.
        </EmailParagraph>

        {/* Payment Summary Box */}
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
            Resumen de Pagos
          </Heading>
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px 0', color: brandColors.textSecondary }}>Póliza:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: brandColors.textPrimary, textAlign: 'right' }}>{policyNumber}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: brandColors.textSecondary }}>Total de pagos:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: brandColors.textPrimary, textAlign: 'right' }}>{totalPayments}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: brandColors.textSecondary }}>Monto total:</td>
                <td style={{ padding: '8px 0', fontWeight: 700, color: brandColors.success, textAlign: 'right', fontSize: '18px' }}>{formatCurrency(totalAmount)}</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <EmailButton href={`${appUrl}/dashboard/policies`}>
          Ver Póliza
        </EmailButton>

        <EmailParagraph size="small">
          Esta es una notificación automática del sistema.
        </EmailParagraph>
      </EmailSection>
      <EmailFooter />
    </EmailLayout>
  );
};

export default AllPaymentsCompletedEmail;
