# Backend Structure Document

## 1. Backend Architecture

This section describes how the backend is organized and the main patterns we use to keep it fast, scalable, and easy to maintain.

**Overall Design**
- We build our API layer using Next.js API Routes. Each file under `app/api/...` acts like a controller that handles HTTP requests and responses.  
- Business logic lives in the `lib/` folder. For example, pricing rules go in `lib/pricing.ts`, and authentication helpers go in `lib/auth.ts`.  
- Database interactions are handled through Drizzle ORM, which enforces type safety and gives us a clear schema-driven approach.  
- We use Docker Compose locally to mirror production, making sure our dev environment is consistent with deployment.

**Supporting Scalability**
- **Stateless APIs**: Each API route is self-contained and does not rely on in-memory state, making horizontal scaling straightforward.  
- **Containerization**: We Dockerize the backend so it can run on any cloud container platform (ECS, Cloud Run, etc.).  
- **Serverless Option**: When deployed on Vercel, each API route scales automatically with demand.

**Maintainability & Performance**
- **Separation of Concerns**: UI code lives in `app/`, database logic in `db/`, and helper functions in `lib/`. This clear structure reduces merge conflicts and makes onboarding new developers easier.  
- **Type Safety**: Drizzle ORM aligns our TypeScript types with the database schema to catch errors at compile time.  
- **Caching Ready**: We can plug in Redis or in-memory caches into our service layer without changing the API interface.  

## 2. Database Management

**Technology Choices**
- **Type**: Relational (SQL)  
- **System**: PostgreSQL  
- **ORM**: Drizzle ORM  
- **Migrations**: `drizzle-kit` manages schema migrations and snapshots.

**Data Handling**
- Schemas are defined in TypeScript `db/schema/*.ts` files.  
- The `db/index.ts` file initializes a Drizzle client that all API routes import for queries and transactions.  
- Migrations ensure we can evolve the schema safely over time, with versioned SQL files.
- We use database transactions (via `db.transaction`) for multi-step operations like rental creation to guarantee ACID properties.  

## 3. Database Schema

Below is a human-readable overview of our main tables, followed by the actual SQL for PostgreSQL.

### Human-Readable Schema
- **users**: Stores login info and role (`cashier` or `manager`)  
- **clothing_models**: Master list of clothing types and details (e.g., size, brand)  
- **inventory_items**: Individual items tied to a model (each has a status: Available, Rented, InLaundry)  
- **customers**: Client information (name, contact details, membership level)  
- **rentals**: A rental transaction with start date, due date, status, and foreign key to `customers` and `users` (cashier)  
- **rental_items**: Junction table linking `rentals` to `inventory_items`  
- **payments**: Records payment amounts, methods, and timestamps for each rental  
- **laundry_cycles**: Tracks when items go to laundry and when they return to availability  
- **activity_logs**: Audit trail of key actions (rental created, returned, status override) with user and timestamp

### PostgreSQL Schema (SQL)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('cashier','manager')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clothing_models (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  size TEXT,
  brand TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventory_items (
  id SERIAL PRIMARY KEY,
  model_id INTEGER NOT NULL REFERENCES clothing_models(id),
  status TEXT NOT NULL CHECK (status IN ('Available','Rented','InLaundry')),
  barcode TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  membership_level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rentals (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  cashier_id INTEGER NOT NULL REFERENCES users(id),
  start_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Open','Completed','Overdue')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rental_items (
  rental_id INTEGER REFERENCES rentals(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES inventory_items(id),
  PRIMARY KEY (rental_id, item_id)
);

CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  rental_id INTEGER NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  method TEXT,
  paid_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE laundry_cycles (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES inventory_items(id),
  sent_at TIMESTAMPTZ NOT NULL,
  returned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```  

## 4. API Design and Endpoints

We follow a RESTful approach using Next.js API Routes. Each route handles one resource.

**Key Endpoints**

- `/api/auth/sign-up` & `/api/auth/sign-in`  
  * Manages user registration and login with role assignment.  

- `/api/inventory`  
  * GET: List or search items by status/model  
  * POST: Create new inventory item  
  * PUT: Update item status or details  
  * DELETE: Remove an item

- `/api/models`  
  * CRUD on clothing model definitions

- `/api/customers`  
  * GET/POST/PUT/DELETE customer records

- `/api/rentals`  
  * POST: Start a new rental (wrapped in a database transaction)  
  * GET: List or filter rentals by customer/date/status

- `/api/rentals/[id]/return`  
  * POST: Process return, calculate late fees, update statuses

- `/api/payments`  
  * POST: Record payment for a rental

- `/api/laundry`  
  * GET: View laundry history  
  * POST: Mark item sent or returned from laundry

- `/api/reports`  
  * GET: Financial and inventory reports (aggregations, date filters)

Each endpoint validates input, handles errors gracefully, and returns clear status codes and messages.

## 5. Hosting Solutions

- **Cloud Provider**: We can host the backend on Vercel (for serverless functions) or on a container platform like AWS ECS, Google Cloud Run, or Azure Container Instances.  
- **Database**: Managed PostgreSQL via AWS RDS, Google Cloud SQL, or DigitalOcean Managed Databases for high availability and automated backups.  
- **Cron Jobs**: Vercel Cron for scheduled laundry cycle updates, or a self-hosted Node.js cron process in a Docker container.

**Benefits**
- High availability and automated scaling reduce downtime risk.  
- Managed databases offload backups, patching, and replication.  
- Serverless functions or containers only incur cost when in use, improving cost effectiveness.

## 6. Infrastructure Components

- **Load Balancer**: Built into Vercel or provided by cloud provider for container deployments.  
- **CDN**: Vercel’s global CDN delivers static assets and API responses with low latency.  
- **Caching**: We can add Redis for session storage, rate limiting, or caching expensive report queries.  
- **Database Connection Pool**: Managed by the cloud provider or via Env var–configured pooling library to optimize DB connections.  
- **Cron Scheduler**: Handles daily laundry cycle tasks, email alerts, and status updates.

These components work together to ensure fast responses, distribute load evenly, and keep operational costs in check.

## 7. Security Measures

- **Authentication & Authorization**  
  * Using Better Auth for secure sign-in/sign-up flows.  
  * Role-based access control (RBAC) enforced both in API middleware and on the frontend.  
- **Data Encryption**  
  * TLS/HTTPS for all client-server communication.  
  * Passwords hashed and salted before storage.  
- **Input Validation & Sanitization**  
  * All incoming data is validated via schemas and sanitized to prevent SQL injection and XSS.  
- **Rate Limiting & Throttling**  
  * Protect critical endpoints (e.g., login) from brute force attacks.  
- **Audit Logs**  
  * Every key action (rental creation, return, override) is logged in `activity_logs` for compliance and debugging.

## 8. Monitoring and Maintenance

- **Logging**: Use a structured logger (e.g., Winston) to track errors, warnings, and info messages. Logs ship to a central service like Logflare or Datadog.  
- **Error Tracking**: Integrate Sentry to capture unhandled exceptions and performance issues.  
- **Performance Monitoring**: Use Vercel Analytics, New Relic, or Prometheus + Grafana to track response times, throughput, and error rates.  
- **Health Checks**: Automated pings to `/api/health` endpoint to ensure uptime.  
- **Maintenance Strategies**  
  * Apply schema migrations during maintenance windows using `drizzle-kit`.  
  * Automated backups of the database with point-in-time recovery enabled.  
  * Regular dependency updates and security audits with tools like Dependabot.

## 9. Conclusion and Overall Backend Summary

This backend structure provides a clear, scalable, and secure foundation for your Professional Clothing Rental Management System. We use Next.js API Routes and Drizzle ORM to keep code organized, type safe, and easy to evolve. PostgreSQL powers robust, transactional data handling, while Docker and serverless options ensure consistent environments from development to production. Caching, CDNs, and load balancers deliver fast user experiences, and comprehensive security, monitoring, and maintenance practices safeguard data and uptime.

All components align to support your core workflows—authentication, POS operations, inventory management, rentals and returns, reporting, and scheduled laundry cycles—so that your team can focus on delivering exceptional business value rather than reinventing infrastructure.