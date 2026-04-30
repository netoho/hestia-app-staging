import React from 'react';
import {
  EmailLayout,
  EmailHeader,
  EmailSection,
  EmailFooter,
  EmailButton,
  EmailParagraph,
} from '../components';

export interface ActorIncompleteReminderEmailProps {
  actorName: string;
  actorType: 'landlord' | 'tenant' | 'jointObligor' | 'aval';
  policyNumber: string;
  actorLink: string;
  email: string;
}

const actorTypeLabels: Record<string, string> = {
  landlord: 'Arrendador',
  tenant: 'Arrendatario',
  jointObligor: 'Obligado Solidario',
  aval: 'Aval'
};

export const ActorIncompleteReminderEmail: React.FC<ActorIncompleteReminderEmailProps> = ({
  actorName,
  actorType,
  policyNumber,
  actorLink,
}) => {
  const actorTypeLabel = actorTypeLabels[actorType] || actorType;

  return (
    <EmailLayout>
      <EmailHeader title="Recordatorio" subtitle="Complete su información para la protección" />
      <EmailSection greeting={`Hola ${actorName},`}>
        <EmailParagraph>
          Este es un recordatorio diario para completar su información como <strong>{actorTypeLabel}</strong> para la protección <strong>{policyNumber}</strong>.
        </EmailParagraph>

        <EmailParagraph>
          Su información está incompleta y es necesaria para procesar la protección. Por favor, tómese unos minutos para completar el formulario.
        </EmailParagraph>

        <EmailButton href={actorLink} variant="accent">
          Completar mi información
        </EmailButton>

        <EmailParagraph size="small">
          Este enlace es único para usted. No lo comparta con nadie más.
        </EmailParagraph>
      </EmailSection>
      <EmailFooter />
    </EmailLayout>
  );
};

export default ActorIncompleteReminderEmail;
