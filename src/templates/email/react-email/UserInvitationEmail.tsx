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
} from '@react-email/components';
import { brandColors, brandInfo, brandUrls } from '@/lib/config/brand';
import { formatDateLong } from '@/lib/utils/formatting';

export interface UserInvitationEmailProps {
  email: string;
  name?: string;
  role: 'ADMIN' | 'STAFF' | 'BROKER';
  invitationUrl: string;
  expiryDate: Date;
  inviterName?: string;
}

const roleDescriptions = {
  ADMIN: 'Administrador del Sistema',
  STAFF: 'Personal de Operaciones',
  BROKER: 'Corredor de Seguros',
};

const rolePermissions = {
  ADMIN: [
    'Gestión completa de usuarios y roles',
    'Acceso total a todas las protecciones',
    // 'Configuración del sistema',
    // 'Reportes y análisis avanzados',
  ],
  STAFF: [
    'Gestión de protecciones',
    'Revisión de documentación',
    // 'Comunicación con clientes',
    'Seguimiento de procesos',
  ],
  BROKER: [
    'Creación de nuevas protecciones',
    'Gestión de clientes propios',
    // 'Seguimiento de comisiones',
    // 'Acceso a herramientas de venta',
  ],
};

export const UserInvitationEmail: React.FC<UserInvitationEmailProps> = ({
  email,
  name,
  role,
  invitationUrl,
  expiryDate,
  inviterName,
}) => {
  const roleDescription = roleDescriptions[role];
  const permissions = rolePermissions[role];

  const expiryDateFormatted = formatDateLong(expiryDate);

  const privacyUrl = `${process.env.NEXT_PUBLIC_APP_URL}${brandUrls.legal.privacy}`;
  const termsUrl = `${process.env.NEXT_PUBLIC_APP_URL}${brandUrls.legal.terms}`;

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
            background: `linear-gradient(135deg, ${brandColors.email.headerGradientStart} 0%, ${brandColors.email.headerGradientEnd} 100%)`,
            padding: '30px',
            textAlign: 'center',
            borderRadius: '12px 12px 0 0',
          }}>
            <img
              src={`${brandUrls.production}/images/logo-hestia-azul-top.png`}
              alt={brandInfo.name}
              width="150"
              style={{ margin: '0 auto' }}
            />
            <Heading style={{
              margin: 0,
              color: brandColors.textPrimary,
              fontSize: '28px',
              fontWeight: '700',
              letterSpacing: '-0.025em'
            }}>
              Bienvenido a {brandInfo.name}
            </Heading>
            <Text style={{
              margin: '8px 0 0 0',
              color: brandColors.textSecondary,
              fontSize: '16px',
              fontWeight: '400'
            }}>
              Tu cuenta ha sido creada exitosamente
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
              Hola{name ? ` ${name}` : ''},
            </Heading>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '16px 0'
            }}>
              {inviterName ? (
                <>
                  <strong>{inviterName}</strong> te ha invitado a formar parte del equipo de {brandInfo.name} como <strong>{roleDescription}</strong>.
                </>
              ) : (
                <>
                  Has sido invitado a formar parte del equipo de {brandInfo.name} como <strong>{roleDescription}</strong>.
                </>
              )}
            </Text>

            {/* Role Info Box */}
            <Section style={{
              backgroundColor: brandColors.email.infoBackground,
              border: `2px solid ${brandColors.email.infoBorder}`,
              padding: '20px',
              borderRadius: '8px',
              margin: '20px 0'
            }}>
              <Text style={{
                margin: '0 0 10px 0',
                fontSize: '14px',
                color: brandColors.textPrimary,
                fontWeight: '600'
              }}>
                Tendrás acceso a:
              </Text>
              {permissions.map((permission, index) => (
                <Text key={index} style={{
                  margin: '4px 0',
                  fontSize: '14px',
                  color: brandColors.textSecondary
                }}>
                  • {permission}
                </Text>
              ))}
            </Section>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '16px 0'
            }}>
              Para comenzar, necesitas configurar tu contraseña y completar tu perfil:
            </Text>

            <Section style={{ textAlign: 'center', margin: '30px 0' }}>
              <Button
                href={invitationUrl}
                style={{
                  backgroundColor: brandColors.accent,
                  color: brandColors.white,
                  padding: '16px 32px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '16px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)',
                  display: 'inline-block'
                }}
              >
                🚀 Configurar Mi Cuenta
              </Button>
            </Section>

            <Heading style={{
              color: brandColors.textPrimary,
              fontSize: '20px',
              fontWeight: '600',
              marginTop: '30px',
              marginBottom: '16px'
            }}>
              ¿Qué podrás hacer en tu primer acceso?
            </Heading>

            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '8px 0'
            }}>
              • Establecer tu contraseña segura
            </Text>
            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '8px 0'
            }}>
              • Subir tu foto de perfil
            </Text>
            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '8px 0'
            }}>
              • Completar tu información de contacto
            </Text>
            <Text style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: brandColors.textPrimary,
              margin: '8px 0'
            }}>
              • Explorar las herramientas disponibles
            </Text>

            {/* Warning Box */}
            <Section style={{
              backgroundColor: brandColors.email.warningBackground,
              border: `2px solid ${brandColors.email.warningBorder}`,
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
                ⚠️ Importante
              </Heading>
              <Text style={{ margin: 0, color: brandColors.textPrimary }}>
                Este enlace de invitación expirará el <strong>{expiryDateFormatted}</strong>.
                Asegúrate de configurar tu cuenta antes de esa fecha.
              </Text>
            </Section>

            {/* Credentials Info */}
            <Section style={{
              backgroundColor: '#f8f9fa',
              padding: '20px',
              borderRadius: '8px',
              margin: '20px 0'
            }}>
              <Text style={{
                margin: '0 0 10px 0',
                fontSize: '14px',
                color: brandColors.textPrimary,
                fontWeight: '600'
              }}>
                Tus credenciales de acceso:
              </Text>
              <Text style={{ margin: '4px 0', fontSize: '14px', color: brandColors.textSecondary }}>
                <strong>Email:</strong> {email}
              </Text>
              <Text style={{ margin: '4px 0', fontSize: '14px', color: brandColors.textSecondary }}>
                <strong>Contraseña:</strong> La establecerás en tu primer acceso
              </Text>
            </Section>

            {/* Help Section */}
            <Text style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: brandColors.textSecondary,
              margin: '20px 0 0 0',
              fontStyle: 'italic'
            }}>
              Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos a {brandInfo.supportEmail} o llamarnos al {brandInfo.supportPhone}.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={{
            marginTop: '40px',
            paddingTop: '30px',
            borderTop: `2px solid ${brandColors.border}`,
          }}>
            <table style={{ width: '100%' }}>
              <tr>
                <td style={{ textAlign: 'center', paddingBottom: '20px' }}>
                  <img
                    src={`${brandUrls.production}/images/logo-hestia-azul-top.png`}
                    alt={brandInfo.name}
                    width="150"
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
                          📧 {brandInfo.infoEmail}
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
                    Todos los derechos reservados | <a href={privacyUrl} style={{ color: brandColors.secondary, textDecoration: 'none' }}>Aviso de Privacidad</a> | <a href={termsUrl} style={{ color: brandColors.secondary, textDecoration: 'none' }}>Términos y Condiciones</a>
                  </Text>
                </td>
              </tr>
            </table>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default UserInvitationEmail;
