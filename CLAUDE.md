# IMS — Inventory Management System by Avalon Digital

> **Version:** 1.0.0 | **Stack lock:** Phase 1 foundation | **Last updated:** 2026-10-11

---

## What this project is

A production-ready, multi-tenant PWA that replaces the manual tally-book process at a restaurant bar. Staff record every bottle sold, returned, and counted, every cash movement, and every delivery. The system reconciles stock, empty bottles, and cash independently at day-end and reports any mismatch with a likely cause.

One Firebase project and one deployment serve **many clients (tenants)**. Each client's data lives entirely under `clients/{clientId}/...` in Firestore. A feature registry controls which modules, dashboard tiles, reports, and settings tabs are available per client.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + Vite 5 + TypeScript 5 (strict) |
| Styling | Tailwind CSS 3 + shadcn/ui |
| Routing | React Router v6 |
| Server state | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Dates | date-fns |
| Search | Fuse.js |
| PWA | Vite PWA plugin |
| Backend | Firebase 10 (Auth, Firestore, Functions, Storage, Hosting) |
| Functions language | TypeScript (Node 20) |
| Unit tests | Vitest + Testing Library |
| Rules tests | @firebase/rules-unit-testing |
| E2E tests | Playwright |
| Linting | ESLint 8 + Prettier 3 |
| Git hooks | Husky 9 + lint-staged |
| CI/CD | GitHub Actions |
| Package manager | pnpm 9 (workspaces) |

---

## Folder structure

```
/ (workspace root)
├── apps/
│   └── web/                   ← Vite + React PWA
│       └── src/
│           ├── app/           ← routing, providers, app shell
│           ├── registry/      ← feature registry (modules, tiles, reports, tabs, presets)
│           ├── features/      ← one folder per feature area
│           │   ├── auth/
│           │   ├── super/     ← super admin console
│           │   ├── dashboard/
│           │   ├── products/
│           │   ├── sales/
│           │   ├── purchases/
│           │   ├── shifts/
│           │   ├── credit/
│           │   ├── offers/
│           │   ├── expenses/
│           │   ├── reports/
│           │   └── settings/
│           ├── domain/        ← pure TypeScript logic, NO Firebase imports
│           ├── data/          ← repositories, Zod schemas, Firestore converters
│           ├── ui/            ← shared components
│           ├── lib/           ← money, dates, i18n utils
│           └── i18n/          ← translation JSON files
├── functions/                 ← Cloud Functions (TypeScript, Node 20)
│   └── src/
│       ├── clients/           ← createClient, setEntitlements, setClientStatus
│       ├── users/             ← createUser, setClaims, resetPassword
│       ├── ledger/            ← rebuild stock counters from ledger
│       ├── aggregates/        ← nightly dailySummary builder
│       ├── dayLock/           ← day-lock enforcement
│       ├── audit/             ← audit log writer
│       └── backup/            ← scheduled Firestore export
├── scripts/                   ← seed script, one-off tooling
├── .github/workflows/         ← CI/CD pipelines
├── CLAUDE.md                  ← this file
├── firebase.json
├── .firebaserc
├── firestore.rules
├── storage.rules
├── firestore.indexes.json
├── netlify.toml
├── vercel.json
└── nginx.conf.example
```

---

## Commands

```bash
# Install all workspaces
pnpm install

# Start web app against local emulators
pnpm --filter web dev

# Start Firebase emulators (Auth, Firestore, Functions, Storage, Hosting)
pnpm emulators

# Run emulators + seed data
pnpm emulators:seed

# Lint (all workspaces)
pnpm lint

# Type-check (all workspaces)
pnpm typecheck

# Unit tests (Vitest)
pnpm test

# Unit tests with coverage
pnpm test:coverage

# Firestore rules tests
pnpm test:rules

# E2E tests (Playwright, requires emulators running)
pnpm test:e2e

# Build web app
pnpm --filter web build

# Deploy to Firebase Hosting (staging)
pnpm deploy:staging

# Deploy to Firebase Hosting (production)
pnpm deploy:prod
```

---

## Naming rules

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `entitlement-guard.tsx` |
| React components | PascalCase | `EntitlementGuard` |
| Hooks | camelCase, `use` prefix | `useClientEntitlements` |
| Domain functions | camelCase | `isEnabled`, `getSettingAt` |
| Firestore collections | camelCase | `stockMovements` |
| Firestore doc IDs | auto-ID or semantic key | `inside`, `outside` |
| Environment variables | `VITE_` prefix | `VITE_FIREBASE_PROJECT_ID` |
| TypeScript types | PascalCase | `ClientStatus`, `ModuleId` |
| TypeScript enums | PascalCase (avoid; prefer `as const` objects) | `MODULE_IDS.stock` |
| Test files | `*.test.ts` or `*.test.tsx` | `entitlements.test.ts` |
| Money | integer cents (LKR) | `90000` = Rs. 900.00 |

---

## Architecture rules (non-negotiable)

1. **UI never calls Firestore directly.** Feature hooks → repositories → Firestore. Every route and menu item goes through `<EntitlementGuard>`.
2. **Append-only ledgers.** `stockMovements`, `cashEntries`, `bottleReturns`, `orders` are never deleted or updated. Counters (`productStock.stockOnHand`) are updated in transactions and can be rebuilt by a Cloud Function.
3. **Versioned settings.** `priceVersions`, `depositVersions`, `settingVersions`, `offers` always add a new document with `effectiveFrom` and `changedBy`. Never update in place. Use `getSettingAt(key, scope, timestamp)` to read the version valid at a point in time.
4. **Money is always integer cents.** Never use `number` floating point for money. Use the helpers in `src/lib/money.ts`. Format with `Intl.NumberFormat`.
5. **No client-specific branches in code.** All client behaviour comes from entitlements and settings data.
6. **Domain functions are pure.** `src/domain/**` has no Firebase imports, no side effects. Every function is unit-tested.
7. **Strict TypeScript.** No `any`. Use `unknown` and narrow. Every Zod schema has a matching TypeScript type via `z.infer`.
8. **Comments explain why, not what.** Code is self-descriptive; comments justify non-obvious decisions.

---

## Business rules summary

### Roles (set only by Cloud Functions as custom claims)
- `superadmin` — sees all clients; accesses `/super`
- `client_admin` — full control of their client; can also do cashier work
- `cashier` — sales work only; cannot edit settings, prices, deposits, offers, or users

### Client status
- `active` — normal operation
- `read_only` — can view and export; all writes blocked
- `blocked` — cannot log in at all

Status is changed **by hand** by the super admin only. No automatic blocking.

### Money accounting
- Currency: LKR (per client setting)
- Store as integer cents; never float
- Net sales = sales at price charged − deposit refunds − deposit used as discount
- Expected cash = cash sales after discounts − cash deposit refunds + cash received on tabs − cash paid out + opening float
- Supplier payments are a **separate expense entry** (purchases do not auto-create a cash outflow)

### Deposit token (bottle return "use as discount")
- Returning a bottle with "use as discount" creates a single-use **discount token** on `bottleReturns`
- The cashier manually applies the token to any order in the same business day (close-order pop-up shows available tokens)
- Token is marked used when the order closes (`usedInOrderId` written to the return document)
- Appears in Deposits report and Offers & Free Drinks report

### Business day
- Opening hours: 09:00–23:00 (configurable per client)
- Business-day cutoff: 04:00 (configurable) — a sale at 02:00 counts toward the previous calendar day
- Timezone: `Asia/Colombo` (configurable per client)

### Firestore data paths
- Global: `clients/{clientId}`, `presets/{presetId}`, `superAuditLog/{id}`
- Per client: `clients/{clientId}/{collection}/{docId}`
- Collections: `entitlements`, `users`, `categories`, `products`, `priceVersions`, `depositVersions`, `settingVersions`, `offers`, `suppliers`, `purchases`, `orders`, `stockMovements`, `bottleReturns`, `cashEntries`, `customers`, `dueExtensions`, `approvalRequests`, `expenseCategories`, `shifts`, `reconciliations`, `dailySummaries`, `bankStatements`, `monthCardChecks`, `auditLog`

---

## Environment variables

Copy `.env.example` to `.env.local` for local development. Never commit `.env.local`.

See `.env.example` for all required variables.

---

## Firebase emulator setup

```bash
# First time
firebase login
firebase use --add   # select your project

# Start emulators
pnpm emulators

# Emulator ports (default)
# Auth:      9099
# Firestore: 8080
# Functions: 5001
# Storage:   9199
# Hosting:   5000
# Emulator UI: 4000
```

---

## Deploying

### Staging
```bash
# Set FIREBASE_TOKEN in GitHub Actions secrets (or use firebase login:ci)
firebase use staging
pnpm --filter web build
firebase deploy --only hosting,firestore:rules,storage:rules,functions
```

### Production
Triggered by a version tag (e.g. `v1.0.0`). Requires manual approval in GitHub Actions.

---

## Adding a new feature

1. Register it in `src/registry/modules.ts` (or tiles/reports/settingsTabs).
2. Add its Firestore collection(s) to the registry entry's `writesCollections` array.
3. Add Firestore rules for the new collection (use the `isModuleEnabled()` helper in `firestore.rules`).
4. Create the feature folder under `src/features/`.
5. Add the route to `src/app/router.tsx`, wrapped in `<EntitlementGuard moduleId="...">`.
6. The Super Admin console will automatically render a switch for it.

---

## Adding a new versioned setting

1. Add an entry to `src/registry/settingsTabs.ts` with key, type, scope, `versioned: true`, and validation.
2. The settings engine (`src/domain/settings.ts`) and the settings page shell (`src/features/settings/SettingsPage.tsx`) will render the field automatically.
3. Write a unit test in `src/domain/__tests__/settings.test.ts` for the new field's edge cases.
