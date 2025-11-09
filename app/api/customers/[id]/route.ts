import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customers, rentals, rentalItems, inventoryItems, clothingModels } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { logActivity } from '@/lib/db-utils';

const updateCustomerSchema = z.object({
    name: z.string().min(1, 'Name is required').optional(),
    email: z.string().email().optional().or(z.literal('')),
    phoneNumber: z.string().min(1, 'Phone number is required').optional(),
    address: z.string().optional(),
    idNumber: z.string().optional(),
    notes: z.string().optional(),
    isActive: z.boolean().optional(),
});

// GET /api/customers/[id] - Get single customer with rental history
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        const [customer] = await db.select()
            .from(customers)
            .where(eq(customers.id, id))
            .limit(1);

        if (!customer) {
            return NextResponse.json(
                { error: 'Customer not found' },
                { status: 404 }
            );
        }

        // Get rental history
        const rentalHistory = await db.select({
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
            items: sql<string>`array_agg(
                json_build_object(
                    'id', ${rentalItems.id},
                    'sku', ${inventoryItems.sku},
                    'itemName', ${clothingModels.name},
                    'size', ${inventoryItems.size},
                    'color', ${inventoryItems.color},
                    'pickupDate', ${rentalItems.pickupDate},
                    'returnDate', ${rentalItems.returnDate},
                    'actualReturnDate', ${rentalItems.actualReturnDate}
                )
            )`,
        })
            .from(rentals)
            .leftJoin(rentalItems, eq(rentals.id, rentalItems.rentalId))
            .leftJoin(inventoryItems, eq(rentalItems.inventoryItemId, inventoryItems.id))
            .leftJoin(clothingModels, eq(inventoryItems.modelId, clothingModels.id))
            .where(eq(rentals.customerId, id))
            .groupBy(rentals.id)
            .orderBy(desc(rentals.rentalDate));

        return NextResponse.json({
            data: {
                ...customer,
                rentalHistory,
            },
        });
    } catch (error) {
        console.error('Error fetching customer:', error);
        return NextResponse.json(
            { error: 'Failed to fetch customer' },
            { status: 500 }
        );
    }
}

// PUT /api/customers/[id] - Update customer
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();
        const validatedData = updateCustomerSchema.parse(body);

        // Check if customer exists
        const [existingCustomer] = await db.select()
            .from(customers)
            .where(eq(customers.id, id))
            .limit(1);

        if (!existingCustomer) {
            return NextResponse.json(
                { error: 'Customer not found' },
                { status: 404 }
            );
        }

        // If updating email, check if it already exists (excluding current customer)
        if (validatedData.email && validatedData.email !== existingCustomer.email) {
            const [duplicateCustomer] = await db.select()
                .from(customers)
                .and(
                    and(
                        eq(customers.email, validatedData.email),
                        sql`${customers.id} != ${id}`
                    )
                )
                .limit(1);

            if (duplicateCustomer) {
                return NextResponse.json(
                    { error: 'Email already exists' },
                    { status: 400 }
                );
            }
        }

        // If updating phone number, check if it already exists
        if (validatedData.phoneNumber && validatedData.phoneNumber !== existingCustomer.phoneNumber) {
            const [duplicatePhone] = await db.select()
                .from(customers)
                .and(
                    and(
                        eq(customers.phoneNumber, validatedData.phoneNumber),
                        sql`${customers.id} != ${id}`
                    )
                )
                .limit(1);

            if (duplicatePhone) {
                return NextResponse.json(
                    { error: 'Phone number already exists' },
                    { status: 400 }
                );
            }
        }

        // If updating ID number, check if it already exists
        if (validatedData.idNumber && validatedData.idNumber !== existingCustomer.idNumber) {
            const [duplicateId] = await db.select()
                .from(customers)
                .and(
                    and(
                        eq(customers.idNumber, validatedData.idNumber),
                        sql`${customers.id} != ${id}`
                    )
                )
                .limit(1);

            if (duplicateId) {
                return NextResponse.json(
                    { error: 'ID number already exists' },
                    { status: 400 }
                );
            }
        }

        const [updatedCustomer] = await db.update(customers)
            .set({
                ...validatedData,
                updatedAt: new Date(),
            })
            .where(eq(customers.id, id))
            .returning();

        // Log activity
        await logActivity({
            entityType: 'customer',
            entityId: id,
            action: 'update',
            description: `Customer ${updatedCustomer.name} updated`,
            userId: 'system', // TODO: Get from auth session
            oldValues: JSON.stringify(existingCustomer),
            newValues: JSON.stringify(validatedData),
        });

        return NextResponse.json({ data: updatedCustomer });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Error updating customer:', error);
        return NextResponse.json(
            { error: 'Failed to update customer' },
            { status: 500 }
        );
    }
}

// DELETE /api/customers/[id] - Delete customer
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        // Check if customer exists
        const [existingCustomer] = await db.select()
            .from(customers)
            .where(eq(customers.id, id))
            .limit(1);

        if (!existingCustomer) {
            return NextResponse.json(
                { error: 'Customer not found' },
                { status: 404 }
            );
        }

        // Check if customer has active rentals
        const [activeRentals] = await db.select({ count: sql`count(*)` })
            .from(rentals)
            .where(and(
                eq(rentals.customerId, id),
                eq(rentals.status, 'active')
            ));

        if (parseInt(activeRentals.count as string) > 0) {
            return NextResponse.json(
                { error: 'Cannot delete customer with active rentals' },
                { status: 400 }
            );
        }

        // For soft delete, we could set isActive to false
        // For hard delete, we need to check if there are any rental records
        const [totalRentals] = await db.select({ count: sql`count(*)` })
            .from(rentals)
            .where(eq(rentals.customerId, id));

        if (parseInt(totalRentals.count as string) > 0) {
            // Soft delete - mark as inactive
            await db.update(customers)
                .set({
                    isActive: false,
                    updatedAt: new Date(),
                })
                .where(eq(customers.id, id));

            // Log activity
            await logActivity({
                entityType: 'customer',
                entityId: id,
                action: 'soft_delete',
                description: `Customer ${existingCustomer.name} deactivated (soft delete)`,
                userId: 'system', // TODO: Get from auth session
                oldValues: JSON.stringify({ isActive: true }),
                newValues: JSON.stringify({ isActive: false }),
            });

            return NextResponse.json(
                { message: 'Customer deactivated successfully' }
            );
        } else {
            // Hard delete - no rental history
            await db.delete(customers)
                .where(eq(customers.id, id));

            // Log activity
            await logActivity({
                entityType: 'customer',
                entityId: id,
                action: 'delete',
                description: `Customer ${existingCustomer.name} deleted permanently`,
                userId: 'system', // TODO: Get from auth session
                oldValues: JSON.stringify(existingCustomer),
            });

            return NextResponse.json(
                { message: 'Customer deleted successfully' }
            );
        }
    } catch (error) {
        console.error('Error deleting customer:', error);
        return NextResponse.json(
            { error: 'Failed to delete customer' },
            { status: 500 }
        );
    }
}