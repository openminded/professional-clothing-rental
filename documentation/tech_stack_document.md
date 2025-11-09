# Tech Stack Document

This document explains the technology choices behind the Professional Clothing Rental Management System in clear, everyday language. It shows how each piece fits together and why we picked it.

---

## 1. Frontend Technologies

We chose a modern React-based stack to build a fast, responsive, and easy-to-use interface for both Cashiers and Managers.

- **Next.js (App Router)**  
  Provides server-side rendering and built-in API routes. Pages load quickly and can fetch live data (e.g., real-time inventory) before sending HTML to the browser.
- **React Server & Client Components**  
  Lets us split pages into parts that run on the server (for fast data loads) and parts that run in the browser (for interactive forms and buttons).
- **shadcn/ui**  
  A collection of ready-made UI building blocks (tables, dialogs, forms) so we don’t have to start from scratch. Speeds up development of inventory lists, rental forms, and confirmation pop-ups.
- **Tailwind CSS (v4)**  
  A utility-first styling framework that makes it easy to create a clean, professional look and switch between light/dark themes in seconds.
- **Charting Library (e.g., Recharts or Chart.js)**  
  Used in the Manager’s dashboard to visualize sales, overdue items, and inventory trends with line charts, bar charts, and pie charts.
- **Browser Print (`window.print()`)**  
  Leverages the built-in print dialog for generating customer receipts and invoices without extra libraries.

*How these choices help:*  
They give us a smooth development process, a consistent look and feel, and fast, interactive pages for both day-to-day operations and high-level reports.

---

## 2. Backend Technologies

Behind the scenes, these tools handle data storage, business logic, and security.

- **Next.js API Routes**  
  Acts as our RESTful API server. Routes like `/api/rentals` and `/api/inventory` process incoming requests, run business logic, and return JSON.
- **Better Auth**  
  A secure authentication library that manages sign-up, sign-in, sessions, and password hashing. We extend it to add roles (cashier, manager) and protect routes accordingly.
- **PostgreSQL**  
  A powerful relational database. It ensures data consistency, supports transactions, and lets us lock rows to prevent double-booking of inventory.
- **Drizzle ORM**  
  A type-safe way to talk to PostgreSQL from TypeScript. We define our tables (Rentals, InventoryItems, Customers, Payments, etc.) in code, and Drizzle generates SQL queries for us.
- **drizzle-kit**  
  Handles database migrations so our schema changes are tracked and reproducible (e.g., adding a new `LaundryCycles` table).
- **Node Cron or Vercel Cron Jobs**  
  Schedules daily tasks (like marking cleaned items as available after the 3-day laundry cycle) without manual intervention.
- **pnpm, ESLint, Prettier**  
  Ensures fast installs, consistent code style, and catches common mistakes early.

*How these pieces work together:*  
When a rental is created, the API route calls Drizzle inside a database transaction: it locks selected rows, writes rental and payment records, updates inventory status, and either commits or rolls back if something goes wrong.

---

## 3. Infrastructure and Deployment

We set up the project so that developers and production run the same code with minimal friction.

- **Docker & Docker Compose**  
  Defines containers for Next.js and PostgreSQL. Developers can run `docker-compose up` to spin up a local environment that mirrors production.
- **Git & GitHub**  
  Version control with pull requests, code reviews, and branch protections to keep the codebase healthy.
- **GitHub Actions (CI/CD)**  
  Automates linting, testing (unit, integration, end-to-end), and deployment whenever code is merged into main.
- **Hosting Platform (e.g., Vercel)**  
  Seamlessly deploys the Next.js app. Provides HTTPS, automatic builds, and optional cron jobs.

*Why these matter:*  
They guarantee that everyone—developers, testers, and end users—sees the same behavior. Automated pipelines catch errors early, and containerization avoids "it works on my machine" problems.

---

## 4. Third-Party Integrations

To extend functionality without reinventing the wheel, we integrate with external services.

- **Payment Processor (e.g., Stripe)**  
  Securely handles credit-card payments and refunds. Integrates at the POS step so payments are recorded automatically.
- **Email Service (e.g., SendGrid or Mailgun)**  
  Sends notifications for overdue returns, laundry completion alerts, or low-stock warnings.
- **Analytics (e.g., Google Analytics, Vercel Analytics)**  
  Tracks user behavior on the dashboard, helping managers spot bottlenecks or training needs.

*Benefits:*  
These integrations improve trust (secure payments), automate communications, and give insights into how the system is used.

---

## 5. Security and Performance Considerations

We designed the stack with safety and speed in mind:

- **Role-Based Access Control**  
  Only authorized users (cashiers vs. managers) can access specific pages or API endpoints.
- **Encrypted Secrets & Environment Variables**  
  Database credentials, auth secrets, and API keys stay out of source control and are stored securely.
- **Database Transactions & Row Locking**  
  Uses PostgreSQL’s `SELECT ... FOR UPDATE` to prevent two cashiers from renting the same item at once.
- **Comprehensive Error Handling**  
  API routes return clear messages (e.g., "Item X was just rented—please refresh"). Rollbacks keep data correct if anything fails.
- **Server-Side Rendering for Data-Heavy Pages**  
  Reporting screens load aggregated data on the server, so clients get fully rendered charts quickly.
- **Linting & Tests**  
  ESLint and Prettier enforce best practices. A test suite (Jest for unit tests, Playwright or Cypress for E2E) confirms that key workflows (rental creation, returns, reporting) always work.

*How this helps:*  
Users experience a fast, reliable system. Potential attacks (e.g., unauthorized access or payment tampering) are blocked, and performance bottlenecks are minimized.

---

## 6. Conclusion and Overall Tech Stack Summary

This Professional Clothing Rental Management System is built on a modern, well-integrated stack:  

- **Frontend:** Next.js + React + shadcn/ui + Tailwind CSS + Chart library  
- **Backend:** Next.js API Routes + Better Auth + PostgreSQL + Drizzle ORM + Cron jobs  
- **Infrastructure:** Docker Compose + Git/GitHub + GitHub Actions + Vercel  
- **Integrations:** Stripe (payments), SendGrid (email), Analytics tools  
- **Quality & Security:** ESLint, Prettier, comprehensive testing, RBAC, encrypted secrets, DB transactions.

These choices align perfectly with our goals:

- Speed of development (pre-built UI, type safety).
- Data integrity (ACID transactions, row locking).
- Clear separation of roles (cashier vs. manager).
- Automated deployment and maintenance (containers, CI/CD, cron jobs).

Together, they form a reliable, scalable foundation that lets you focus on delivering great features—like inventory forecasting, dynamic pricing, or advanced reporting—rather than wrestling with infrastructure or boilerplate code.