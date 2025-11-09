import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
    rentals,
    rentalItems,
    customers,
    inventoryItems,
    clothingModels,
    user,
} from '@/db/schema';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { createRentalSchema, checkInventoryAvailability, createPayment } from '@/lib/db-utils';

const createRentalRequestSchema = z.object({
    customerId: z.string().min(1, 'Customer ID is required'),
    rentalDuration: z.number().min(1, 'Rental duration must be at least 1 day'),
    notes: z.string().optional(),
    items: z.array(z.object({
        inventoryItemId: z.string().min(1, 'Inventory item ID is required'),
        returnDate: z.string().min(1, 'Return date is required'),
    })).min(1, 'At least one item is required'),
});

// GET /api/rentals - List rentals with optional filtering
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const customerId = searchParams.get('customerId');
        const cashierId = searchParams.get('cashierId');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        let query = db.select({
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
            customer: {
                id: customers.id,
                name: customers.name,
                phoneNumber: customers.phoneNumber,
                email: customers.email,
            },
            cashier: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
            itemCount: sql<number>`count(${rentalItems.id})`.mapWith(Number),
        })
            .from(rentals)
            .leftJoin(customers, eq(rentals.customerId, customers.id))
            .leftJoin(rentalItems, eq(rentals.id, rentalItems.rentalId))
            .leftJoin(user, eq(rentals.cashierId, user.id))
            .groupBy(rentals.id, customers.id, user.id);

        // Apply filters
        const conditions = [];
        if (status) {
            conditions.push(eq(rentals.status, status));
        }
        if (customerId) {
            conditions.push(eq(rentals.customerId, customerId));
        }
        if (cashierId) {
            conditions.push(eq(rentals.cashierId, cashierId));
        }

        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }

        // Apply pagination and ordering
        const rentalList = await query
            .orderBy(desc(rentals.rentalDate))
            .limit(limit)
            .offset(offset);

        // Get total count for pagination
        let countQuery = db.select({ count: sql`count(*)` }).from(rentals);

        if (conditions.length > 0) {
            countQuery = countQuery.where(and(...conditions));
        }

        const [{ count }] = await countQuery;

        return NextResponse.json({
            data: rentalList,
            pagination: {
                page,
                limit,
                total: parseInt(count as string),
                totalPages: Math.ceil(parseInt(count as string) / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching rentals:', error);
        return NextResponse.json(
            { error: 'Failed to fetch rentals' },
            { status: 500 }
        );
    }
}

// POST /api/rentals - Create new rental
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validatedData = createRentalRequestSchema.parse(body);

        // TODO: Get cashier ID from auth session
        const cashierId = 'cashier-001'; // Temporary hardcoded value

        // Convert string dates to Date objects
        const itemsWithDates = validatedData.items.map(item => ({
            ...item,
            returnDate: new Date(item.returnDate),
        }));

        // Check inventory availability
        const inventoryItemIds = itemsWithDates.map(item => item.inventoryItemId);
        const isAvailable = await checkInventoryAvailability(inventoryItemIds);

        if (!isAvailable) {
            return NextResponse.json(
                { error: 'One or more items are not available' },
                { status: 400 }
            );
        }

        // Create rental using utility function
        const rental = await createRental({
            customerId: validatedData.customerId,
            cashierId,
            items: itemsWithDates,
            rentalDuration: validatedData.rentalDuration,
            notes: validatedData.notes,
        });

        return NextResponse.json({ data: rental }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Error creating rental:', error);
        return NextResponse.json(
            { error: 'Failed to create rental' },
            { status: 500 }
        );
    }
}