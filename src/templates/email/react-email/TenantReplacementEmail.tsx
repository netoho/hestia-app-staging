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

export interface TenantReplacementEmailProps {
  recipientName?: string;
  policyNumber: string;
  policyLink: string;
}

export const TenantReplacementEmail: React.FC<TenantReplacementEmailProps> = ({
  recipientName,
  policyNumber,
  policyLink,
}) => (
  <EmailLayout>
    <EmailHeader
      title="Inquilino reemplazado"
      subtitle={`Protección #${policyNumber}`}
    />
    <EmailSection greeting={`Hola${recipientName ? ` ${recipientName}` : ''},`}>
      <EmailParagraph>
        El inquilino fue reemplazado en la protección{' '}
        <strong>#{policyNumber}</strong>. El proceso de recolección de información se reinició para
        el nuevo inquilino.
      </EmailParagraph>
      <EmailInfoBox icon="ℹ️">
        Revisa el estado de la protección y el avance del nuevo inquilino en el tablero.
      </EmailInfoBox>
      <EmailButton href={policyLink}>Ver protección</EmailButton>
    </EmailSection>
    <EmailFooter />
  </EmailLayout>
);

export default TenantReplacementEmail;
