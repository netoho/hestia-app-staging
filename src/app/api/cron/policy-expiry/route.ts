import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { expireActivePolicies } from '@/lib/services/policyWorkflowService';

/**
 * Vercel Cron Job endpoint for expiring active policies whose contract has ended.
 * Runs daily at 6:00 AM Mexico City time (12:00 UTC).
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

    console.log('[CRON] Starting policy expiry job at', new Date().toISOString());

    const result = await expireActivePolicies();

    console.log('[CRON] Completed policy expiry job:', result);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error) {
    console.error('[CRON] Error in policy expiry job:', error);

    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}
