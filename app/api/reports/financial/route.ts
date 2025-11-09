import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payments, rentals, user, customers } from '@/db/schema';
import { eq, and, sql, gte, lte, desc } from 'drizzle-orm';
import { getFinancialReport } from '@/lib/db-utils';

// GET /api/reports/financial - Generate financial report
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const reportType = searchParams.get('type') || 'summary';
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        switch (reportType) {
            case 'summary':
                if (!startDate || !endDate) {
                    return NextResponse.json(
                        { error: 'Start date and end date are required for summary report' },
                        { status: 400 }
                    );
                }
                return await getFinancialSummaryReport(new Date(startDate), new Date(endDate));
            case 'transactions':
                return await getTransactionReport(startDate, endDate);
            case 'cashier-performance':
                return await getCashierPerformanceReport(startDate, endDate);
            case 'revenue-breakdown':
                return await getRevenueBreakdownReport(startDate, endDate);
            default:
                return NextResponse.json(
                    { error: 'Invalid report type' },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('Error generating financial report:', error);
        return NextResponse.json(
            { error: 'Failed to generate financial report' },
            { status: 500 }
        );
    }
}

async function getFinancialSummaryReport(startDate: Date, endDate: Date) {
    const results = await getFinancialReport(startDate, endDate);

    // Get monthly trend data
    const monthlyTrend = await db.select({
        month: sql<string>`TO_CHAR(${payments.createdAt}, 'YYYY-MM')`,
        revenue: sql<number>`COALESCE(SUM(${payments.amount}), 0)`.mapWith(Number),
        transactionCount: sql<number>`COUNT(${payments.id})`.mapWith(Number),
    })
        .from(payments)
        .where(and(
            gte(payments.createdAt, startDate),
            lte(payments.createdAt, endDate),
            eq(payments.status, 'paid')
        ))
        .groupBy(sql`TO_CHAR(${payments.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(${payments.createdAt}, 'YYYY-MM')`);

    // Get top customers by revenue
    const topCustomers = await db.select({
        customerId: rentals.customerId,
        customerName: sql<string>`(SELECT name FROM customers WHERE id = ${rentals.customerId})`,
        totalRevenue: sql<number>`COALESCE(SUM(${payments.amount}), 0)`.mapWith(Number),
        rentalCount: sql<number>`COUNT(DISTINCT ${rentals.id})`.mapWith(Number),
    })
        .from(rentals)
        .leftJoin(payments, eq(rentals.id, payments.rentalId))
        .where(and(
            gte(payments.createdAt, startDate),
            lte(payments.createdAt, endDate),
            eq(payments.status, 'paid')
        ))
        .groupBy(rentals.customerId)
        .orderBy(desc(sql`COALESCE(SUM(${payments.amount}), 0)`))
        .limit(10);

    return NextResponse.json({
        data: {
            summary: results,
            monthlyTrend,
            topCustomers,
            reportPeriod: { startDate, endDate },
            generatedAt: new Date(),
        },
    });
}

async function getTransactionReport(startDate?: string | null, endDate?: string | null) {
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
            rentalDate: rentals.rentalDate,
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

    const conditions = [];
    if (startDate) {
        conditions.push(gte(payments.createdAt, new Date(startDate)));
    }
    if (endDate) {
        conditions.push(lte(payments.createdAt, new Date(endDate)));
    }

    if (conditions.length > 0) {
        query = query.where(and(...conditions));
    }

    const transactions = await query
        .orderBy(desc(payments.createdAt));

    const summary = await db.select({
        totalRevenue: sql<number>`COALESCE(SUM(${payments.amount}), 0)`.mapWith(Number),
        transactionCount: sql<number>`COUNT(${payments.id})`.mapWith(Number),
        cashRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${payments.method} = 'cash' THEN ${payments.amount} END), 0)`.mapWith(Number),
        transferRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${payments.method} = 'transfer' THEN ${payments.amount} END), 0)`.mapWith(Number),
        cardRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${payments.method} = 'card' THEN ${payments.amount} END), 0)`.mapWith(Number),
    })
        .from(payments)
        .where(conditions.length > 0 ? and(...conditions) : sql`1=1`);

    return NextResponse.json({
        data: transactions,
        summary: summary[0] || {},
        generatedAt: new Date(),
    });
}

async function getCashierPerformanceReport(startDate?: string | null, endDate?: string | null) {
    let query = db.select({
        cashierId: user.id,
        cashierName: user.name,
        cashierEmail: user.email,
        totalRevenue: sql<number>`COALESCE(SUM(${payments.amount}), 0)`.mapWith(Number),
        transactionCount: sql<number>`COUNT(${payments.id})`.mapWith(Number),
        averageTransactionValue: sql<number>`COALESCE(AVG(${payments.amount}), 0)`.mapWith(Number),
        rentalCount: sql<number>`COUNT(DISTINCT ${rentals.id})`.mapWith(Number),
    })
        .from(user)
        .leftJoin(payments, eq(user.id, payments.cashierId))
        .leftJoin(rentals, eq(user.id, rentals.cashierId));

    const conditions = [];
    if (startDate) {
        conditions.push(gte(payments.createdAt, new Date(startDate)));
    }
    if (endDate) {
        conditions.push(lte(payments.createdAt, new Date(endDate)));
    }

    if (conditions.length > 0) {
        query = query.where(and(...conditions));
    }

    const performance = await query
        .groupBy(user.id)
        .orderBy(desc(sql`COALESCE(SUM(${payments.amount}), 0)`));

    // Get daily breakdown for top performer
    const topPerformer = performance[0];
    let dailyBreakdown = [];

    if (topPerformer) {
        dailyBreakdown = await db.select({
            date: sql<string>`DATE(${payments.createdAt})`,
            revenue: sql<number>`COALESCE(SUM(${payments.amount}), 0)`.mapWith(Number),
            transactionCount: sql<number>`COUNT(${payments.id})`.mapWith(Number),
        })
            .from(payments)
            .where(and(
                eq(payments.cashierId, topPerformer.cashierId),
                ...(startDate ? [gte(payments.createdAt, new Date(startDate))] : []),
                ...(endDate ? [lte(payments.createdAt, new Date(endDate))] : [])
            ))
            .groupBy(sql`DATE(${payments.createdAt})`)
            .orderBy(sql`DATE(${payments.createdAt})`);
    }

    return NextResponse.json({
        data: performance,
        topPerformerDailyBreakdown: dailyBreakdown,
        generatedAt: new Date(),
    });
}

async function getRevenueBreakdownReport(startDate?: string | null, endDate?: string | null) {
    // Revenue by payment method
    const paymentMethodBreakdown = await db.select({
        method: payments.method,
        revenue: sql<number>`COALESCE(SUM(${payments.amount}), 0)`.mapWith(Number),
        transactionCount: sql<number>`COUNT(${payments.id})`.mapWith(Number),
        percentage: sql<number>`(SUM(${payments.amount}) * 100.0 / (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE ${conditions.length > 0 ? and(...conditions) : sql`1=1`}))`.mapWith(Number),
    })
        .from(payments)
        .where(conditions.length > 0 ? and(...conditions) : sql`1=1`)
        .groupBy(payments.method);

    // Revenue by rental status
    const rentalStatusBreakdown = await db.select({
        rentalStatus: rentals.status,
        revenue: sql<number>`COALESCE(SUM(${payments.amount}), 0)`.mapWith(Number),
        rentalCount: sql<number>`COUNT(DISTINCT ${rentals.id})`.mapWith(Number),
    })
        .from(rentals)
        .leftJoin(payments, eq(rentals.id, payments.rentalId))
        .where(and(
            ...(startDate ? [gte(payments.createdAt, new Date(startDate))] : []),
            ...(endDate ? [lte(payments.createdAt, new Date(endDate))] : [])
        ))
        .groupBy(rentals.status);

    // Revenue by day of week
    const dayOfWeekBreakdown = await db.select({
        dayOfWeek: sql<string>`TO_CHAR(${payments.createdAt}, 'Day')`,
        dayOfWeekNumber: sql<number>`EXTRACT(DOW FROM ${payments.createdAt})`.mapWith(Number),
        revenue: sql<number>`COALESCE(SUM(${payments.amount}), 0)`.mapWith(Number),
        transactionCount: sql<number>`COUNT(${payments.id})`.mapWith(Number),
    })
        .from(payments)
        .where(conditions.length > 0 ? and(...conditions) : sql`1=1`)
        .groupBy(sql`TO_CHAR(${payments.createdAt}, 'Day')`, sql`EXTRACT(DOW FROM ${payments.createdAt})`)
        .orderBy(sql`EXTRACT(DOW FROM ${payments.createdAt})`);

    return NextResponse.json({
        data: {
            paymentMethodBreakdown,
            rentalStatusBreakdown,
            dayOfWeekBreakdown,
        },
        generatedAt: new Date(),
    });
}