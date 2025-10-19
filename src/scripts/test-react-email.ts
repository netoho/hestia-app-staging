#!/usr/bin/env bun

/**
 * Test script for React Email templates
 * Usage: bun run src/scripts/test-react-email.ts
 */

import { render } from '@react-email/render';
import { PolicyInvitationEmail } from '../templates/email/react-email/PolicyInvitationEmail';
import { PolicySubmissionEmail } from '../templates/email/react-email/PolicySubmissionEmail';
import { PolicyStatusUpdateEmail } from '../templates/email/react-email/PolicyStatusUpdateEmail';

async function testEmailTemplates() {
  console.log('🧪 Testing React Email templates...\n');

  // Test data
  const policyInvitationData = {
    tenantEmail: 'juan.perez@example.com',
    tenantName: 'Juan Pérez',
    propertyAddress: 'Av. Reforma 123, Col. Centro, CDMX',
    accessToken: 'test-token-123',
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    initiatorName: 'María García'
  };

  const policySubmissionData = {
    tenantEmail: 'juan.perez@example.com',
    tenantName: 'Juan Pérez',
    policyId: 'POL-2025-001',
    submittedAt: new Date()
  };

  const policyStatusUpdateData = {
    tenantEmail: 'juan.perez@example.com',
    tenantName: 'Juan Pérez',
    status: 'approved' as const,
    reason: 'Todos los documentos están en orden y las referencias han sido verificadas.',
    reviewerName: 'Ana López'
  };

  try {
    // Test Policy Invitation Email
    console.log('1️⃣ Testing Policy Invitation Email...');
    const invitationHtml = await render(PolicyInvitationEmail(policyInvitationData));
    console.log(`✅ Policy Invitation rendered successfully (${invitationHtml.length} characters)`);

    // Test Policy Submission Email
    console.log('\n2️⃣ Testing Policy Submission Email...');
    const submissionHtml = await render(PolicySubmissionEmail(policySubmissionData));
    console.log(`✅ Policy Submission rendered successfully (${submissionHtml.length} characters)`);

    // Test Policy Status Update Email (Approved)
    console.log('\n3️⃣ Testing Policy Status Update Email (Approved)...');
    const statusApprovedHtml = await render(PolicyStatusUpdateEmail(policyStatusUpdateData));
    console.log(`✅ Policy Status Update (Approved) rendered successfully (${statusApprovedHtml.length} characters)`);

    // Test Policy Status Update Email (Denied)
    console.log('\n4️⃣ Testing Policy Status Update Email (Denied)...');
    const statusDeniedData = {
      ...policyStatusUpdateData,
      status: 'denied' as const,
      reason: 'Los ingresos declarados no cumplen con los requisitos mínimos de la protección.'
    };
    const statusDeniedHtml = await render(PolicyStatusUpdateEmail(statusDeniedData));
    console.log(`✅ Policy Status Update (Denied) rendered successfully (${statusDeniedHtml.length} characters)`);

    console.log('\n🎉 All React Email templates tested successfully!');
    console.log('\n📧 Templates are ready for production use with SMTP, Resend, or Mailgun providers.');

  } catch (error) {
    console.error('❌ Error testing email templates:', error);
    process.exit(1);
  }
}

// Run the test
testEmailTemplates();
