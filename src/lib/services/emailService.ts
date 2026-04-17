import 'server-only';

import { Resend } from 'resend';
import Mailgun from 'mailgun.js';
import nodemailer from 'nodemailer';
import type { IMailgunClient } from 'mailgun.js/Types/Interfaces/MailgunClient/IMailgunClient';
import type { Transporter } from 'nodemailer';
import { generatePolicyUrl } from '../utils/tokenUtils';
import { brandInfo, emailSubject } from '@/lib/config/brand';
import { formatDate, formatDateLong, formatDateTimeLong } from '@/lib/utils/formatting';

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
    const submittedDate = formatDateTimeLong(data.submittedAt);

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
  propertyAddress: string | object;
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

Importante: Este enlace expirará ${data.expiryDate ? `el ${formatDate(data.expiryDate)}` : 'en 7 días'}.

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
Fecha de solicitud: ${formatDateTimeLong(new Date())}

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

Importante: Este enlace expirará el ${formatDateLong(data.expiryDate)}. Asegúrate de configurar tu cuenta antes de esa fecha.

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

Este es un recordatorio diario para completar su información como ${actorTypeLabel} para la protección ${data.policyNumber}.

Su información está incompleta y es necesaria para procesar la protección. Por favor, visite el siguiente enlace para completar el formulario:

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

Este es un resumen diario de los actores que aún necesitan completar su información para la protección ${data.policyNumber}.

Actores Pendientes:
${actorsListText}

Se han enviado recordatorios automáticos a cada actor con información de contacto. Los recordatorios continuarán enviándose diariamente hasta que completen su información.

Ver protección: ${data.policyLink}

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
    const { render } = await import('@react-email/render');
    const { PaymentCompletedEmail } = await import('../../templates/email/react-email/PaymentCompletedEmail');

    const html = await render(await PaymentCompletedEmail({
      payerName: data.payerName,
      policyNumber: data.policyNumber,
      paymentType: data.paymentType,
      amount: data.amount,
      paidAt: data.paidAt,
    }));

    const subject = emailSubject(`Pago Confirmado - ${data.policyNumber}`);

    const text = `
Hola${data.payerName ? ` ${data.payerName}` : ''},

Tu pago ha sido procesado exitosamente.

Poliza: ${data.policyNumber}
Concepto: ${data.paymentType}
Monto: ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(data.amount)}
Fecha: ${formatDateLong(data.paidAt)}

Gracias por tu pago. Si tienes alguna pregunta, contactanos en ${SUPPORT_EMAIL}.

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
    const { render } = await import('@react-email/render');
    const { AllPaymentsCompletedEmail } = await import('../../templates/email/react-email/AllPaymentsCompletedEmail');

    const html = await render(await AllPaymentsCompletedEmail({
      policyNumber: data.policyNumber,
      totalPayments: data.totalPayments,
      totalAmount: data.totalAmount,
    }));

    const subject = emailSubject(`Pagos Completados - ${data.policyNumber}`);

    const text = `
Todos los pagos de la poliza han sido completados.

Poliza: ${data.policyNumber}
Total de pagos: ${data.totalPayments}
Monto total: ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(data.totalAmount)}

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
    const subject = emailSubject(`Protección Cancelada #${data.policyNumber}`);

    const cancelledDate = formatDateTimeLong(data.cancelledAt);

    const text = `
Protección Cancelada

Hola${data.adminName ? ` ${data.adminName}` : ''},

Se ha cancelado una protección en el sistema.

Detalles:
- Número de Protección: ${data.policyNumber}
- Razón: ${data.cancellationReason}
- Comentario: ${data.cancellationComment}
- Cancelada por: ${data.cancelledByName}
- Fecha: ${cancelledDate}

${data.policyLink ? `Ver protección: ${data.policyLink}` : ''}

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

// Simple notification email interface
interface SimpleNotificationEmailData {
  to: string;
  recipientName?: string;
  subject: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
}

// Send a simple notification email (for internal notifications)
export const sendSimpleNotificationEmail = async (data: SimpleNotificationEmailData): Promise<boolean> => {
  try {
    const subject = emailSubject(data.subject);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${COMPANY_NAME}</h1>
  </div>
  <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="margin: 0 0 15px;">Hola${data.recipientName ? ` ${data.recipientName}` : ''},</p>
    <p style="margin: 0 0 20px;">${data.message}</p>
    ${data.actionUrl && data.actionText ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: 600;">${data.actionText}</a>
    </div>
    ` : ''}
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">
      © ${new Date().getFullYear()} ${COMPANY_NAME}. Todos los derechos reservados.
    </p>
  </div>
</body>
</html>
    `.trim();

    const text = `
${data.recipientName ? `Hola ${data.recipientName},` : 'Hola,'}

${data.message}

${data.actionUrl ? `${data.actionText || 'Ver más'}: ${data.actionUrl}` : ''}

© ${new Date().getFullYear()} ${COMPANY_NAME}. Todos los derechos reservados.
    `.trim();

    return await EmailProvider.sendEmail({
      to: data.to,
      subject,
      html,
      text,
    });
  } catch (error) {
    console.error('Failed to send simple notification email:', error);
    return false;
  }
};

// ====================================
// Investigation Emails
// ====================================

export interface InvestigationSubmittedData {
  email: string;
  policyNumber: string;
  propertyAddress: string;
  actorType: 'TENANT' | 'JOINT_OBLIGOR' | 'AVAL';
  actorName: string;
  submittedBy: string;
  submittedAt: Date;
  policyUrl: string;
}

export const sendInvestigationSubmittedEmail = async (data: InvestigationSubmittedData): Promise<boolean> => {
  try {
    const { render } = await import('@react-email/render');
    const { InvestigationSubmittedEmail } = await import('../../templates/email/react-email/InvestigationSubmittedEmail');

    const html = await render(await InvestigationSubmittedEmail(data));
    const subject = emailSubject(`Nueva Investigación - ${data.policyNumber}`);

    const actorTypeNames: Record<string, string> = {
      'TENANT': 'Inquilino',
      'JOINT_OBLIGOR': 'Obligado Solidario',
      'AVAL': 'Aval'
    };

    const text = `
Nueva Investigación Enviada

Se ha enviado una nueva investigación para aprobación:

Actor: ${data.actorName} (${actorTypeNames[data.actorType]})
Propiedad: ${data.propertyAddress}
Enviada por: ${data.submittedBy}
Fecha: ${formatDateTimeLong(data.submittedAt)}

Se ha notificado al broker y arrendador para su aprobación.

Ver protección: ${data.policyUrl}

© ${new Date().getFullYear()} ${COMPANY_NAME}. Todos los derechos reservados.
    `.trim();

    return await EmailProvider.sendEmail({
      to: data.email,
      subject,
      html,
      text,
    });
  } catch (error) {
    console.error('Failed to send investigation submitted email:', error);
    return false;
  }
};

export interface InvestigationApprovalRequestData {
  email: string;
  recipientName?: string;
  recipientType: 'BROKER' | 'LANDLORD';
  policyNumber: string;
  propertyAddress: string;
  actorType: 'TENANT' | 'JOINT_OBLIGOR' | 'AVAL';
  actorName: string;
  approvalUrl: string;
  expiryDate: Date;
}

export const sendInvestigationApprovalRequestEmail = async (data: InvestigationApprovalRequestData): Promise<boolean> => {
  try {
    const { render } = await import('@react-email/render');
    const { InvestigationApprovalRequestEmail } = await import('../../templates/email/react-email/InvestigationApprovalRequestEmail');

    const html = await render(await InvestigationApprovalRequestEmail(data));
    const subject = emailSubject(`Aprobación de Investigación - ${data.policyNumber}`);

    const actorTypeNames: Record<string, string> = {
      'TENANT': 'Inquilino',
      'JOINT_OBLIGOR': 'Obligado Solidario',
      'AVAL': 'Aval'
    };

    const text = `
Aprobación de Investigación Requerida

Hola${data.recipientName ? ` ${data.recipientName}` : ''},

Se ha completado la investigación de ${data.actorName} (${actorTypeNames[data.actorType]}) y requiere tu aprobación.

Protección: ${data.policyNumber}
Propiedad: ${data.propertyAddress}

Por favor revisa la investigación y decide si aprobar o rechazar:
${data.approvalUrl}

Este enlace expira el ${formatDateLong(data.expiryDate)}.

© ${new Date().getFullYear()} ${COMPANY_NAME}. Todos los derechos reservados.
    `.trim();

    return await EmailProvider.sendEmail({
      to: data.email,
      subject,
      html,
      text,
    });
  } catch (error) {
    console.error('Failed to send investigation approval request email:', error);
    return false;
  }
};

export interface InvestigationResultData {
  email: string;
  recipientName?: string;
  recipientType: 'ADMIN' | 'BROKER' | 'LANDLORD';
  policyNumber: string;
  propertyAddress: string;
  actorType: 'TENANT' | 'JOINT_OBLIGOR' | 'AVAL';
  actorName: string;
  result: 'APPROVED' | 'REJECTED';
  approvedBy: string;
  approvedByType: 'BROKER' | 'LANDLORD';
  approvedAt: Date;
  notes?: string;
  rejectionReason?: string;
  policyUrl?: string;
}

export const sendInvestigationResultEmail = async (data: InvestigationResultData): Promise<boolean> => {
  try {
    const { render } = await import('@react-email/render');
    const { InvestigationResultEmail } = await import('../../templates/email/react-email/InvestigationResultEmail');

    const html = await render(await InvestigationResultEmail(data));
    const resultText = data.result === 'APPROVED' ? 'Aprobada' : 'Rechazada';
    const subject = emailSubject(`Investigación ${resultText} - ${data.policyNumber}`);

    const actorTypeNames: Record<string, string> = {
      'TENANT': 'Inquilino',
      'JOINT_OBLIGOR': 'Obligado Solidario',
      'AVAL': 'Aval'
    };

    const approverTypeNames: Record<string, string> = {
      'BROKER': 'el Broker',
      'LANDLORD': 'el Arrendador'
    };

    const text = `
Investigación ${resultText}

Hola${data.recipientName ? ` ${data.recipientName}` : ''},

La investigación de ${data.actorName} (${actorTypeNames[data.actorType]}) ha sido ${resultText.toLowerCase()} por ${approverTypeNames[data.approvedByType]}.

Protección: ${data.policyNumber}
Propiedad: ${data.propertyAddress}
Fecha: ${formatDateTimeLong(data.approvedAt)}

${data.result === 'REJECTED' && data.rejectionReason ? `Motivo del rechazo: ${data.rejectionReason}` : ''}
${data.result === 'APPROVED' && data.notes ? `Notas: ${data.notes}` : ''}

${data.policyUrl ? `Ver protección: ${data.policyUrl}` : ''}

© ${new Date().getFullYear()} ${COMPANY_NAME}. Todos los derechos reservados.
    `.trim();

    return await EmailProvider.sendEmail({
      to: data.email,
      subject,
      html,
      text,
    });
  } catch (error) {
    console.error('Failed to send investigation result email:', error);
    return false;
  }
};

// ============================================
// RECEIPT EMAILS
// ============================================

export interface ReceiptReminderData {
  tenantName: string;
  email: string;
  propertyAddress: string;
  policyNumber: string;
  monthName: string;
  year: number;
  requiredReceipts: string[];
  portalUrl: string;
}

export const sendReceiptReminder = async (data: ReceiptReminderData): Promise<boolean> => {
  try {
    const { render } = await import('@react-email/render');
    const { ReceiptReminderEmail } = await import('../../templates/email/react-email/ReceiptReminderEmail');

    const html = await render(await ReceiptReminderEmail(data));

    const subject = emailSubject(`Comprobantes de ${data.monthName} ${data.year}`);
    const receiptsText = data.requiredReceipts.map(r => `- ${r}`).join('\n');
    const text = `
Hola ${data.tenantName},

Es momento de subir tus comprobantes de pago del mes de ${data.monthName} ${data.year} para la propiedad en ${data.propertyAddress}.

Comprobantes solicitados:
${receiptsText}

Accede a tu portal: ${data.portalUrl}

© ${new Date().getFullYear()} ${COMPANY_NAME}. Todos los derechos reservados.
    `.trim();

    return await EmailProvider.sendEmail({ to: data.email, subject, html, text });
  } catch (error) {
    console.error('Failed to send receipt reminder:', error);
    return false;
  }
};

export interface ReceiptMagicLinkData {
  tenantName: string;
  email: string;
  portalUrl: string;
}

export const sendReceiptMagicLink = async (data: ReceiptMagicLinkData): Promise<boolean> => {
  try {
    const { render } = await import('@react-email/render');
    const { ReceiptMagicLinkEmail } = await import('../../templates/email/react-email/ReceiptMagicLinkEmail');

    const html = await render(await ReceiptMagicLinkEmail(data));

    const subject = emailSubject('Accede a tu Portal de Comprobantes');
    const text = `
Hola ${data.tenantName},

Haz clic en el siguiente enlace para acceder a tu portal de comprobantes:

${data.portalUrl}

Este enlace es personal. No lo compartas con nadie.

© ${new Date().getFullYear()} ${COMPANY_NAME}. Todos los derechos reservados.
    `.trim();

    return await EmailProvider.sendEmail({ to: data.email, subject, html, text });
  } catch (error) {
    console.error('Failed to send receipt magic link:', error);
    return false;
  }
};

// ============================================
// Password reset confirmation
// ============================================

export interface PasswordResetConfirmationData {
  email: string;
  name?: string;
  changedAt: Date;
}

export const sendPasswordResetConfirmation = async (
  data: PasswordResetConfirmationData,
): Promise<boolean> => {
  try {
    const { render } = await import('@react-email/render');
    const { PasswordResetConfirmationEmail } = await import(
      '../../templates/email/react-email/PasswordResetConfirmationEmail'
    );

    const html = await render(await PasswordResetConfirmationEmail(data));
    const subject = emailSubject('Tu contraseña fue actualizada');

    const text = `
Hola${data.name ? ` ${data.name}` : ''},

Te confirmamos que tu contraseña se cambió correctamente el ${formatDateTimeLong(data.changedAt)}.

Si no reconoces esta actividad, contáctanos de inmediato a ${SUPPORT_EMAIL}.

© ${new Date().getFullYear()} ${COMPANY_NAME}. Todos los derechos reservados.
    `.trim();

    return await EmailProvider.sendEmail({ to: data.email, subject, html, text });
  } catch (error) {
    console.error('Failed to send password reset confirmation:', error);
    return false;
  }
};

// ============================================
// Tenant replacement notification
// ============================================

export interface TenantReplacementEmailData {
  email: string;
  recipientName?: string;
  policyNumber: string;
  policyLink: string;
}

export const sendTenantReplacementEmail = async (
  data: TenantReplacementEmailData,
): Promise<boolean> => {
  try {
    const { render } = await import('@react-email/render');
    const { TenantReplacementEmail } = await import(
      '../../templates/email/react-email/TenantReplacementEmail'
    );

    const html = await render(await TenantReplacementEmail(data));
    const subject = emailSubject(`Inquilino reemplazado en protección #${data.policyNumber}`);

    const text = `
Hola${data.recipientName ? ` ${data.recipientName}` : ''},

El inquilino fue reemplazado en la protección #${data.policyNumber}. El proceso de recolección de información se reinició para el nuevo inquilino.

Ver protección: ${data.policyLink}

© ${new Date().getFullYear()} ${COMPANY_NAME}. Todos los derechos reservados.
    `.trim();

    return await EmailProvider.sendEmail({ to: data.email, subject, html, text });
  } catch (error) {
    console.error('Failed to send tenant replacement email:', error);
    return false;
  }
};

// ============================================
// Policy pending approval notification
// ============================================

export interface PolicyPendingApprovalEmailData {
  email: string;
  recipientName?: string;
  policyNumber: string;
  policyLink: string;
}

export const sendPolicyPendingApprovalEmail = async (
  data: PolicyPendingApprovalEmailData,
): Promise<boolean> => {
  try {
    const { render } = await import('@react-email/render');
    const { PolicyPendingApprovalEmail } = await import(
      '../../templates/email/react-email/PolicyPendingApprovalEmail'
    );

    const html = await render(await PolicyPendingApprovalEmail(data));
    const subject = emailSubject(`Protección pendiente de aprobación - ${data.policyNumber}`);

    const text = `
Hola${data.recipientName ? ` ${data.recipientName}` : ''},

La protección #${data.policyNumber} completó todas las investigaciones y está lista para aprobación final.

Revisar protección: ${data.policyLink}

© ${new Date().getFullYear()} ${COMPANY_NAME}. Todos los derechos reservados.
    `.trim();

    return await EmailProvider.sendEmail({ to: data.email, subject, html, text });
  } catch (error) {
    console.error('Failed to send policy pending approval email:', error);
    return false;
  }
};
