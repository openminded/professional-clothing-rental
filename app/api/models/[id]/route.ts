import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { clothingModels, inventoryItems } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { logActivity } from '@/lib/db-utils';

const updateClothingModelSchema = z.object({
    name: z.string().min(1, 'Name is required').optional(),
    description: z.string().optional(),
    category: z.string().min(1, 'Category is required').optional(),
    brand: z.string().optional(),
    dailyRate: z.number().min(0, 'Daily rate must be positive').optional(),
    lateFeeRate: z.number().min(0, 'Late fee rate must be positive').optional(),
    imageUrl: z.string().optional(),
    isActive: z.boolean().optional(),
});

// GET /api/models/[id] - Get single clothing model with inventory details
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        const [model] = await db.select({
            id: clothingModels.id,
            name: clothingModels.name,
            description: clothingModels.description,
            category: clothingModels.category,
            brand: clothingModels.brand,
            dailyRate: clothingModels.dailyRate,
            lateFeeRate: clothingModels.lateFeeRate,
            imageUrl: clothingModels.imageUrl,
            isActive: clothingModels.isActive,
            createdAt: clothingModels.createdAt,
            updatedAt: clothingModels.updatedAt,
        })
            .from(clothingModels)
            .where(eq(clothingModels.id, id))
            .limit(1);

        if (!model) {
            return NextResponse.json(
                { error: 'Clothing model not found' },
                { status: 404 }
            );
        }

        // Get inventory items for this model
        const inventory = await db.select()
            .from(inventoryItems)
            .where(eq(inventoryItems.modelId, id))
            .orderBy(inventoryItems.size, inventoryItems.color);

        return NextResponse.json({
            data: {
                ...model,
                inventory,
            },
        });
    } catch (error) {
        console.error('Error fetching clothing model:', error);
        return NextResponse.json(
            { error: 'Failed to fetch clothing model' },
            { status: 500 }
        );
    }
}

// PUT /api/models/[id] - Update clothing model
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();
        const validatedData = updateClothingModelSchema.parse(body);

        // Check if model exists
        const [existingModel] = await db.select()
            .from(clothingModels)
            .where(eq(clothingModels.id, id))
            .limit(1);

        if (!existingModel) {
            return NextResponse.json(
                { error: 'Clothing model not found' },
                { status: 404 }
            );
        }

        // Prepare update data
        const updateData: any = {
            ...validatedData,
            updatedAt: new Date(),
        };

        // Convert numeric fields to strings if present
        if (validatedData.dailyRate !== undefined) {
            updateData.dailyRate = validatedData.dailyRate.toString();
        }
        if (validatedData.lateFeeRate !== undefined) {
            updateData.lateFeeRate = validatedData.lateFeeRate.toString();
        }

        const [updatedModel] = await db.update(clothingModels)
            .set(updateData)
            .where(eq(clothingModels.id, id))
            .returning();

        // Log activity
        await logActivity({
            entityType: 'clothing_model',
            entityId: id,
            action: 'update',
            description: `Clothing model ${updatedModel.name} updated`,
            userId: 'system', // TODO: Get from auth session
            oldValues: JSON.stringify(existingModel),
            newValues: JSON.stringify(validatedData),
        });

        return NextResponse.json({ data: updatedModel });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Error updating clothing model:', error);
        return NextResponse.json(
            { error: 'Failed to update clothing model' },
            { status: 500 }
        );
    }
}

// DELETE /api/models/[id] - Delete clothing model
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        // Check if model exists
        const [existingModel] = await db.select()
            .from(clothingModels)
            .where(eq(clothingModels.id, id))
            .limit(1);

        if (!existingModel) {
            return NextResponse.json(
                { error: 'Clothing model not found' },
                { status: 404 }
            );
        }

        // Check if model has inventory items
        const [inventoryCount] = await db.select({ count: sql`count(*)` })
            .from(inventoryItems)
            .where(eq(inventoryItems.modelId, id));

        if (parseInt(inventoryCount.count as string) > 0) {
            return NextResponse.json(
                { error: 'Cannot delete clothing model with existing inventory items' },
                { status: 400 }
            );
        }

        await db.delete(clothingModels)
            .where(eq(clothingModels.id, id));

        // Log activity
        await logActivity({
            entityType: 'clothing_model',
            entityId: id,
            action: 'delete',
            description: `Clothing model ${existingModel.name} deleted`,
            userId: 'system', // TODO: Get from auth session
            oldValues: JSON.stringify(existingModel),
        });

        return NextResponse.json(
            { message: 'Clothing model deleted successfully' }
        );
    } catch (error) {
        console.error('Error deleting clothing model:', error);
        return NextResponse.json(
            { error: 'Failed to delete clothing model' },
            { status: 500 }
        );
    }
}