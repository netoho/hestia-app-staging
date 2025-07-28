import React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Button,
  Hr,
  Img,
} from '@react-email/components';
import { PolicyInvitationData } from '@/lib/services/emailService';
import { generatePolicyUrl } from '@/lib/utils/tokenUtils';

interface PolicyInvitationEmailProps extends PolicyInvitationData {}

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

export const PolicyInvitationEmail: React.FC<PolicyInvitationEmailProps> = ({
  tenantEmail,
  tenantName,
  propertyAddress,
  accessToken,
  expiryDate,
  initiatorName,
}) => {
  const policyUrl = generatePolicyUrl(accessToken, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  const expiryDateFormatted = new Date(expiryDate).toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
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
            background: `linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.secondary} 100%)`,
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
              Solicitud de Póliza
            </Heading>
            <Text style={{
              margin: '8px 0 0 0',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '16px',
              fontWeight: '400'
            }}>
              Completa tu aplicación de garantía
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
              Hola{tenantName ? ` ${tenantName}` : ''},
            </Heading>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '16px 0'
            }}>
              <strong>{initiatorName}</strong> ha iniciado una solicitud de póliza de garantía para ti
              {propertyAddress && (
                <> para la propiedad ubicada en <strong>{propertyAddress}</strong></>
              )}.
            </Text>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '16px 0'
            }}>
              Para completar tu solicitud, haz clic en el botón de abajo y sigue el proceso paso a paso:
            </Text>

            <Section style={{ textAlign: 'center', margin: '30px 0' }}>
              <Button
                href={policyUrl}
                style={{
                  backgroundColor: brandColors.primary,
                  color: brandColors.white,
                  padding: '14px 28px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '16px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}
              >
                Completar Mi Solicitud
              </Button>
            </Section>

            {/* Warning Box */}
            <Section style={{
              backgroundColor: '#fffbeb',
              border: '2px solid #fbd38d',
              padding: '20px',
              borderRadius: '8px',
              margin: '20px 0'
            }}>
              <Heading style={{
                margin: '0 0 10px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: brandColors.warning
              }}>
                Importante
              </Heading>
              <Text style={{ margin: 0, color: brandColors.textPrimary }}>
                Este enlace expirará el <strong>{expiryDateFormatted}</strong>. 
                Por favor completa tu solicitud antes de esta fecha.
              </Text>
            </Section>

            <Heading style={{
              color: brandColors.textPrimary,
              fontSize: '20px',
              fontWeight: '600',
              marginTop: '30px',
              marginBottom: '16px'
            }}>
              Lo que necesitarás:
            </Heading>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '8px 0'
            }}>
              • Identificación válida (CURP mexicana o pasaporte)
            </Text>
            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '8px 0'
            }}>
              • Información laboral y comprobantes de ingresos
            </Text>
            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '8px 0'
            }}>
              • Información de contacto de referencias personales
            </Text>
            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '8px 0'
            }}>
              • Documentos adicionales (opcional)
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
                💡 <strong>Tip:</strong> El proceso de solicitud toma típicamente 15-20 minutos en completarse.
              </Text>
            </Section>
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

export default PolicyInvitationEmail;