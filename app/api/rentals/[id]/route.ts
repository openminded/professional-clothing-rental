import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
    rentals,
    rentalItems,
    customers,
    inventoryItems,
    clothingModels,
    user,
    payments,
} from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logActivity } from '@/lib/db-utils';

// GET /api/rentals/[id] - Get single rental with full details
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        const [rental] = await db.select({
            id: rentals.id,
            status: rentals.status,
            rentalDate: rentals.rentalDate,
            expectedReturnDate: rentals.expectedReturnDate,
            actualReturnDate: rentals.actualReturnDate,
            subtotal: rentals.subtotal,
            lateFees: rentals.lateFees,
            totalAmount: rentals.totalAmount,
            notes: rentals.notes,
            createdAt: rentals.createdAt,
            updatedAt: rentals.updatedAt,
            customer: {
                id: customers.id,
                name: customers.name,
                phoneNumber: customers.phoneNumber,
                email: customers.email,
                address: customers.address,
            },
            cashier: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        })
            .from(rentals)
            .leftJoin(customers, eq(rentals.customerId, customers.id))
            .leftJoin(user, eq(rentals.cashierId, user.id))
            .where(eq(rentals.id, id))
            .limit(1);

        if (!rental) {
            return NextResponse.json(
                { error: 'Rental not found' },
                { status: 404 }
            );
        }

        // Get rental items
        const items = await db.select({
            id: rentalItems.id,
            pickupDate: rentalItems.pickupDate,
            returnDate: rentalItems.returnDate,
            actualReturnDate: rentalItems.actualReturnDate,
            dailyRate: rentalItems.dailyRate,
            lateFeeRate: rentalItems.lateFeeRate,
            calculatedFees: rentalItems.calculatedFees,
            notes: rentalItems.notes,
            inventoryItem: {
                id: inventoryItems.id,
                sku: inventoryItems.sku,
                size: inventoryItems.size,
                color: inventoryItems.color,
                condition: inventoryItems.condition,
            },
            model: {
                id: clothingModels.id,
                name: clothingModels.name,
                category: clothingModels.category,
                brand: clothingModels.brand,
                imageUrl: clothingModels.imageUrl,
            },
        })
            .from(rentalItems)
            .leftJoin(inventoryItems, eq(rentalItems.inventoryItemId, inventoryItems.id))
            .leftJoin(clothingModels, eq(inventoryItems.modelId, clothingModels.id))
            .where(eq(rentalItems.rentalId, id));

        // Get payments
        const rentalPayments = await db.select()
            .from(payments)
            .where(eq(payments.rentalId, id))
            .orderBy(payments.createdAt);

        return NextResponse.json({
            data: {
                ...rental,
                items,
                payments: rentalPayments,
            },
        });
    } catch (error) {
        console.error('Error fetching rental:', error);
        return NextResponse.json(
            { error: 'Failed to fetch rental' },
            { status: 500 }
        );
    }
}

// PUT /api/rentals/[id] - Update rental (limited updates)
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();

        // Check if rental exists
        const [existingRental] = await db.select()
            .from(rentals)
            .where(eq(rentals.id, id))
            .limit(1);

        if (!existingRental) {
            return NextResponse.json(
                { error: 'Rental not found' },
                { status: 404 }
            );
        }

        // Only allow updating certain fields (not status or dates that should be managed by workflows)
        const allowedUpdates = {
            notes: body.notes,
        };

        const [updatedRental] = await db.update(rentals)
            .set({
                ...allowedUpdates,
                updatedAt: new Date(),
            })
            .where(eq(rentals.id, id))
            .returning();

        // Log activity
        await logActivity({
            entityType: 'rental',
            entityId: id,
            action: 'update',
            description: `Rental ${id} updated`,
            userId: 'system', // TODO: Get from auth session
            oldValues: JSON.stringify(existingRental),
            newValues: JSON.stringify(allowedUpdates),
        });

        return NextResponse.json({ data: updatedRental });
    } catch (error) {
        console.error('Error updating rental:', error);
        return NextResponse.json(
            { error: 'Failed to update rental' },
            { status: 500 }
        );
    }
}