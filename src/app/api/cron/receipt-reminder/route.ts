import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { sendMonthlyReceiptReminders } from '@/services/receiptReminderService';

/**
 * Vercel Cron Job endpoint for sending monthly receipt reminders to tenants.
 * Runs on the 1st of each month at 9:00 AM Mexico City time (15:00 UTC).
 */
export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In production, verify the cron secret
    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Additional Vercel cron header check
    const isVercelCron = headersList.get('x-vercel-cron') === '1';
    if (process.env.NODE_ENV === 'production' && !isVercelCron) {
      return NextResponse.json(
        { error: 'This endpoint can only be called by Vercel Cron' },
        { status: 401 },
      );
    }

    console.log('[CRON] Starting monthly receipt reminder job at', new Date().toISOString());

    const result = await sendMonthlyReceiptReminders();

    console.log('[CRON] Completed monthly receipt reminder job:', result);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result: {
        policiesProcessed: result.policiesProcessed,
        remindersSent: result.remindersSent,
        skipped: result.skipped,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error('[CRON] Error in receipt reminder job:', error);

    // Return 200 even on error to prevent Vercel from retrying immediately
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}
