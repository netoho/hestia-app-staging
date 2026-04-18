import React from 'react';
import { Section, Text, Heading, Hr } from '@react-email/components';
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
import { PolicyStatusUpdateData } from '@/lib/services/emailService';
import { brandColors } from '@/lib/config/brand';

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

  return (
    <EmailLayout>
      <EmailHeader
        title={`Solicitud ${statusText}`}
        subtitle="Resultado de la revisión"
      />
      <EmailSection greeting={`Hola${tenantName ? ` ${tenantName}` : ''},`}>
        <EmailParagraph>
          Tu solicitud de protección de garantía ha sido revisada por <strong>{reviewerName}</strong>.
        </EmailParagraph>

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
            fontWeight: 600,
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
              fontWeight: 600,
              marginTop: '30px',
              marginBottom: '16px'
            }}>
              🎉 ¡Felicidades!
            </Heading>

            <EmailParagraph>
              Tu solicitud ha sido aprobada. Nuestro equipo se pondrá en contacto contigo en breve con las instrucciones para la activación de tu protección.
            </EmailParagraph>

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
                fontWeight: 600,
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
              fontWeight: 600,
              marginTop: '30px',
              marginBottom: '16px'
            }}>
              ¿Qué puedes hacer?
            </Heading>

            <EmailParagraph>
              Si crees que esta decisión fue tomada por error o te gustaría discutir tu solicitud, puedes contactar a nuestro equipo de soporte.
            </EmailParagraph>

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
                fontWeight: 600,
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

            <EmailButton href="mailto:soporte@hestiaplp.com.mx" variant="accent">
              Contactar Soporte
            </EmailButton>
          </>
        )}

        <Hr style={{ margin: '40px 0 20px 0', borderColor: '#f7fafc' }} />

        <EmailParagraph>
          Agradecemos tu interés en Hestia. Estamos comprometidos en brindarte el mejor servicio para proteger tu tranquilidad en el arrendamiento.
        </EmailParagraph>
      </EmailSection>
      <EmailFooter />
    </EmailLayout>
  );
};

export default PolicyStatusUpdateEmail;
