import React from 'react';
import { Hr } from '@react-email/components';
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

export interface ActorRejectionEmailProps {
  to: string;
  actorName: string;
  actorType: string;
  rejectionReason: string;
  policyNumber: string;
}

export const ActorRejectionEmail: React.FC<ActorRejectionEmailProps> = ({
  to,
  actorName,
  actorType,
  rejectionReason,
  policyNumber,
}) => {
  const actorTypeLabels: Record<string, string> = {
    landlord: 'Arrendador',
    tenant: 'Inquilino',
    jointObligor: 'Obligado Solidario',
    aval: 'Aval',
  };

  const actorTypeLabel = actorTypeLabels[actorType] || actorType;

  return (
    <EmailLayout>
      <EmailHeader
        title="Información Rechazada"
        subtitle={`Protección #${policyNumber}`}
      />
      <EmailSection greeting={`Hola ${actorName},`}>
        <EmailParagraph>
          Tu información como <strong>{actorTypeLabel}</strong> para la protección <strong>{policyNumber}</strong> ha sido rechazada.
        </EmailParagraph>

        <EmailWarningBox title="Razón del rechazo:" tone="danger">
          {rejectionReason}
        </EmailWarningBox>

        <EmailParagraph>
          Por favor, revisa y actualiza tu información según las observaciones proporcionadas. Puedes acceder nuevamente usando el enlace que te fue enviado anteriormente.
        </EmailParagraph>

        <EmailInfoBox icon="💡">
          <strong>¿Necesitas ayuda?</strong>
          <br />
          Si tienes preguntas o necesitas asistencia para actualizar tu información, nuestro equipo de soporte está disponible para ayudarte.
        </EmailInfoBox>

        <EmailButton href={`mailto:${brandInfo.infoEmail}`} variant="accent">
          📧 Contactar Soporte
        </EmailButton>

        <Hr style={{ margin: '30px 0', borderColor: brandColors.border }} />

        <EmailParagraph size="small">
          Este es un correo automático. Por favor, no respondas a este mensaje.
        </EmailParagraph>
      </EmailSection>
      <EmailFooter />
    </EmailLayout>
  );
};

export default ActorRejectionEmail;
