import React from 'react';
import {
  EmailLayout,
  EmailHeader,
  EmailSection,
  EmailFooter,
  EmailButton,
  EmailWarningBox,
  EmailParagraph,
} from '../components';

export interface ReceiptMagicLinkEmailProps {
  tenantName: string;
  email: string;
  portalUrl: string;
}

export const ReceiptMagicLinkEmail: React.FC<ReceiptMagicLinkEmailProps> = ({
  tenantName,
  portalUrl,
}) => {
  return (
    <EmailLayout>
      <EmailHeader
        title="Accede a tu Portal"
        subtitle="Portal de Comprobantes de Pago"
      />
      <EmailSection greeting={`Hola ${tenantName},`}>
        <EmailParagraph>
          Haz clic en el siguiente botón para acceder a tu portal de comprobantes donde podrás subir y consultar tus recibos de pago.
        </EmailParagraph>

        <EmailButton href={portalUrl} variant="accent">
          Acceder al Portal
        </EmailButton>

        <EmailWarningBox tone="warning">
          Este enlace es personal y de un solo uso. No lo compartas con nadie.
        </EmailWarningBox>

        <EmailParagraph size="small">
          Si no solicitaste este enlace, puedes ignorar este correo.
        </EmailParagraph>
      </EmailSection>
      <EmailFooter />
    </EmailLayout>
  );
};

export default ReceiptMagicLinkEmail;
