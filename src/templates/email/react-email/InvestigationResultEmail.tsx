import React from 'react';
import { Section, Text } from '@react-email/components';
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
import { formatDateTimeLong } from '@/lib/utils/formatting';

export interface InvestigationResultEmailProps {
  email: string;
  recipientName?: string;
  recipientType: 'ADMIN' | 'BROKER' | 'LANDLORD';
  policyNumber: string;
  propertyAddress: string;
  actorType: 'TENANT' | 'JOINT_OBLIGOR' | 'AVAL';
  actorName: string;
  result: 'APPROVED' | 'REJECTED';
  approvedBy: string;
  approvedByType: 'BROKER' | 'LANDLORD';
  approvedAt: Date;
  notes?: string;
  rejectionReason?: string;
  policyUrl?: string;
}

const actorTypeNames: Record<string, string> = {
  'TENANT': 'Inquilino',
  'JOINT_OBLIGOR': 'Obligado Solidario',
  'AVAL': 'Aval'
};

const approverTypeNames: Record<string, string> = {
  'BROKER': 'el Broker',
  'LANDLORD': 'el Arrendador'
};

export const InvestigationResultEmail: React.FC<InvestigationResultEmailProps> = ({
  email,
  recipientName,
  recipientType,
  policyNumber,
  propertyAddress,
  actorType,
  actorName,
  result,
  approvedBy,
  approvedByType,
  approvedAt,
  notes,
  rejectionReason,
  policyUrl,
}) => {
  const isApproved = result === 'APPROVED';

  const resultColor = isApproved ? '#22c55e' : '#ef4444';
  const resultBgColor = isApproved ? '#dcfce7' : '#fee2e2';
  const resultBorderColor = isApproved ? '#86efac' : '#fca5a5';
  const resultText = isApproved ? 'Aprobada' : 'Rechazada';

  return (
    <EmailLayout>
      <EmailHeader
        title={`Investigación ${resultText}`}
        subtitle={`Protección #${policyNumber}`}
      />
      <EmailSection greeting={`Hola${recipientName ? ` ${recipientName}` : ''},`}>
        {/* Result Banner */}
        <Section style={{
          backgroundColor: resultBgColor,
          border: `2px solid ${resultBorderColor}`,
          padding: '20px',
          borderRadius: '8px',
          margin: '20px 0',
          textAlign: 'center'
        }}>
          <Text style={{
            margin: 0,
            color: resultColor,
            fontSize: '20px',
            fontWeight: 700
          }}>
            Investigación {resultText}
          </Text>
        </Section>

        <EmailParagraph>
          La investigación de <strong>{actorName}</strong> ({actorTypeNames[actorType]}) ha sido <strong>{resultText.toLowerCase()}</strong> por {approverTypeNames[approvedByType]}.
        </EmailParagraph>

        <EmailInfoBox icon="📝">
          <strong>Actor:</strong> {actorName} ({actorTypeNames[actorType]})
          <br />
          <strong>Propiedad:</strong> {propertyAddress}
          <br />
          <strong>Decisión por:</strong> {approverTypeNames[approvedByType]}
          <br />
          <strong>Fecha:</strong> {formatDateTimeLong(approvedAt)}
        </EmailInfoBox>

        {(notes || rejectionReason) && (
          isApproved ? (
            <EmailInfoBox icon="📝">
              <strong>Notas:</strong>
              <br />
              {notes}
            </EmailInfoBox>
          ) : (
            <EmailWarningBox title="Motivo del rechazo:" tone="danger">
              {rejectionReason}
            </EmailWarningBox>
          )
        )}

        {policyUrl && (
          <EmailButton href={policyUrl} variant="accent">
            Ver Protección
          </EmailButton>
        )}
      </EmailSection>
      <EmailFooter />
    </EmailLayout>
  );
};

export default InvestigationResultEmail;
