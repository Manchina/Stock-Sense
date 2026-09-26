# StockSense — System Architecture & File Structure

## 1. Overview

StockSense is a modular Inventory Management System (IMS) covering authentication, a
real-time dashboard, product management, and the four core stock operations: Receipts,
Delivery Orders, Internal Transfers, and Stock Adjustments — all backed by an immutable
Stock Ledger.

> 📋 **Engineering Implementation Plan**: See [plan.md](plan.md) for the complete phase-by-phase execution blueprint, TDD workflows, and verification checklist.

**Stack**

| Layer     | Technology                          |
|-----------|--------------------------------------|
| Frontend  | React (Vite), React Router, TanStack Query, Zustand/Context for local state |
| Backend   | Hono (runs on Node.js / Bun / Cloudflare Workers) |
| Database  | PostgreSQL on Neon (serverless Postgres, branching) |
| ORM       | Drizzle ORM (or Prisma) with Neon's serverless HTTP/WebSocket driver |
| Auth      | JWT (access + refresh) + OTP for password reset (email/SMS provider) |
| Validation| Zod, shared between frontend and backend |
| Deployment| Backend on a Node/Bun host or Cloudflare Workers; Frontend on Vercel/Netlify; DB on Neon |

---

## 2. High-Level Architecture

```mermaid
flowchart LR
    subgraph Client["React SPA"]
        UI[Pages / Components]
        Store[Query Cache + State]
    end

    subgraph API["Hono API Server"]
        MW[Middleware: auth, cors, logger, error handler]
        Routes[Route Modules]
        Services[Service Layer]
        Repo[Repository / DB Access]
    end

    subgraph DB["Neon Postgres"]
        Tables[(Tables + Views)]
    end

    UI --> Store --> API
    MW --> Routes --> Services --> Repo --> Tables
    API -- JSON --> Client
```

**Request flow:** Client calls a REST endpoint → Hono middleware (auth/validation) → route
handler → service layer (business rules, e.g. "validating a receipt increases stock") →
repository layer (SQL via Drizzle) → Neon Postgres. Every stock-affecting action writes a
row to `stock_ledger` inside the same DB transaction that updates `stock_levels`.

---

## 3. Database Design (Neon Postgres)

### 3.1 Entity-Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ OTP_CODES : requests
    USERS ||--o{ AUDIT_LOG : performs
    WAREHOUSES ||--o{ LOCATIONS : contains
    CATEGORIES ||--o{ PRODUCTS : classifies
    PRODUCTS ||--o{ STOCK_LEVELS : has
    LOCATIONS ||--o{ STOCK_LEVELS : holds
    PRODUCTS ||--o{ REORDER_RULES : has

    RECEIPTS ||--o{ RECEIPT_LINES : contains
    DELIVERY_ORDERS ||--o{ DELIVERY_LINES : contains
    TRANSFERS ||--o{ TRANSFER_LINES : contains
    ADJUSTMENTS ||--o{ ADJUSTMENT_LINES : contains

    PRODUCTS ||--o{ RECEIPT_LINES : referenced_in
    PRODUCTS ||--o{ DELIVERY_LINES : referenced_in
    PRODUCTS ||--o{ TRANSFER_LINES : referenced_in
    PRODUCTS ||--o{ ADJUSTMENT_LINES : referenced_in

    RECEIPTS ||--o{ STOCK_LEDGER : logs
    DELIVERY_ORDERS ||--o{ STOCK_LEDGER : logs
    TRANSFERS ||--o{ STOCK_LEDGER : logs
    ADJUSTMENTS ||--o{ STOCK_LEDGER : logs
```

### 3.2 Core Tables

- **users** — id, name, email, password_hash, role (`inventory_manager` \| `warehouse_staff`), created_at
- **otp_codes** — id, user_id, code_hash, purpose (`password_reset`), expires_at, used_at
- **warehouses** — id, name, address
- **locations** — id, warehouse_id, name (e.g. "Rack A"), type
- **categories** — id, name, parent_id (nullable, for sub-categories)
- **products** — id, name, sku, category_id, uom, reorder_point, reorder_qty, is_active
- **stock_levels** — id, product_id, location_id, quantity *(current on-hand, derived/kept in sync via ledger)*
- **reorder_rules** — id, product_id, location_id, min_qty, max_qty
- **receipts** / **receipt_lines** — header (supplier, status, warehouse, dates) + lines (product, qty_expected, qty_received)
- **delivery_orders** / **delivery_lines** — header (customer/sales_order_ref, status, warehouse) + lines (product, qty_ordered, qty_picked, qty_delivered)
- **transfers** / **transfer_lines** — header (source_location, dest_location, status) + lines (product, qty)
- **adjustments** / **adjustment_lines** — header (location, reason, status) + lines (product, recorded_qty, counted_qty, delta)
- **stock_ledger** — id, product_id, location_id, delta_qty, source_type (`receipt`\|`delivery`\|`transfer`\|`adjustment`), source_id, balance_after, created_at, created_by *(append-only, single source of truth for Move History)*
- **audit_log** — id, user_id, action, entity, entity_id, created_at

`status` fields (Draft, Waiting, Ready, Done, Canceled) are shared enums used for dashboard filters across Receipts, Delivery, Internal Transfers, and Adjustments.

---

## 4. Backend Architecture (Hono)

Layered structure: **routes → controllers → services → repositories → db**, keeping Hono
handlers thin and business logic testable independently of the HTTP layer.

- **Middleware**: JWT auth guard, role-based access (manager vs. staff), request validation (Zod), centralized error handler, request logger, CORS.
- **Services** own transactional logic — e.g. `ReceiptService.validate()` opens a DB transaction, updates `stock_levels`, and inserts into `stock_ledger` atomically.
- **Repositories** wrap Drizzle queries per table/aggregate, keeping SQL out of services.

---

## 5. Backend File Structure

```
stocksense-api/
├── src/
│   ├── index.ts                     # Hono app bootstrap, route mounting
│   ├── config/
│   │   ├── env.ts                   # env var parsing/validation (zod)
│   │   └── db.ts                    # Neon connection (drizzle client)
│   ├── db/
│   │   ├── schema/
│   │   │   ├── users.schema.ts
│   │   │   ├── warehouses.schema.ts
│   │   │   ├── products.schema.ts
│   │   │   ├── receipts.schema.ts
│   │   │   ├── deliveries.schema.ts
│   │   │   ├── transfers.schema.ts
│   │   │   ├── adjustments.schema.ts
│   │   │   └── ledger.schema.ts
│   │   ├── migrations/              # drizzle-kit generated SQL migrations
│   │   └── seed.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── role.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── logger.middleware.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts       # login, signup, JWT issuing
│   │   │   └── otp.service.ts        # generate/verify OTP for reset
│   │   ├── dashboard/
│   │   │   ├── dashboard.routes.ts
│   │   │   ├── dashboard.controller.ts
│   │   │   └── dashboard.service.ts  # KPI aggregation queries
│   │   ├── products/
│   │   │   ├── products.routes.ts
│   │   │   ├── products.controller.ts
│   │   │   ├── products.service.ts
│   │   │   └── products.repository.ts
│   │   ├── categories/
│   │   ├── warehouses/
│   │   ├── receipts/
│   │   │   ├── receipts.routes.ts
│   │   │   ├── receipts.controller.ts
│   │   │   ├── receipts.service.ts   # validate() -> stock +qty, ledger entry
│   │   │   └── receipts.repository.ts
│   │   ├── deliveries/
│   │   │   └── ...                   # pick/pack/validate -> stock -qty
│   │   ├── transfers/
│   │   │   └── ...                   # move between locations
│   │   ├── adjustments/
│   │   │   └── ...                   # recorded vs counted -> delta
│   │   └── ledger/
│   │       ├── ledger.routes.ts      # "Move History" endpoint
│   │       └── ledger.service.ts
│   ├── lib/
│   │   ├── jwt.ts
│   │   ├── password.ts               # hashing (argon2/bcrypt)
│   │   └── otp-provider.ts           # email/SMS sender abstraction
│   ├── shared/
│   │   ├── validators/                # zod schemas shared per module
│   │   └── constants.ts               # status enums, roles
│   └── types/
│       └── index.d.ts
├── drizzle.config.ts
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 6. Frontend Architecture (React)

Feature-folder structure with a shared API client and query layer; each module (Products,
Receipts, Deliveries, Transfers, Adjustments) mirrors its backend counterpart.

- **API layer**: typed fetch client + TanStack Query hooks per module (`useProducts`, `useReceipts`, …), giving caching, refetching, and optimistic updates for validate/pick/pack actions.
- **Routing**: protected routes for Dashboard/Products/Operations, public routes for Login/Signup/Reset.
- **Shared UI**: KPI cards, status badges (Draft/Waiting/Ready/Done/Canceled), filter bar (document type, status, warehouse, category), data table.

---

## 7. Frontend File Structure

```
stocksense-web/
├── src/
│   ├── main.tsx
│   ├── App.tsx                      # route definitions
│   ├── api/
│   │   ├── client.ts                 # axios/fetch instance, interceptors (JWT)
│   │   ├── auth.api.ts
│   │   ├── products.api.ts
│   │   ├── receipts.api.ts
│   │   ├── deliveries.api.ts
│   │   ├── transfers.api.ts
│   │   ├── adjustments.api.ts
│   │   └── dashboard.api.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useProducts.ts
│   │   ├── useReceipts.ts
│   │   ├── useDeliveries.ts
│   │   ├── useTransfers.ts
│   │   ├── useAdjustments.ts
│   │   └── useDashboardKpis.ts
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── SignupPage.tsx
│   │   │   └── ResetPasswordPage.tsx   # OTP flow
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx
│   │   ├── products/
│   │   │   ├── ProductListPage.tsx
│   │   │   └── ProductFormPage.tsx
│   │   ├── operations/
│   │   │   ├── ReceiptsPage.tsx
│   │   │   ├── ReceiptDetailPage.tsx
│   │   │   ├── DeliveryOrdersPage.tsx
│   │   │   ├── DeliveryDetailPage.tsx
│   │   │   ├── TransfersPage.tsx
│   │   │   ├── AdjustmentsPage.tsx
│   │   │   └── MoveHistoryPage.tsx
│   │   ├── settings/
│   │   │   └── WarehouseSettingsPage.tsx
│   │   └── profile/
│   │       └── MyProfilePage.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx           # Products, Operations, Settings, Profile
│   │   │   ├── Topbar.tsx
│   │   │   └── AppLayout.tsx
│   │   ├── kpi/
│   │   │   └── KpiCard.tsx
│   │   ├── filters/
│   │   │   └── FilterBar.tsx         # doc type / status / warehouse / category
│   │   ├── table/
│   │   │   └── DataTable.tsx
│   │   └── ui/                       # buttons, badges, modals, inputs
│   ├── store/
│   │   └── auth.store.ts             # Zustand: current user, tokens
│   ├── lib/
│   │   ├── constants.ts              # status enums shared with backend
│   │   └── validators/                # zod schemas (forms)
│   ├── types/
│   │   └── index.ts
│   └── styles/
│       └── globals.css
├── vite.config.ts
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 8. Key API Endpoints (summary)

| Module | Endpoints |
|---|---|
| Auth | `POST /auth/signup`, `POST /auth/login`, `POST /auth/otp/request`, `POST /auth/otp/verify`, `POST /auth/reset-password` |
| Dashboard | `GET /dashboard/kpis`, `GET /dashboard/filters` |
| Products | `GET/POST /products`, `GET/PATCH /products/:id`, `GET /products/:id/stock` |
| Receipts | `GET/POST /receipts`, `GET /receipts/:id`, `POST /receipts/:id/validate` |
| Deliveries | `GET/POST /deliveries`, `POST /deliveries/:id/pick`, `POST /deliveries/:id/pack`, `POST /deliveries/:id/validate` |
| Transfers | `GET/POST /transfers`, `POST /transfers/:id/validate` |
| Adjustments | `GET/POST /adjustments`, `POST /adjustments/:id/apply` |
| Ledger | `GET /ledger` (Move History, filterable) |
| Warehouses | `GET/POST /warehouses`, `GET/POST /locations` |

---

## 9. Cross-Cutting Concerns

- **Transactional integrity**: every "validate" action (receipt, delivery, transfer, adjustment) runs inside a single Postgres transaction that updates `stock_levels` and inserts a `stock_ledger` row — preventing partial stock updates.
- **Low-stock alerts**: a scheduled job or DB trigger compares `stock_levels` against `reorder_rules` and flags items for the dashboard KPI and notifications.
- **Multi-warehouse support**: all stock is keyed by `location_id` (not just `product_id`), so quantities are always scoped to a specific warehouse/location.
- **Auth & roles**: JWT access + refresh tokens; role checks distinguish Inventory Managers (full CRUD) from Warehouse Staff (transfers, picking, counting).

---

## 10. Operational Workflows & Concrete Inventory Scenarios

StockSense models physical inventory operations with strict status transitions and transactional ledger updates:

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Waiting : Confirm Order / Schedule
    Waiting --> Ready : Items Available / Arrived
    Ready --> Done : Validate (Ledger Written & Stock Updated)
    Draft --> Canceled : Cancel
    Waiting --> Canceled : Cancel
```

### 10.1 The Core Operational Lifecycles

1. **Receipts (Incoming Goods from Suppliers)**
   - **Process:** Create receipt $\rightarrow$ Specify supplier, target warehouse & items $\rightarrow$ Input received quantities $\rightarrow$ **Validate**.
   - **Effect:** Increases `stock_levels` for the target location; appends an immutable entry to `stock_ledger`.
   - *Example:* Receiving 50 units of "Steel Rods" at Main Store increments stock by +50.

2. **Delivery Orders (Outgoing Goods to Customers)**
   - **Process:** Create order $\rightarrow$ **Pick items** (reserves stock) $\rightarrow$ **Pack items** (prepares dispatch) $\rightarrow$ **Validate** (dispatches goods).
   - **Effect:** Decreases `stock_levels` for the source location; appends an immutable ledger entry.
   - *Example:* Sales order for 10 office chairs reduces inventory by -10 upon validation.

3. **Internal Transfers (Company Movements)**
   - **Process:** Specify source location and destination location $\rightarrow$ Select product & transfer quantity $\rightarrow$ **Validate**.
   - **Effect:** Total company-wide inventory remains unchanged; source location decreases by $N$, destination location increases by $N$; dual-line movement recorded in the ledger.
   - *Example:* Main Warehouse $\rightarrow$ Production Floor, or Rack A $\rightarrow$ Rack B.

4. **Stock Adjustments (Physical Inventory Reconciliation)**
   - **Process:** Select product and location $\rightarrow$ Enter counted physical quantity $\rightarrow$ System computes $\Delta = (\text{counted} - \text{recorded})$.
   - **Effect:** Reconciles `stock_levels` to exact physical count; appends adjustment delta to the ledger with audit reason.
   - *Example:* Recorded 100 kg, physical count reveals 3 kg damaged $\rightarrow$ delta $-3\text{ kg}$, new balance $97\text{ kg}$.

### 10.2 End-to-End Inventory Flow Walkthrough

```mermaid
flowchart TD
    Step1["Step 1: Receive Goods from Vendor\nReceive 100 kg Steel into Main Store\nStock: +100 kg (Balance: 100 kg)"]
    Step2["Step 2: Internal Transfer\nMove 50 kg from Main Store to Production Rack\nMain Store: 50 kg | Production Rack: 50 kg (Total: 100 kg)"]
    Step3["Step 3: Deliver Finished Goods\nShip 20 kg Steel to Customer\nProduction Rack: -20 kg (Balance: 30 kg | Total: 80 kg)"]
    Step4["Step 4: Adjust Damaged Items\nPhysical count reveals 3 kg scrap\nProduction Rack: -3 kg (Balance: 27 kg | Total: 77 kg)"]

    Step1 --> Step2 --> Step3 --> Step4
```

---

## 11. Role-Based Access Control (RBAC) Matrix

| Module / Action | Inventory Manager | Warehouse Staff |
|---|:---:|:---:|
| **Dashboard & Analytics** | Full View (All KPIs & Financials) | Operational View (Transfers & Orders) |
| **Product & Category CRUD** | ✅ Create / Edit / Archive | ❌ Read Only |
| **Reordering Rules & Min/Max** | ✅ Create / Edit | ❌ Read Only |
| **Receipts (Create / Edit)** | ✅ Full Access | ✅ Create & Enter Received Qty |
| **Receipts (Validate)** | ✅ Approve & Validate | ❌ Requires Manager Sign-off |
| **Delivery Orders (Pick & Pack)** | ✅ Full Access | ✅ Pick & Pack Operations |
| **Delivery Orders (Validate / Dispatch)** | ✅ Approve & Validate | ✅ Validate Shipment |
| **Internal Transfers** | ✅ Create & Validate | ✅ Create & Move Stock |
| **Stock Adjustments** | ✅ Approve & Reconcile | ❌ Input Count Only (Draft) |
| **Move History (Audit Trail)** | ✅ Full Audit & Export | ✅ View Movements |
| **Warehouse & Location Config** | ✅ Add / Edit Warehouses & Racks | ❌ Read Only |

---

## 12. UI Wireframes & Mockups

The user experience follows a clean, responsive layout designed for high-density warehouse operations and desktop inventory management:

- **Mockup Design Link:** [StockSense Excalidraw Wireframes](https://link.excalidraw.com/l/65VNwvy7c4X/3ENvQFu9o8R)
- **Navigation Architecture:**
  - **Left Sidebar:** Products (List, Categories, Reorder Rules), Operations (Receipts, Deliveries, Adjustments, Transfers, Move History), Dashboard, Settings (Warehouses & Locations), User Profile & Logout.
  - **Top Bar:** Quick Search (SKU / Name / Barcode), Active Warehouse Selector, Low-Stock Notification Bell, User Status.
  - **Dynamic Filtering Panel:** Quick pill filters for Document Type, Status (`Draft`, `Waiting`, `Ready`, `Done`, `Canceled`), Warehouse, and Category.

---

## 13. Getting Started & Local Development

### Prerequisites
- Node.js 20+ or Bun 1.1+
- PostgreSQL database (or free serverless tier on [Neon.tech](https://neon.tech))
- Git

### Quick Setup

```bash
# 1. Clone repository
git clone https://github.com/Manchina/Stock-Sense.git
cd Stock-Sense

# 2. Setup backend
cd stocksense-api
cp .env.example .env
npm install
npm run db:push     # Push Drizzle schema to Neon Postgres
npm run db:seed     # Seed initial warehouses, demo users, and SKUs
npm run dev         # Starts Hono API on http://localhost:3000

# 3. Setup frontend (in a separate terminal)
cd ../stocksense-web
cp .env.example .env
npm install
npm run dev         # Starts Vite app on http://localhost:5173
```

---

## 14. Implementation Plan

For the detailed engineering roadmap, phased execution milestones, data contracts, and verification protocols, refer to [plan.md](plan.md).

