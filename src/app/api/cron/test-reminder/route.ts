import { NextRequest, NextResponse } from 'next/server';
import { sendIncompleteActorReminders } from '@/services/reminderService';

/**
 * Test endpoint for manually triggering the incomplete actors reminder
 * Only available in development environment
 */
export async function GET(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development' },
        { status: 403 }
      );
    }

    console.log('[TEST] Manually triggering incomplete actors reminder...');

    // Execute the reminder service
    const result = await sendIncompleteActorReminders();

    console.log('[TEST] Reminder job completed:', result);

    return NextResponse.json({
      success: true,
      message: 'Test reminder executed successfully',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      result: {
        policiesProcessed: result.policiesProcessed,
        remindersSent: result.remindersSent,
        errors: result.errors,
        details: {
          emailProvider: process.env.EMAIL_PROVIDER || 'resend',
          fromEmail: process.env.EMAIL_FROM || 'onboarding@resend.dev',
          nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000'
        }
      }
    });

  } catch (error) {
    console.error('[TEST] Error in test reminder:', error);

    return NextResponse.json({
      success: false,
      message: 'Test reminder failed',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}