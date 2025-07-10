import { Resend } from 'resend';
import { isEmulator } from '../env-check';
import { generatePolicyUrl } from '../utils/tokenUtils';

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const COMPANY_NAME = 'Hestia';
const SUPPORT_EMAIL = 'support@hestia.com';

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
  if (isEmulator()) {
    console.log('Emulator mode: Mock sending policy invitation email');
    console.log('To:', data.tenantEmail);
    console.log('Token:', data.accessToken);
    console.log('Expires:', data.expiryDate);
    return true;
  }

  try {
    const template = policyInvitationTemplate(data);
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.tenantEmail,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    console.log('Policy invitation email sent:', result);
    return true;
  } catch (error) {
    console.error('Failed to send policy invitation email:', error);
    return false;
  }
};

export const sendPolicySubmissionConfirmation = async (data: PolicySubmissionData): Promise<boolean> => {
  if (isEmulator()) {
    console.log('Emulator mode: Mock sending submission confirmation email');
    console.log('To:', data.tenantEmail);
    console.log('Policy ID:', data.policyId);
    return true;
  }

  try {
    const template = policySubmissionTemplate(data);
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.tenantEmail,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    console.log('Submission confirmation email sent:', result);
    return true;
  } catch (error) {
    console.error('Failed to send submission confirmation email:', error);
    return false;
  }
};

export const sendPolicyStatusUpdate = async (data: PolicyStatusUpdateData): Promise<boolean> => {
  if (isEmulator()) {
    console.log('Emulator mode: Mock sending status update email');
    console.log('To:', data.tenantEmail);
    console.log('Status:', data.status);
    return true;
  }

  try {
    const template = policyStatusUpdateTemplate(data);
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.tenantEmail,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    console.log('Status update email sent:', result);
    return true;
  } catch (error) {
    console.error('Failed to send status update email:', error);
    return false;
  }
};