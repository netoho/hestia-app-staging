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
import { brandColors, brandInfo, brandUrls } from '@/lib/config/brand';

export interface PasswordResetEmailProps {
  email: string;
  name?: string;
  resetUrl: string;
  expiryTime: string; // e.g., "1 hora"
}

export const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({
  email,
  name,
  resetUrl,
  expiryTime,
}) => {
  const privacyUrl = `${process.env.NEXT_PUBLIC_APP_URL}${brandUrls.legal.privacy}`;
  const termsUrl = `${process.env.NEXT_PUBLIC_APP_URL}${brandUrls.legal.terms}`;
  const supportEmail = brandInfo.support.email;

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
              Restablecer Contraseña
            </Heading>
          </Section>

          {/* Main Content */}
          <Section style={{
            backgroundColor: brandColors.email.contentBackground,
            padding: '30px',
            borderRadius: '0 0 12px 12px'
          }}>
            <Text style={{
              color: brandColors.textSecondary,
              fontSize: '16px',
              lineHeight: '24px',
              margin: '0 0 20px'
            }}>
              Hola {name || 'usuario'},
            </Text>

            <Text style={{
              color: brandColors.textPrimary,
              fontSize: '16px',
              lineHeight: '24px',
              margin: '0 0 20px'
            }}>
              Recibimos una solicitud para restablecer la contraseña de tu cuenta en {brandInfo.name}
              asociada con el correo electrónico <strong>{email}</strong>.
            </Text>

            <Text style={{
              color: brandColors.textPrimary,
              fontSize: '16px',
              lineHeight: '24px',
              margin: '0 0 30px'
            }}>
              Si realizaste esta solicitud, haz clic en el botón de abajo para crear una nueva contraseña:
            </Text>

            {/* CTA Button */}
            <div style={{ textAlign: 'center', margin: '30px 0' }}>
              <Button
                href={resetUrl}
                style={{
                  backgroundColor: brandColors.email.ctaBackground,
                  color: brandColors.email.ctaText,
                  padding: '14px 28px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  display: 'inline-block'
                }}
              >
                Restablecer Contraseña
              </Button>
            </div>

            {/* Warning Box */}
            <Section style={{
              backgroundColor: brandColors.email.warningBackground,
              border: `1px solid ${brandColors.email.warningBorder}`,
              borderRadius: '8px',
              padding: '16px',
              margin: '24px 0'
            }}>
              <Text style={{
                color: brandColors.email.warningText,
                fontSize: '14px',
                lineHeight: '20px',
                margin: '0 0 10px',
                fontWeight: '600'
              }}>
                ⚠️ Información importante:
              </Text>
              <Text style={{
                color: brandColors.email.warningText,
                fontSize: '14px',
                lineHeight: '20px',
                margin: '0'
              }}>
                • Este enlace expirará en <strong>{expiryTime}</strong>
                <br />
                • Por seguridad, no compartas este enlace con nadie
                <br />
                • Si no solicitaste restablecer tu contraseña, ignora este correo
              </Text>
            </Section>

            <Hr style={{
              borderColor: brandColors.email.divider,
              margin: '30px 0'
            }} />

            {/* Alternative Link */}
            <Text style={{
              color: brandColors.textSecondary,
              fontSize: '14px',
              lineHeight: '20px',
              margin: '0 0 10px'
            }}>
              Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:
            </Text>
            <Text style={{
              color: brandColors.primary,
              fontSize: '14px',
              lineHeight: '20px',
              wordBreak: 'break-all',
              margin: '0 0 20px'
            }}>
              {resetUrl}
            </Text>

            <Hr style={{
              borderColor: brandColors.email.divider,
              margin: '30px 0'
            }} />

            {/* Security Notice */}
            <Section style={{
              backgroundColor: brandColors.email.infoBackground,
              border: `1px solid ${brandColors.email.infoBorder}`,
              borderRadius: '8px',
              padding: '16px',
              margin: '24px 0'
            }}>
              <Text style={{
                color: brandColors.email.infoText,
                fontSize: '14px',
                lineHeight: '20px',
                margin: '0'
              }}>
                <strong>🔒 Nota de seguridad:</strong> Si no solicitaste restablecer tu contraseña,
                es posible que alguien esté intentando acceder a tu cuenta. Por favor, asegúrate de
                que tu cuenta esté segura y contacta a nuestro equipo de soporte si tienes alguna preocupación.
              </Text>
            </Section>

            {/* Support */}
            <Text style={{
              color: brandColors.textSecondary,
              fontSize: '14px',
              lineHeight: '20px',
              margin: '20px 0 0'
            }}>
              ¿Necesitas ayuda? Contáctanos en{' '}
              <a
                href={`mailto:${supportEmail}`}
                style={{ color: brandColors.primary, textDecoration: 'none' }}
              >
                {supportEmail}
              </a>
            </Text>
          </Section>

          {/* Footer */}
          <Section style={{
            textAlign: 'center',
            padding: '24px 0',
          }}>
            <Text style={{
              color: brandColors.email.footerText,
              fontSize: '12px',
              lineHeight: '18px',
              margin: '0 0 8px'
            }}>
              © {new Date().getFullYear()} {brandInfo.legalEntity}
              <br />
              Todos los derechos reservados
            </Text>

            <Text style={{
              color: brandColors.email.footerText,
              fontSize: '12px',
              lineHeight: '18px',
              margin: '0'
            }}>
              <a href={privacyUrl} style={{ color: brandColors.email.footerLink, textDecoration: 'none' }}>
                Política de Privacidad
              </a>
              {' | '}
              <a href={termsUrl} style={{ color: brandColors.email.footerLink, textDecoration: 'none' }}>
                Términos de Servicio
              </a>
            </Text>

            {/* Office Address */}
            <Text style={{
              color: brandColors.email.footerText,
              fontSize: '11px',
              lineHeight: '16px',
              margin: '16px 0 0',
              opacity: 0.8
            }}>
              {brandInfo.address}
              <br />
              Tel: {brandInfo.support.phone}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Default export for React Email preview
export default PasswordResetEmail;