import React from 'react';
import { Hr, Text } from '@react-email/components';
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
import { brandColors, brandInfo } from '@/lib/config/brand';

export interface PasswordResetEmailProps {
  email: string;
  name?: string;
  resetUrl: string;
  expiryTime: string; // e.g., "1 hora"
}

export const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({
  email,
  name,
  resetUrl,
  expiryTime,
}) => {
  const supportEmail = brandInfo.supportEmail;

  return (
    <EmailLayout>
      <EmailHeader title="Restablecer Contraseña" />
      <EmailSection greeting={`Hola ${name || 'usuario'},`}>
        <EmailParagraph>
          Recibimos una solicitud para restablecer la contraseña de tu cuenta en {brandInfo.name} asociada con el correo electrónico <strong>{email}</strong>.
        </EmailParagraph>

        <EmailParagraph>
          Si realizaste esta solicitud, haz clic en el botón de abajo para crear una nueva contraseña:
        </EmailParagraph>

        <EmailButton href={resetUrl} variant="accent">
          Restablecer Contraseña
        </EmailButton>

        <EmailWarningBox title="Información importante:" tone="warning">
          • Este enlace expirará en <strong>{expiryTime}</strong>
          <br />
          • Por seguridad, no compartas este enlace con nadie
          <br />
          • Si no solicitaste restablecer tu contraseña, ignora este correo
        </EmailWarningBox>

        <Hr style={{ borderColor: brandColors.border, margin: '30px 0' }} />

        <EmailParagraph size="small">
          Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:
        </EmailParagraph>
        <Text style={{
          color: brandColors.primary,
          fontSize: '14px',
          lineHeight: '20px',
          wordBreak: 'break-all',
          margin: '0 0 20px'
        }}>
          {resetUrl}
        </Text>

        <Hr style={{ borderColor: brandColors.border, margin: '30px 0' }} />

        <EmailInfoBox icon="🔐">
          <strong>Nota de seguridad:</strong> Si no solicitaste restablecer tu contraseña, es posible que alguien esté intentando acceder a tu cuenta. Por favor, asegúrate de que tu cuenta esté segura y contacta a nuestro equipo de soporte si tienes alguna preocupación.
        </EmailInfoBox>

        <EmailParagraph size="small">
          ¿Necesitas ayuda? Contáctanos en{' '}
          <a
            href={`mailto:${supportEmail}`}
            style={{ color: brandColors.primary, textDecoration: 'none' }}
          >
            {supportEmail}
          </a>
        </EmailParagraph>
      </EmailSection>
      <EmailFooter />
    </EmailLayout>
  );
};

// Default export for React Email preview
export default PasswordResetEmail;
