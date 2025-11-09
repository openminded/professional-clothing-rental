import {
    pgTable,
    text,
    timestamp,
    decimal,
    integer,
    boolean,
    pgEnum,
    primaryKey,
    index
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";

// Enums for various statuses
export const itemStatusEnum = pgEnum("item_status", [
    "available",
    "rented",
    "in_laundry",
    "unavailable",
    "damaged"
]);

export const rentalStatusEnum = pgEnum("rental_status", [
    "pending",
    "active",
    "completed",
    "overdue",
    "cancelled"
]);

export const paymentMethodEnum = pgEnum("payment_method", [
    "cash",
    "transfer",
    "card"
]);

export const paymentStatusEnum = pgEnum("payment_status", [
    "pending",
    "paid",
    "partial",
    "failed"
]);

// Customers table
export const customers = pgTable("customers", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    email: text("email").unique(),
    phoneNumber: text("phone_number").notNull(),
    address: text("address"),
    idNumber: text("id_number").unique(),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
    phoneIndex: index("customers_phone_idx").on(table.phoneNumber),
    nameIndex: index("customers_name_idx").on(table.name),
}));

// Clothing Models table
export const clothingModels = pgTable("clothing_models", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    brand: text("brand"),
    dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }).notNull(),
    lateFeeRate: decimal("late_fee_rate", { precision: 10, scale: 2 }).notNull().default("10.00"),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
    nameIndex: index("clothing_models_name_idx").on(table.name),
    categoryIndex: index("clothing_models_category_idx").on(table.category),
}));

// Inventory Items table (size/color variants)
export const inventoryItems = pgTable("inventory_items", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    modelId: text("model_id").notNull().references(() => clothingModels.id, { onDelete: "cascade" }),
    sku: text("sku").notNull().unique(),
    size: text("size").notNull(),
    color: text("color").notNull(),
    status: itemStatusEnum("status").notNull().default("available"),
    condition: text("condition").default("good"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
    skuIndex: index("inventory_items_sku_idx").on(table.sku),
    modelIndex: index("inventory_items_model_idx").on(table.modelId),
    statusIndex: index("inventory_items_status_idx").on(table.status),
    modelStatusIndex: index("inventory_items_model_status_idx").on(table.modelId, table.status),
}));

// Rentals table
export const rentals = pgTable("rentals", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "restrict" }),
    cashierId: text("cashier_id").notNull().references(() => user.id, { onDelete: "restrict" }),
    status: rentalStatusEnum("status").notNull().default("pending"),
    rentalDate: timestamp("rental_date").notNull().defaultNow(),
    expectedReturnDate: timestamp("expected_return_date").notNull(),
    actualReturnDate: timestamp("actual_return_date"),
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
    lateFees: decimal("late_fees", { precision: 10, scale: 2 }).notNull().default("0.00"),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
    customerIndex: index("rentals_customer_idx").on(table.customerId),
    cashierIndex: index("rentals_cashier_idx").on(table.cashierId),
    statusIndex: index("rentals_status_idx").on(table.status),
    dateIndex: index("rentals_date_idx").on(table.rentalDate),
    expectedReturnIndex: index("rentals_expected_return_idx").on(table.expectedReturnDate),
}));

// Rental Items junction table
export const rentalItems = pgTable("rental_items", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    rentalId: text("rental_id").notNull().references(() => rentals.id, { onDelete: "cascade" }),
    inventoryItemId: text("inventory_item_id").notNull().references(() => inventoryItems.id, { onDelete: "restrict" }),
    pickupDate: timestamp("pickup_date"),
    returnDate: timestamp("return_date"),
    actualReturnDate: timestamp("actual_return_date"),
    dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }).notNull(),
    lateFeeRate: decimal("late_fee_rate", { precision: 10, scale: 2 }).notNull(),
    calculatedFees: decimal("calculated_fees", { precision: 10, scale: 2 }).notNull().default("0.00"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
    rentalIndex: index("rental_items_rental_idx").on(table.rentalId),
    inventoryIndex: index("rental_items_inventory_idx").on(table.inventoryItemId),
    uniqueRentalItem: index("rental_items_unique_idx").on(table.rentalId, table.inventoryItemId),
}));

// Payments table
export const payments = pgTable("payments", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    rentalId: text("rental_id").notNull().references(() => rentals.id, { onDelete: "cascade" }),
    cashierId: text("cashier_id").notNull().references(() => user.id, { onDelete: "restrict" }),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    method: paymentMethodEnum("method").notNull(),
    status: paymentStatusEnum("status").notNull().default("paid"),
    transactionReference: text("transaction_reference"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
    rentalIndex: index("payments_rental_idx").on(table.rentalId),
    cashierIndex: index("payments_cashier_idx").on(table.cashierId),
    statusIndex: index("payments_status_idx").on(table.status),
    dateIndex: index("payments_date_idx").on(table.createdAt),
}));

// Laundry Cycles table
export const laundryCycles = pgTable("laundry_cycles", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    inventoryItemId: text("inventory_item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
    rentalItemId: text("rental_item_id").references(() => rentalItems.id, { onDelete: "set null" }),
    startDate: timestamp("start_date").notNull().defaultNow(),
    expectedEndDate: timestamp("expected_end_date").notNull(),
    actualEndDate: timestamp("actual_end_date"),
    status: text("status").notNull().default("in_progress"),
    notes: text("notes"),
    createdBy: text("created_by").notNull().references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
    inventoryIndex: index("laundry_cycles_inventory_idx").on(table.inventoryItemId),
    statusIndex: index("laundry_cycles_status_idx").on(table.status),
    endDateIndex: index("laundry_cycles_end_date_idx").on(table.expectedEndDate),
}));

// Activity Logs table
export const activityLogs = pgTable("activity_logs", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    description: text("description").notNull(),
    oldValues: text("old_values"),
    newValues: text("new_values"),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
    entityIndex: index("activity_logs_entity_idx").on(table.entityType, table.entityId),
    userIndex: index("activity_logs_user_idx").on(table.userId),
    actionIndex: index("activity_logs_action_idx").on(table.action),
    dateIndex: index("activity_logs_date_idx").on(table.createdAt),
}));

// Relations
export const customersRelations = relations(customers, ({ many }) => ({
    rentals: many(rentals),
}));

export const clothingModelsRelations = relations(clothingModels, ({ many }) => ({
    inventoryItems: many(inventoryItems),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one, many }) => ({
    model: one(clothingModels, {
        fields: [inventoryItems.modelId],
        references: [clothingModels.id],
    }),
    rentalItems: many(rentalItems),
    laundryCycles: many(laundryCycles),
}));

export const rentalsRelations = relations(rentals, ({ one, many }) => ({
    customer: one(customers, {
        fields: [rentals.customerId],
        references: [customers.id],
    }),
    cashier: one(user, {
        fields: [rentals.cashierId],
        references: [user.id],
    }),
    rentalItems: many(rentalItems),
    payments: many(payments),
}));

export const rentalItemsRelations = relations(rentalItems, ({ one, many }) => ({
    rental: one(rentals, {
        fields: [rentalItems.rentalId],
        references: [rentals.id],
    }),
    inventoryItem: one(inventoryItems, {
        fields: [rentalItems.inventoryItemId],
        references: [inventoryItems.id],
    }),
    laundryCycles: many(laundryCycles),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
    rental: one(rentals, {
        fields: [payments.rentalId],
        references: [rentals.id],
    }),
    cashier: one(user, {
        fields: [payments.cashierId],
        references: [user.id],
    }),
}));

export const laundryCyclesRelations = relations(laundryCycles, ({ one }) => ({
    inventoryItem: one(inventoryItems, {
        fields: [laundryCycles.inventoryItemId],
        references: [inventoryItems.id],
    }),
    rentalItem: one(rentalItems, {
        fields: [laundryCycles.rentalItemId],
        references: [rentalItems.id],
    }),
    createdByUser: one(user, {
        fields: [laundryCycles.createdBy],
        references: [user.id],
    }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
    user: one(user, {
        fields: [activityLogs.userId],
        references: [user.id],
    }),
}));