import React from 'react';
import { Section, Text, Heading, Hr, Preview } from '@react-email/components';
import {
  EmailLayout,
  EmailHeader,
  EmailSection,
  EmailFooter,
  EmailInfoBox,
  EmailParagraph,
} from '../components';
import { brandColors } from '@/lib/config/brand';
import { formatDateTimeLong } from '@/lib/utils/formatting';

export interface JoinUsNotificationEmailProps {
  name: string;
  email: string;
  phone: string;
  company: string;
  experience: string;
  currentClients: string;
  message: string;
}

export const JoinUsNotificationEmail: React.FC<JoinUsNotificationEmailProps> = ({
  name,
  email,
  phone,
  company,
  experience,
  currentClients,
  message,
}) => {
  const previewText = `Nueva solicitud para unirse de ${name}`;

  return (
    <EmailLayout>
      <Preview>{previewText}</Preview>
      <EmailHeader
        title="Nueva Solicitud para Unirse al Equipo"
        subtitle="Un asesor inmobiliario está interesado en formar parte de Hestia"
      />
      <EmailSection>
        <Heading as="h2" style={{
          color: brandColors.primary,
          fontSize: '22px',
          fontWeight: 600,
          marginBottom: '20px',
          marginTop: 0,
        }}>
          Información del Solicitante
        </Heading>

        <Section style={{ marginBottom: '25px' }}>
          <Text style={{ margin: '10px 0', fontSize: '15px', color: '#333' }}>
            <strong style={{ color: brandColors.primary }}>Nombre:</strong> {name}
          </Text>
          <Text style={{ margin: '10px 0', fontSize: '15px', color: '#333' }}>
            <strong style={{ color: brandColors.primary }}>Email:</strong>{' '}
            <a href={`mailto:${email}`} style={{ color: brandColors.link, textDecoration: 'none' }}>
              {email}
            </a>
          </Text>
          <Text style={{ margin: '10px 0', fontSize: '15px', color: '#333' }}>
            <strong style={{ color: brandColors.primary }}>Teléfono:</strong>{' '}
            <a href={`tel:${phone}`} style={{ color: brandColors.link, textDecoration: 'none' }}>
              {phone}
            </a>
          </Text>
          <Text style={{ margin: '10px 0', fontSize: '15px', color: '#333' }}>
            <strong style={{ color: brandColors.primary }}>Empresa/Inmobiliaria:</strong> {company}
          </Text>
          <Text style={{ margin: '10px 0', fontSize: '15px', color: '#333' }}>
            <strong style={{ color: brandColors.primary }}>Años de Experiencia:</strong> {experience}
          </Text>
          <Text style={{ margin: '10px 0', fontSize: '15px', color: '#333' }}>
            <strong style={{ color: brandColors.primary }}>Número de Clientes Actuales:</strong> {currentClients}
          </Text>
        </Section>

        <Hr style={{ margin: '25px 0', borderColor: '#e0e0e0' }} />

        <Heading as="h3" style={{
          color: brandColors.primary,
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '15px'
        }}>
          Mensaje del Solicitante
        </Heading>

        <Section style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          border: `1px solid ${brandColors.border}`
        }}>
          <Text style={{
            fontSize: '15px',
            lineHeight: 1.6,
            color: '#333',
            margin: 0,
            whiteSpace: 'pre-wrap'
          }}>
            {message}
          </Text>
        </Section>

        <Hr style={{ margin: '25px 0', borderColor: '#e0e0e0' }} />

        <EmailInfoBox icon="ℹ️">
          <strong>Acción Requerida:</strong> Por favor, revisa esta solicitud y contacta al solicitante para continuar con el proceso de incorporación.
        </EmailInfoBox>

        <EmailParagraph size="small">
          Fecha de solicitud: {formatDateTimeLong(new Date())}
        </EmailParagraph>
      </EmailSection>
      <EmailFooter />
    </EmailLayout>
  );
};

export default JoinUsNotificationEmail;
