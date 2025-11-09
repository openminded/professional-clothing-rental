import { NextRequest, NextResponse } from 'next/server';
import { laundryManager } from '@/lib/cron-jobs/laundry-manager';

/**
 * API endpoint to manually trigger laundry cycle processing
 * This can be called by admins or scheduled jobs
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🧺 Manual laundry processing triggered via API');

    const result = await laundryManager.processOverdueLaundryCycles();

    return NextResponse.json({
      success: true,
      message: 'Laundry cycles processed successfully',
      data: {
        processed: result.processed,
        errors: result.errors.length,
        errorDetails: result.errors,
      },
    });
  } catch (error) {
    console.error('❌ Error in laundry processing API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process laundry cycles',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check current laundry statistics
 */
export async function GET(request: NextRequest) {
  try {
    const stats = await laundryManager.getLaundryStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('❌ Error fetching laundry stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch laundry statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}