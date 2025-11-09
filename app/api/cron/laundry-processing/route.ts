import { NextRequest, NextResponse } from 'next/server';
import { laundryManager } from '@/lib/cron-jobs/laundry-manager';

/**
 * Scheduled Job: Automatic Laundry Cycle Processing
 *
 * This endpoint is designed to be called by a cron job scheduler
 * (like Vercel Cron Jobs, GitHub Actions, or traditional cron)
 * to automatically process overdue laundry cycles.
 *
 * Recommended schedule: Every hour
 *
 * Example Vercel cron configuration in vercel.json:
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/laundry-processing",
 *       "schedule": "0 * * * *"
 *     }
 *   ]
 * }
 */

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron job request (optional security measure)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🧺 Scheduled laundry processing started');

    const startTime = new Date();
    const result = await laundryManager.processOverdueLaundryCycles();
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    // Log the results for monitoring
    console.log(`🧺 Scheduled laundry processing completed in ${duration}ms`);
    console.log(`   - Processed: ${result.processed} cycles`);
    console.log(`   - Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.error('   - Error details:', result.errors);
    }

    return NextResponse.json({
      success: true,
      message: 'Scheduled laundry processing completed',
      data: {
        processed: result.processed,
        errors: result.errors.length,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        errorDetails: result.errors,
      },
    });
  } catch (error) {
    console.error('❌ Scheduled laundry processing failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Scheduled laundry processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}