import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
    inventoryItems,
    clothingModels,
    laundryCycles,
    rentalItems,
    rentals,
} from '@/db/schema';
import { count } from 'drizzle-orm';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { getInventoryReport, getOverdueRentals } from '@/lib/db-utils';

// GET /api/reports/inventory - Generate inventory report
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const reportType = searchParams.get('type') || 'summary';

        switch (reportType) {
            case 'summary':
                return await getInventorySummaryReport();
            case 'detailed':
                return await getDetailedInventoryReport();
            case 'laundry':
                return await getLaundryReport();
            case 'utilization':
                return await getUtilizationReport();
            default:
                return NextResponse.json(
                    { error: 'Invalid report type' },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('Error generating inventory report:', error);
        return NextResponse.json(
            { error: 'Failed to generate inventory report' },
            { status: 500 }
        );
    }
}

async function getInventorySummaryReport() {
    const results = await db.select({
        total: count(inventoryItems.id),
        available: count(sql`CASE WHEN ${inventoryItems.status} = 'available' THEN 1 END`),
        rented: count(sql`CASE WHEN ${inventoryItems.status} = 'rented' THEN 1 END`),
        inLaundry: count(sql`CASE WHEN ${inventoryItems.status} = 'in_laundry' THEN 1 END`),
        unavailable: count(sql`CASE WHEN ${inventoryItems.status} = 'unavailable' THEN 1 END`),
        damaged: count(sql`CASE WHEN ${inventoryItems.status} = 'damaged' THEN 1 END`),
    }).from(inventoryItems);

    // Get status by category
    const categoryBreakdown = await db.select({
        category: clothingModels.category,
        total: count(inventoryItems.id),
        available: count(sql`CASE WHEN ${inventoryItems.status} = 'available' THEN 1 END`),
        rented: count(sql`CASE WHEN ${inventoryItems.status} = 'rented' THEN 1 END`),
    })
        .from(inventoryItems)
        .leftJoin(clothingModels, eq(inventoryItems.modelId, clothingModels.id))
        .groupBy(clothingModels.category);

    return NextResponse.json({
        data: {
            summary: results[0] || {},
            categoryBreakdown,
            generatedAt: new Date(),
        },
    });
}

async function getDetailedInventoryReport() {
    const items = await db.select({
        id: inventoryItems.id,
        sku: inventoryItems.sku,
        size: inventoryItems.size,
        color: inventoryItems.color,
        status: inventoryItems.status,
        condition: inventoryItems.condition,
        notes: inventoryItems.notes,
        createdAt: inventoryItems.createdAt,
        model: {
            id: clothingModels.id,
            name: clothingModels.name,
            category: clothingModels.category,
            brand: clothingModels.brand,
            dailyRate: clothingModels.dailyRate,
        },
        lastRentalDate: sql<Date>`(
            SELECT MAX(${rentals.rental_date})
            FROM ${rentalItems}
            JOIN ${rentals} ON ${rentalItems.rental_id} = ${rentals.id}
            WHERE ${rentalItems.inventory_item_id} = ${inventoryItems.id}
        )`,
        rentalCount: sql<number>`(
            SELECT COUNT(*)
            FROM ${rentalItems}
            WHERE ${rentalItems.inventory_item_id} = ${inventoryItems.id}
        )`.mapWith(Number),
    })
        .from(inventoryItems)
        .leftJoin(clothingModels, eq(inventoryItems.modelId, clothingModels.id))
        .orderBy(clothingModels.name, inventoryItems.size, inventoryItems.color);

    return NextResponse.json({
        data: items,
        summary: {
            total: items.length,
            generatedAt: new Date(),
        },
    });
}

async function getLaundryReport() {
    const laundryItems = await db.select({
        id: laundryCycles.id,
        startDate: laundryCycles.startDate,
        expectedEndDate: laundryCycles.expectedEndDate,
        actualEndDate: laundryCycles.actualEndDate,
        status: laundryCycles.status,
        notes: laundryCycles.notes,
        inventoryItem: {
            id: inventoryItems.id,
            sku: inventoryItems.sku,
            size: inventoryItems.size,
            color: inventoryItems.color,
        },
        model: {
            name: clothingModels.name,
            category: clothingModels.category,
        },
        daysInLaundry: sql<number>`EXTRACT(DAY FROM CURRENT_TIMESTAMP - ${laundryCycles.start_date)`.mapWith(Number),
        isOverdue: sql<boolean>`CURRENT_TIMESTAMP > ${laundryCycles.expected_end_date}`,
    })
        .from(laundryCycles)
        .leftJoin(inventoryItems, eq(laundryCycles.inventoryItemId, inventoryItems.id))
        .leftJoin(clothingModels, eq(inventoryItems.modelId, clothingModels.id))
        .where(eq(laundryCycles.status, 'in_progress'))
        .orderBy(laundryCycles.expectedEndDate);

    const summary = {
        totalInLaundry: laundryItems.length,
        overdueCount: laundryItems.filter(item => item.isOverdue).length,
        generatedAt: new Date(),
    };

    return NextResponse.json({
        data: laundryItems,
        summary,
    });
}

async function getUtilizationReport() {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
        return NextResponse.json(
            { error: 'Start date and end date are required for utilization report' },
            { status: 400 }
        );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get utilization by model
    const modelUtilization = await db.select({
        modelId: clothingModels.id,
        modelName: clothingModels.name,
        category: clothingModels.category,
        totalInventory: count(inventoryItems.id),
        daysRented: sql<number>`SUM(
            CASE
                WHEN ${rentalItems.pickup_date} IS NOT NULL
                     AND ${rentalItems.actual_return_date} IS NOT NULL
                THEN GREATEST(0,
                    EXTRACT(DAY FROM LEAST(${rentalItems.actual_return_date}, ${end}) -
                           GREATEST(${rentalItems.pickup_date}, ${start}))
                )
                WHEN ${rentalItems.pickup_date} IS NOT NULL
                     AND ${rentalItems.actual_return_date} IS NULL
                     AND ${rentalItems.pickup_date} <= ${end}
                THEN EXTRACT(DAY FROM ${end} - GREATEST(${rentalItems.pickup_date}, ${start}))
                ELSE 0
            END
        )`.mapWith(Number),
    })
        .from(clothingModels)
        .leftJoin(inventoryItems, eq(clothingModels.id, inventoryItems.modelId))
        .leftJoin(rentalItems, eq(inventoryItems.id, rentalItems.inventoryItemId))
        .where(and(
            gte(rentalItems.pickupDate, start),
            lte(rentalItems.pickupDate, end)
        ))
        .groupBy(clothingModels.id)
        .having(sql`COUNT(${inventoryItems.id}) > 0`);

    // Calculate utilization percentages
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const utilizationWithPercentage = modelUtilization.map(item => ({
        ...item,
        utilizationPercentage: item.totalInventory > 0
            ? ((item.daysRented / (item.totalInventory * totalDays)) * 100).toFixed(2)
            : '0.00',
    }));

    return NextResponse.json({
        data: utilizationWithPercentage,
        summary: {
            totalDays,
            reportPeriod: { start, end },
            generatedAt: new Date(),
        },
    });
}