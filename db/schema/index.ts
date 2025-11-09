// Export all schema tables and enums
export * from './auth';
export * from './rental';

// Re-export commonly used items for convenience
export {
    // Auth tables
    user,
    session,
    account,
    verification,
    userRoleEnum,

    // Rental system tables
    customers,
    clothingModels,
    inventoryItems,
    rentals,
    rentalItems,
    payments,
    laundryCycles,
    activityLogs,

    // Enums
    itemStatusEnum,
    rentalStatusEnum,
    paymentMethodEnum,
    paymentStatusEnum,

    // Relations
    customersRelations,
    clothingModelsRelations,
    inventoryItemsRelations,
    rentalsRelations,
    rentalItemsRelations,
    paymentsRelations,
    laundryCyclesRelations,
    activityLogsRelations,
} from './rental';