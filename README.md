# IMS-Smart — Bar Ledger & Inventory Management System

A production-ready, multi-tenant inventory, live sales tally, customer credit, and cash-flow management application built by **Avalon Digital**. Designed for restaurant bars with support for complex multi-channel pricing, returnable bottle deposits, happy hour promotions, and independent three-way day-end reconciliation.

## Features

- **Multi-Tenant & Entitlement-Driven:** One unified backend serving multiple clients with per-tenant module switches and custom settings.
- **Inventory & Supplies:** Real-time append-only stock movement ledger, delivery tracking with Weighted Average Cost (WAC), and reorder alerts.
- **Live Orders & Tally:** Touch-friendly fast product tiles, channel separation (Inside vs. Outside), 60-second undo recovery, and multi-method split payments (Cash, Card, Tab).
- **Bottle Deposit Engine:** Automated tracking for government-mandated returnable containers, return refund validation against sold containers, and discount token issuance.
- **Tabs & Customer Credit:** Credit account limits, overdue calculation, due date extensions, and cashier request approvals.
- **Cash Drawer & Expenses:** Real-time ledger of drawer movements, operational bar expenses with category attribution, and float management.

## Tech Stack

- **Frontend:** React 18, Vite 5, TypeScript (strict), Tailwind CSS
- **State & Data:** TanStack Query v5, Zod schemas, date-fns
- **Backend:** Firebase (Auth, Firestore, Cloud Functions, Storage, Hosting)
- **Quality & Testing:** Vitest, ESLint, Prettier

## Commands

```bash
# Install dependencies
./bin/pnpm install

# Run web app in development
./bin/pnpm --filter web dev

# Type check
./bin/pnpm typecheck

# Lint check
./bin/pnpm lint

# Unit tests with coverage
./bin/pnpm test:coverage

# Build web application
./bin/pnpm --filter web build
```
