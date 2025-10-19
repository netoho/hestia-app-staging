// Modern email templates using template literals (no React dependency)
// Safe to import anywhere without Next.js bundling issues

import { generatePolicyUrl } from '../utils/tokenUtils';
import type { PolicyInvitationData, PolicySubmissionData, PolicyStatusUpdateData } from '../services/emailService';

// Hestia brand colors
const BRAND_COLORS = {
  primary: '#1a365d',
  secondary: '#2b77e6',
  success: '#38a169',
  warning: '#d69e2e',
  danger: '#e53e3e',
  accent: '#f7fafc',
  textPrimary: '#2d3748',
  textSecondary: '#4a5568',
  textMuted: '#718096'
};

// Base email styles
const getBaseStyles = () => `
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    line-height: 1.6;
    color: ${BRAND_COLORS.textPrimary};
    margin: 0;
    padding: 0;
    background-color: #f8fafc;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
  }
  .header {
    padding: 40px 30px;
    text-align: center;
    border-radius: 12px 12px 0 0;
    background-image: linear-gradient(135deg, var(--header-color) 0%, ${BRAND_COLORS.secondary} 100%);
  }
  .header h1 {
    margin: 0;
    color: #ffffff;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.025em;
  }
  .header p {
    margin: 8px 0 0 0;
    color: rgba(255, 255, 255, 0.9);
    font-size: 16px;
    font-weight: 400;
  }
  .content {
    background-color: #ffffff;
    padding: 40px 30px;
    border: 1px solid #e2e8f0;
    border-top: none;
    border-radius: 0 0 12px 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
  .content h2 {
    color: ${BRAND_COLORS.textPrimary};
    margin-top: 0;
    font-size: 24px;
    font-weight: 600;
  }
  .content p {
    font-size: 16px;
    line-height: 1.6;
    color: ${BRAND_COLORS.textPrimary};
    margin: 16px 0;
  }
  .button {
    display: inline-block;
    padding: 14px 28px;
    background-color: ${BRAND_COLORS.primary};
    color: #ffffff !important;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    text-align: center;
    margin: 20px 0;
    border: none;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  .info-box {
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
    border: 2px solid;
  }
  .info-box.warning {
    background-color: #fffbeb;
    border-color: #fbd38d;
    color: ${BRAND_COLORS.textPrimary};
  }
  .info-box.success {
    background-color: #f0fff4;
    border-color: #9ae6b4;
    color: ${BRAND_COLORS.textPrimary};
  }
  .info-box.info {
    background-color: #ebf8ff;
    border-color: #bee3f8;
    color: ${BRAND_COLORS.textPrimary};
  }
  .info-box.danger {
    background-color: #fed7d7;
    border-color: #feb2b2;
    color: ${BRAND_COLORS.textPrimary};
  }
  .info-box h3 {
    margin: 0 0 10px 0;
    font-size: 18px;
    font-weight: 600;
  }
  .footer {
    margin-top: 40px;
    padding-top: 30px;
    border-top: 2px solid ${BRAND_COLORS.accent};
    text-align: center;
    font-size: 14px;
    color: ${BRAND_COLORS.textMuted};
  }
  .footer-logo {
    font-size: 18px;
    font-weight: 600;
    color: ${BRAND_COLORS.primary};
    margin-bottom: 10px;
  }
  ul, ol {
    padding-left: 20px;
    color: ${BRAND_COLORS.textPrimary};
  }
  li {
    margin-bottom: 8px;
  }
`;

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export function renderPolicyInvitationEmail(data: PolicyInvitationData): EmailContent {
  const policyUrl = generatePolicyUrl(data.accessToken, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  const expiryDate = new Date(data.expiryDate).toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const subject = 'Acción Requerida: Completa tu Solicitud de Protección Hestia';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Solicitud de Protección</title>
  <style>
    :root { --header-color: ${BRAND_COLORS.primary}; }
    ${getBaseStyles()}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Solicitud de Protección</h1>
      <p>Completa tu aplicación de garantía</p>
    </div>
    <div class="content">
      <h2>Hola${data.tenantName ? ` ${data.tenantName}` : ''},</h2>
      
      <p><strong>${data.initiatorName}</strong> ha iniciado una solicitud de protección de garantía para ti${data.propertyAddress ? ` para la propiedad ubicada en <strong>${data.propertyAddress}</strong>` : ''}.</p>
      
      <p>Para completar tu solicitud, haz clic en el botón de abajo y sigue el proceso paso a paso:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${policyUrl}" class="button">Completar Mi Solicitud</a>
      </div>
      
      <div class="info-box warning">
        <h3>Importante</h3>
        <p style="margin: 0;">Este enlace expirará el <strong>${expiryDate}</strong>. Por favor completa tu solicitud antes de esta fecha.</p>
      </div>
      
      <h3>Lo que necesitarás:</h3>
      <ul>
        <li>Identificación válida (CURP mexicana o pasaporte)</li>
        <li>Información laboral y comprobantes de ingresos</li>
        <li>Información de contacto de referencias personales</li>
        <li>Documentos adicionales (opcional)</li>
      </ul>
      
      <div class="info-box info">
        <p style="margin: 0;">💡 <strong>Tip:</strong> El proceso de solicitud toma típicamente 15-20 minutos en completarse.</p>
      </div>
    </div>
    
    <div class="footer">
      <div class="footer-logo">Hestia</div>
      <p style="margin: 5px 0;">Protegiendo tu tranquilidad en cada arrendamiento</p>
      <p style="margin: 15px 0 5px 0;">
        ¿Tienes preguntas? Contáctanos en 
        <a href="mailto:soporte@hestiaplp.com.mx" style="color: ${BRAND_COLORS.secondary}; text-decoration: none;">soporte@hestiaplp.com.mx</a>
      </p>
      <p style="margin: 5px 0 0 0; font-size: 12px;">© ${new Date().getFullYear()} Hestia PLP. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>`;

  const text = `
Hola${data.tenantName ? ` ${data.tenantName}` : ''},

${data.initiatorName} ha iniciado una solicitud de protección de garantía para ti${data.propertyAddress ? ` para la propiedad ubicada en ${data.propertyAddress}` : ''}.

Para completar tu solicitud, visita: ${policyUrl}

Importante: Este enlace expirará el ${expiryDate}.

Lo que necesitarás:
- Identificación válida (CURP mexicana o pasaporte)
- Información laboral y comprobantes de ingresos  
- Información de contacto de referencias personales
- Documentos adicionales (opcional)

El proceso de solicitud toma típicamente 15-20 minutos en completarse.

Si tienes alguna pregunta, contáctanos en soporte@hestiaplp.com.mx

© ${new Date().getFullYear()} Hestia PLP. Todos los derechos reservados.
  `.trim();

  return { subject, html, text };
}

export function renderPolicySubmissionEmail(data: PolicySubmissionData): EmailContent {
  const submittedDate = new Date(data.submittedAt).toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const subject = `Solicitud Recibida - Protección Hestia #${data.policyId}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Solicitud Recibida</title>
  <style>
    :root { --header-color: ${BRAND_COLORS.success}; }
    ${getBaseStyles()}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Solicitud Recibida</h1>
      <p>Tu aplicación está en proceso</p>
    </div>
    <div class="content">
      <h2>¡Gracias${data.tenantName ? `, ${data.tenantName}` : ''}!</h2>
      
      <p>Hemos recibido exitosamente tu solicitud de protección de garantía.</p>
      
      <div class="info-box success">
        <h3>Detalles de tu Solicitud</h3>
        <p style="margin: 0 0 10px 0;"><strong>ID de Solicitud:</strong> #${data.policyId}</p>
        <p style="margin: 0;"><strong>Enviada el:</strong> ${submittedDate}</p>
      </div>
      
      <h3>¿Qué sigue ahora?</h3>
      <ol>
        <li><strong>Revisión de documentos:</strong> Nuestro equipo revisará tu solicitud y documentos</li>
        <li><strong>Verificación de referencias:</strong> Podemos contactar a tus referencias para verificación</li>
        <li><strong>Decisión final:</strong> Recibirás un correo con nuestra decisión en 2-3 días hábiles</li>
      </ol>
      
      <div class="info-box info">
        <p style="margin: 0;">📧 Si necesitamos información adicional, te contactaremos a esta dirección de correo electrónico.</p>
      </div>
      
      <p style="margin-top: 30px;">Apreciamos tu confianza en Hestia para proteger tu tranquilidad en el arrendamiento.</p>
    </div>
    
    <div class="footer">
      <div class="footer-logo">Hestia</div>
      <p style="margin: 5px 0;">Protegiendo tu tranquilidad en cada arrendamiento</p>
      <p style="margin: 15px 0 5px 0;">
        ¿Tienes preguntas? Contáctanos en 
        <a href="mailto:soporte@hestiaplp.com.mx" style="color: ${BRAND_COLORS.secondary}; text-decoration: none;">soporte@hestiaplp.com.mx</a>
      </p>
      <p style="margin: 5px 0 0 0; font-size: 12px;">© ${new Date().getFullYear()} Hestia PLP. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>`;

  const text = `
¡Gracias${data.tenantName ? `, ${data.tenantName}` : ''}!

Hemos recibido exitosamente tu solicitud de protección de garantía.

ID de Solicitud: #${data.policyId}
Enviada el: ${submittedDate}

¿Qué sigue ahora?
1. Revisión de documentos: Nuestro equipo revisará tu solicitud y documentos
2. Verificación de referencias: Podemos contactar a tus referencias para verificación
3. Decisión final: Recibirás un correo con nuestra decisión en 2-3 días hábiles

Si necesitamos información adicional, te contactaremos a esta dirección de correo electrónico.

Apreciamos tu confianza en Hestia para proteger tu tranquilidad en el arrendamiento.

¿Preguntas? Contáctanos en soporte@hestiaplp.com.mx

© ${new Date().getFullYear()} Hestia PLP. Todos los derechos reservados.
  `.trim();

  return { subject, html, text };
}

export function renderPolicyStatusUpdateEmail(data: PolicyStatusUpdateData): EmailContent {
  const isApproved = data.status === 'approved';
  const statusText = isApproved ? 'Aprobada' : 'Rechazada';
  const headerColor = isApproved ? BRAND_COLORS.success : BRAND_COLORS.danger;

  const subject = `Solicitud de Protección ${statusText} - Hestia`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Solicitud ${statusText}</title>
  <style>
    :root { --header-color: ${headerColor}; }
    ${getBaseStyles()}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Solicitud ${statusText}</h1>
      <p>Resultado de la revisión</p>
    </div>
    <div class="content">
      <h2>Hola${data.tenantName ? ` ${data.tenantName}` : ''},</h2>
      
      <p>Tu solicitud de protección de garantía ha sido revisada por <strong>${data.reviewerName}</strong>.</p>
      
      <div class="info-box ${isApproved ? 'success' : 'danger'}">
        <h3>Estado: ${statusText}</h3>
        ${data.reason ? `<p style="margin: 0;"><strong>Motivo:</strong> ${data.reason}</p>` : 
          `<p style="margin: 0;">${isApproved ? 
            'Tu solicitud cumple con todos nuestros requisitos.' : 
            'Tu solicitud no cumple con los requisitos necesarios en este momento.'}</p>`}
      </div>
      
      ${isApproved ? `
        <h3>🎉 ¡Felicidades!</h3>
        <p>Tu solicitud ha sido aprobada. Nuestro equipo se pondrá en contacto contigo en breve con las instrucciones para la activación de tu protección.</p>
        
        <div class="info-box info">
          <h3>Próximos Pasos</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Recibirás los documentos de la protección por correo electrónico</li>
            <li>Un representante te contactará para finalizar los detalles</li>
            <li>Tu garantía estará activa una vez completado el proceso</li>
          </ul>
        </div>
      ` : `
        <h3>¿Qué puedes hacer?</h3>
        <p>Si crees que esta decisión fue tomada por error o te gustaría discutir tu solicitud, puedes contactar a nuestro equipo de soporte.</p>
        
        <div class="info-box info">
          <h3>Opciones Disponibles</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Contacta a nuestro equipo para aclarar dudas</li>
            <li>Proporciona documentación adicional si es necesario</li>
            <li>Presenta una nueva solicitud cuando sea apropiado</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="mailto:soporte@hestiaplp.com.mx" class="button" style="background-color: ${BRAND_COLORS.secondary};">Contactar Soporte</a>
        </div>
      `}
      
      <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid ${BRAND_COLORS.accent}; color: ${BRAND_COLORS.textSecondary};">
        Agradecemos tu interés en Hestia. Estamos comprometidos en brindarte el mejor servicio para proteger tu tranquilidad en el arrendamiento.
      </p>
    </div>
    
    <div class="footer">
      <div class="footer-logo">Hestia</div>
      <p style="margin: 5px 0;">Protegiendo tu tranquilidad en cada arrendamiento</p>
      <p style="margin: 15px 0 5px 0;">
        ¿Tienes preguntas? Contáctanos en 
        <a href="mailto:soporte@hestiaplp.com.mx" style="color: ${BRAND_COLORS.secondary}; text-decoration: none;">soporte@hestiaplp.com.mx</a>
      </p>
      <p style="margin: 5px 0 0 0; font-size: 12px;">© ${new Date().getFullYear()} Hestia PLP. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>`;

  const text = `
Hola${data.tenantName ? ` ${data.tenantName}` : ''},

Tu solicitud de protección de garantía ha sido revisada por ${data.reviewerName}.

Estado: ${statusText}
${data.reason ? `Motivo: ${data.reason}` : ''}

${isApproved ? 
  `¡Felicidades! Tu solicitud ha sido aprobada. Nuestro equipo se pondrá en contacto contigo en breve con las instrucciones para la activación de tu protección.

Próximos Pasos:
- Recibirás los documentos de la protección por correo electrónico
- Un representante te contactará para finalizar los detalles
- Tu garantía estará activa una vez completado el proceso` :
  `Si crees que esta decisión fue tomada por error o te gustaría discutir tu solicitud, puedes contactar a nuestro equipo de soporte.

Opciones Disponibles:
- Contacta a nuestro equipo para aclarar dudas
- Proporciona documentación adicional si es necesario
- Presenta una nueva solicitud cuando sea apropiado

Contacta soporte: soporte@hestiaplp.com.mx`
}

Agradecemos tu interés en Hestia. Estamos comprometidos en brindarte el mejor servicio para proteger tu tranquilidad en el arrendamiento.

© ${new Date().getFullYear()} Hestia PLP. Todos los derechos reservados.
  `.trim();

  return { subject, html, text };
}
