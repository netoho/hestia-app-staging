import React from 'react';
import {
  EmailLayout,
  EmailHeader,
  EmailSection,
  EmailParagraph,
  EmailButton,
  EmailFooter,
} from '../components';
import { brandInfo } from '@/lib/config/brand';

export interface PolicyQuarterlyFollowupEmailProps {
  recipientName: string;
  policyNumber: string;
  isCompany: boolean;
  companyName?: string | null;
  mailtoUrl: string;
  whatsappUrl?: string | null;
}

export const PolicyQuarterlyFollowupEmail: React.FC<PolicyQuarterlyFollowupEmailProps> = ({
  recipientName,
  policyNumber,
  isCompany,
  companyName,
  mailtoUrl,
  whatsappUrl,
}) => {
  const greetingName =
    isCompany && companyName
      ? `${recipientName}, como representante legal de ${companyName}`
      : recipientName;

  return (
    <EmailLayout>
      <EmailHeader
        title="Seguimiento de tu protección"
        subtitle={`Protección #${policyNumber}`}
      />
      <EmailSection greeting={`Estimado/a ${greetingName},`}>
        <EmailParagraph>Espero que se encuentre muy bien.</EmailParagraph>
        <EmailParagraph>
          Nos ponemos en contacto con usted como parte de nuestro seguimiento periódico del
          servicio de protección jurídica que tiene contratado con nosotros.
        </EmailParagraph>
        <EmailParagraph>
          El objetivo de este mensaje es asegurarnos de que todo esté funcionando conforme a sus
          expectativas y recordarle que seguimos a su disposición para cualquier consulta, revisión
          o apoyo legal que pueda necesitar en este momento.
        </EmailParagraph>
        <EmailParagraph>
          Si ha habido algún cambio en su situación o requiere asesoramiento en algún tema en
          particular, no dude en hacérnoslo saber. Con gusto podemos agendar una llamada o reunión
          para atenderle de manera más personalizada.
        </EmailParagraph>
        <EmailParagraph>
          Agradecemos su confianza en nuestros servicios y reiteramos nuestro compromiso de
          brindarle respaldo oportuno y efectivo.
        </EmailParagraph>
        <EmailParagraph>Quedamos atentos a sus comentarios.</EmailParagraph>

        <EmailButton href={mailtoUrl} variant="accent">
          Enviar correo
        </EmailButton>
        {whatsappUrl ? (
          <EmailButton href={whatsappUrl} variant="whatsapp">
            Contactar por WhatsApp
          </EmailButton>
        ) : null}

        <EmailParagraph>
          Cordialmente,
          <br />
          <strong>{brandInfo.name}</strong>
          <br />
          <em>{brandInfo.tagline}</em>
          <br />
          {brandInfo.supportPhone}
          <br />
          {brandInfo.supportEmail}
        </EmailParagraph>
      </EmailSection>
      <EmailFooter />
    </EmailLayout>
  );
};

export default PolicyQuarterlyFollowupEmail;
