# Project Requirements Document (PRD)

## 1. Project Overview

The Professional Clothing Rental Management System is a full-stack web application designed to streamline rental operations for businesses offering professional attire. It provides a secure, role-based environment where Cashiers can quickly register customer rentals and process returns, while Managers can access detailed reports on inventory, finances, and customer activity. Built on a modern Next.js and PostgreSQL foundation, the system emphasizes reliability, type safety, and real-time data updates to prevent booking conflicts and ensure smooth day-to-day operations.

This system is being built to replace disparate spreadsheets and manual processes, reducing human error and speeding up transaction times. Key objectives include: 1) enabling Cashiers to complete rental registrations in under two minutes, 2) providing Managers with up-to-date analytics and exportable reports, and 3) ensuring zero data loss through ACID-compliant transactions. Success will be measured by improved throughput, reduction in booking conflicts, and positive user feedback on usability.

## 2. In-Scope vs. Out-of-Scope

### In-Scope (Version 1)
- User authentication and role-based access control (Cashier vs. Manager)
- Cashier Point of Sale (POS) interface for rental creation
- Inventory Management CRUD for Clothing Models and Inventory Items
- Rental and Return workflows with ACID-safe database transactions
- Manager Reporting Dashboard with charts and exportable tables
- Automatic daily laundry-cycle scheduler to update item availability
- Invoice/Receipt generation via printable HTML templates
- Activity logging and audit trail for all critical actions
- Light/dark theming and responsive design
- Containerized development and production setup with Docker
- Basic automated tests (unit, integration, end-to-end)

### Out-of-Scope (Phase 2+)
- Mobile application or offline support
- Multi-location inventory synchronization
- Third-party payment gateway integration (beyond simple placeholders)
- Advanced AI-driven recommendation or forecasting
- Customer portal for bookings or self-service returns
- Internationalization (i18n) or multi-currency support

## 3. User Flow

A new user (Cashier or Manager) lands on the public homepage and clicks "Sign In." They enter their credentials on the `/sign-in` page, and the system verifies their role. Cashiers are redirected to `/dashboard/pos`, while Managers go to `/dashboard/reports`. Both roles see a left-hand navigation bar with links to the relevant sections (POS, Inventory, Returns, Reports).

In the POS interface, Cashiers search and filter clothing items, add them to a virtual cart, and fill in customer details. Upon submission, the front end calls `POST /api/rentals`, which runs a Drizzle ORM transaction: it locks selected items, creates `Rental` and `RentalItems` records, updates item statuses to "Rented," and logs payment. Returns follow a similar pattern via `POST /api/returns`. Managers on the Reports page select date ranges, view aggregated charts, export CSVs, or drill down on individual transactions. The daily cron job runs in the background to mark items as "Available" once laundry cycles complete.

## 4. Core Features

- **Authentication & RBAC**: Secure sign-up/sign-in, JWT or session-based auth, `role` field (`cashier | manager`), middleware checks.
- **POS Interface**: Real-time inventory fetch, search/filter, cart management, form validation, payment placeholder.
- **Inventory Management**: Full CRUD on Clothing Models and Inventory Items via RESTful API routes (`/api/inventory`).
- **Rental & Return Workflows**: ACID transactions in Drizzle ORM, pessimistic locking (`SELECT ... FOR UPDATE`), late-fee calculations.
- **Reporting Dashboard**: Aggregated financial and inventory views, date filters, drill-downs, chart components (Chart.js or Recharts).
- **Scheduler**: Daily job (Vercel Cron or `node-cron`) scanning `LaundryCycles`, updating statuses, sending alerts.
- **Invoice Generation**: HTML/CSS templates for printable receipts and invoices.
- **Activity Logging**: `ActivityLogs` table capturing user, timestamp, action details.
- **Theming & Responsiveness**: Light/dark mode, mobile-friendly layout using Tailwind CSS.
- **Testing Suite**: Unit tests for business logic, integration tests for API routes, E2E tests (Playwright/Cypress).

## 5. Tech Stack & Tools

- **Frontend**: Next.js (App Router), React Server & Client Components, `shadcn/ui`, Tailwind CSS v4
- **Backend**: Next.js API Routes, Node.js, Drizzle ORM
- **Database**: PostgreSQL (via Docker Compose)
- **Authentication**: Better Auth (extended for roles)
- **Scheduling**: Vercel Cron or `node-cron`
- **Charting**: Recharts or Chart.js
- **Containerization**: Docker & `docker-compose`
- **Package Management**: pnpm
- **Code Quality**: ESLint, Prettier
- **Testing**: Jest (unit/integration), Playwright or Cypress (E2E)
- **IDE/Plugins (Optional)**: VSCode with Cursor, Windsurf for AI-assisted coding

## 6. Non-Functional Requirements

- **Performance**: Dashboard pages load in under 2 seconds; API responses under 500ms under normal load.
- **Security**: TLS encryption in transit, OWASP Top 10 protections, parameterized queries to prevent SQL injection.
- **Compliance**: GDPR-ready (data deletion on request), secure storage of customer PII.
- **Usability**: Accessible (WCAG AA), consistent UI patterns, form validation and inline error messages.
- **Scalability**: Support up to 100 concurrent cashier sessions, DB connection pooling.

## 7. Constraints & Assumptions

- **Dependencies**: Requires Node.js v18+, PostgreSQL 13+, Docker for local setup.
- **Hosting**: Assumes Vercel or similar serverless environment for frontend; Postgres hosted separately.
- **Environment Variables**: `.env` file with DB URL, auth secrets, cron schedule.
- **Assumptions**: Cashiers and Managers have stable internet access; rental periods are fixed to a default laundry cycle of 3 days.

## 8. Known Issues & Potential Pitfalls

- **Race Conditions**: Without proper locking, two cashiers could rent the same item. Mitigation: use `SELECT ... FOR UPDATE` inside Drizzle transactions.
- **Cron Reliability**: Serverless cron jobs may miss runs. Mitigation: implement retry logic and maintain a last-run timestamp.
- **Large Data Sets**: Reports on large date ranges can be slow. Mitigation: server-side pagination, caching of common queries.
- **Payment Placeholder**: If integrating real gateways later, ensure API routes are modular.
- **Time Zones**: Date filters and cron jobs may misfire across time zones. Mitigation: normalize all dates to UTC in the database.

---
*This PRD serves as the single source of truth for all subsequent technical documents and implementation guidelines.*