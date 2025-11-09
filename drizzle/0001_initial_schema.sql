-- Create enum types
CREATE TYPE "user_role" AS ENUM('cashier', 'manager', 'admin');
CREATE TYPE "item_status" AS ENUM('available', 'rented', 'in_laundry', 'unavailable', 'damaged');
CREATE TYPE "rental_status" AS ENUM('pending', 'active', 'completed', 'overdue', 'cancelled');
CREATE TYPE "payment_method" AS ENUM('cash', 'transfer', 'card');
CREATE TYPE "payment_status" AS ENUM('pending', 'paid', 'partial', 'failed');

-- Create tables
-- Customers table
CREATE TABLE "customers" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT UNIQUE,
    "phone_number" TEXT NOT NULL,
    "address" TEXT,
    "id_number" TEXT UNIQUE,
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Clothing Models table
CREATE TABLE "clothing_models" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "brand" TEXT,
    "daily_rate" DECIMAL(10,2) NOT NULL,
    "late_fee_rate" DECIMAL(10,2) DEFAULT 10.00 NOT NULL,
    "image_url" TEXT,
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Inventory Items table
CREATE TABLE "inventory_items" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "model_id" TEXT NOT NULL REFERENCES "clothing_models"("id") ON DELETE CASCADE,
    "sku" TEXT NOT NULL UNIQUE,
    "size" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "status" "item_status" DEFAULT 'available' NOT NULL,
    "condition" TEXT DEFAULT 'good',
    "notes" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Rentals table
CREATE TABLE "rentals" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "customer_id" TEXT NOT NULL REFERENCES "customers"("id") ON DELETE RESTRICT,
    "cashier_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
    "status" "rental_status" DEFAULT 'pending' NOT NULL,
    "rental_date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expected_return_date" TIMESTAMP NOT NULL,
    "actual_return_date" TIMESTAMP,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "late_fees" DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Rental Items junction table
CREATE TABLE "rental_items" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "rental_id" TEXT NOT NULL REFERENCES "rentals"("id") ON DELETE CASCADE,
    "inventory_item_id" TEXT NOT NULL REFERENCES "inventory_items"("id") ON DELETE RESTRICT,
    "pickup_date" TIMESTAMP,
    "return_date" TIMESTAMP,
    "actual_return_date" TIMESTAMP,
    "daily_rate" DECIMAL(10,2) NOT NULL,
    "late_fee_rate" DECIMAL(10,2) NOT NULL,
    "calculated_fees" DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Payments table
CREATE TABLE "payments" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "rental_id" TEXT NOT NULL REFERENCES "rentals"("id") ON DELETE CASCADE,
    "cashier_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "payment_method" NOT NULL,
    "status" "payment_status" DEFAULT 'paid' NOT NULL,
    "transaction_reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Laundry Cycles table
CREATE TABLE "laundry_cycles" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "inventory_item_id" TEXT NOT NULL REFERENCES "inventory_items"("id") ON DELETE CASCADE,
    "rental_item_id" TEXT REFERENCES "rental_items"("id") ON DELETE SET NULL,
    "start_date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expected_end_date" TIMESTAMP NOT NULL,
    "actual_end_date" TIMESTAMP,
    "status" TEXT DEFAULT 'in_progress' NOT NULL,
    "notes" TEXT,
    "created_by" TEXT NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Activity Logs table
CREATE TABLE "activity_logs" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "old_values" TEXT,
    "new_values" TEXT,
    "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for performance optimization
-- Customers indexes
CREATE INDEX "customers_phone_idx" ON "customers"("phone_number");
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- Clothing Models indexes
CREATE INDEX "clothing_models_name_idx" ON "clothing_models"("name");
CREATE INDEX "clothing_models_category_idx" ON "clothing_models"("category");

-- Inventory Items indexes
CREATE INDEX "inventory_items_sku_idx" ON "inventory_items"("sku");
CREATE INDEX "inventory_items_model_idx" ON "inventory_items"("model_id");
CREATE INDEX "inventory_items_status_idx" ON "inventory_items"("status");
CREATE INDEX "inventory_items_model_status_idx" ON "inventory_items"("model_id", "status");

-- Rentals indexes
CREATE INDEX "rentals_customer_idx" ON "rentals"("customer_id");
CREATE INDEX "rentals_cashier_idx" ON "rentals"("cashier_id");
CREATE INDEX "rentals_status_idx" ON "rentals"("status");
CREATE INDEX "rentals_date_idx" ON "rentals"("rental_date");
CREATE INDEX "rentals_expected_return_idx" ON "rentals"("expected_return_date");

-- Rental Items indexes
CREATE INDEX "rental_items_rental_idx" ON "rental_items"("rental_id");
CREATE INDEX "rental_items_inventory_idx" ON "rental_items"("inventory_item_id");
CREATE INDEX "rental_items_unique_idx" ON "rental_items"("rental_id", "inventory_item_id");

-- Payments indexes
CREATE INDEX "payments_rental_idx" ON "payments"("rental_id");
CREATE INDEX "payments_cashier_idx" ON "payments"("cashier_id");
CREATE INDEX "payments_status_idx" ON "payments"("status");
CREATE INDEX "payments_date_idx" ON "payments"("created_at");

-- Laundry Cycles indexes
CREATE INDEX "laundry_cycles_inventory_idx" ON "laundry_cycles"("inventory_item_id");
CREATE INDEX "laundry_cycles_status_idx" ON "laundry_cycles"("status");
CREATE INDEX "laundry_cycles_end_date_idx" ON "laundry_cycles"("expected_end_date");

-- Activity Logs indexes
CREATE INDEX "activity_logs_entity_idx" ON "activity_logs"("entity_type", "entity_id");
CREATE INDEX "activity_logs_user_idx" ON "activity_logs"("user_id");
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");
CREATE INDEX "activity_logs_date_idx" ON "activity_logs"("created_at");

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON "customers" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clothing_models_updated_at BEFORE UPDATE ON "clothing_models" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON "inventory_items" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rentals_updated_at BEFORE UPDATE ON "rentals" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rental_items_updated_at BEFORE UPDATE ON "rental_items" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON "payments" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_laundry_cycles_updated_at BEFORE UPDATE ON "laundry_cycles" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();