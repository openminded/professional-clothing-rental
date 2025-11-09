import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { inventoryItems, clothingModels } from '@/db/schema';
import { eq, and, ilike, sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth, canManageInventory, logAuthenticatedActivity } from '@/lib/auth-middleware';
import type { AuthenticatedRequest } from '@/lib/auth-middleware';

const createInventoryItemSchema = z.object({
    modelId: z.string().min(1, 'Model ID is required'),
    sku: z.string().min(1, 'SKU is required'),
    size: z.string().min(1, 'Size is required'),
    color: z.string().min(1, 'Color is required'),
    condition: z.string().default('good'),
    notes: z.string().optional(),
});

const updateInventoryItemSchema = createInventoryItemSchema.partial().extend({
    status: z.enum(['available', 'rented', 'in_laundry', 'unavailable', 'damaged']).optional(),
});

// GET /api/inventory - List inventory items with optional filtering
export const GET = requireAuth(async (request: AuthenticatedRequest, user) => {
    try {
        const { searchParams } = new URL(request.url);
        const modelId = searchParams.get('modelId');
        const status = searchParams.get('status');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        let query = db.select({
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
            modelName: clothingModels.name,
            modelCategory: clothingModels.category,
            modelBrand: clothingModels.brand,
            dailyRate: clothingModels.dailyRate,
            imageUrl: clothingModels.imageUrl,
        })
            .from(inventoryItems)
            .leftJoin(clothingModels, eq(inventoryItems.modelId, clothingModels.id));

        // Apply filters
        const conditions = [];
        if (modelId) {
            conditions.push(eq(inventoryItems.modelId, modelId));
        }
        if (status) {
            conditions.push(eq(inventoryItems.status, status));
        }
        if (search) {
            conditions.push(sql`(
                ${inventoryItems.sku} ILIKE ${'%' + search + '%'} OR
                ${inventoryItems.size} ILIKE ${'%' + search + '%'} OR
                ${inventoryItems.color} ILIKE ${'%' + search + '%'} OR
                ${clothingModels.name} ILIKE ${'%' + search + '%'} OR
                ${clothingModels.category} ILIKE ${'%' + search + '%'}
            )`);
        }

        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }

        // Apply pagination and ordering
        const items = await query
            .orderBy(inventoryItems.createdAt)
            .limit(limit)
            .offset(offset);

        // Get total count for pagination
        let countQuery = db.select({ count: sql`count(*)` }).from(inventoryItems)
            .leftJoin(clothingModels, eq(inventoryItems.modelId, clothingModels.id));

        if (conditions.length > 0) {
            countQuery = countQuery.where(and(...conditions));
        }

        const [{ count }] = await countQuery;

        return NextResponse.json({
            data: items,
            pagination: {
                page,
                limit,
                total: parseInt(count as string),
                totalPages: Math.ceil(parseInt(count as string) / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching inventory:', error);
        return NextResponse.json(
            { error: 'Failed to fetch inventory items' },
            { status: 500 }
        );
    }
});

// POST /api/inventory - Create new inventory item
export const POST = requireAuth(async (request: AuthenticatedRequest, user) => {
    // Check if user has permission to manage inventory
    if (!canManageInventory(user.role)) {
        return NextResponse.json(
            { error: 'Insufficient permissions to manage inventory' },
            { status: 403 }
        );
    }

    try {
        const body = await request.json();
        const validatedData = createInventoryItemSchema.parse(body);

        // Check if SKU already exists
        const existingItem = await db.select()
            .from(inventoryItems)
            .where(eq(inventoryItems.sku, validatedData.sku))
            .limit(1);

        if (existingItem.length > 0) {
            return NextResponse.json(
                { error: 'SKU already exists' },
                { status: 400 }
            );
        }

        // Verify that the model exists
        const model = await db.select()
            .from(clothingModels)
            .where(eq(clothingModels.id, validatedData.modelId))
            .limit(1);

        if (model.length === 0) {
            return NextResponse.json(
                { error: 'Clothing model not found' },
                { status: 404 }
            );
        }

        const [item] = await db.insert(inventoryItems)
            .values({
                ...validatedData,
                status: 'available',
            })
            .returning();

        // Log activity
        await logAuthenticatedActivity(user, {
            entityType: 'inventory_item',
            entityId: item.id,
            action: 'create',
            description: `Inventory item ${item.sku} created`,
            newValues: JSON.stringify(validatedData),
        }, request);

        return NextResponse.json({ data: item }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Error creating inventory item:', error);
        return NextResponse.json(
            { error: 'Failed to create inventory item' },
            { status: 500 }
        );
    }
}, 'manager'); // Only managers and admins can create inventory items