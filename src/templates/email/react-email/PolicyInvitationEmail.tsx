import React from 'react';
import { Text, Heading } from '@react-email/components';
import {
  EmailLayout,
  EmailHeader,
  EmailSection,
  EmailFooter,
  EmailButton,
  EmailInfoBox,
  EmailWarningBox,
  EmailParagraph,
} from '../components';
import { PolicyInvitationData } from '@/lib/services/emailService';
import { generatePolicyUrl } from '@/lib/utils/tokenUtils';
import { brandColors } from '@/lib/config/brand';
import { formatDateLong } from '@/lib/utils/formatting';

interface PolicyInvitationEmailProps {
  tenantEmail: string;
  tenantName?: string;
  propertyAddress?: string;
  accessToken: string;
  expiryDate: Date;
  initiatorName: string;
}

export const PolicyInvitationEmail: React.FC<PolicyInvitationEmailProps> = ({
  tenantEmail,
  tenantName,
  propertyAddress,
  accessToken,
  expiryDate,
  initiatorName,
}) => {
  const policyUrl = generatePolicyUrl(accessToken, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  const expiryDateFormatted = formatDateLong(expiryDate);

  return (
    <EmailLayout>
      <EmailHeader
        title="Solicitud de Protección de Arrendamiento"
        subtitle="Completa tu aplicación en minutos"
      />
      <EmailSection greeting={`Hola${tenantName ? ` ${tenantName}` : ''},`}>
        <EmailParagraph>
          <strong>{initiatorName}</strong> ha iniciado una solicitud de protección de arrendamiento para ti
          {propertyAddress && (
            <> para la propiedad ubicada en <strong>{propertyAddress}</strong></>
          )}.
        </EmailParagraph>

        <EmailParagraph>
          Para completar tu solicitud, haz clic en el botón de abajo y sigue el proceso paso a paso:
        </EmailParagraph>

        <EmailButton href={policyUrl}>
          ✨ Completar Mi Solicitud
        </EmailButton>

        <EmailWarningBox title="Importante" tone="warning">
          Este enlace expirará el <strong>{expiryDateFormatted}</strong>.
          Por favor completa tu solicitud antes de esta fecha.
        </EmailWarningBox>

        <Heading style={{
          color: brandColors.textPrimary,
          fontSize: '20px',
          fontWeight: 600,
          marginTop: '30px',
          marginBottom: '16px'
        }}>
          Lo que necesitarás:
        </Heading>

        <Text style={{
          fontSize: '16px',
          lineHeight: 1.6,
          color: brandColors.textPrimary,
          margin: '8px 0'
        }}>
          • Identificación válida (CURP mexicana o pasaporte)
        </Text>
        <Text style={{
          fontSize: '16px',
          lineHeight: 1.6,
          color: brandColors.textPrimary,
          margin: '8px 0'
        }}>
          • Información laboral y comprobantes de ingresos
        </Text>
        <Text style={{
          fontSize: '16px',
          lineHeight: 1.6,
          color: brandColors.textPrimary,
          margin: '8px 0'
        }}>
          • Información de contacto de referencias personales
        </Text>
        <Text style={{
          fontSize: '16px',
          lineHeight: 1.6,
          color: brandColors.textPrimary,
          margin: '8px 0'
        }}>
          • Documentos adicionales (opcional)
        </Text>

        <EmailInfoBox icon="💡">
          <strong>Tip:</strong> El proceso de solicitud toma típicamente 15-20 minutos en completarse.
        </EmailInfoBox>
      </EmailSection>
      <EmailFooter />
    </EmailLayout>
  );
};

export default PolicyInvitationEmail;
