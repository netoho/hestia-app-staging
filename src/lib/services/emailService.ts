import 'server-only';

import { Resend } from 'resend';
import Mailgun from 'mailgun.js';
import nodemailer from 'nodemailer';
import type { IMailgunClient } from 'mailgun.js/Types/Interfaces/MailgunClient/IMailgunClient';
import type { Transporter } from 'nodemailer';
import { generatePolicyUrl } from '../utils/tokenUtils';
import { brandInfo, emailSubject } from '@/lib/config/brand';

// Email provider configuration
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'resend'; // 'resend', 'mailgun', or 'smtp'
const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const COMPANY_NAME = brandInfo.name;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || brandInfo.supportEmail;

// Email provider clients (initialized lazily)
let resendClient: Resend | null = null;
let mailgunClient: IMailgunClient | null = null;
let smtpTransporter: Transporter | null = null;

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
        // TLS settings - require valid certificates in production
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production'
        }
      });
    }

    const mailOptions = {
      from: FROM_EMAIL,
      to: data.to,
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

export interface PolicyCancellationEmailData {
  adminEmail: string;
  adminName?: string;
  policyNumber: string;
  cancellationReason: string;
  cancellationComment: string;
  cancelledByName: string;
  cancelledAt: Date;
  policyLink?: string;
}

// Email service functions

export const sendPolicySubmissionConfirmation = async (data: PolicySubmissionData): Promise<boolean> => {
  try {
    // Use React Email templates
    const { render } = await import('@react-email/render');
    const { PolicySubmissionEmail } = await import('../../templates/email/react-email/PolicySubmissionEmail');

    const html = await render(await PolicySubmissionEmail(data));
    const subject = emailSubject(`Solicitud Recibida #${data.policyId}`);

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
    console.error('Failed to send policy submission confirmation:', error);
    return false;
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

    const html = await render(await ActorInvitationEmail(data));

    const actorTypeNames = {
      'landlord': 'Arrendador',
      'tenant': 'Inquilino',
      'jointObligor': 'Obligado Solidario',
      'aval': 'Aval'
    };

    const actorTypeName = actorTypeNames[data.actorType];
    const subject = emailSubject(`Completa tu información como ${actorTypeName} - ${data.policyNumber}`);

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

    const html = await render(await JoinUsNotificationEmail(data));
    const subject = emailSubject(`Nueva solicitud - ${data.name}`);

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

    const html = await render(await ActorRejectionEmail(params));

    const actorTypeLabels: Record<string, string> = {
      landlord: 'Arrendador',
      tenant: 'Inquilino',
      jointObligor: 'Obligado Solidario',
      aval: 'Aval',
    };

    const subject = emailSubject(`Información Rechazada - ${params.policyNumber}`);

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
    const subject = emailSubject(`Bienvenido - Configuración de Cuenta`);

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
    const subject = emailSubject(`Solicitud ${statusText}`);

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
    console.error('Failed to send policy status update:', error);
    return false;
  }
};

// Actor incomplete reminder data
export interface ActorIncompleteReminderData {
  actorType: 'landlord' | 'tenant' | 'jointObligor' | 'aval';
  actorName: string;
  email: string;
  policyNumber: string;
  actorLink: string;
}

// Policy creator summary data
export interface PolicyCreatorSummaryData {
  creatorName: string;
  email: string;
  policyNumber: string;
  policyLink: string;
  incompleteActors: Array<{
    type: string;
    name: string;
    email: string;
  }>;
}

export const sendActorIncompleteReminder = async (data: ActorIncompleteReminderData): Promise<boolean> => {
  try {
    const { render } = await import('@react-email/render');
    const { ActorIncompleteReminderEmail } = await import('../../templates/email/react-email/ActorIncompleteReminderEmail');

    const html = await render(await ActorIncompleteReminderEmail(data));

    const actorTypeLabels: Record<string, string> = {
      landlord: 'Arrendador',
      tenant: 'Arrendatario',
      jointObligor: 'Obligado Solidario',
      aval: 'Aval'
    };
    const actorTypeLabel = actorTypeLabels[data.actorType] || data.actorType;

    const subject = emailSubject('Recordatorio: Complete su información');
    const text = `
Hola ${data.actorName},

Este es un recordatorio diario para completar su información como ${actorTypeLabel} para la póliza ${data.policyNumber}.

Su información está incompleta y es necesaria para procesar la póliza. Por favor, visite el siguiente enlace para completar el formulario:

${data.actorLink}

Este enlace es único para usted. No lo comparta con nadie más.

© ${new Date().getFullYear()} ${COMPANY_NAME}. Todos los derechos reservados.
    `.trim();

    return await EmailProvider.sendEmail({
      to: data.email,
      subject,
      html,
      text
    });
  } catch (error) {
    console.error('Failed to send actor incomplete reminder:', error);
    return false;
  }
};

export const sendPolicyCreatorSummary = async (data: PolicyCreatorSummaryData): Promise<boolean> => {
  try {
    const { render } = await import('@react-email/render');
    const { PolicyCreatorSummaryEmail } = await import('../../templates/email/react-email/PolicyCreatorSummaryEmail');

    const html = await render(await PolicyCreatorSummaryEmail(data));

    const subject = emailSubject(`Recordatorio: Actores pendientes - ${data.policyNumber}`);
    const actorsListText = data.incompleteActors.map(actor =>
      `- ${actor.type}: ${actor.name} (${actor.email})`
    ).join('\n');

    const text = `
Hola ${data.creatorName},

Este es un resumen diario de los actores que aún necesitan completar su información para la póliza ${data.policyNumber}.

Actores Pendientes:
${actorsListText}

Se han enviado recordatorios automáticos a cada actor con información de contacto. Los recordatorios continuarán enviándose diariamente hasta que completen su información.

Ver póliza: ${data.policyLink}

© ${new Date().getFullYear()} ${COMPANY_NAME}. Todos los derechos reservados.
    `.trim();

    return await EmailProvider.sendEmail({
      to: data.email,
      subject,
      html,
      text
    });
  } catch (error) {
    console.error('Failed to send policy creator summary:', error);
    return false;
  }
};

// ====================================
// Password Reset Email
// ====================================

interface PasswordResetData {
  email: string;
  name?: string;
  resetUrl: string;
  expiryHours?: number;
}

export const sendPasswordResetEmail = async (data: PasswordResetData): Promise<boolean> => {
  try {
    // Use React Email template
    const { render } = await import('@react-email/render');
    const { PasswordResetEmail } = await import('../../templates/email/react-email/PasswordResetEmail');

    const expiryHours = data.expiryHours || 1;
    const expiryTime = expiryHours === 1 ? '1 hora' : `${expiryHours} horas`;

    const html = await render(await PasswordResetEmail({
      email: data.email,
      name: data.name,
      resetUrl: data.resetUrl,
      expiryTime
    }));

    const subject = emailSubject('Restablecer tu contraseña');

    // Generate plain text version
    const text = `
Hola ${data.name || 'usuario'},

Recibimos una solicitud para restablecer la contraseña de tu cuenta en Hestia asociada con el correo electrónico ${data.email}.

Si realizaste esta solicitud, visita el siguiente enlace para crear una nueva contraseña:
${data.resetUrl}

IMPORTANTE:
• Este enlace expirará en ${expiryTime}
• Por seguridad, no compartas este enlace con nadie
• Si no solicitaste restablecer tu contraseña, ignora este correo

Si el enlace no funciona, copia y pega la URL completa en tu navegador.

Nota de seguridad: Si no solicitaste restablecer tu contraseña, es posible que alguien esté intentando acceder a tu cuenta. Por favor, asegúrate de que tu cuenta esté segura y contacta a nuestro equipo de soporte si tienes alguna preocupación.

¿Necesitas ayuda? Contáctanos en ${SUPPORT_EMAIL}

© ${new Date().getFullYear()} Hestia PLP. Todos los derechos reservados.
    `.trim();

    return await EmailProvider.sendEmail({
      to: data.email,
      subject,
      html,
      text
    });
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
};

// Payment completion email data
export interface PaymentCompletedData {
  email: string;
  payerName?: string;
  policyNumber: string;
  paymentType: string;
  amount: number;
  paidAt: Date;
}

export const sendPaymentCompletedEmail = async (data: PaymentCompletedData): Promise<boolean> => {
  try {
    const subject = emailSubject(`Pago Confirmado - ${data.policyNumber}`);

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(amount);

    const formatDate = (date: Date) =>
      new Date(date).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">¡Pago Confirmado!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p>Hola${data.payerName ? ` ${data.payerName}` : ''},</p>
          <p>Tu pago ha sido procesado exitosamente.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 5px 0;"><strong>Póliza:</strong> ${data.policyNumber}</p>
            <p style="margin: 5px 0;"><strong>Concepto:</strong> ${data.paymentType}</p>
            <p style="margin: 5px 0;"><strong>Monto:</strong> ${formatCurrency(data.amount)}</p>
            <p style="margin: 5px 0;"><strong>Fecha:</strong> ${formatDate(data.paidAt)}</p>
          </div>
          <p>Gracias por tu pago. Si tienes alguna pregunta, contáctanos en ${SUPPORT_EMAIL}.</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">© ${new Date().getFullYear()} Hestia PLP. Todos los derechos reservados.</p>
        </div>
      </body>
      </html>
    `.trim();

    const text = `
Hola${data.payerName ? ` ${data.payerName}` : ''},

Tu pago ha sido procesado exitosamente.

Póliza: ${data.policyNumber}
Concepto: ${data.paymentType}
Monto: ${formatCurrency(data.amount)}
Fecha: ${formatDate(data.paidAt)}

Gracias por tu pago. Si tienes alguna pregunta, contáctanos en ${SUPPORT_EMAIL}.

© ${new Date().getFullYear()} Hestia PLP. Todos los derechos reservados.
    `.trim();

    return await EmailProvider.sendEmail({
      to: data.email,
      subject,
      html,
      text
    });
  } catch (error) {
    console.error('Failed to send payment completed email:', error);
    return false;
  }
};

// All payments completed email data (for admin notification)
export interface AllPaymentsCompletedData {
  adminEmail: string;
  policyNumber: string;
  totalPayments: number;
  totalAmount: number;
}

export const sendAllPaymentsCompletedEmail = async (data: AllPaymentsCompletedData): Promise<boolean> => {
  try {
    const subject = emailSubject(`Pagos Completados - ${data.policyNumber}`);

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(amount);

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Pagos Completados</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p>Todos los pagos de la póliza han sido completados.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <p style="margin: 5px 0;"><strong>Póliza:</strong> ${data.policyNumber}</p>
            <p style="margin: 5px 0;"><strong>Total de pagos:</strong> ${data.totalPayments}</p>
            <p style="margin: 5px 0;"><strong>Monto total:</strong> ${formatCurrency(data.totalAmount)}</p>
          </div>
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">© ${new Date().getFullYear()} Hestia PLP. Todos los derechos reservados.</p>
        </div>
      </body>
      </html>
    `.trim();

    const text = `
Todos los pagos de la póliza han sido completados.

Póliza: ${data.policyNumber}
Total de pagos: ${data.totalPayments}
Monto total: ${formatCurrency(data.totalAmount)}

© ${new Date().getFullYear()} Hestia PLP. Todos los derechos reservados.
    `.trim();

    return await EmailProvider.sendEmail({
      to: data.adminEmail,
      subject,
      html,
      text
    });
  } catch (error) {
    console.error('Failed to send all payments completed email:', error);
    return false;
  }
};

// Send policy cancellation notification to admin
export const sendPolicyCancellationEmail = async (data: PolicyCancellationEmailData): Promise<boolean> => {
  try {
    const { render } = await import('@react-email/render');
    const { PolicyCancellationEmail } = await import('../../templates/email/react-email/PolicyCancellationEmail');

    const html = await render(await PolicyCancellationEmail(data));
    const subject = emailSubject(`Proteccion Cancelada #${data.policyNumber}`);

    const cancelledDate = new Date(data.cancelledAt).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const text = `
Proteccion Cancelada

Hola${data.adminName ? ` ${data.adminName}` : ''},

Se ha cancelado una proteccion en el sistema.

Detalles:
- Numero de Proteccion: ${data.policyNumber}
- Razon: ${data.cancellationReason}
- Comentario: ${data.cancellationComment}
- Cancelada por: ${data.cancelledByName}
- Fecha: ${cancelledDate}

${data.policyLink ? `Ver proteccion: ${data.policyLink}` : ''}

© ${new Date().getFullYear()} Hestia PLP. Todos los derechos reservados.
    `.trim();

    return await EmailProvider.sendEmail({
      to: data.adminEmail,
      subject,
      html,
      text,
    });
  } catch (error) {
    console.error('Failed to send policy cancellation email:', error);
    return false;
  }
};
