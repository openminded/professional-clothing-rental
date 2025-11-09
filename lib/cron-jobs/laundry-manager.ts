import { db } from '@/db';
import { laundryCycles, inventoryItems, activityLogs } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Automated Laundry Cycle Management System
 *
 * This system manages the automated completion of laundry cycles and
 * updates inventory item statuses from 'in_laundry' to 'available'.
 */

export class LaundryManager {
  private readonly DEFAULT_LAUNDRY_DURATION_DAYS = 3;

  /**
   * Process all overdue laundry cycles
   * Finds all laundry cycles that have exceeded their expected end date
   * and marks their corresponding inventory items as available.
   */
  async processOverdueLaundryCycles(): Promise<{
    processed: number;
    errors: string[];
  }> {
    console.log('🧺 Starting laundry cycle processing...');

    const result = {
      processed: 0,
      errors: [] as string[],
    };

    try {
      // Find all overdue laundry cycles that are still in progress
      const overdueCycles = await db
        .select({
          id: laundryCycles.id,
          inventoryItemId: laundryCycles.inventoryItemId,
          rentalItemId: laundryCycles.rentalItemId,
          startDate: laundryCycles.startDate,
          expectedEndDate: laundryCycles.expectedEndDate,
          actualEndDate: laundryCycles.actualEndDate,
          status: laundryCycles.status,
          notes: laundryCycles.notes,
          createdBy: laundryCycles.createdBy,
        })
        .from(laundryCycles)
        .where(
          and(
            eq(laundryCycles.status, 'in_progress'),
            sql`${laundryCycles.expected_end_date} < CURRENT_TIMESTAMP`
          )
        );

      console.log(`Found ${overdueCycles.length} overdue laundry cycles`);

      // Process each overdue cycle
      for (const cycle of overdueCycles) {
        try {
          await this.completeLaundryCycle(cycle.id, cycle.inventoryItemId, cycle.createdBy);
          result.processed++;

          console.log(`✅ Completed laundry cycle ${cycle.id} for inventory item ${cycle.inventoryItemId}`);
        } catch (error) {
          const errorMsg = `Failed to process laundry cycle ${cycle.id}: ${error}`;
          console.error(`❌ ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }

      console.log(`🧺 Laundry processing complete. Processed: ${result.processed}, Errors: ${result.errors.length}`);

      return result;
    } catch (error) {
      console.error('❌ Error in laundry cycle processing:', error);
      result.errors.push(`System error: ${error}`);
      return result;
    }
  }

  /**
   * Complete a specific laundry cycle
   * Updates the laundry cycle status and marks the inventory item as available
   */
  async completeLaundryCycle(cycleId: string, inventoryItemId: string, createdBy: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Update the laundry cycle to mark it as completed
      await tx
        .update(laundryCycles)
        .set({
          actualEndDate: new Date(),
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(eq(laundryCycles.id, cycleId));

      // Update the inventory item status to available
      const [updatedItem] = await tx
        .update(inventoryItems)
        .set({
          status: 'available',
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, inventoryItemId))
        .returning();

      // Log the activity
      await tx.insert(activityLogs).values({
        entityType: 'laundry_cycle',
        entityId: cycleId,
        action: 'auto_complete',
        description: `Laundry cycle ${cycleId} completed automatically. Item ${updatedItem.sku} is now available.`,
        userId: 'system',
        newValues: JSON.stringify({
          status: 'completed',
          actualEndDate: new Date(),
          itemStatus: 'available',
        }),
        createdAt: new Date(),
      });

      console.log(`✅ Laundry cycle ${cycleId} completed. Item ${updatedItem.sku} is now available.`);
    });
  }

  /**
   * Create a new laundry cycle for returned items
   * This is typically called when items are returned from a rental
   */
  async createLaundryCycle(
    inventoryItemId: string,
    rentalItemId: string | null,
    userId: string,
    customDuration?: number
  ): Promise<void> {
    const duration = customDuration || this.DEFAULT_LAUNDRY_DURATION_DAYS;
    const startDate = new Date();
    const expectedEndDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);

    await db.transaction(async (tx) => {
      // Create the laundry cycle
      const [cycle] = await tx
        .insert(laundryCycles)
        .values({
          inventoryItemId,
          rentalItemId,
          startDate,
          expectedEndDate,
          status: 'in_progress',
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Update inventory item status to in_laundry
      const [updatedItem] = await tx
        .update(inventoryItems)
        .set({
          status: 'in_laundry',
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, inventoryItemId))
        .returning();

      // Log the activity
      await tx.insert(activityLogs).values({
        entityType: 'laundry_cycle',
        entityId: cycle.id,
        action: 'create',
        description: `Laundry cycle started for item ${updatedItem.sku}. Expected completion: ${expectedEndDate.toISOString()}`,
        userId,
        newValues: JSON.stringify({
          cycleId: cycle.id,
          inventoryItemId,
          expectedEndDate,
          status: 'in_progress',
        }),
        createdAt: new Date(),
      });

      console.log(`🧺 Laundry cycle ${cycle.id} created for item ${updatedItem.sku}. Expected completion: ${expectedEndDate.toISOString()}`);
    });
  }

  /**
   * Get current laundry statistics
   * Returns information about active laundry cycles and their status
   */
  async getLaundryStats(): Promise<{
    totalActive: number;
    overdueCount: number;
    completingToday: number;
    averageDuration: number;
  }> {
    const stats = await db
      .select({
        totalActive: sql<number>`COUNT(*)`,
        overdueCount: sql<number>`COUNT(CASE WHEN ${laundryCycles.expected_end_date} < CURRENT_TIMESTAMP THEN 1 END)`,
        completingToday: sql<number>`COUNT(CASE WHEN DATE(${laundryCycles.expected_end_date}) = CURRENT_DATE THEN 1 END)`,
        averageDuration: sql<number>`AVG(EXTRACT(DAY FROM ${laundryCycles.expected_end_date} - ${laundryCycles.start_date}))`,
      })
      .from(laundryCycles)
      .where(eq(laundryCycles.status, 'in_progress'));

    return {
      totalActive: stats[0]?.totalActive || 0,
      overdueCount: stats[0]?.overdueCount || 0,
      completingToday: stats[0]?.completingToday || 0,
      averageDuration: Math.round(stats[0]?.averageDuration || this.DEFAULT_LAUNDRY_DURATION_DAYS),
    };
  }

  /**
   * Manual override to complete a laundry cycle early
   * Used when laundry is completed ahead of schedule
   */
  async completeLaundryCycleEarly(
    cycleId: string,
    userId: string,
    notes?: string
  ): Promise<void> {
    const cycle = await db
      .select()
      .from(laundryCycles)
      .where(eq(laundryCycles.id, cycleId))
      .limit(1);

    if (!cycle[0]) {
      throw new Error(`Laundry cycle ${cycleId} not found`);
    }

    if (cycle[0].status !== 'in_progress') {
      throw new Error(`Laundry cycle ${cycleId} is not in progress`);
    }

    await this.completeLaundryCycle(cycleId, cycle[0].inventoryItemId, userId);

    // Add additional notes if provided
    if (notes) {
      await db
        .update(laundryCycles)
        .set({
          notes: cycle[0].notes ? `${cycle[0].notes}\n${notes}` : notes,
          updatedAt: new Date(),
        })
        .where(eq(laundryCycles.id, cycleId));
    }

    // Log the manual completion
    await db.insert(activityLogs).values({
      entityType: 'laundry_cycle',
      entityId: cycleId,
      action: 'manual_complete',
      description: `Laundry cycle ${cycleId} completed manually by user ${userId}`,
      userId,
      newValues: JSON.stringify({
        completedBy: userId,
        notes,
        completedEarly: true,
      }),
      createdAt: new Date(),
    });
  }

  /**
   * Extend a laundry cycle (for items that need more cleaning time)
   */
  async extendLaundryCycle(
    cycleId: string,
    additionalDays: number,
    userId: string,
    reason?: string
  ): Promise<void> {
    const cycle = await db
      .select()
      .from(laundryCycles)
      .where(eq(laundryCycles.id, cycleId))
      .limit(1);

    if (!cycle[0]) {
      throw new Error(`Laundry cycle ${cycleId} not found`);
    }

    if (cycle[0].status !== 'in_progress') {
      throw new Error(`Laundry cycle ${cycleId} is not in progress`);
    }

    const newExpectedEndDate = new Date(
      cycle[0].expectedEndDate.getTime() + additionalDays * 24 * 60 * 60 * 1000
    );

    await db.transaction(async (tx) => {
      await tx
        .update(laundryCycles)
        .set({
          expectedEndDate: newExpectedEndDate,
          notes: cycle[0].notes
            ? `${cycle[0].notes}\nExtended by ${additionalDays} days. Reason: ${reason || 'No reason provided'}`
            : `Extended by ${additionalDays} days. Reason: ${reason || 'No reason provided'}`,
          updatedAt: new Date(),
        })
        .where(eq(laundryCycles.id, cycleId));

      // Log the extension
      await tx.insert(activityLogs).values({
        entityType: 'laundry_cycle',
        entityId: cycleId,
        action: 'extend',
        description: `Laundry cycle ${cycleId} extended by ${additionalDays} days`,
        userId,
        newValues: JSON.stringify({
          extendedBy: additionalDays,
          newExpectedEndDate: newExpectedEndDate,
          reason,
        }),
        createdAt: new Date(),
      });
    });
  }
}

// Export a singleton instance
export const laundryManager = new LaundryManager();

// Export the handler for use in API routes or scheduled jobs
export async function processLaundryCycles() {
  return await laundryManager.processOverdueLaundryCycles();
}