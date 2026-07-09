import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { cfdiReconciliationService } from '@/lib/services/cfdi/reconciliationService';

/**
 * Vercel Cron Job endpoint reconciling CFDI records against micfdi (#216).
 * micfdi sends no webhooks, so this daily poll advances non-terminal
 * CfdiRecords (registered/validated/…) and captures folio/uuid/totals once the
 * client stamps their invoice at the portal. Runs daily at 6:30 AM Mexico City
 * time (12:30 UTC).
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

    console.log('[CRON] Starting CFDI reconcile job at', new Date().toISOString());

    const result = await cfdiReconciliationService.reconcilePending();

    console.log('[CRON] Completed CFDI reconcile job:', result);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error) {
    console.error('[CRON] Error in CFDI reconcile job:', error);

    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}
