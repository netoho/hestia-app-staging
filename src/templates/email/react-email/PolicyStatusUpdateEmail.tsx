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
} from '@react-email/components';
import { PolicyStatusUpdateData } from '@/lib/services/emailService';

interface PolicyStatusUpdateEmailProps extends PolicyStatusUpdateData {}

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

export const PolicyStatusUpdateEmail: React.FC<PolicyStatusUpdateEmailProps> = ({
  tenantEmail,
  tenantName,
  status,
  reason,
  reviewerName,
}) => {
  const isApproved = status === 'approved';
  const statusText = isApproved ? 'Aprobada' : 'Rechazada';
  const headerColor = isApproved ? brandColors.success : brandColors.danger;

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
            background: `linear-gradient(135deg, ${headerColor} 0%, ${brandColors.secondary} 100%)`,
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
              Solicitud {statusText}
            </Heading>
            <Text style={{
              margin: '8px 0 0 0',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '16px',
              fontWeight: '400'
            }}>
              Resultado de la revisión
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
              Tu solicitud de póliza de garantía ha sido revisada por <strong>{reviewerName}</strong>.
            </Text>

            {/* Status Box */}
            <Section style={{
              backgroundColor: isApproved ? '#f0fff4' : '#fed7d7',
              border: `2px solid ${isApproved ? '#9ae6b4' : '#feb2b2'}`,
              padding: '20px',
              borderRadius: '8px',
              margin: '20px 0'
            }}>
              <Heading style={{
                margin: '0 0 10px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: isApproved ? brandColors.success : brandColors.danger
              }}>
                Estado: {statusText}
              </Heading>
              <Text style={{ margin: 0, color: brandColors.textPrimary }}>
                {reason ? (
                  <><strong>Motivo:</strong> {reason}</>
                ) : (
                  isApproved ? 
                    'Tu solicitud cumple con todos nuestros requisitos.' : 
                    'Tu solicitud no cumple con los requisitos necesarios en este momento.'
                )}
              </Text>
            </Section>

            {isApproved ? (
              <>
                <Heading style={{
                  color: brandColors.textPrimary,
                  fontSize: '20px',
                  fontWeight: '600',
                  marginTop: '30px',
                  marginBottom: '16px'
                }}>
                  🎉 ¡Felicidades!
                </Heading>

                <Text style={{
                  fontSize: '16px',
                  lineHeight: '1.6',
                  color: brandColors.textPrimary,
                  margin: '16px 0'
                }}>
                  Tu solicitud ha sido aprobada. Nuestro equipo se pondrá en contacto contigo en breve con las instrucciones para la activación de tu póliza.
                </Text>

                {/* Next Steps Box */}
                <Section style={{
                  backgroundColor: '#ebf8ff',
                  border: '2px solid #bee3f8',
                  padding: '20px',
                  borderRadius: '8px',
                  margin: '20px 0'
                }}>
                  <Heading style={{
                    margin: '0 0 10px 0',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: brandColors.textPrimary
                  }}>
                    Próximos Pasos
                  </Heading>
                  <Text style={{ margin: '8px 0', color: brandColors.textPrimary }}>
                    • Recibirás los documentos de la póliza por correo electrónico
                  </Text>
                  <Text style={{ margin: '8px 0', color: brandColors.textPrimary }}>
                    • Un representante te contactará para finalizar los detalles
                  </Text>
                  <Text style={{ margin: '8px 0', color: brandColors.textPrimary }}>
                    • Tu garantía estará activa una vez completado el proceso
                  </Text>
                </Section>
              </>
            ) : (
              <>
                <Heading style={{
                  color: brandColors.textPrimary,
                  fontSize: '20px',
                  fontWeight: '600',
                  marginTop: '30px',
                  marginBottom: '16px'
                }}>
                  ¿Qué puedes hacer?
                </Heading>

                <Text style={{
                  fontSize: '16px',
                  lineHeight: '1.6',
                  color: brandColors.textPrimary,
                  margin: '16px 0'
                }}>
                  Si crees que esta decisión fue tomada por error o te gustaría discutir tu solicitud, puedes contactar a nuestro equipo de soporte.
                </Text>

                {/* Options Box */}
                <Section style={{
                  backgroundColor: '#ebf8ff',
                  border: '2px solid #bee3f8',
                  padding: '20px',
                  borderRadius: '8px',
                  margin: '20px 0'
                }}>
                  <Heading style={{
                    margin: '0 0 10px 0',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: brandColors.textPrimary
                  }}>
                    Opciones Disponibles
                  </Heading>
                  <Text style={{ margin: '8px 0', color: brandColors.textPrimary }}>
                    • Contacta a nuestro equipo para aclarar dudas
                  </Text>
                  <Text style={{ margin: '8px 0', color: brandColors.textPrimary }}>
                    • Proporciona documentación adicional si es necesario
                  </Text>
                  <Text style={{ margin: '8px 0', color: brandColors.textPrimary }}>
                    • Presenta una nueva solicitud cuando sea apropiado
                  </Text>
                </Section>

                <Section style={{ textAlign: 'center', margin: '30px 0' }}>
                  <Button
                    href="mailto:soporte@hestiaplp.com.mx"
                    style={{
                      backgroundColor: brandColors.secondary,
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
                    Contactar Soporte
                  </Button>
                </Section>
              </>
            )}

            <Hr style={{ margin: '40px 0 20px 0', borderColor: '#f7fafc' }} />

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textSecondary,
              marginTop: '20px'
            }}>
              Agradecemos tu interés en Hestia. Estamos comprometidos en brindarte el mejor servicio para proteger tu tranquilidad en el alquiler.
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

export default PolicyStatusUpdateEmail;