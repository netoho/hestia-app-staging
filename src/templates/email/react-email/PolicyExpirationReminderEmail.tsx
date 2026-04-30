import React from 'react';
import { Heading } from '@react-email/components';
import {
  EmailLayout,
  EmailHeader,
  EmailSection,
  EmailParagraph,
  EmailButton,
  EmailInfoBox,
  EmailWarningBox,
  EmailFooter,
} from '../components';
import { brandColors, brandInfo } from '@/lib/config/brand';
import { formatDateLong } from '@/lib/utils/formatting';

export type ExpirationTier = 60 | 45 | 30 | 14 | 1;

export interface PolicyExpirationReminderEmailProps {
  recipientName: string;
  policyNumber: string;
  propertyAddress: string;
  expiresAt: Date | string;
  tier: ExpirationTier;
  policyUrl: string;
  whatsappUrl?: string | null;
  mailtoUrl: string;
}

interface TierCopy {
  headerTitle: string;
  headerSubtitle: string;
  greeting: string;
  intro: string;
  ctaLabel: string;
  note?: string;
  urgent: boolean;
}

const copyByTier: Record<ExpirationTier, TierCopy> = {
  60: {
    headerTitle: 'Tu protección vence en 2 meses',
    headerSubtitle: 'Tiempo suficiente para planear la renovación',
    greeting: 'Hola',
    intro:
      'Te escribimos con anticipación para recordarte que tu protección se acerca a su fecha de vencimiento. Tienes poco más de dos meses para decidir si deseas renovar el servicio.',
    ctaLabel: 'Ver mi protección',
    note:
      'Renovar con tiempo asegura que no quede ningún periodo sin cobertura y te da margen para revisar cambios en el contrato de arrendamiento.',
    urgent: false,
  },
  45: {
    headerTitle: 'Tu protección vence en 1 mes y 2 semanas',
    headerSubtitle: 'Es buen momento para decidir la renovación',
    greeting: 'Hola',
    intro:
      'Queremos asegurarnos de que tengas toda la información necesaria para decidir si renuevas la protección. Si necesitas ajustar condiciones, este es el momento ideal.',
    ctaLabel: 'Revisar mi protección',
    urgent: false,
  },
  30: {
    headerTitle: 'Tu protección vence en 1 mes',
    headerSubtitle: 'Confirma la renovación para evitar interrupciones',
    greeting: 'Hola',
    intro:
      'Falta un mes para que termine la vigencia de tu protección. Te recomendamos iniciar el proceso de renovación en los próximos días para no dejar la propiedad sin cobertura.',
    ctaLabel: 'Iniciar renovación',
    urgent: false,
  },
  14: {
    headerTitle: 'Tu protección vence en 2 semanas',
    headerSubtitle: 'Último tramo para confirmar la renovación',
    greeting: 'Hola',
    intro:
      'Quedan dos semanas de vigencia. Si planeas continuar protegiendo tu propiedad con nosotros, agradecemos confirmar la renovación cuanto antes.',
    ctaLabel: 'Confirmar renovación',
    urgent: false,
  },
  1: {
    headerTitle: '¡Tu protección vence mañana!',
    headerSubtitle: 'Acción requerida para mantener la cobertura',
    greeting: 'Atención',
    intro:
      'Tu protección vence mañana. Si aún no has iniciado la renovación, por favor contáctanos hoy mismo para evitar que la propiedad quede sin cobertura.',
    ctaLabel: 'Renovar ahora',
    urgent: true,
  },
};

export const PolicyExpirationReminderEmail: React.FC<PolicyExpirationReminderEmailProps> = ({
  recipientName,
  policyNumber,
  propertyAddress,
  expiresAt,
  tier,
  policyUrl,
  whatsappUrl,
  mailtoUrl,
}) => {
  const copy = copyByTier[tier];
  const expiresFormatted = formatDateLong(expiresAt);

  return (
    <EmailLayout>
      <EmailHeader title={copy.headerTitle} subtitle={copy.headerSubtitle} />
      <EmailSection greeting={`${copy.greeting}${recipientName ? ` ${recipientName}` : ''},`}>
        <EmailParagraph>{copy.intro}</EmailParagraph>

        <EmailParagraph>
          <strong>Protección:</strong> #{policyNumber}
          <br />
          <strong>Propiedad:</strong> {propertyAddress}
          <br />
          <strong>Vence el:</strong> {expiresFormatted}
        </EmailParagraph>

        {copy.urgent ? (
          <EmailWarningBox tone="danger" title="Acción inmediata">
            Contáctanos hoy para iniciar la renovación y evitar cualquier interrupción en la
            cobertura.
          </EmailWarningBox>
        ) : copy.note ? (
          <EmailInfoBox>{copy.note}</EmailInfoBox>
        ) : null}

        <EmailButton href={policyUrl} variant={copy.urgent ? 'danger' : 'primary'}>
          {copy.ctaLabel}
        </EmailButton>

        <Heading
          style={{
            color: brandColors.textPrimary,
            fontSize: '18px',
            fontWeight: 600,
            margin: '24px 0 12px 0',
          }}
        >
          ¿Prefieres hablar con nosotros?
        </Heading>
        <EmailParagraph>
          Nuestro equipo está disponible para resolver cualquier duda sobre la renovación.
        </EmailParagraph>
        <EmailButton href={mailtoUrl} variant="accent">
          Enviar correo
        </EmailButton>
        {whatsappUrl ? (
          <EmailButton href={whatsappUrl} variant="whatsapp">
            Contactar por WhatsApp
          </EmailButton>
        ) : null}

        <EmailParagraph size="small">
          Si ya iniciaste la renovación con nosotros, puedes ignorar este recordatorio.
        </EmailParagraph>
      </EmailSection>
      <EmailFooter />
    </EmailLayout>
  );
};

export default PolicyExpirationReminderEmail;
