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
} from '@react-email/components';
import { PolicySubmissionData } from '@/lib/services/emailService';

interface PolicySubmissionEmailProps extends PolicySubmissionData {}

// Hestia brand colors
const brandColors = {
  primary: '#1a365d',
  secondary: '#2b77e6',
  success: '#38a169',
  warning: '#d69e2e',
  danger: '#e53e3e',
  textPrimary: '#2d3748',
  textSecondary: '#4a5568',
  textMuted: '#718096',
  background: '#f8fafc',
  white: '#ffffff',
};

export const PolicySubmissionEmail: React.FC<PolicySubmissionEmailProps> = ({
  tenantEmail,
  tenantName,
  policyId,
  submittedAt,
}) => {
  const submittedDate = new Date(submittedAt).toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: brandColors.background, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        <Container style={{ 
          maxWidth: '600px', 
          margin: '0 auto', 
          padding: '20px' 
        }}>
          {/* Header */}
          <Section style={{
            background: `linear-gradient(135deg, ${brandColors.success} 0%, ${brandColors.secondary} 100%)`,
            padding: '40px 30px',
            textAlign: 'center',
            borderRadius: '12px 12px 0 0',
          }}>
            <Heading style={{
              margin: 0,
              color: brandColors.white,
              fontSize: '28px',
              fontWeight: '700',
              letterSpacing: '-0.025em'
            }}>
              Solicitud Recibida
            </Heading>
            <Text style={{
              margin: '8px 0 0 0',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '16px',
              fontWeight: '400'
            }}>
              Tu aplicación está en proceso
            </Text>
          </Section>

          {/* Content */}
          <Section style={{
            backgroundColor: brandColors.white,
            padding: '40px 30px',
            border: '1px solid #e2e8f0',
            borderTop: 'none',
            borderRadius: '0 0 12px 12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <Heading style={{
              color: brandColors.textPrimary,
              marginTop: 0,
              fontSize: '24px',
              fontWeight: '600'
            }}>
              ¡Gracias{tenantName ? `, ${tenantName}` : ''}!
            </Heading>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '16px 0'
            }}>
              Hemos recibido exitosamente tu solicitud de póliza de garantía.
            </Text>

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
                fontWeight: '600',
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
              fontWeight: '600',
              marginTop: '30px',
              marginBottom: '16px'
            }}>
              ¿Qué sigue ahora?
            </Heading>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '8px 0'
            }}>
              <strong>1. Revisión de documentos:</strong> Nuestro equipo revisará tu solicitud y documentos
            </Text>
            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '8px 0'
            }}>
              <strong>2. Verificación de referencias:</strong> Podemos contactar a tus referencias para verificación
            </Text>
            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '8px 0'
            }}>
              <strong>3. Decisión final:</strong> Recibirás un correo con nuestra decisión en 2-3 días hábiles
            </Text>

            {/* Info Box */}
            <Section style={{
              backgroundColor: '#ebf8ff',
              border: '2px solid #bee3f8',
              padding: '20px',
              borderRadius: '8px',
              margin: '20px 0'
            }}>
              <Text style={{ margin: 0, color: brandColors.textPrimary }}>
                📧 Si necesitamos información adicional, te contactaremos a esta dirección de correo electrónico.
              </Text>
            </Section>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textSecondary,
              marginTop: '30px'
            }}>
              Apreciamos tu confianza en Hestia para proteger tu tranquilidad en el alquiler.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={{
            marginTop: '40px',
            paddingTop: '30px',
            borderTop: '2px solid #f7fafc',
            textAlign: 'center'
          }}>
            <Text style={{
              fontSize: '18px',
              fontWeight: '600',
              color: brandColors.primary,
              marginBottom: '10px'
            }}>
              Hestia
            </Text>
            <Text style={{
              margin: '5px 0',
              fontSize: '14px',
              color: brandColors.textMuted
            }}>
              Protegiendo tu tranquilidad en cada alquiler
            </Text>
            <Text style={{
              margin: '15px 0 5px 0',
              fontSize: '14px',
              color: brandColors.textMuted
            }}>
              ¿Tienes preguntas? Contáctanos en{' '}
              <a 
                href="mailto:soporte@hestiaplp.com.mx" 
                style={{ color: brandColors.secondary, textDecoration: 'none' }}
              >
                soporte@hestiaplp.com.mx
              </a>
            </Text>
            <Text style={{
              margin: '5px 0 0 0',
              fontSize: '12px',
              color: brandColors.textMuted
            }}>
              © {new Date().getFullYear()} Hestia PLP. Todos los derechos reservados.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default PolicySubmissionEmail;