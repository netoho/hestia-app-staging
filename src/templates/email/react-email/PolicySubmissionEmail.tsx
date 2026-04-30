import React from 'react';
import { Section, Text, Heading } from '@react-email/components';
import {
  EmailLayout,
  EmailHeader,
  EmailSection,
  EmailFooter,
  EmailInfoBox,
  EmailParagraph,
} from '../components';
import { PolicySubmissionData } from '@/lib/services/emailService';
import { brandColors } from '@/lib/config/brand';
import { formatDateTimeLong } from '@/lib/utils/formatting';

interface PolicySubmissionEmailProps extends PolicySubmissionData {}

export const PolicySubmissionEmail: React.FC<PolicySubmissionEmailProps> = ({
  tenantEmail,
  tenantName,
  policyId,
  submittedAt,
}) => {
  const submittedDate = formatDateTimeLong(submittedAt);

  return (
    <EmailLayout>
      <EmailHeader title="Solicitud Recibida" subtitle="Tu aplicación está en proceso" />
      <EmailSection greeting={`¡Gracias${tenantName ? `, ${tenantName}` : ''}!`}>
        <EmailParagraph>
          Hemos recibido exitosamente tu solicitud de protección de arrendamiento.
        </EmailParagraph>

        {/* Success Box */}
        <Section style={{
          backgroundColor: '#f0fff4',
          border: '2px solid #9ae6b4',
          padding: '20px',
          borderRadius: '8px',
          margin: '20px 0'
        }}>
          <Heading style={{
            margin: '0 0 10px 0',
            fontSize: '18px',
            fontWeight: 600,
            color: brandColors.success
          }}>
            Detalles de tu Solicitud
          </Heading>
          <Text style={{ margin: '0 0 10px 0', color: brandColors.textPrimary }}>
            <strong>ID de Solicitud:</strong> #{policyId}
          </Text>
          <Text style={{ margin: 0, color: brandColors.textPrimary }}>
            <strong>Enviada el:</strong> {submittedDate}
          </Text>
        </Section>

        <Heading style={{
          color: brandColors.textPrimary,
          fontSize: '20px',
          fontWeight: 600,
          marginTop: '30px',
          marginBottom: '16px'
        }}>
          ¿Qué sigue ahora?
        </Heading>

        <Text style={{
          fontSize: '16px',
          lineHeight: 1.6,
          color: brandColors.textPrimary,
          margin: '8px 0'
        }}>
          <strong>1. Revisión de documentos:</strong> Nuestro equipo revisará tu solicitud y documentos
        </Text>
        <Text style={{
          fontSize: '16px',
          lineHeight: 1.6,
          color: brandColors.textPrimary,
          margin: '8px 0'
        }}>
          <strong>2. Verificación de referencias:</strong> Podemos contactar a tus referencias para verificación
        </Text>
        <Text style={{
          fontSize: '16px',
          lineHeight: 1.6,
          color: brandColors.textPrimary,
          margin: '8px 0'
        }}>
          <strong>3. Decisión final:</strong> Recibirás un correo con nuestra decisión en 2-3 días hábiles
        </Text>

        <EmailInfoBox icon="📧">
          Si necesitamos información adicional, te contactaremos a esta dirección de correo electrónico.
        </EmailInfoBox>

        <EmailParagraph>
          Apreciamos tu confianza en Hestia para proteger tu tranquilidad en el arrendamiento.
        </EmailParagraph>
      </EmailSection>
      <EmailFooter />
    </EmailLayout>
  );
};

export default PolicySubmissionEmail;
