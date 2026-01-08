import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { sendIncompleteActorReminders } from '@/services/reminderService';

/**
 * Vercel Cron Job endpoint for sending daily reminders about incomplete actor information
 * Runs daily at 11:30 AM Mexico City time (17:30 UTC)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In production, verify the cron secret
    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Additional Vercel cron header check
    const isVercelCron = headersList.get('x-vercel-cron') === '1';

    // Allow manual triggers in development
    if (process.env.NODE_ENV === 'production' && !isVercelCron) {
      return NextResponse.json(
        { error: 'This endpoint can only be called by Vercel Cron' },
        { status: 401 }
      );
    }

    console.log('[CRON] Starting incomplete actors reminder job at', new Date().toISOString());

    // Execute the reminder service
    const result = await sendIncompleteActorReminders();

    console.log('[CRON] Completed incomplete actors reminder job:', result);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result: {
        policiesProcessed: result.policiesProcessed,
        remindersSent: result.remindersSent,
        errors: result.errors
      }
    });

  } catch (error) {
    console.error('[CRON] Error in incomplete actors reminder job:', error);

    // Return 200 even on error to prevent Vercel from retrying immediately
    // Log the error for monitoring
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}