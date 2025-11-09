import { db } from '@/db';
import {
    customers,
    clothingModels,
    inventoryItems,
    rentals,
    rentalItems,
    payments,
    laundryCycles,
    activityLogs,
    itemStatusEnum,
    rentalStatusEnum,
    paymentStatusEnum
} from '@/db/schema';
import { eq, and, gte, lte, count, sum, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

// Input validation schemas
export const createCustomerSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email().optional().or(z.literal('')),
    phoneNumber: z.string().min(1, 'Phone number is required'),
    address: z.string().optional(),
    idNumber: z.string().optional(),
    notes: z.string().optional(),
});

export const createClothingModelSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    category: z.string().min(1, 'Category is required'),
    brand: z.string().optional(),
    dailyRate: z.number().min(0, 'Daily rate must be positive'),
    lateFeeRate: z.number().min(0, 'Late fee rate must be positive'),
    imageUrl: z.string().optional(),
});

export const createInventoryItemSchema = z.object({
    modelId: z.string().min(1, 'Model ID is required'),
    sku: z.string().min(1, 'SKU is required'),
    size: z.string().min(1, 'Size is required'),
    color: z.string().min(1, 'Color is required'),
    condition: z.string().default('good'),
    notes: z.string().optional(),
});

export const createRentalSchema = z.object({
    customerId: z.string().min(1, 'Customer ID is required'),
    cashierId: z.string().min(1, 'Cashier ID is required'),
    items: z.array(z.object({
        inventoryItemId: z.string().min(1, 'Inventory item ID is required'),
        pickupDate: z.date().optional(),
        returnDate: z.date(),
    })).min(1, 'At least one item is required'),
    rentalDuration: z.number().min(1, 'Rental duration must be at least 1 day'),
    notes: z.string().optional(),
});

export const createPaymentSchema = z.object({
    rentalId: z.string().min(1, 'Rental ID is required'),
    cashierId: z.string().min(1, 'Cashier ID is required'),
    amount: z.number().min(0, 'Amount must be positive'),
    method: z.enum(['cash', 'transfer', 'card']),
    transactionReference: z.string().optional(),
    notes: z.string().optional(),
});

// Inventory management functions
export async function getAvailableInventoryItems(modelId?: string) {
    let query = db.select().from(inventoryItems)
        .where(eq(inventoryItems.status, itemStatusEnum.enumValues[0])); // available

    if (modelId) {
        query = query.where(and(
            eq(inventoryItems.status, itemStatusEnum.enumValues[0]),
            eq(inventoryItems.modelId, modelId)
        ));
    }

    return await query;
}

export async function checkInventoryAvailability(inventoryItemIds: string[]) {
    const items = await db.select()
        .from(inventoryItems)
        .where(and(
            eq(inventoryItems.status, itemStatusEnum.enumValues[0]), // available
            sql`${inventoryItems.id} = ANY(${inventoryItemIds})`
        ));

    return items.length === inventoryItemIds.length;
}

export async function lockInventoryItems(inventoryItemIds: string[]) {
    // Use SELECT FOR UPDATE to lock the rows and prevent race conditions
    return await db.transaction(async (tx) => {
        const items = await tx.select()
            .from(inventoryItems)
            .where(and(
                eq(inventoryItems.status, itemStatusEnum.enumValues[0]), // available
                sql`${inventoryItems.id} = ANY(${inventoryItemIds})`
            ))
            .for('update');

        if (items.length !== inventoryItemIds.length) {
            throw new Error('Some items are no longer available');
        }

        // Mark items as rented
        await tx.update(inventoryItems)
            .set({ status: itemStatusEnum.enumValues[1] }) // rented
            .where(sql`${inventoryItems.id} = ANY(${inventoryItemIds})`);

        return items;
    });
}

export async function releaseInventoryItems(inventoryItemIds: string[]) {
    await db.update(inventoryItems)
        .set({ status: itemStatusEnum.enumValues[0] }) // available
        .where(sql`${inventoryItems.id} = ANY(${inventoryItemIds})`);
}

// Customer management functions
export async function createCustomer(data: z.infer<typeof createCustomerSchema>) {
    const validatedData = createCustomerSchema.parse(data);

    const [customer] = await db.insert(customers)
        .values(validatedData)
        .returning();

    return customer;
}

export async function searchCustomers(query: string) {
    return await db.select()
        .from(customers)
        .where(sql`(
            ${customers.name} ILIKE ${'%' + query + '%'} OR
            ${customers.email} ILIKE ${'%' + query + '%'} OR
            ${customers.phoneNumber} ILIKE ${'%' + query + '%'}
        )`)
        .limit(20);
}

// Rental management functions
export async function createRental(data: z.infer<typeof createRentalSchema>) {
    const validatedData = createRentalSchema.parse(data);

    return await db.transaction(async (tx) => {
        // Calculate rental dates and amounts
        const rentalDate = new Date();
        const returnDate = new Date(rentalDate);
        returnDate.setDate(returnDate.getDate() + validatedData.rentalDuration);

        // Get inventory items with pricing
        const inventoryItemsWithModels = await tx
            .select({
                inventoryItem: inventoryItems,
                model: clothingModels,
            })
            .from(inventoryItems)
            .leftJoin(clothingModels, eq(inventoryItems.modelId, clothingModels.id))
            .where(sql`${inventoryItems.id} = ANY(${validatedData.items.map(item => item.inventoryItemId)})`);

        if (inventoryItemsWithModels.length !== validatedData.items.length) {
            throw new Error('Some inventory items not found');
        }

        // Check availability and lock items
        await lockInventoryItems(validatedData.items.map(item => item.inventoryItemId));

        // Calculate total amount
        const dailyRates = inventoryItemsWithModels.map(item =>
            parseFloat(item.model?.dailyRate || '0')
        );
        const subtotal = dailyRates.reduce((sum, rate) => sum + rate, 0) * validatedData.rentalDuration;
        const totalAmount = subtotal; // Can add taxes or other fees later

        // Create rental
        const [rental] = await tx.insert(rentals).values({
            customerId: validatedData.customerId,
            cashierId: validatedData.cashierId,
            status: rentalStatusEnum.enumValues[0], // pending
            rentalDate,
            expectedReturnDate: returnDate,
            subtotal: subtotal.toString(),
            lateFees: '0.00',
            totalAmount: totalAmount.toString(),
            notes: validatedData.notes,
        }).returning();

        // Create rental items
        const rentalItemsData = validatedData.items.map((item, index) => ({
            rentalId: rental.id,
            inventoryItemId: item.inventoryItemId,
            pickupDate: item.pickupDate || null,
            returnDate: item.returnDate,
            dailyRate: dailyRates[index].toString(),
            lateFeeRate: inventoryItemsWithModels[index].model?.lateFeeRate || '10.00',
            calculatedFees: '0.00',
        }));

        await tx.insert(rentalItems).values(rentalItemsData);

        return rental;
    });
}

export async function processRentalPickup(rentalId: string, cashierId: string) {
    return await db.transaction(async (tx) => {
        const [rental] = await tx.update(rentals)
            .set({
                status: rentalStatusEnum.enumValues[1], // active
                updatedAt: new Date()
            })
            .where(eq(rentals.id, rentalId))
            .returning();

        if (!rental) {
            throw new Error('Rental not found');
        }

        // Update rental items with pickup date
        await tx.update(rentalItems)
            .set({
                pickupDate: new Date(),
                updatedAt: new Date()
            })
            .where(eq(rentalItems.rentalId, rentalId));

        // Log activity
        await tx.insert(activityLogs).values({
            entityType: 'rental',
            entityId: rentalId,
            action: 'pickup',
            description: `Rental ${rentalId} picked up by cashier ${cashierId}`,
            userId: cashierId,
            newValues: JSON.stringify({ status: 'active' }),
        });

        return rental;
    });
}

export async function processRentalReturn(rentalId: string, cashierId: string) {
    return await db.transaction(async (tx) => {
        const returnDate = new Date();

        const [rental] = await tx.update(rentals)
            .set({
                status: rentalStatusEnum.enumValues[2], // completed
                actualReturnDate: returnDate,
                updatedAt: new Date()
            })
            .where(eq(rentals.id, rentalId))
            .returning();

        if (!rental) {
            throw new Error('Rental not found');
        }

        // Get rental items to calculate late fees
        const rentalItemsList = await tx.select()
            .from(rentalItems)
            .where(eq(rentalItems.rentalId, rentalId));

        let totalLateFees = 0;

        // Process each rental item
        for (const rentalItem of rentalItemsList) {
            const expectedReturn = new Date(rentalItem.returnDate);
            const daysLate = Math.max(0, Math.ceil((returnDate.getTime() - expectedReturn.getTime()) / (1000 * 60 * 60 * 24)));

            if (daysLate > 0) {
                const lateFee = daysLate * parseFloat(rentalItem.lateFeeRate);
                totalLateFees += lateFee;

                await tx.update(rentalItems)
                    .set({
                        actualReturnDate: returnDate,
                        calculatedFees: lateFee.toString(),
                        updatedAt: new Date()
                    })
                    .where(eq(rentalItems.id, rentalItem.id));
            } else {
                await tx.update(rentalItems)
                    .set({
                        actualReturnDate: returnDate,
                        updatedAt: new Date()
                    })
                    .where(eq(rentalItems.id, rentalItem.id));
            }

            // Create laundry cycle using the laundry manager
            const { laundryManager } = await import('./cron-jobs/laundry-manager');
            const manager = new laundryManager();
            await manager.createLaundryCycle(
                rentalItem.inventoryItemId,
                rentalItem.id,
                cashierId
            );
        }

        // Update rental with late fees
        await tx.update(rentals)
            .set({
                lateFees: totalLateFees.toString(),
                totalAmount: (parseFloat(rental.totalAmount) + totalLateFees).toString(),
                updatedAt: new Date()
            })
            .where(eq(rentals.id, rentalId));

        // Log activity
        await tx.insert(activityLogs).values({
            entityType: 'rental',
            entityId: rentalId,
            action: 'return',
            description: `Rental ${rentalId} returned with $${totalLateFees.toFixed(2)} in late fees`,
            userId: cashierId,
            newValues: JSON.stringify({
                status: 'completed',
                actualReturnDate: returnDate,
                lateFees: totalLateFees.toString()
            }),
        });

        return { rental, totalLateFees };
    });
}

// Payment processing functions
export async function createPayment(data: z.infer<typeof createPaymentSchema>) {
    const validatedData = createPaymentSchema.parse(data);

    const [payment] = await db.insert(payments)
        .values({
            ...validatedData,
            amount: validatedData.amount.toString(),
        })
        .returning();

    // Log activity
    await db.insert(activityLogs).values({
        entityType: 'payment',
        entityId: payment.id,
        action: 'create',
        description: `Payment of $${validatedData.amount.toFixed(2)} received for rental ${validatedData.rentalId}`,
        userId: validatedData.cashierId,
        newValues: JSON.stringify({
            amount: validatedData.amount.toString(),
            method: validatedData.method,
        }),
    });

    return payment;
}

// Reporting functions
export async function getInventoryReport() {
    const results = await db.select({
        total: count(inventoryItems.id),
        available: count(sql`CASE WHEN ${inventoryItems.status} = 'available' THEN 1 END`),
        rented: count(sql`CASE WHEN ${inventoryItems.status} = 'rented' THEN 1 END`),
        inLaundry: count(sql`CASE WHEN ${inventoryItems.status} = 'in_laundry' THEN 1 END`),
        damaged: count(sql`CASE WHEN ${inventoryItems.status} = 'damaged' THEN 1 END`),
    }).from(inventoryItems);

    return results[0] || {};
}

export async function getFinancialReport(startDate: Date, endDate: Date) {
    const results = await db.select({
        totalRevenue: sum(payments.amount).mapWith(Number),
        transactionCount: count(payments.id),
        cashRevenue: sum(sql`CASE WHEN ${payments.method} = 'cash' THEN ${payments.amount} END`).mapWith(Number),
        transferRevenue: sum(sql`CASE WHEN ${payments.method} = 'transfer' THEN ${payments.amount} END`).mapWith(Number),
        cardRevenue: sum(sql`CASE WHEN ${payments.method} = 'card' THEN ${payments.amount} END`).mapWith(Number),
    }).from(payments)
        .where(and(
            gte(payments.createdAt, startDate),
            lte(payments.createdAt, endDate),
            eq(payments.status, paymentStatusEnum.enumValues[1]) // paid
        ));

    return results[0] || {};
}

export async function getOverdueRentals() {
    const now = new Date();

    return await db.select({
        rental: rentals,
        customer: customers,
        items: count(rentalItems.id),
    })
        .from(rentals)
        .leftJoin(customers, eq(rentals.customerId, customers.id))
        .leftJoin(rentalItems, eq(rentals.id, rentalItems.rentalId))
        .where(and(
            eq(rentals.status, rentalStatusEnum.enumValues[1]), // active
            lte(rentals.expectedReturnDate, now)
        ))
        .groupBy(rentals.id, customers.id)
        .orderBy(desc(rentals.expectedReturnDate));
}

// Activity logging utility
export async function logActivity(data: {
    entityType: string;
    entityId: string;
    action: string;
    description: string;
    userId: string;
    oldValues?: string;
    newValues?: string;
    ipAddress?: string;
    userAgent?: string;
}) {
    await db.insert(activityLogs).values({
        ...data,
        createdAt: new Date(),
    });
}