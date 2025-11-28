import React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Img,
  Preview,
} from '@react-email/components';
import { brandColors, brandInfo, brandUrls } from '@/lib/config/brand';

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
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: brandColors.background, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        <Container style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '20px'
        }}>
          {/* Header */}
          <Section style={{
            background: `linear-gradient(135deg, ${brandColors.email.headerGradientStart} 0%, ${brandColors.email.headerGradientEnd} 100%)`,
            padding: '30px',
            textAlign: 'center',
            borderRadius: '12px 12px 0 0',
          }}>
            <img
              src={`${brandUrls.production}/images/logo-hestia-azul-top.png`}
              alt={brandInfo.name}
              width="200"
              style={{ margin: '0 auto' }}
            />
            <Heading style={{
              color: brandColors.textPrimary,
              fontSize: '28px',
              fontWeight: '600',
              margin: '20px 0 10px'
            }}>
              Nueva Solicitud para Unirse al Equipo
            </Heading>
            <Text style={{
              color: brandColors.textSecondary,
              fontSize: '16px',
              margin: '0'
            }}>
              Un asesor inmobiliario está interesado en formar parte de Hestia
            </Text>
          </Section>

          {/* Main Content */}
          <Section style={{
            background: '#ffffff',
            padding: '30px',
            borderRadius: '0 0 12px 12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <Heading as="h2" style={{
              color: brandColors.primary,
              fontSize: '22px',
              fontWeight: '600',
              marginBottom: '20px'
            }}>
              Información del Solicitante
            </Heading>

            <div style={{ marginBottom: '25px' }}>
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
            </div>

            <Hr style={{ margin: '25px 0', borderColor: '#e0e0e0' }} />

            <Heading as="h3" style={{
              color: brandColors.primary,
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '15px'
            }}>
              Mensaje del Solicitante
            </Heading>

            <div style={{
              background: '#f8f9fa',
              padding: '20px',
              borderRadius: '8px',
              border: `1px solid ${brandColors.border}`
            }}>
              <Text style={{
                fontSize: '15px',
                lineHeight: '1.6',
                color: '#333',
                margin: 0,
                whiteSpace: 'pre-wrap'
              }}>
                {message}
              </Text>
            </div>

            <Hr style={{ margin: '25px 0', borderColor: '#e0e0e0' }} />

            <div style={{
              background: brandColors.info.bg,
              border: `1px solid ${brandColors.info.border}`,
              borderRadius: '8px',
              padding: '15px',
              marginTop: '20px'
            }}>
              <Text style={{
                color: brandColors.info.text,
                fontSize: '14px',
                margin: 0
              }}>
                <strong>Acción Requerida:</strong> Por favor, revisa esta solicitud y contacta al solicitante para continuar con el proceso de incorporación.
              </Text>
            </div>

            <Text style={{
              fontSize: '13px',
              color: '#666',
              marginTop: '20px',
              textAlign: 'center'
            }}>
              Fecha de solicitud: {new Date().toLocaleDateString('es-MX', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </Section>

          {/* Footer */}
          <Section style={{
            marginTop: '30px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <Text style={{
              color: '#999',
              fontSize: '12px',
              margin: '0 0 5px'
            }}>
              Este es un correo automático generado por el sistema de Hestia.
            </Text>
            <Text style={{
              color: '#999',
              fontSize: '12px',
              margin: '0'
            }}>
              © {new Date().getFullYear()} {brandInfo.legalName}. Todos los derechos reservados.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default JoinUsNotificationEmail;
