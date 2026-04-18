import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { sendPolicyQuarterlyFollowups } from '@/services/policyQuarterlyFollowupService';

/**
 * Vercel Cron: quarterly follow-up to primary landlord of every ACTIVE policy
 * that hasn't received one in the last 90 days. Runs daily at 7:30 AM Mexico
 * City time (13:30 UTC) and processes up to 200 policies per run.
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

    console.log('[CRON] Starting quarterly follow-up job at', new Date().toISOString());

    const result = await sendPolicyQuarterlyFollowups();

    console.log('[CRON] Completed quarterly follow-up job:', result);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error) {
    console.error('[CRON] Error in quarterly follow-up job:', error);

    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}
