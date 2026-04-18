import React from 'react';
import {
  EmailLayout,
  EmailHeader,
  EmailSection,
  EmailParagraph,
  EmailInfoBox,
  EmailFooter,
} from '../components';
import { formatDateTimeLong } from '@/lib/utils/formatting';
import { brandInfo } from '@/lib/config/brand';

export interface PasswordResetConfirmationEmailProps {
  name?: string;
  changedAt: Date | string;
}

export const PasswordResetConfirmationEmail: React.FC<PasswordResetConfirmationEmailProps> = ({
  name,
  changedAt,
}) => (
  <EmailLayout>
    <EmailHeader
      title="Tu contraseña fue actualizada"
      subtitle="Confirmación de cambio de contraseña"
    />
    <EmailSection greeting={`Hola${name ? ` ${name}` : ''},`}>
      <EmailParagraph>
        Te confirmamos que tu contraseña se cambió correctamente el{' '}
        <strong>{formatDateTimeLong(changedAt)}</strong>.
      </EmailParagraph>
      <EmailInfoBox icon="🔐">
        Si tú realizaste este cambio, no es necesario hacer nada más.
      </EmailInfoBox>
      <EmailParagraph>
        Si no reconoces esta actividad, contáctanos de inmediato a{' '}
        <a href={`mailto:${brandInfo.supportEmail}`}>{brandInfo.supportEmail}</a> para proteger tu
        cuenta.
      </EmailParagraph>
    </EmailSection>
    <EmailFooter />
  </EmailLayout>
);

export default PasswordResetConfirmationEmail;
