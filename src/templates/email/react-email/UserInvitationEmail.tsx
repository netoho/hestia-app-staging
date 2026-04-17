import React from 'react';
import { Section, Text, Heading } from '@react-email/components';
import {
  EmailLayout,
  EmailHeader,
  EmailSection,
  EmailFooter,
  EmailButton,
  EmailInfoBox,
  EmailWarningBox,
  EmailParagraph,
} from '../components';
import { brandColors, brandInfo } from '@/lib/config/brand';
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

  return (
    <EmailLayout>
      <EmailHeader
        title={`Bienvenido a ${brandInfo.name}`}
        subtitle="Tu cuenta ha sido creada exitosamente"
      />
      <EmailSection greeting={`Hola${name ? ` ${name}` : ''},`}>
        <EmailParagraph>
          {inviterName ? (
            <>
              <strong>{inviterName}</strong> te ha invitado a formar parte del equipo de {brandInfo.name} como <strong>{roleDescription}</strong>.
            </>
          ) : (
            <>
              Has sido invitado a formar parte del equipo de {brandInfo.name} como <strong>{roleDescription}</strong>.
            </>
          )}
        </EmailParagraph>

        <EmailInfoBox icon="🔑">
          <strong>Tendrás acceso a:</strong>
          {permissions.map((permission, index) => (
            <React.Fragment key={index}>
              <br />
              • {permission}
            </React.Fragment>
          ))}
        </EmailInfoBox>

        <EmailParagraph>
          Para comenzar, necesitas configurar tu contraseña y completar tu perfil:
        </EmailParagraph>

        <EmailButton href={invitationUrl} variant="accent">
          🚀 Configurar Mi Cuenta
        </EmailButton>

        <Heading style={{
          color: brandColors.textPrimary,
          fontSize: '20px',
          fontWeight: 600,
          marginTop: '30px',
          marginBottom: '16px'
        }}>
          ¿Qué podrás hacer en tu primer acceso?
        </Heading>

        <Text style={{
          fontSize: '16px',
          lineHeight: 1.6,
          color: brandColors.textPrimary,
          margin: '8px 0'
        }}>
          • Establecer tu contraseña segura
        </Text>
        <Text style={{
          fontSize: '16px',
          lineHeight: 1.6,
          color: brandColors.textPrimary,
          margin: '8px 0'
        }}>
          • Subir tu foto de perfil
        </Text>
        <Text style={{
          fontSize: '16px',
          lineHeight: 1.6,
          color: brandColors.textPrimary,
          margin: '8px 0'
        }}>
          • Completar tu información de contacto
        </Text>
        <Text style={{
          fontSize: '16px',
          lineHeight: 1.6,
          color: brandColors.textPrimary,
          margin: '8px 0'
        }}>
          • Explorar las herramientas disponibles
        </Text>

        <EmailWarningBox title="Importante" tone="warning">
          Este enlace de invitación expirará el <strong>{expiryDateFormatted}</strong>.
          Asegúrate de configurar tu cuenta antes de esa fecha.
        </EmailWarningBox>

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
            fontWeight: 600
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

        <EmailParagraph size="small">
          Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos a {brandInfo.supportEmail} o llamarnos al {brandInfo.supportPhone}.
        </EmailParagraph>
      </EmailSection>
      <EmailFooter />
    </EmailLayout>
  );
};

export default UserInvitationEmail;
