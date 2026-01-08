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
import { PolicyStatusUpdateData } from '@/lib/services/emailService';
import {brandColors, brandInfo, brandUrls} from '@/lib/config/brand';

interface PolicyStatusUpdateEmailProps extends PolicyStatusUpdateData {}

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
            background: `linear-gradient(135deg, ${headerColor} 0%, ${brandColors.email.headerGradientEnd} 100%)`,
            padding: '30px',
            textAlign: 'center',
            borderRadius: '12px 12px 0 0',
          }}>
              <img
                  src={`${brandUrls.production}/images/logo-hestia-azul-top.png`}
                  alt={brandInfo.name}
                  width="150"
                  height="50"
                  style={{ margin: '0 auto' }}
              />
            <Heading style={{
              margin: 0,
              color: brandColors.textPrimary,
              fontSize: '28px',
              fontWeight: '700',
              letterSpacing: '-0.025em'
            }}>
              Solicitud {statusText}
            </Heading>
            <Text style={{
              margin: '8px 0 0 0',
              color: brandColors.textSecondary,
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
              Tu solicitud de protección de garantía ha sido revisada por <strong>{reviewerName}</strong>.
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
                  Tu solicitud ha sido aprobada. Nuestro equipo se pondrá en contacto contigo en breve con las instrucciones para la activación de tu protección.
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
                    • Recibirás los documentos de la protección por correo electrónico
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
              Agradecemos tu interés en Hestia. Estamos comprometidos en brindarte el mejor servicio para proteger tu tranquilidad en el arrendamiento.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={{
            marginTop: '40px',
            paddingTop: '30px',
            borderTop: `2px solid ${brandColors.border}`,
          }}>
            <table style={{ width: '100%' }}>
              <body>
                <tr>
                  <td style={{ textAlign: 'center', paddingBottom: '20px' }}>
                    <Img
                      src={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/images/logo-hestia-azul-top.png`}
                      alt="Hestia Logo"
                      width="140"
                      height="40"
                      style={{ margin: '0 auto', display: 'block' }}
                    />
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center', paddingBottom: '15px' }}>
                    <Text style={{
                      margin: '0',
                      fontSize: '14px',
                      color: brandColors.textMuted,
                      fontStyle: 'italic'
                    }}>
                      {brandInfo.tagline}
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center', paddingBottom: '20px' }}>
                    <table style={{ margin: '0 auto' }}>
                      <tr>
                        <td style={{ padding: '0 15px' }}>
                          <Text style={{ margin: 0, fontSize: '13px', color: brandColors.textMuted }}>
                            📧 {brandInfo.supportEmail}
                          </Text>
                        </td>
                        <td style={{ padding: '0 15px', borderLeft: `1px solid ${brandColors.border}` }}>
                          <Text style={{ margin: 0, fontSize: '13px', color: brandColors.textMuted }}>
                            📱 {brandInfo.supportPhone}
                          </Text>
                        </td>
                        <td style={{ padding: '0 15px', borderLeft: `1px solid ${brandColors.border}` }}>
                          <Text style={{ margin: 0, fontSize: '13px', color: brandColors.textMuted }}>
                            📍 {brandInfo.location}
                          </Text>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center', paddingTop: '15px', borderTop: `1px solid ${brandColors.border}` }}>
                    <Text style={{
                      margin: '10px 0 0 0',
                      fontSize: '12px',
                      color: brandColors.textMuted
                    }}>
                      © {new Date().getFullYear()} {brandInfo.companyLegalName}
                    </Text>
                    <Text style={{
                      margin: '5px 0 0 0',
                      fontSize: '11px',
                      color: brandColors.textMuted
                    }}>
                      Todos los derechos reservados | <a href={`${process.env.NEXT_PUBLIC_APP_URL}/privacy`} style={{ color: brandColors.secondary, textDecoration: 'none' }}>Aviso de Privacidad</a> | <a href={`${process.env.NEXT_PUBLIC_APP_URL}/terms`} style={{ color: brandColors.secondary, textDecoration: 'none' }}>Términos y Condiciones</a>
                    </Text>
                  </td>
                </tr>
              </body>
            </table>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default PolicyStatusUpdateEmail;
