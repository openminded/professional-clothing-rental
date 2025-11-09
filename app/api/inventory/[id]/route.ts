import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { inventoryItems, clothingModels } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { logActivity } from '@/lib/db-utils';

const updateInventoryItemSchema = z.object({
    sku: z.string().min(1, 'SKU is required').optional(),
    size: z.string().min(1, 'Size is required').optional(),
    color: z.string().min(1, 'Color is required').optional(),
    condition: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(['available', 'rented', 'in_laundry', 'unavailable', 'damaged']).optional(),
});

// GET /api/inventory/[id] - Get single inventory item
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        const [item] = await db.select({
            id: inventoryItems.id,
            modelId: inventoryItems.modelId,
            sku: inventoryItems.sku,
            size: inventoryItems.size,
            color: inventoryItems.color,
            status: inventoryItems.status,
            condition: inventoryItems.condition,
            notes: inventoryItems.notes,
            createdAt: inventoryItems.createdAt,
            updatedAt: inventoryItems.updatedAt,
            model: {
                id: clothingModels.id,
                name: clothingModels.name,
                description: clothingModels.description,
                category: clothingModels.category,
                brand: clothingModels.brand,
                dailyRate: clothingModels.dailyRate,
                lateFeeRate: clothingModels.lateFeeRate,
                imageUrl: clothingModels.imageUrl,
            },
        })
            .from(inventoryItems)
            .leftJoin(clothingModels, eq(inventoryItems.modelId, clothingModels.id))
            .where(eq(inventoryItems.id, id))
            .limit(1);

        if (!item) {
            return NextResponse.json(
                { error: 'Inventory item not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: item });
    } catch (error) {
        console.error('Error fetching inventory item:', error);
        return NextResponse.json(
            { error: 'Failed to fetch inventory item' },
            { status: 500 }
        );
    }
}

// PUT /api/inventory/[id] - Update inventory item
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();
        const validatedData = updateInventoryItemSchema.parse(body);

        // Check if item exists
        const [existingItem] = await db.select()
            .from(inventoryItems)
            .where(eq(inventoryItems.id, id))
            .limit(1);

        if (!existingItem) {
            return NextResponse.json(
                { error: 'Inventory item not found' },
                { status: 404 }
            );
        }

        // If updating SKU, check if it already exists (excluding current item)
        if (validatedData.sku && validatedData.sku !== existingItem.sku) {
            const [duplicateItem] = await db.select()
                .from(inventoryItems)
                .and(
                    and(
                        eq(inventoryItems.sku, validatedData.sku),
                        sql`${inventoryItems.id} != ${id}`
                    )
                )
                .limit(1);

            if (duplicateItem) {
                return NextResponse.json(
                    { error: 'SKU already exists' },
                    { status: 400 }
                );
            }
        }

        const [updatedItem] = await db.update(inventoryItems)
            .set({
                ...validatedData,
                updatedAt: new Date(),
            })
            .where(eq(inventoryItems.id, id))
            .returning();

        // Log activity (would need to get user ID from auth session)
        await logActivity({
            entityType: 'inventory_item',
            entityId: id,
            action: 'update',
            description: `Inventory item ${updatedItem.sku} updated`,
            userId: 'system', // TODO: Get from auth session
            oldValues: JSON.stringify(existingItem),
            newValues: JSON.stringify(validatedData),
        });

        return NextResponse.json({ data: updatedItem });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Error updating inventory item:', error);
        return NextResponse.json(
            { error: 'Failed to update inventory item' },
            { status: 500 }
        );
    }
}

// DELETE /api/inventory/[id] - Delete inventory item
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        // Check if item exists
        const [existingItem] = await db.select()
            .from(inventoryItems)
            .where(eq(inventoryItems.id, id))
            .limit(1);

        if (!existingItem) {
            return NextResponse.json(
                { error: 'Inventory item not found' },
                { status: 404 }
            );
        }

        // TODO: Check if item is currently rented or has active rentals
        // For now, we'll allow deletion but in production you'd want to prevent deletion of items with rental history

        await db.delete(inventoryItems)
            .where(eq(inventoryItems.id, id));

        // Log activity
        await logActivity({
            entityType: 'inventory_item',
            entityId: id,
            action: 'delete',
            description: `Inventory item ${existingItem.sku} deleted`,
            userId: 'system', // TODO: Get from auth session
            oldValues: JSON.stringify(existingItem),
        });

        return NextResponse.json(
            { message: 'Inventory item deleted successfully' }
        );
    } catch (error) {
        console.error('Error deleting inventory item:', error);
        return NextResponse.json(
            { error: 'Failed to delete inventory item' },
            { status: 500 }
        );
    }
}