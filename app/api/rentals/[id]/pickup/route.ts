import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rentals, rentalItems, inventoryItems, user } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { processRentalPickup, logActivity } from '@/lib/db-utils';

const pickupSchema = z.object({
    notes: z.string().optional(),
});

// POST /api/rentals/[id]/pickup - Process rental pickup
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();
        const validatedData = pickupSchema.parse(body);

        // TODO: Get cashier ID from auth session
        const cashierId = 'cashier-001'; // Temporary hardcoded value

        // Check if rental exists and is in correct status
        const [rental] = await db.select()
            .from(rentals)
            .where(eq(rentals.id, id))
            .limit(1);

        if (!rental) {
            return NextResponse.json(
                { error: 'Rental not found' },
                { status: 404 }
            );
        }

        if (rental.status !== 'pending') {
            return NextResponse.json(
                { error: `Cannot process pickup for rental with status: ${rental.status}` },
                { status: 400 }
            );
        }

        // Process pickup using utility function
        const updatedRental = await processRentalPickup(id, cashierId);

        // Update rental notes if provided
        if (validatedData.notes) {
            await db.update(rentals)
                .set({ notes: validatedData.notes })
                .where(eq(rentals.id, id));
        }

        // Get updated rental with items
        const rentalWithItems = await db.select({
            id: rentals.id,
            status: rentals.status,
            rentalDate: rentals.rentalDate,
            expectedReturnDate: rentals.expectedReturnDate,
            notes: rentals.notes,
            customerName: sql<string>`(SELECT name FROM customers WHERE id = ${rentals.customerId})`,
            items: sql<string>`array_agg(
                json_build_object(
                    'id', ${rentalItems.id},
                    'sku', ${inventoryItems.sku},
                    'itemName', (SELECT name FROM clothing_models WHERE id = ${inventoryItems.modelId}),
                    'size', ${inventoryItems.size},
                    'color', ${inventoryItems.color},
                    'pickupDate', ${rentalItems.pickupDate}
                )
            )`,
        })
            .from(rentals)
            .leftJoin(rentalItems, eq(rentals.id, rentalItems.rentalId))
            .leftJoin(inventoryItems, eq(rentalItems.inventoryItemId, inventoryItems.id))
            .where(eq(rentals.id, id))
            .groupBy(rentals.id);

        // Log detailed pickup activity
        await logActivity({
            entityType: 'rental',
            entityId: id,
            action: 'pickup_processed',
            description: `Rental ${id} picked up by customer`,
            userId: cashierId,
            newValues: JSON.stringify({
                status: 'active',
                pickupDate: new Date(),
                notes: validatedData.notes,
            }),
        });

        return NextResponse.json({
            data: rentalWithItems[0],
            message: 'Rental pickup processed successfully',
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Error processing rental pickup:', error);
        return NextResponse.json(
            { error: 'Failed to process rental pickup' },
            { status: 500 }
        );
    }
}