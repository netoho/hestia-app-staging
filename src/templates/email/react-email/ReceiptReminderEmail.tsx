import React from 'react';
import { Section, Text } from '@react-email/components';
import {
  EmailLayout,
  EmailHeader,
  EmailSection,
  EmailFooter,
  EmailButton,
  EmailParagraph,
} from '../components';
import { brandColors } from '@/lib/config/brand';

export interface ReceiptReminderEmailProps {
  tenantName: string;
  email: string;
  propertyAddress: string;
  policyNumber: string;
  monthName: string;
  year: number;
  requiredReceipts: string[];
  portalUrl: string;
}

export const ReceiptReminderEmail: React.FC<ReceiptReminderEmailProps> = ({
  tenantName,
  propertyAddress,
  policyNumber,
  monthName,
  year,
  requiredReceipts,
  portalUrl,
}) => {
  return (
    <EmailLayout>
      <EmailHeader
        title="Comprobantes de Pago"
        subtitle={`${monthName} ${year} — Protección #${policyNumber}`}
      />
      <EmailSection greeting={`Hola ${tenantName},`}>
        <EmailParagraph>
          Es momento de subir tus comprobantes de pago del mes de <strong>{monthName} {year}</strong> para la propiedad en <strong>{propertyAddress}</strong>.
        </EmailParagraph>

        {/* Receipt types box */}
        <Section style={{
          backgroundColor: brandColors.email.infoBackground,
          border: `2px solid ${brandColors.email.infoBorder}`,
          padding: '20px',
          borderRadius: '8px',
          margin: '20px 0',
        }}>
          <Text style={{ margin: '0 0 12px 0', fontWeight: 600, color: brandColors.textPrimary, fontSize: '15px' }}>
            Comprobantes solicitados:
          </Text>
          {requiredReceipts.map((receipt, idx) => (
            <Text key={idx} style={{
              margin: '6px 0',
              color: brandColors.textPrimary,
              fontSize: '15px',
            }}>
              • {receipt}
            </Text>
          ))}
        </Section>

        <EmailParagraph size="small">
          Si algún servicio no aplica este mes, puedes marcarlo como "No aplica" directamente en el portal.
        </EmailParagraph>

        <EmailButton href={portalUrl} variant="accent">
          Subir Comprobantes
        </EmailButton>

        <EmailParagraph size="small">
          Este enlace es personal. No lo compartas con nadie.
        </EmailParagraph>
      </EmailSection>
      <EmailFooter />
    </EmailLayout>
  );
};

export default ReceiptReminderEmail;
