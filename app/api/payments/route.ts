import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payments, rentals, customers, user } from '@/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { z } from 'zod';
import { createPayment } from '@/lib/db-utils';

const createPaymentSchema = z.object({
    rentalId: z.string().min(1, 'Rental ID is required'),
    amount: z.number().min(0, 'Amount must be positive'),
    method: z.enum(['cash', 'transfer', 'card']),
    transactionReference: z.string().optional(),
    notes: z.string().optional(),
});

// GET /api/payments - List payments with optional filtering
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const rentalId = searchParams.get('rentalId');
        const cashierId = searchParams.get('cashierId');
        const method = searchParams.get('method');
        const status = searchParams.get('status');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        let query = db.select({
            id: payments.id,
            amount: payments.amount,
            method: payments.method,
            status: payments.status,
            transactionReference: payments.transactionReference,
            notes: payments.notes,
            createdAt: payments.createdAt,
            rental: {
                id: rentals.id,
                status: rentals.status,
                customerName: sql<string>`(SELECT name FROM customers WHERE id = ${rentals.customerId})`,
            },
            cashier: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        })
            .from(payments)
            .leftJoin(rentals, eq(payments.rentalId, rentals.id))
            .leftJoin(user, eq(payments.cashierId, user.id));

        // Apply filters
        const conditions = [];
        if (rentalId) {
            conditions.push(eq(payments.rentalId, rentalId));
        }
        if (cashierId) {
            conditions.push(eq(payments.cashierId, cashierId));
        }
        if (method) {
            conditions.push(eq(payments.method, method));
        }
        if (status) {
            conditions.push(eq(payments.status, status));
        }
        if (startDate) {
            conditions.push(sql`${payments.createdAt} >= ${new Date(startDate)}`);
        }
        if (endDate) {
            conditions.push(sql`${payments.createdAt} <= ${new Date(endDate)}`);
        }

        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }

        // Apply pagination and ordering
        const paymentList = await query
            .orderBy(desc(payments.createdAt))
            .limit(limit)
            .offset(offset);

        // Get total count for pagination
        let countQuery = db.select({ count: sql`count(*)` }).from(payments);

        if (conditions.length > 0) {
            countQuery = countQuery.where(and(...conditions));
        }

        const [{ count }] = await countQuery;

        return NextResponse.json({
            data: paymentList,
            pagination: {
                page,
                limit,
                total: parseInt(count as string),
                totalPages: Math.ceil(parseInt(count as string) / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching payments:', error);
        return NextResponse.json(
            { error: 'Failed to fetch payments' },
            { status: 500 }
        );
    }
}

// POST /api/payments - Create new payment
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validatedData = createPaymentSchema.parse(body);

        // TODO: Get cashier ID from auth session
        const cashierId = 'cashier-001'; // Temporary hardcoded value

        // Verify rental exists
        const [rental] = await db.select()
            .from(rentals)
            .where(eq(rentals.id, validatedData.rentalId))
            .limit(1);

        if (!rental) {
            return NextResponse.json(
                { error: 'Rental not found' },
                { status: 404 }
            );
        }

        // Create payment using utility function
        const payment = await createPayment({
            ...validatedData,
            cashierId,
        });

        return NextResponse.json({ data: payment }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Error creating payment:', error);
        return NextResponse.json(
            { error: 'Failed to create payment' },
            { status: 500 }
        );
    }
}