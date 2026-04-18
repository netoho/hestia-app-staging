import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { sendPolicyExpirationReminders } from '@/services/policyExpirationReminderService';

/**
 * Vercel Cron: pre-expiration reminders to primary landlord at tiers
 * 60, 45, 30, 14, and 1 days before expiresAt. Tier 1 also notifies broker + admins.
 * Runs daily at 7:00 AM Mexico City time (13:00 UTC).
 */
export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const isVercelCron = headersList.get('x-vercel-cron') === '1';
    if (process.env.NODE_ENV === 'production' && !isVercelCron) {
      return NextResponse.json(
        { error: 'This endpoint can only be called by Vercel Cron' },
        { status: 401 },
      );
    }

    console.log('[CRON] Starting policy expiration reminder job at', new Date().toISOString());

    const result = await sendPolicyExpirationReminders();

    console.log('[CRON] Completed policy expiration reminder job:', {
      totalRemindersSent: result.totalRemindersSent,
      totalErrors: result.totalErrors,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error) {
    console.error('[CRON] Error in policy expiration reminder job:', error);

    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}
