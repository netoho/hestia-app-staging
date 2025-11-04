import { Resend } from 'resend';
import Mailgun from 'mailgun.js';
import nodemailer from 'nodemailer';
import { generatePolicyUrl } from '../utils/tokenUtils';

// Email provider configuration
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'resend'; // 'resend', 'mailgun', or 'smtp'
const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const COMPANY_NAME = 'Hestia';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'soporte@hestiaplp.com.mx';

// Email provider clients (initialized lazily)
let resendClient: Resend | null = null;
let mailgunClient: any = null;
let smtpTransporter: any = null;

// Email provider interface
interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Email provider abstraction
class EmailProvider {
  static async sendEmail(data: EmailData): Promise<boolean> {
    try {
      switch (EMAIL_PROVIDER) {
        case 'mailgun':
          return await this.sendWithMailgun(data);
        case 'smtp':
          return await this.sendWithSMTP(data);
        case 'resend':
        default:
          return await this.sendWithResend(data);
      }
    } catch (error) {
      console.error(`Failed to send email via ${EMAIL_PROVIDER}:`, error);
      return false;
    }
  }

  private static async sendWithResend(data: EmailData): Promise<boolean> {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return false;
    }

    // Initialize Resend client lazily
    if (!resendClient) {
      resendClient = new Resend(process.env.RESEND_API_KEY);
    }

    const result = await resendClient.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: data.subject,
      html: data.html,
      text: data.text
    });

    return true;
  }

  private static async sendWithMailgun(data: EmailData): Promise<boolean> {
    if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
      console.error('MAILGUN_API_KEY or MAILGUN_DOMAIN not configured');
      return false;
    }

    // Initialize Mailgun client lazily
    if (!mailgunClient) {
      const mailgun = new Mailgun(require('form-data'));
      mailgunClient = mailgun.client({
        username: 'api',
        key: process.env.MAILGUN_API_KEY,
      });
    }

    const result = await mailgunClient.messages.create(process.env.MAILGUN_DOMAIN, {
      from: FROM_EMAIL,
      to: data.to,
      subject: data.subject,
      html: data.html,
      text: data.text
    });

    return true;
  }

  private static async sendWithSMTP(data: EmailData): Promise<boolean> {
    const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.error(`SMTP configuration missing: ${missingVars.join(', ')}`);
      return false;
    }

    // Initialize SMTP transporter lazily
    if (!smtpTransporter) {
      smtpTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        // Additional HostGator-specific settings
        tls: {
          rejectUnauthorized: false // May be needed for some shared hosting providers
        }
      });
    }

    const mailOptions = {
      from: FROM_EMAIL,
      to: 'ehuerta@iadgroup.mx',
      subject: data.subject,
      html: data.html,
      text: data.text
    };

    // console.log('Sending email via SMTP to:', mailOptions);

    const result = await smtpTransporter.sendMail(mailOptions);
    return true;
  }
}

// Type definitions
export interface PolicyInvitationData {
  tenantEmail: string;
  tenantName?: string;
  propertyAddress?: string;
  accessToken: string;
  expiryDate: Date;
  initiatorName: string;
}

export interface PolicySubmissionData {
  tenantEmail: string;
  tenantName?: string;
  policyId: string;
  submittedAt: Date;
}

export interface PolicyStatusUpdateData {
  tenantEmail: string;
  tenantName?: string;
  status: 'approved' | 'denied';
  reason?: string;
  reviewerName: string;
}

// Email templates
const policyInvitationTemplate = (data: PolicyInvitationData) => {
  const policyUrl = generatePolicyUrl(data.accessToken, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  const expiryDate = new Date(data.expiryDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return {
    subject: `Action Required: Complete Your ${COMPANY_NAME} Policy Application`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Policy Application</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #ffffff; padding: 40px 30px; border: 1px solid #e9ecef; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 14px 30px; background-color: #007bff; color: #ffffff !important; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e9ecef; text-align: center; font-size: 14px; color: #6c757d; }
    .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; color: #007bff;">${COMPANY_NAME}</h1>
      <p style="margin: 10px 0 0 0; color: #6c757d;">Policy Application Portal</p>
    </div>
    <div class="content">
      <h2>Hello${data.tenantName ? ` ${data.tenantName}` : ''},</h2>
      
      <p>${data.initiatorName} has initiated a policy application for you${data.propertyAddress ? ` for the property at ${data.propertyAddress}` : ''}.</p>
      
      <p>To complete your application, please click the button below and follow the step-by-step process:</p>
      
      <div style="text-align: center;">
        <a href="${policyUrl}" class="button">Complete Your Application</a>
      </div>
      
      <div class="warning">
        <strong>Important:</strong> This link will expire on ${expiryDate}. Please complete your application before this date.
      </div>
      
      <h3>What you'll need:</h3>
      <ul>
        <li>Valid identification (Mexican CURP or passport)</li>
        <li>Employment information and proof of income</li>
        <li>Personal reference contact information</li>
        <li>Additional documents (optional)</li>
      </ul>
      
      <p>The application process typically takes 15-20 minutes to complete.</p>
      
      <div class="footer">
        <p>If you have any questions, please contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
        <p>&copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `,
    text: `
Hello${data.tenantName ? ` ${data.tenantName}` : ''},

${data.initiatorName} has initiated a policy application for you${data.propertyAddress ? ` for the property at ${data.propertyAddress}` : ''}.

To complete your application, please visit: ${policyUrl}

Important: This link will expire on ${expiryDate}.

What you'll need:
- Valid identification (Mexican CURP or passport)
- Employment information and proof of income
- Personal reference contact information
- Additional documents (optional)

The application process typically takes 15-20 minutes to complete.

If you have any questions, please contact us at ${SUPPORT_EMAIL}

© ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.
    `
  };
};

const policySubmissionTemplate = (data: PolicySubmissionData) => {
  const submittedDate = new Date(data.submittedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return {
    subject: `Application Received - ${COMPANY_NAME} Policy #${data.policyId}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #28a745; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #ffffff; padding: 40px 30px; border: 1px solid #e9ecef; border-radius: 0 0 8px 8px; }
    .info-box { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e9ecef; text-align: center; font-size: 14px; color: #6c757d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; color: #ffffff;">${COMPANY_NAME}</h1>
      <p style="margin: 10px 0 0 0; color: #ffffff;">Application Received</p>
    </div>
    <div class="content">
      <h2>Thank you${data.tenantName ? `, ${data.tenantName}` : ''}!</h2>
      
      <p>We have successfully received your policy application.</p>
      
      <div class="info-box">
        <p style="margin: 0;"><strong>Application ID:</strong> ${data.policyId}</p>
        <p style="margin: 10px 0 0 0;"><strong>Submitted on:</strong> ${submittedDate}</p>
      </div>
      
      <h3>What happens next?</h3>
      <ol>
        <li>Our team will review your application and documents</li>
        <li>We may contact your references for verification</li>
        <li>You'll receive an email with our decision within 2-3 business days</li>
      </ol>
      
      <p>If we need any additional information, we'll contact you at this email address.</p>
      
      <div class="footer">
        <p>Questions? Contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
        <p>&copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `,
    text: `
Thank you${data.tenantName ? `, ${data.tenantName}` : ''}!

We have successfully received your policy application.

Application ID: ${data.policyId}
Submitted on: ${submittedDate}

What happens next?
1. Our team will review your application and documents
2. We may contact your references for verification
3. You'll receive an email with our decision within 2-3 business days

If we need any additional information, we'll contact you at this email address.

Questions? Contact us at ${SUPPORT_EMAIL}

© ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.
    `
  };
};

const policyStatusUpdateTemplate = (data: PolicyStatusUpdateData) => {
  const isApproved = data.status === 'approved';
  const headerColor = isApproved ? '#28a745' : '#dc3545';
  const statusText = isApproved ? 'Approved' : 'Denied';

  return {
    subject: `Policy Application ${statusText} - ${COMPANY_NAME}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: ${headerColor}; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #ffffff; padding: 40px 30px; border: 1px solid #e9ecef; border-radius: 0 0 8px 8px; }
    .status-box { background-color: ${isApproved ? '#d4edda' : '#f8d7da'}; border: 1px solid ${isApproved ? '#c3e6cb' : '#f5c6cb'}; padding: 20px; border-radius: 5px; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e9ecef; text-align: center; font-size: 14px; color: #6c757d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; color: #ffffff;">${COMPANY_NAME}</h1>
      <p style="margin: 10px 0 0 0; color: #ffffff;">Application ${statusText}</p>
    </div>
    <div class="content">
      <h2>Hello${data.tenantName ? ` ${data.tenantName}` : ''},</h2>
      
      <p>Your policy application has been reviewed by ${data.reviewerName}.</p>
      
      <div class="status-box">
        <h3 style="margin: 0 0 10px 0;">Status: ${statusText}</h3>
        ${data.reason ? `<p style="margin: 0;"><strong>Reason:</strong> ${data.reason}</p>` : ''}
      </div>
      
      ${isApproved ? `
        <h3>Next Steps:</h3>
        <p>Congratulations! Your application has been approved. Our team will contact you shortly with further instructions regarding your policy activation.</p>
      ` : `
        <h3>What can you do?</h3>
        <p>If you believe this decision was made in error or would like to discuss your application, please contact our support team.</p>
      `}
      
      <div class="footer">
        <p>Questions? Contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
        <p>&copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `,
    text: `
Hello${data.tenantName ? ` ${data.tenantName}` : ''},

Your policy application has been reviewed by ${data.reviewerName}.

Status: ${statusText}
${data.reason ? `Reason: ${data.reason}` : ''}

${isApproved ? 
  'Congratulations! Your application has been approved. Our team will contact you shortly with further instructions regarding your policy activation.' :
  'If you believe this decision was made in error or would like to discuss your application, please contact our support team.'
}

Questions? Contact us at ${SUPPORT_EMAIL}

© ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.
    `
  };
};

// Email service functions
export const sendPolicyInvitation = async (data: PolicyInvitationData): Promise<boolean> => {
  try {
    // Use React Email templates
    const { render } = await import('@react-email/render');
    const { PolicyInvitationEmail } = await import('../../templates/email/react-email/PolicyInvitationEmail');

    const html = await render(PolicyInvitationEmail(data));
    const subject = 'Acción Requerida: Completa tu Solicitud de Protección Hestia';

    // Generate plain text version
    const policyUrl = generatePolicyUrl(data.accessToken, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    const expiryDate = new Date(data.expiryDate).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const text = `
Hola${data.tenantName ? ` ${data.tenantName}` : ''},

${data.initiatorName} ha iniciado una solicitud de protección de arrendamiento para ti${data.propertyAddress ? ` para la propiedad ubicada en ${data.propertyAddress}` : ''}.

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

    return await EmailProvider.sendEmail({
      to: data.tenantEmail,
      subject,
      html,
      text
    });
  } catch (error) {
    console.error('Error rendering React Email template, falling back to legacy:', error);
    // Fallback to legacy template
    const template = policyInvitationTemplate(data);
    return await EmailProvider.sendEmail({
      to: data.tenantEmail,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }
};

export const sendPolicySubmissionConfirmation = async (data: PolicySubmissionData): Promise<boolean> => {
  try {
    // Use React Email templates
    const { render } = await import('@react-email/render');
    const { PolicySubmissionEmail } = await import('../../templates/email/react-email/PolicySubmissionEmail');

    const html = await render(PolicySubmissionEmail(data));
    const subject = `Solicitud Recibida - Protección Hestia #${data.policyId}`;

    // Generate plain text version
    const submittedDate = new Date(data.submittedAt).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const text = `
¡Gracias${data.tenantName ? `, ${data.tenantName}` : ''}!

Hemos recibido exitosamente tu solicitud de protección de arrendamiento.

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

    return await EmailProvider.sendEmail({
      to: data.tenantEmail,
      subject,
      html,
      text
    });
  } catch (error) {
    console.error('Error rendering React Email template, falling back to legacy:', error);
    // Fallback to legacy template
    const template = policySubmissionTemplate(data);
    return await EmailProvider.sendEmail({
      to: data.tenantEmail,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }
};

// Actor invitation data
export interface ActorInvitationData {
  actorType: 'landlord' | 'tenant' | 'jointObligor' | 'aval';
  isCompany: boolean;
  email: string;
  name?: string;
  token: string;
  url: string;
  policyNumber: string;
  propertyAddress: string;
  expiryDate?: Date;
  initiatorName?: string;
}

// Join Us notification data
export interface JoinUsNotificationData {
  name: string;
  email: string;
  phone: string;
  company: string;
  experience: string;
  currentClients: string;
  message: string;
}

export const sendActorInvitation = async (data: ActorInvitationData): Promise<boolean> => {
  try {
    // Use React Email templates
    const { render } = await import('@react-email/render');
    const { ActorInvitationEmail } = await import('../../templates/email/react-email/ActorInvitationEmail');

    const html = await render(ActorInvitationEmail(data));

    const actorTypeNames = {
      'landlord': 'Arrendador',
      'tenant': 'Inquilino',
      'jointObligor': 'Obligado Solidario',
      'aval': 'Aval'
    };

    const actorTypeName = actorTypeNames[data.actorType];
    const subject = `Acción Requerida: Completa tu información como ${actorTypeName} - Protección ${data.policyNumber}`;

    // Generate plain text version
    const text = `
Hola${data.name ? ` ${data.name}` : ''},

${data.initiatorName || 'El administrador'} te ha designado como ${actorTypeName} en una protección de arrendamiento.

Número de Protección: ${data.policyNumber}
Propiedad: ${data.propertyAddress}

Para continuar con el proceso, necesitamos que completes tu información y documentación.

Accede aquí: ${data.url}

¿Qué necesitarás?
- Identificación oficial (INE o pasaporte)
- Información laboral y comprobantes de ingresos
- 3 referencias personales con datos de contacto
${data.actorType === 'aval' ? '- Información de la propiedad en garantía' : ''}

Importante: Este enlace expirará ${data.expiryDate ? `el ${new Date(data.expiryDate).toLocaleDateString('es-MX')}` : 'en 7 días'}.

Si tienes preguntas, contacta a: soporte@hestiaplp.com.mx

© ${new Date().getFullYear()} Hestia PLP. Todos los derechos reservados.
    `.trim();

    console.log('Sending actor invitation to:', data.email);

    return await EmailProvider.sendEmail({
      to: data.email,
      subject,
      html,
      text
    });
  } catch (error) {
    console.error('Error sending actor invitation:', error);
    return false;
  }
};

export const sendJoinUsNotification = async (data: JoinUsNotificationData): Promise<boolean> => {
  try {
    // Use React Email templates
    const { render } = await import('@react-email/render');
    const { JoinUsNotificationEmail } = await import('../../templates/email/react-email/JoinUsNotificationEmail');

    const html = await render(JoinUsNotificationEmail(data));
    const subject = `Nueva solicitud para unirse al equipo - ${data.name}`;

    // Generate plain text version
    const text = `
Nueva Solicitud para Unirse al Equipo de Asesores

Información del Solicitante:
- Nombre: ${data.name}
- Email: ${data.email}
- Teléfono: ${data.phone}
- Empresa/Inmobiliaria: ${data.company}
- Años de Experiencia: ${data.experience}
- Número de Clientes Actuales: ${data.currentClients}

Mensaje del Solicitante:
${data.message}

---
Fecha de solicitud: ${new Date().toLocaleDateString('es-MX', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

Por favor, revisa esta solicitud y contacta al solicitante para continuar con el proceso de incorporación.

© ${new Date().getFullYear()} Hestia PLP. Todos los derechos reservados.
    `.trim();

    // Send to unete@hestiaplp.com.mx
    const joinUsEmail = process.env.JOIN_US_EMAIL || 'unete@hestiaplp.com.mx';

    return await EmailProvider.sendEmail({
      to: joinUsEmail,
      subject,
      html,
      text
    });
  } catch (error) {
    console.error('Error sending join us notification:', error);
    return false;
  }
};

export interface ActorRejectionData {
  to: string;
  actorName: string;
  actorType: string;
  rejectionReason: string;
  policyNumber: string;
}

export const sendActorRejectionEmail = async (params: ActorRejectionData): Promise<boolean> => {
  try {
    // Use React Email templates
    const { render } = await import('@react-email/render');
    const { ActorRejectionEmail } = await import('../../templates/email/react-email/ActorRejectionEmail');

    const html = await render(ActorRejectionEmail(params));

    const actorTypeLabels: Record<string, string> = {
      landlord: 'Arrendador',
      tenant: 'Inquilino',
      jointObligor: 'Obligado Solidario',
      aval: 'Aval',
    };

    const subject = `Información Rechazada - Protección ${params.policyNumber}`;

    // Generate plain text version
    const text = `
Hola ${params.actorName},

Tu información como ${actorTypeLabels[params.actorType] || params.actorType} para la protección ${params.policyNumber} ha sido rechazada.

Razón del rechazo:
${params.rejectionReason}

Por favor, revisa y actualiza tu información según las observaciones proporcionadas.
Puedes acceder nuevamente usando el enlace que te fue enviado anteriormente.

Si tienes preguntas o necesitas ayuda, no dudes en contactarnos en ${SUPPORT_EMAIL}.

© ${new Date().getFullYear()} Hestia PLP. Todos los derechos reservados.
    `.trim();

    return await EmailProvider.sendEmail({
      to: params.to,
      subject,
      text,
      html,
    });
  } catch (error) {
    console.error('Failed to send actor rejection email:', error);
    return false;
  }
};

// User invitation data
export interface UserInvitationData {
  email: string;
  name?: string;
  role: 'ADMIN' | 'STAFF' | 'BROKER';
  invitationUrl: string;
  expiryDate: Date;
  inviterName?: string;
}

export const sendUserInvitation = async (data: UserInvitationData): Promise<boolean> => {
  try {
    // Use React Email template
    const { render } = await import('@react-email/render');
    const { UserInvitationEmail } = await import('../../templates/email/react-email/UserInvitationEmail');

    const html = await render(await UserInvitationEmail(data));

    const roleDescriptions = {
      ADMIN: 'Administrador del Sistema',
      STAFF: 'Personal de Operaciones',
      BROKER: 'Corredor de Seguros',
    };

    const roleDescription = roleDescriptions[data.role];
    const subject = `Bienvenido a Hestia - Configuración de Cuenta`;

    // Generate plain text version
    const text = `
Hola${data.name ? ` ${data.name}` : ''},

${data.inviterName ? `${data.inviterName} te` : 'Te'} ha invitado a formar parte del equipo de Hestia como ${roleDescription}.

Para comenzar, necesitas configurar tu contraseña y completar tu perfil.

Accede aquí: ${data.invitationUrl}

Tus credenciales de acceso:
- Email: ${data.email}
- Contraseña: La establecerás en tu primer acceso

¿Qué podrás hacer en tu primer acceso?
- Establecer tu contraseña segura
- Subir tu foto de perfil
- Completar tu información de contacto
- Explorar las herramientas disponibles

Importante: Este enlace expirará el ${new Date(data.expiryDate).toLocaleDateString('es-MX', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})}. Asegúrate de configurar tu cuenta antes de esa fecha.

Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos a soporte@hestiaplp.com.mx.

© ${new Date().getFullYear()} Hestia PLP. Todos los derechos reservados.
    `.trim();

    console.log('Sending user invitation to:', data.email);

    return await EmailProvider.sendEmail({
      to: data.email,
      subject,
      html,
      text
    });
  } catch (error) {
    console.error('Failed to send user invitation email:', error);
    return false;
  }
};

export const sendPolicyStatusUpdate = async (data: PolicyStatusUpdateData): Promise<boolean> => {
  try {
    // Use React Email templates
    const { render } = await import('@react-email/render');
    const { PolicyStatusUpdateEmail } = await import('../../templates/email/react-email/PolicyStatusUpdateEmail');

    const html = await render(await PolicyStatusUpdateEmail(data));
    const isApproved = data.status === 'approved';
    const statusText = isApproved ? 'Aprobada' : 'Rechazada';
    const subject = `Solicitud de Protección ${statusText} - Hestia`;

    // Generate plain text version
    const text = `
Hola${data.tenantName ? ` ${data.tenantName}` : ''},

Tu solicitud de protección de arrendamiento ha sido revisada por ${data.reviewerName}.

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

    return await EmailProvider.sendEmail({
      to: data.tenantEmail,
      subject,
      html,
      text
    });
  } catch (error) {
    console.error('Error rendering React Email template, falling back to legacy:', error);
    // Fallback to legacy template
    const template = policyStatusUpdateTemplate(data);
    return await EmailProvider.sendEmail({
      to: data.tenantEmail,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }
};
