import { NextRequest, NextResponse } from 'next/server';
import { laundryManager } from '@/lib/cron-jobs/laundry-manager';
import { z } from 'zod';

const completeLaundrySchema = z.object({
  notes: z.string().optional(),
});

/**
 * Manual completion of a laundry cycle
 * Used when laundry is completed ahead of schedule
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { notes } = completeLaundrySchema.parse(body);

    // TODO: Get user ID from authentication
    const userId = 'system'; // Replace with actual user authentication

    await laundryManager.completeLaundryCycleEarly(id, userId, notes);

    return NextResponse.json({
      success: true,
      message: 'Laundry cycle completed successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error('❌ Error completing laundry cycle:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to complete laundry cycle',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}