import React from 'react';
import { Section, Heading } from '@react-email/components';
import {
  EmailLayout,
  EmailHeader,
  EmailSection,
  EmailFooter,
  EmailParagraph,
  EmailButton,
} from '../components';
import { CfdiPortalData } from '@/lib/services/emailService';
import { brandColors } from '@/lib/config/brand';
import { formatCurrency } from '@/lib/utils/currency';

type CfdiPortalEmailProps = Omit<CfdiPortalData, 'email'>;

export const CfdiPortalEmail: React.FC<CfdiPortalEmailProps> = ({
  payerName,
  policyNumber,
  paymentDescription,
  amount,
  portalUrl,
}) => {
  return (
    <EmailLayout>
      <EmailHeader title="Genera tu Factura (CFDI)" subtitle="Tu pago fue registrado" />
      <EmailSection greeting={`Hola${payerName ? `, ${payerName}` : ''}`}>
        <EmailParagraph>
          Registramos tu pago y ya puedes generar tu factura (CFDI). En el portal
          ingresarás tu RFC y datos fiscales; nosotros nunca los almacenamos. El
          enlace es permanente: puedes generar tu factura ahora o más adelante.
        </EmailParagraph>

        {/* Payment Details Box */}
        <Section style={{
          backgroundColor: '#f7fafc',
          border: '2px solid #e2e8f0',
          borderLeft: `4px solid ${brandColors.primary}`,
          padding: '20px',
          borderRadius: '8px',
          margin: '20px 0'
        }}>
          <Heading style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: 600,
            color: brandColors.primary
          }}>
            Detalles del Pago
          </Heading>
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px 0', color: brandColors.textSecondary }}>Protección:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: brandColors.textPrimary, textAlign: 'right' }}>{policyNumber}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: brandColors.textSecondary }}>Concepto:</td>
                <td style={{ padding: '8px 0', fontWeight: 600, color: brandColors.textPrimary, textAlign: 'right' }}>{paymentDescription}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: brandColors.textSecondary }}>Monto:</td>
                <td style={{ padding: '8px 0', fontWeight: 700, color: brandColors.primary, textAlign: 'right', fontSize: '18px' }}>{formatCurrency(amount)}</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <EmailButton href={portalUrl}>Generar mi Factura</EmailButton>

        <EmailParagraph size="small">
          Si el botón no funciona, copia y pega este enlace en tu navegador: {portalUrl}
        </EmailParagraph>
      </EmailSection>
      <EmailFooter />
    </EmailLayout>
  );
};

export default CfdiPortalEmail;
