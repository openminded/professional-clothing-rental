import { NextRequest, NextResponse } from 'next/server';
import { laundryManager } from '@/lib/cron-jobs/laundry-manager';
import { z } from 'zod';

const extendLaundrySchema = z.object({
  additionalDays: z.number().min(1).max(14),
  reason: z.string().optional(),
});

/**
 * Extend a laundry cycle duration
 * Used when items need more cleaning time
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { additionalDays, reason } = extendLaundrySchema.parse(body);

    // TODO: Get user ID from authentication
    const userId = 'system'; // Replace with actual user authentication

    await laundryManager.extendLaundryCycle(id, additionalDays, userId, reason);

    return NextResponse.json({
      success: true,
      message: `Laundry cycle extended by ${additionalDays} days`,
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

    console.error('❌ Error extending laundry cycle:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to extend laundry cycle',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}