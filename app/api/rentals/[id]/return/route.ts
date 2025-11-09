import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rentals, rentalItems, inventoryItems, payments } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { processRentalReturn, logActivity } from '@/lib/db-utils';

const returnSchema = z.object({
    notes: z.string().optional(),
    paymentMethod: z.enum(['cash', 'transfer', 'card']).optional(),
    transactionReference: z.string().optional(),
});

// POST /api/rentals/[id]/return - Process rental return
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();
        const validatedData = returnSchema.parse(body);

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

        if (rental.status !== 'active') {
            return NextResponse.json(
                { error: `Cannot process return for rental with status: ${rental.status}` },
                { status: 400 }
            );
        }

        // Process return using utility function
        const { rental: updatedRental, totalLateFees } = await processRentalReturn(id, cashierId);

        // Update rental notes if provided
        if (validatedData.notes) {
            await db.update(rentals)
                .set({ notes: validatedData.notes })
                .where(eq(rentals.id, id));
        }

        // Create payment for late fees if applicable
        let lateFeePayment = null;
        if (totalLateFees > 0) {
            lateFeePayment = await db.insert(payments).values({
                rentalId: id,
                cashierId,
                amount: totalLateFees.toString(),
                method: validatedData.paymentMethod || 'cash',
                status: 'paid',
                transactionReference: validatedData.transactionReference,
                notes: `Late fees for rental ${id}`,
            }).returning();
        }

        // Get updated rental with items and payment info
        const [rentalWithDetails] = await db.select({
            id: rentals.id,
            status: rentals.status,
            rentalDate: rentals.rentalDate,
            expectedReturnDate: rentals.expectedReturnDate,
            actualReturnDate: rentals.actualReturnDate,
            subtotal: rentals.subtotal,
            lateFees: rentals.lateFees,
            totalAmount: rentals.totalAmount,
            notes: rentals.notes,
            customerName: sql<string>`(SELECT name FROM customers WHERE id = ${rentals.customerId})`,
            items: sql<string>`array_agg(
                json_build_object(
                    'id', ${rentalItems.id},
                    'sku', ${inventoryItems.sku},
                    'itemName', (SELECT name FROM clothing_models WHERE id = ${inventoryItems.modelId}),
                    'size', ${inventoryItems.size},
                    'color', ${inventoryItems.color},
                    'actualReturnDate', ${rentalItems.actualReturnDate},
                    'calculatedFees', ${rentalItems.calculatedFees}
                )
            )`,
            totalPayments: sql<number>`(SELECT COALESCE(sum(amount), 0) FROM payments WHERE rental_id = ${rentals.id})`.mapWith(Number),
        })
            .from(rentals)
            .leftJoin(rentalItems, eq(rentals.id, rentalItems.rentalId))
            .leftJoin(inventoryItems, eq(rentalItems.inventoryItemId, inventoryItems.id))
            .where(eq(rentals.id, id))
            .groupBy(rentals.id);

        // Log detailed return activity
        await logActivity({
            entityType: 'rental',
            entityId: id,
            action: 'return_processed',
            description: `Rental ${id} returned with $${totalLateFees.toFixed(2)} in late fees`,
            userId: cashierId,
            newValues: JSON.stringify({
                status: 'completed',
                actualReturnDate: new Date(),
                lateFees: totalLateFees.toString(),
                paymentMethod: validatedData.paymentMethod,
                notes: validatedData.notes,
            }),
        });

        return NextResponse.json({
            data: rentalWithDetails,
            lateFeePayment,
            message: 'Rental return processed successfully',
            lateFees: totalLateFees,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Error processing rental return:', error);
        return NextResponse.json(
            { error: 'Failed to process rental return' },
            { status: 500 }
        );
    }
}