import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { clothingModels, inventoryItems } from '@/db/schema';
import { eq, and, ilike, sql } from 'drizzle-orm';
import { z } from 'zod';

const createClothingModelSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    category: z.string().min(1, 'Category is required'),
    brand: z.string().optional(),
    dailyRate: z.number().min(0, 'Daily rate must be positive'),
    lateFeeRate: z.number().min(0, 'Late fee rate must be positive'),
    imageUrl: z.string().optional(),
});

const updateClothingModelSchema = createClothingModelSchema.partial();

// GET /api/models - List clothing models with optional filtering
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        let query = db.select({
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
            totalItems: sql<number>`count(${inventoryItems.id})`.mapWith(Number),
            availableItems: sql<number>`count(CASE WHEN ${inventoryItems.status} = 'available' THEN 1 END)`.mapWith(Number),
        })
            .from(clothingModels)
            .leftJoin(inventoryItems, eq(clothingModels.id, inventoryItems.modelId))
            .groupBy(clothingModels.id);

        // Apply filters
        const conditions = [];
        if (category) {
            conditions.push(eq(clothingModels.category, category));
        }
        if (search) {
            conditions.push(sql`(
                ${clothingModels.name} ILIKE ${'%' + search + '%'} OR
                ${clothingModels.description} ILIKE ${'%' + search + '%'} OR
                ${clothingModels.brand} ILIKE ${'%' + search + '%'} OR
                ${clothingModels.category} ILIKE ${'%' + search + '%'}
            )`);
        }

        // Only show active models by default
        conditions.push(eq(clothingModels.isActive, true));

        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }

        // Apply pagination and ordering
        const models = await query
            .orderBy(clothingModels.name)
            .limit(limit)
            .offset(offset);

        // Get total count for pagination
        let countQuery = db.select({ count: sql`count(*)` }).from(clothingModels);

        if (conditions.length > 0) {
            countQuery = countQuery.where(and(...conditions));
        }

        const [{ count }] = await countQuery;

        return NextResponse.json({
            data: models,
            pagination: {
                page,
                limit,
                total: parseInt(count as string),
                totalPages: Math.ceil(parseInt(count as string) / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching clothing models:', error);
        return NextResponse.json(
            { error: 'Failed to fetch clothing models' },
            { status: 500 }
        );
    }
}

// POST /api/models - Create new clothing model
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validatedData = createClothingModelSchema.parse(body);

        const [model] = await db.insert(clothingModels)
            .values({
                ...validatedData,
                dailyRate: validatedData.dailyRate.toString(),
                lateFeeRate: validatedData.lateFeeRate.toString(),
            })
            .returning();

        return NextResponse.json({ data: model }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Error creating clothing model:', error);
        return NextResponse.json(
            { error: 'Failed to create clothing model' },
            { status: 500 }
        );
    }
}