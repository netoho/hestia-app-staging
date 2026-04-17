import React from 'react';
import { Hr } from '@react-email/components';
import {
  EmailLayout,
  EmailHeader,
  EmailSection,
  EmailFooter,
  EmailButton,
  EmailWarningBox,
  EmailParagraph,
} from '../components';
import { PolicyCancellationEmailData } from '@/lib/services/emailService';
import { formatDateTimeLong } from '@/lib/utils/formatting';

interface PolicyCancellationEmailProps extends PolicyCancellationEmailData {}

const CANCELLATION_REASON_LABELS: Record<string, string> = {
  CLIENT_REQUEST: 'Solicitud del Cliente',
  NON_PAYMENT: 'Falta de Pago',
  FRAUD: 'Fraude',
  DOCUMENTATION_ISSUES: 'Problemas de Documentación',
  LANDLORD_REQUEST: 'Solicitud del Arrendador',
  TENANT_REQUEST: 'Solicitud del Inquilino',
  OTHER: 'Otro',
};

export const PolicyCancellationEmail: React.FC<PolicyCancellationEmailProps> = ({
  adminName,
  policyNumber,
  cancellationReason,
  cancellationComment,
  cancelledByName,
  cancelledAt,
  policyLink,
}) => {
  const reasonLabel = CANCELLATION_REASON_LABELS[cancellationReason] || cancellationReason;
  const cancelledDate = formatDateTimeLong(cancelledAt);

  return (
    <EmailLayout>
      <EmailHeader title="Protección Cancelada" subtitle="Notificación de cancelación" />
      <EmailSection greeting={`Hola${adminName ? ` ${adminName}` : ''},`}>
        <EmailParagraph>
          Se ha cancelado una protección en el sistema. A continuacion los detalles:
        </EmailParagraph>

        <EmailWarningBox title="Detalles de la Cancelación" tone="danger">
          <strong>Número de Protección:</strong> {policyNumber}
          <br />
          <strong>Razón:</strong> {reasonLabel}
          <br />
          <strong>Comentario:</strong> {cancellationComment}
          <br />
          <strong>Cancelada por:</strong> {cancelledByName}
          <br />
          <strong>Fecha:</strong> {cancelledDate}
        </EmailWarningBox>

        {policyLink && (
          <EmailButton href={policyLink} variant="accent">
            Ver Protección
          </EmailButton>
        )}

        <Hr style={{ margin: '40px 0 20px 0', borderColor: '#f7fafc' }} />

        <EmailParagraph size="small">
          Este es un mensaje automático del sistema. Si tienes preguntas sobre esta cancelación, contacta al equipo que la realizo.
        </EmailParagraph>
      </EmailSection>
      <EmailFooter />
    </EmailLayout>
  );
};

export default PolicyCancellationEmail;
