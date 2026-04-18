import React from 'react';
import {
  EmailLayout,
  EmailHeader,
  EmailSection,
  EmailFooter,
  EmailButton,
  EmailInfoBox,
  EmailParagraph,
} from '../components';
import { formatDateTimeLong } from '@/lib/utils/formatting';

export interface InvestigationSubmittedEmailProps {
  email: string;
  policyNumber: string;
  propertyAddress: string;
  actorType: 'TENANT' | 'JOINT_OBLIGOR' | 'AVAL';
  actorName: string;
  submittedBy: string;
  submittedAt: Date;
  policyUrl: string;
}

const actorTypeNames: Record<string, string> = {
  'TENANT': 'Inquilino',
  'JOINT_OBLIGOR': 'Obligado Solidario',
  'AVAL': 'Aval'
};

export const InvestigationSubmittedEmail: React.FC<InvestigationSubmittedEmailProps> = ({
  email,
  policyNumber,
  propertyAddress,
  actorType,
  actorName,
  submittedBy,
  submittedAt,
  policyUrl,
}) => {
  return (
    <EmailLayout>
      <EmailHeader
        title="Nueva Investigación Enviada"
        subtitle={`Protección #${policyNumber}`}
      />
      <EmailSection>
        <EmailParagraph>
          Se ha enviado una nueva investigación para aprobación:
        </EmailParagraph>

        <EmailInfoBox icon="📝">
          <strong>Actor:</strong> {actorName} ({actorTypeNames[actorType]})
          <br />
          <strong>Propiedad:</strong> {propertyAddress}
          <br />
          <strong>Enviada por:</strong> {submittedBy}
          <br />
          <strong>Fecha:</strong> {formatDateTimeLong(submittedAt)}
        </EmailInfoBox>

        <EmailParagraph>
          Se ha notificado al broker y arrendador para su aprobación.
        </EmailParagraph>

        <EmailButton href={policyUrl} variant="accent">
          Ver Protección
        </EmailButton>
      </EmailSection>
      <EmailFooter />
    </EmailLayout>
  );
};

export default InvestigationSubmittedEmail;
