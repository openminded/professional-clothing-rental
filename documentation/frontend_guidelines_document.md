# Frontend Guideline Document

This document outlines the frontend architecture, design principles, styling rules, component structure, state management, routing strategy, performance tips, and testing approach for the **Professional Clothing Rental Management System**. It’s written in everyday language so anyone can understand how the frontend is set up and maintained.

---

## 1. Frontend Architecture

### 1.1 Overview
- Framework: **Next.js** (App Router) with React Server and Client Components. This gives both server-rendered pages (fast initial load) and interactive client-side UIs.
- Language: **TypeScript** for type safety and fewer runtime errors.
- UI Library: **shadcn/ui** for pre-built, accessible components (tables, dialogs, forms) that speed up development.
- Styling: **Tailwind CSS v4** (utility-first) for rapid, consistent styling.
- Authentication: **Better Auth** integrated into Next.js API routes and frontend hooks to manage user sessions.
- Data Fetching: Next.js built-in `fetch` on the server and client, plus React’s built-in state hooks. (Optional: add a data-caching library like React Query or SWR if heavy client caching is needed.)

### 1.2 Scalability, Maintainability, Performance
- **Scalability**: Next.js’s App Router supports nested routes and layouts out of the box, so you can add new dashboards or pages without restructuring existing code.
- **Maintainability**: Component-based architecture (see Section 4) keeps UI pieces isolated and reusable.
- **Performance**: Server Components handle data-intensive pages (reports, inventory) on the server, reducing client bundle size. Client Components power interactive parts (POS form, dialogs).

---

## 2. Design Principles

1. **Usability**: Simple, intuitive flows for cashiers and managers. Every form and button has clear labels and feedback messages.
2. **Accessibility (a11y)**: All components follow ARIA guidelines. Keyboard navigation and screen-reader support are guaranteed by using shadcn/ui’s accessible building blocks.
3. **Responsiveness**: Layouts adapt to desktop and tablet screens using Tailwind’s responsive utilities (e.g., `md:`, `lg:` prefixes).
4. **Consistency**: Shared tokens for colors, spacing, typography ensure a unified look across pages.
5. **Feedback and Error Handling**: Every action gives immediate feedback—loading spinners, success toasts, error messages—so users know exactly what’s happening.

_Application of Principles_: Forms show inline validation errors, tables are sortable and filterable, dialogs confirm destructive actions, and all pages maintain a consistent header/sidebar layout.

---

## 3. Styling and Theming

### 3.1 Styling Approach
- **Utility-first** with **Tailwind CSS**. No external CSS files or BEM naming—most styling is done inline via class names.
- **Dark/Light Mode**: Implemented using a `data-theme` attribute (or `class="dark"`) toggled in a top-level layout. Tailwind’s `dark:` variants style components accordingly.

### 3.2 Theming
- Centralized in `tailwind.config.js` under `theme.extend`:
  • Colors, fonts, border radius, shadows.
  • Dark and light color tokens.

### 3.3 Visual Style
- **Style**: Modern flat design with subtle shadows and glassmorphism touches on modal backgrounds.
- **Color Palette**:
    • Primary: #1E40AF (Blue 800)
    • Primary Light: #3B82F6 (Blue 500)
    • Secondary: #047857 (Emerald 700)
    • Accent: #F59E0B (Amber 500)
    • Neutral Light: #F3F4F6 (Gray 100)
    • Neutral Dark: #111827 (Gray 900)
    • Error: #DC2626 (Red 600)
    • Success: #16A34A (Green 600)

- **Typography**:
    • Font Family: **Inter**, sans-serif (imported via Google Fonts).
    • Base Size: 16px, with `leading-relaxed` and `tracking-wide` for readability.

---

## 4. Component Structure

### 4.1 Directory Organization
```
app/                  # Next.js routes & layouts
  ├── (auth)/         # Sign-in, sign-up layouts
  ├── dashboard/      # Nested routes: pos/, inventory/, returns/, reports/
components/           # UI building blocks & business components
  ├── ui/             # shadcn/ui components overrides
  ├── business/       # e.g., RentalForm.tsx, InventoryTable.tsx, RevenueChart.tsx
lib/                  # Shared utilities & auth logic
  └── auth.ts         # Role checks, session helpers
styles/               # Tailwind config, global CSS (if any)
```

### 4.2 Reusability
- **UI primitives** (buttons, inputs, tables) live under `components/ui` and are only styled overrides or wrappers around shadcn/ui.
- **Business components** under `components/business` compose UI primitives to implement domain features (POS cart list, rental history row).

### 4.3 Benefits
- **Isolation**: Changing one component has minimal ripple effects.
- **Discoverability**: Clear folder separation means new developers can find what they need quickly.

---

## 5. State Management

### 5.1 Global State
- **Authentication & User Info**: Managed by Better Auth’s React hooks and NextAuth session. User role (`cashier` or `manager`) is available via a `useSession()` hook.
- **Theme (Light/Dark)**: Stored in a React Context or in `localStorage`, toggled by a context provider at the root.

### 5.2 Local/Component State
- **Component UI State**: `useState`, `useReducer` for form inputs, modal open/close flags, cart items.
- **Server Data**: Fetched in React Server Components or via client fetch calls. For interactive data needs (e.g., live search in POS), you can introduce **SWR** or **React Query** to handle caching and background refetching.

### 5.3 Sharing State
- Context providers (AuthContext, ThemeContext) wrap the app in root layouts.
- Props drilling is minimized by colocating data fetching in parent components and passing down only what children need.

---

## 6. Routing and Navigation

- **Next.js App Router** handles all routing.
- **Layouts**: A main `dashboard/layout.tsx` wraps all secure pages. It checks the user session and redirects to `/sign-in` if not authenticated.
- **Nested Routes**:
    /dashboard/pos      — Cashier’s Point of Sale
    /dashboard/inventory— Inventory CRUD screens
    /dashboard/returns  — Return processing
    /dashboard/reports  — Manager’s financial and inventory reports
- **Protected Routes**: Implemented in the layout using a server-side session check (`getServerSession`). Manager-only pages add an extra role guard.
- **Navigation UI**: A sidebar component with links that highlight based on the current route. The sidebar hides/shows items based on user role.

---

## 7. Performance Optimization

1. **Server Components** for data-heavy views (reports, inventory) to reduce bundle size on the client.
2. **Code Splitting & Dynamic Imports**:
   - Use `next/dynamic` to load heavy chart components (e.g., Chart.js, Recharts) only when the Reports page mounts.
3. **Image Optimization**: Use `next/image` for any product photos or icons.
4. **Lazy Loading**: Defer loading of non-critical components (modals, advanced filters) until they are needed.
5. **Minification & Compression**: Default Next.js production build handles JS/CSS minification and gzip/brotli compression.
6. **Caching**: Leverage Next.js’s `cache-control` headers on API responses. Introduce SWR/React Query stale-while-revalidate if real-time updates are needed in the POS.

---

## 8. Testing and Quality Assurance

### 8.1 Unit Tests
- **Tools**: Jest + React Testing Library.
- **What to test**: Business logic in utility functions (e.g., pricing, late fee calculations), individual UI components (button clicks, form validation).

### 8.2 Integration Tests
- **Tools**: Jest + Testing Library + MSW (Mock Service Worker) for API mocking.
- **What to test**: API routes (`/api/rentals`, `/api/inventory`), ensuring database mocks produce expected state changes and error handling.

### 8.3 End-to-End Tests
- **Tools**: Playwright or Cypress.
- **What to test**: Core user flows end-to-end:
  • Cashier sign-in → Create rental → Verify inventory status
  • Process return → Verify late fee calculation and status update
  • Manager sign-in → View reports → Filter by date range

### 8.4 Code Quality
- **Linting**: ESLint with a shared config (rules for React, Tailwind, imports).
- **Formatting**: Prettier auto-formats code on save.
- **Pre-commit Hooks**: Husky + lint-staged to run tests and linting before commits.

---

## 9. Conclusion and Overall Frontend Summary

This Frontend Guideline Document covers everything you need to build and maintain a professional clothing rental system UI:

- A **scalable architecture** with Next.js, Server Components, and a clear folder layout.
- **Design principles** focused on usability, accessibility, and responsiveness.
- A **modern flat style** powered by Tailwind CSS and shadcn/ui, with light/dark themes and a consistent color palette.
- **Component-based structure** that separates UI primitives from business logic for easy reuse.
- **State management** via React hooks, Context for global concerns, and optional data-caching libraries.
- **Routing** using the Next.js App Router with protected, role-based layouts.
- **Performance** best practices like code splitting, dynamic imports, and image optimization.
- A **comprehensive testing strategy** (unit, integration, end-to-end) and tooling for linting and formatting.

By following these guidelines, your team can deliver a maintainable, high-performance frontend that meets the operational needs of cashiers and managers while providing an excellent user experience. Good luck building out your POS, inventory screens, returns flow, and reporting dashboards!