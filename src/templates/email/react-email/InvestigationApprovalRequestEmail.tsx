import React from 'react';
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
import { formatDateLong } from '@/lib/utils/formatting';

export interface InvestigationApprovalRequestEmailProps {
  email: string;
  recipientName?: string;
  recipientType: 'BROKER' | 'LANDLORD';
  policyNumber: string;
  propertyAddress: string;
  actorType: 'TENANT' | 'JOINT_OBLIGOR' | 'AVAL';
  actorName: string;
  approvalUrl: string;
  expiryDate: Date;
}

const actorTypeNames: Record<string, string> = {
  'TENANT': 'Inquilino',
  'JOINT_OBLIGOR': 'Obligado Solidario',
  'AVAL': 'Aval'
};

export const InvestigationApprovalRequestEmail: React.FC<InvestigationApprovalRequestEmailProps> = ({
  email,
  recipientName,
  recipientType,
  policyNumber,
  propertyAddress,
  actorType,
  actorName,
  approvalUrl,
  expiryDate,
}) => {
  const expiryDateFormatted = formatDateLong(expiryDate);

  return (
    <EmailLayout>
      <EmailHeader
        title="Aprobación de Investigación"
        subtitle={`Protección #${policyNumber} · ${propertyAddress}`}
      />
      <EmailSection greeting={`Hola${recipientName ? ` ${recipientName}` : ''},`}>
        <EmailParagraph>
          Se ha completado la investigación de <strong>{actorName}</strong> ({actorTypeNames[actorType]}) y requiere tu aprobación.
        </EmailParagraph>

        <EmailInfoBox icon="📝">
          <strong>Actor:</strong> {actorName}
          <br />
          <strong>Tipo:</strong> {actorTypeNames[actorType]}
        </EmailInfoBox>

        <EmailParagraph>
          Por favor revisa la investigación y decide si aprobar o rechazar.
        </EmailParagraph>

        <EmailButton href={approvalUrl} variant="accent">
          Revisar y Aprobar
        </EmailButton>

        <EmailWarningBox tone="warning">
          Este enlace expira el <strong>{expiryDateFormatted}</strong>
        </EmailWarningBox>

        <EmailParagraph size="small">
          Si tienes alguna duda, contacta a nuestro equipo de soporte.
        </EmailParagraph>
      </EmailSection>
      <EmailFooter />
    </EmailLayout>
  );
};

export default InvestigationApprovalRequestEmail;
