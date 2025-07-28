#!/usr/bin/env bun
// Test script for the new email system
// Usage: bun run src/scripts/test-email.ts

import { sendPolicyInvitation, sendPolicySubmissionConfirmation, sendPolicyStatusUpdate } from '@/lib/services/emailService';

async function testEmailSystem() {
  console.log('🧪 Testing Email System Enhancement...\n');

  // Test data
  const testEmail = process.env.TEST_EMAIL || 'test@example.com';
  
  console.log(`📧 Testing with email: ${testEmail}`);
  console.log(`🏷️  Using provider: ${process.env.EMAIL_PROVIDER || 'resend'}\n`);

  try {
    // Test 1: Policy Invitation
    console.log('1️⃣ Testing Policy Invitation Email...');
    const invitationResult = await sendPolicyInvitation({
      tenantEmail: testEmail,
      tenantName: 'Juan Pérez',
      propertyAddress: 'Av. Reforma 123, Ciudad de México',
      accessToken: 'test-token-123',
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      initiatorName: 'María González'
    });
    console.log(`   Result: ${invitationResult ? '✅ SUCCESS' : '❌ FAILED'}\n`);

    // Test 2: Policy Submission Confirmation
    console.log('2️⃣ Testing Policy Submission Confirmation Email...');
    const submissionResult = await sendPolicySubmissionConfirmation({
      tenantEmail: testEmail,
      tenantName: 'Juan Pérez',
      policyId: 'POL-2025-001',
      submittedAt: new Date()
    });
    console.log(`   Result: ${submissionResult ? '✅ SUCCESS' : '❌ FAILED'}\n`);

    // Test 3: Policy Status Update (Approved)
    console.log('3️⃣ Testing Policy Status Update Email (Approved)...');
    const approvedResult = await sendPolicyStatusUpdate({
      tenantEmail: testEmail,
      tenantName: 'Juan Pérez',
      status: 'approved',
      reviewerName: 'Ana Martínez'
    });
    console.log(`   Result: ${approvedResult ? '✅ SUCCESS' : '❌ FAILED'}\n`);

    // Test 4: Policy Status Update (Denied)
    console.log('4️⃣ Testing Policy Status Update Email (Denied)...');
    const deniedResult = await sendPolicyStatusUpdate({
      tenantEmail: testEmail,
      tenantName: 'Juan Pérez',
      status: 'denied',
      reason: 'Documentación incompleta - favor de proporcionar comprobante de ingresos actualizado',
      reviewerName: 'Carlos Rodríguez'
    });
    console.log(`   Result: ${deniedResult ? '✅ SUCCESS' : '❌ FAILED'}\n`);

    // Summary
    const allResults = [invitationResult, submissionResult, approvedResult, deniedResult];
    const successCount = allResults.filter(Boolean).length;
    
    console.log('📊 Test Summary:');
    console.log(`   ✅ Successful: ${successCount}/4`);
    console.log(`   ❌ Failed: ${4 - successCount}/4`);
    
    if (successCount === 4) {
      console.log('\n🎉 All email tests passed! Email system is working correctly.');
    } else {
      console.log('\n⚠️  Some email tests failed. Check your email provider configuration.');
    }

  } catch (error) {
    console.error('❌ Email test failed with error:', error);
    process.exit(1);
  }
}

// Run the test
testEmailSystem().catch(console.error);