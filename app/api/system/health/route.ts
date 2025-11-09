import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { laundryManager } from '@/lib/cron-jobs/laundry-manager';

/**
 * System Health Check Endpoint
 *
 * Provides information about the health and status of various system components
 * including database connectivity, laundry cycles, and overall system metrics.
 */

export async function GET(request: NextRequest) {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    checks: {
      database: {
        status: 'unknown' as 'healthy' | 'unhealthy',
        responseTime: 0,
        error: null as string | null,
      },
      laundrySystem: {
        status: 'unknown' as 'healthy' | 'unhealthy',
        stats: null as any,
        error: null as string | null,
      },
      memory: {
        status: 'healthy' as 'healthy' | 'warning' | 'unhealthy',
        usage: process.memoryUsage(),
        percentage: 0,
      },
    },
  };

  try {
    // Database Health Check
    const dbStartTime = Date.now();
    await db.select({ count: 1 }).from({ count: 1 });
    const dbResponseTime = Date.now() - dbStartTime;

    healthCheck.checks.database = {
      status: dbResponseTime < 5000 ? 'healthy' : 'unhealthy',
      responseTime: dbResponseTime,
      error: null,
    };
  } catch (error) {
    healthCheck.checks.database = {
      status: 'unhealthy',
      responseTime: 0,
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
    healthCheck.status = 'unhealthy';
  }

  try {
    // Laundry System Health Check
    const laundryStats = await laundryManager.getLaundryStats();
    healthCheck.checks.laundrySystem = {
      status: 'healthy',
      stats: laundryStats,
      error: null,
    };
  } catch (error) {
    healthCheck.checks.laundrySystem = {
      status: 'unhealthy',
      stats: null,
      error: error instanceof Error ? error.message : 'Unknown laundry system error',
    };
  }

  // Memory Usage Check
  const memoryUsage = process.memoryUsage();
  const totalMemory = memoryUsage.heapTotal;
  const usedMemory = memoryUsage.heapUsed;
  const memoryPercentage = (usedMemory / totalMemory) * 100;

  healthCheck.checks.memory = {
    status: memoryPercentage < 90 ? 'healthy' : memoryPercentage < 95 ? 'warning' : 'unhealthy',
    usage: memoryUsage,
    percentage: Math.round(memoryPercentage),
  };

  // Overall status determination
  const hasUnhealthyChecks = Object.values(healthCheck.checks).some(
    check => check.status === 'unhealthy'
  );
  const hasWarningChecks = Object.values(healthCheck.checks).some(
    check => check.status === 'warning'
  );

  if (hasUnhealthyChecks) {
    healthCheck.status = 'unhealthy';
  } else if (hasWarningChecks) {
    healthCheck.status = 'warning';
  }

  // Return appropriate HTTP status code
  const statusCode = healthCheck.status === 'healthy' ? 200 :
                      healthCheck.status === 'warning' ? 200 : 503;

  return NextResponse.json(healthCheck, { status: statusCode });
}