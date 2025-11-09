import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customers, rentals } from '@/db/schema';
import { eq, and, ilike, sql, desc } from 'drizzle-orm';
import { z } from 'zod';

const createCustomerSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email().optional().or(z.literal('')),
    phoneNumber: z.string().min(1, 'Phone number is required'),
    address: z.string().optional(),
    idNumber: z.string().optional(),
    notes: z.string().optional(),
});

const updateCustomerSchema = createCustomerSchema.partial().extend({
    isActive: z.boolean().optional(),
});

// GET /api/customers - List customers with optional filtering
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const isActive = searchParams.get('isActive');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        let query = db.select({
            id: customers.id,
            name: customers.name,
            email: customers.email,
            phoneNumber: customers.phoneNumber,
            address: customers.address,
            idNumber: customers.idNumber,
            isActive: customers.isActive,
            notes: customers.notes,
            createdAt: customers.createdAt,
            updatedAt: customers.updatedAt,
            totalRentals: sql<number>`count(${rentals.id})`.mapWith(Number),
            activeRentals: sql<number>`count(CASE WHEN ${rentals.status} = 'active' THEN 1 END)`.mapWith(Number),
        })
            .from(customers)
            .leftJoin(rentals, eq(customers.id, rentals.customerId))
            .groupBy(customers.id);

        // Apply filters
        const conditions = [];
        if (search) {
            conditions.push(sql`(
                ${customers.name} ILIKE ${'%' + search + '%'} OR
                ${customers.email} ILIKE ${'%' + search + '%'} OR
                ${customers.phoneNumber} ILIKE ${'%' + search + '%'} OR
                ${customers.idNumber} ILIKE ${'%' + search + '%'}
            )`);
        }
        if (isActive !== null) {
            conditions.push(eq(customers.isActive, isActive === 'true'));
        }

        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }

        // Apply pagination and ordering
        const customerList = await query
            .orderBy(desc(customers.createdAt))
            .limit(limit)
            .offset(offset);

        // Get total count for pagination
        let countQuery = db.select({ count: sql`count(*)` }).from(customers);

        if (conditions.length > 0) {
            countQuery = countQuery.where(and(...conditions));
        }

        const [{ count }] = await countQuery;

        return NextResponse.json({
            data: customerList,
            pagination: {
                page,
                limit,
                total: parseInt(count as string),
                totalPages: Math.ceil(parseInt(count as string) / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        return NextResponse.json(
            { error: 'Failed to fetch customers' },
            { status: 500 }
        );
    }
}

// POST /api/customers - Create new customer
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validatedData = createCustomerSchema.parse(body);

        // Check if email already exists (if provided)
        if (validatedData.email) {
            const [existingCustomer] = await db.select()
                .from(customers)
                .where(eq(customers.email, validatedData.email))
                .limit(1);

            if (existingCustomer) {
                return NextResponse.json(
                    { error: 'Email already exists' },
                    { status: 400 }
                );
            }
        }

        // Check if phone number already exists
        const [existingPhone] = await db.select()
            .from(customers)
            .where(eq(customers.phoneNumber, validatedData.phoneNumber))
            .limit(1);

        if (existingPhone) {
            return NextResponse.json(
                { error: 'Phone number already exists' },
                { status: 400 }
            );
        }

        // Check if ID number already exists (if provided)
        if (validatedData.idNumber) {
            const [existingId] = await db.select()
                .from(customers)
                .where(eq(customers.idNumber, validatedData.idNumber))
                .limit(1);

            if (existingId) {
                return NextResponse.json(
                    { error: 'ID number already exists' },
                    { status: 400 }
                );
            }
        }

        const [customer] = await db.insert(customers)
            .values(validatedData)
            .returning();

        return NextResponse.json({ data: customer }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Error creating customer:', error);
        return NextResponse.json(
            { error: 'Failed to create customer' },
            { status: 500 }
        );
    }
}