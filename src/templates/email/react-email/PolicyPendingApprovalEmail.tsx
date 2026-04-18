import React from 'react';
import {
  EmailLayout,
  EmailHeader,
  EmailSection,
  EmailParagraph,
  EmailButton,
  EmailInfoBox,
  EmailFooter,
} from '../components';

export interface PolicyPendingApprovalEmailProps {
  recipientName?: string;
  policyNumber: string;
  policyLink: string;
}

export const PolicyPendingApprovalEmail: React.FC<PolicyPendingApprovalEmailProps> = ({
  recipientName,
  policyNumber,
  policyLink,
}) => (
  <EmailLayout>
    <EmailHeader
      title="Protección pendiente de aprobación"
      subtitle={`Protección #${policyNumber}`}
    />
    <EmailSection greeting={`Hola${recipientName ? ` ${recipientName}` : ''},`}>
      <EmailParagraph>
        La protección <strong>#{policyNumber}</strong> completó todas las investigaciones y está
        lista para la aprobación final.
      </EmailParagraph>
      <EmailInfoBox icon="📝">
        Revisa los resultados y decide si continúa al estado ACTIVE.
      </EmailInfoBox>
      <EmailButton href={policyLink}>Revisar protección</EmailButton>
    </EmailSection>
    <EmailFooter />
  </EmailLayout>
);

export default PolicyPendingApprovalEmail;
