# StockSense — Modern Modular Inventory Management System

> Real-time stock visibility, multi-warehouse logistics, and an immutable, double-entry audit ledger for modern supply chain operations.

StockSense is a production-grade Inventory Management System (IMS) engineered to eliminate stock discrepancies, eradicate phantom inventory, and streamline warehouse movements. Instead of relying on error-prone spreadsheets, manual tallies, or unverified stock overwrites, StockSense couples an intuitive warehouse operations UI with a strict, transactionally guaranteed, append-only **Stock Ledger**.

---

## Table of Contents

1. [How the App Works](#1-how-the-app-works)
   - [Core Concepts & Entities](#11-core-concepts--entities)
   - [The Four Core Stock Operations](#12-the-four-core-stock-operations)
   - [The Immutable Stock Ledger ("Move History")](#13-the-immutable-stock-ledger-move-history)
   - [Reorder Rules & Low-Stock Automation](#14-reorder-rules--low-stock-automation)
   - [Role-Based Access Control (RBAC)](#15-role-based-access-control-rbac)
   - [End-to-End Operational Lifecycle Walkthrough](#16-end-to-end-operational-lifecycle-walkthrough)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
   - [High-Level Architecture Diagram](#31-high-level-architecture-diagram)
   - [Database Design & Entity-Relationship Diagram](#32-database-design--entity-relationship-diagram)
   - [Backend Architecture & Transaction Safety](#33-backend-architecture--transaction-safety)
   - [Frontend Architecture & State Strategy](#34-frontend-architecture--state-strategy)
   - [REST API Specifications](#35-rest-api-specifications)
   - [Repository & Monorepo Structure](#36-repository--monorepo-structure)
4. [Getting Started & Local Development](#4-getting-started--local-development)
5. [Testing & Quality Verification](#5-testing--quality-verification)
6. [Engineering Roadmap](#6-engineering-roadmap)

---

## 1. How the App Works

At its heart, StockSense models the real-world flow of physical inventory across warehouses, storage racks, and operational stages. It guarantees that **every physical stock change corresponds to a cryptographically traceable, append-only ledger transaction**.

```mermaid
flowchart LR
    Vendors[External Vendors] -->|1. Receipts| Staging[Receiving Dock]
    Staging -->|2. Internal Transfers| Storage[Warehouse Racks / Bins]
    Storage -->|3. Adjustments| Storage
    Storage -->|4. Deliveries| Customers[Dispatched to Customers]

    subgraph Ledger Engine ["Atomic Ledger Engine (Double-Entry Record)"]
        Staging -.->|"+Qty Entry"| Ledger[(Stock Ledger)]
        Storage -.->|"±Qty Delta"| Ledger
        Customers -.->|"-Qty Entry"| Ledger
    end
```

### 1.1 Core Concepts & Entities

- **Warehouses & Locations**: Stock is never stored in a generic global void. A physical facility (**Warehouse**) contains fine-grained storage bins or shelves (**Locations**, e.g., "Zone A, Rack 04"). All stock levels are bound to a specific `location_id`.
- **Products & Categories**: Catalog items are defined with unique SKUs, primary Units of Measure (UOM, e.g., `kg`, `units`, `meters`), barcoding data, and hierarchical category groupings.
- **Stock Levels**: The cached, instantaneous quantity of a product currently on hand at a specific location. Stock levels are strictly read-optimized projections kept in sync with the immutable ledger.
- **Operation Status Lifecycle**: Every operational document transitions through explicit state boundaries:
  
  $$\text{Draft} \longrightarrow \text{Waiting} \longrightarrow \text{Ready} \longrightarrow \text{Done} \quad (\text{or } \text{Canceled})$$

---

### 1.2 The Four Core Stock Operations

StockSense structures warehouse execution around four fundamental operational workflows:

```mermaid
stateDiagram-v2
    [*] --> Draft : Create Document
    Draft --> Waiting : Confirm Lines / Schedule
    Waiting --> Ready : Availability Confirmed / Staged
    Ready --> Done : Validate / Execute Transaction
    Draft --> Canceled : Abandon
    Waiting --> Canceled : Cancel
```

#### 1. Receipts (Inbound Logistics)
- **Purpose**: Intake raw materials or finished goods from external vendors and suppliers.
- **Workflow**: Create receipt header $\rightarrow$ Add expected lines (SKU, expected quantity) $\rightarrow$ Enter actual received quantity upon dock arrival $\rightarrow$ **Validate**.
- **Inventory Impact**: Atomically increases `stock_levels` for the designated destination location and appends a positive delta ($\Delta > 0$) entry to the ledger.

#### 2. Delivery Orders (Outbound Logistics)
- **Purpose**: Fulfill and dispatch customer sales orders or outbound transfers.
- **Workflow**: Create delivery order $\rightarrow$ **Pick items** (allocating and staging stock from bins) $\rightarrow$ **Pack items** (packaging verification) $\rightarrow$ **Validate / Ship**.
- **Inventory Impact**: Atomically decreases `stock_levels` from the origin location and logs a negative delta ($\Delta < 0$) entry in the ledger.

#### 3. Internal Transfers (Internal Movements)
- **Purpose**: Relocate stock between different locations, bins, production lines, or warehouse branches.
- **Workflow**: Select source location and destination location $\rightarrow$ Select SKU and quantity to move $\rightarrow$ **Validate**.
- **Inventory Impact**: Overall company inventory remains unchanged ($\sum \Delta = 0$). Source location balance is reduced by $N$, and destination location balance is increased by $N$ simultaneously.

#### 4. Stock Adjustments (Cycle Counting & Physical Reconciliation)
- **Purpose**: Reconcile discrepancies between digital book balance and physical counts (due to breakage, shrinkage, scrap, or periodic audit).
- **Workflow**: Select location and SKU $\rightarrow$ System displays recorded quantity $\rightarrow$ Staff enters physical counted quantity $\rightarrow$ System computes variance:
  
  $$\Delta = \text{Counted Quantity} - \text{Recorded Quantity}$$
  
- **Inventory Impact**: Reconciles the stock level to match the physical count and inserts the corrective delta ($\pm \Delta$) with mandatory reason codes.

---

### 1.3 The Immutable Stock Ledger ("Move History")

Traditional inventory software frequently updates quantity columns directly (`UPDATE products SET qty = 45`), obliterating the paper trail and making forensic audits impossible.

StockSense enforces an **Append-Only Double-Entry Ledger Invariant**:

$$\text{Balance}_{\text{after}} = \text{Balance}_{\text{before}} + \Delta_{\text{quantity}}$$

- **No Updates, No Deletions**: The `stock_ledger` table allows only `INSERT` queries. Any modification requires a compensating entry.
- **Audit Completeness**: Each entry captures the exact timestamp, acting user ID, source document type (`receipt`, `delivery`, `transfer`, `adjustment`), source document ID, target location, delta quantity, and post-transaction balance.
- **Move History View**: The frontend exposes a filterable, real-time audit grid where managers can inspect every single SKU movement across the organization.

---

### 1.4 Reorder Rules & Low-Stock Automation

To avoid stockouts without overstocking warehouse space, StockSense implements automated replenishment thresholds:

- **Min / Max Rule Engine**: Each SKU-location pair can define a minimum safety threshold ($\text{Qty}_{\text{min}}$) and an optimal order quantity ($\text{Qty}_{\text{max}}$).
- **Dashboard Alerts**: When `stock_levels.quantity` dips below `reorder_rules.min_qty`, the SKU is automatically flagged as `LOW_STOCK` on the manager dashboard KPI cards, generating proactive reorder recommendations.

---

### 1.5 Role-Based Access Control (RBAC)

The system distinguishes between supervisory oversight and warehouse floor operations:

| Feature / Action | Inventory Manager | Warehouse Staff |
|---|:---:|:---:|
| **Dashboard KPIs & Global Analytics** | Full Visibility | Operational View |
| **Product & Category Catalog CRUD** | Full Access | Read-Only |
| **Warehouse & Bin Configuration** | Full Access | Read-Only |
| **Reorder Rules Configuration** | Full Access | Read-Only |
| **Receipts: Create & Enter Counts** | Full Access | Full Access |
| **Receipts: Validate (Commit to Stock)** | Full Access | Requires Manager Approval |
| **Delivery Orders: Pick & Pack** | Full Access | Full Access |
| **Delivery Orders: Validate & Ship** | Full Access | Full Access |
| **Internal Transfers: Create & Validate** | Full Access | Full Access |
| **Stock Adjustments: Physical Count Input** | Full Access | Input Draft Count |
| **Stock Adjustments: Approve & Apply Delta** | Full Access | Read-Only |
| **Move History Audit Trail** | Full View & CSV Export | View Movements |

---

### 1.6 End-to-End Operational Lifecycle Walkthrough

Here is how a physical unit of inventory travels through the StockSense ecosystem:

```mermaid
flowchart TD
    Step1["1. VENDOR RECEIPT\nSupplier ships 100 units of 'SKU-STEEL-01'\nStaff receives goods at Main Receiving Dock\nStatus: DONE | Stock Delta: +100 units\nLedger: Receipt #RC-101 (+100)"]
    
    Step2["2. INTERNAL TRANSFER\nForklift driver moves 60 units to Production Rack A\nStatus: DONE | Source Dock: -60 | Dest Rack: +60\nLedger: Transfer #TR-304 (-60 / +60)"]
    
    Step3["3. CUSTOMER DELIVERY\nClient purchases 25 units\nStaff picks 25 units from Rack A -> Packs order -> Dispatches\nStatus: DONE | Stock Delta: -25 units\nLedger: Delivery #DO-809 (-25)"]
    
    Step4["4. CYCLE COUNT ADJUSTMENT\nRoutine audit reveals 2 units damaged during handling\nStaff records count: 33 (Recorded: 35)\nManager approves delta: -2 units\nLedger: Adjustment #ADJ-012 (-2) | Current Balance: 33"]

    Step1 --> Step2 --> Step3 --> Step4
```

---

## 2. Technology Stack

StockSense is architected around modern, type-safe, lightweight technologies designed for sub-millisecond API response times and instant UI updates:

| Domain | Technology | Description |
|---|---|---|
| **Frontend Framework** | [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) | Ultra-fast build pipeline and component rendering |
| **Routing** | [React Router v7](https://reactrouter.com/) | Client-side routing with nested layouts and route protection |
| **Server State & Caching** | [TanStack Query v5](https://tanstack.com/query/latest) | Asynchronous data synchronization, cache invalidation, and optimistic mutations |
| **Client State Management** | [Zustand](https://zustand-demo.pmnd.rs/) | Minimalist client stores for auth session, active warehouse, and table filters |
| **UI & Styling** | [Tailwind CSS](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/) | Responsive, dense warehouse design system with accessible components |
| **Icons** | [Lucide React](https://lucide.dev/) | Clean, consistent operational iconography |
| **Backend Server** | [Hono v4](https://hono.dev/) | Lightweight, standards-based web framework running on Node.js / Bun / Edge |
| **Runtime Environment** | Node.js 20+ / [@hono/node-server](https://github.com/honojs/node-server) | Fast server execution with native TypeScript execution via `tsx` |
| **Database** | [Neon PostgreSQL](https://neon.tech/) | Serverless Postgres with instant branching and pooled connection pooling |
| **ORM & Migrations** | [Drizzle ORM](https://orm.drizzle.team/) + [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview) | Zero-overhead, end-to-end type-safe SQL query builder and schema management |
| **Schema Validation** | [Zod](https://zod.dev/) | Shared runtime boundary validation across API payloads and forms |
| **Security & Auth** | JWT (`jsonwebtoken`) + [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | Stateless access/refresh authentication, secure hashing, and OTP reset flows |
| **Testing Engine** | [Vitest](https://vitest.dev/) | Vite-native unit and integration test runner |

---

## 3. System Architecture

### 3.1 High-Level Architecture Diagram

```mermaid
flowchart LR
    subgraph Client ["Frontend Client (React 19 SPA)"]
        UI["UI Components\n(Pages, Tables, Modals)"]
        ZStore["Zustand Store\n(Auth & UI State)"]
        TQ["TanStack Query Cache\n(Server State)"]
        UI <--> ZStore
        UI <--> TQ
    end

    subgraph API ["Backend API (Hono Server)"]
        MW["Middleware Pipeline\n(Auth Guard, CORS, Logger, Error Handler)"]
        Router["Domain Routers\n(/products, /transfers, /adjustments, etc.)"]
        ServiceLayer["Service Layer\n(Business Logic & Transaction Bounds)"]
        Drizzle["Drizzle ORM\n(Typed Query Execution)"]
        
        MW --> Router --> ServiceLayer --> Drizzle
    end

    subgraph Database ["Persistence Layer (Neon Serverless Postgres)"]
        Tables[(Core Relational Tables)]
        LedgerTable[(stock_ledger\nAppend-Only Journal)]
        Pooler[Connection Pooler / WebSocket]
        
        Drizzle <--> Pooler <--> Tables & LedgerTable
    end

    TQ <-->|REST over HTTPS / JSON| MW
```

---

### 3.2 Database Design & Entity-Relationship Diagram

StockSense is backed by a normalized PostgreSQL schema designed for zero data redundancy, relational integrity, and high query concurrency:

```mermaid
erDiagram
    USERS ||--o{ OTP_CODES : requests
    USERS ||--o{ AUDIT_LOG : triggers
    WAREHOUSES ||--o{ LOCATIONS : contains
    CATEGORIES ||--o{ PRODUCTS : classifies
    PRODUCTS ||--o{ STOCK_LEVELS : tracks
    LOCATIONS ||--o{ STOCK_LEVELS : holds
    PRODUCTS ||--o{ REORDER_RULES : configures
    LOCATIONS ||--o{ REORDER_RULES : scopes

    RECEIPTS ||--o{ RECEIPT_LINES : details
    DELIVERY_ORDERS ||--o{ DELIVERY_LINES : details
    TRANSFERS ||--o{ TRANSFER_LINES : details
    ADJUSTMENTS ||--o{ ADJUSTMENT_LINES : details

    PRODUCTS ||--o{ RECEIPT_LINES : references
    PRODUCTS ||--o{ DELIVERY_LINES : references
    PRODUCTS ||--o{ TRANSFER_LINES : references
    PRODUCTS ||--o{ ADJUSTMENT_LINES : references

    PRODUCTS ||--o{ STOCK_LEDGER : audits
    LOCATIONS ||--o{ STOCK_LEDGER : records
```

#### Core Database Tables

- **`users`**: User identities, role designations (`inventory_manager`, `warehouse_staff`), hashed credentials, and metadata.
- **`otp_codes`**: Transient, cryptographic hash verification codes for secure password reset flows.
- **`warehouses` & `locations`**: Two-tier physical spatial model (facility $\rightarrow$ shelf/rack/bin).
- **`categories` & `products`**: Catalog records with SKU indexing, barcodes, descriptions, and UOM.
- **`stock_levels`**: Cached on-hand quantities indexed by `(product_id, location_id)` with positive constraints.
- **`reorder_rules`**: Minimum and maximum stock thresholds used to trigger low-stock alerts.
- **`receipts` & `receipt_lines`**: Inbound purchasing documents and itemized quantities (expected vs. received).
- **`deliveries` & `delivery_lines`**: Outbound customer fulfillment documents and picking/packing quantities.
- **`transfers` & `transfer_lines`**: Multi-item internal movements between source and destination bins.
- **`adjustments` & `adjustment_lines`**: Cycle counts comparing recorded vs. counted values, computing deltas.
- **`stock_ledger`**: Append-only transaction journal storing product, location, delta quantity, resulting balance, and source event references.
- **`audit_log`**: System-wide administrative tracking recording entity modifications and actor IDs.

---

### 3.3 Backend Architecture & Transaction Safety

The backend adheres to a layered architecture: **Routes $\rightarrow$ Validation $\rightarrow$ Services $\rightarrow$ Drizzle ORM Data Access**.

#### Transactional Stock Engine
Stock adjustments and operational validations never run as standalone `UPDATE` statements. Every operation is wrapped in a PostgreSQL transaction (`db.transaction(...)`):

```typescript
// Conceptual transaction guarantee
await db.transaction(async (tx) => {
  // 1. Lock and update current stock level
  const updatedLevel = await tx
    .insert(stockLevels)
    .values({ productId, locationId, quantity: deltaQty })
    .onConflictDoUpdate({
      target: [stockLevels.productId, stockLevels.locationId],
      set: { quantity: sql`${stockLevels.quantity} + ${deltaQty}` }
    })
    .returning();

  // 2. Append immutable record to stock_ledger
  await tx.insert(stockLedger).values({
    productId,
    locationId,
    deltaQty,
    balanceAfter: updatedLevel.quantity,
    sourceType: "receipt",
    sourceId: receiptId,
    createdBy: userId,
  });
});
```

If any step fails or an invalid balance is encountered, the entire transaction rolls back automatically, preventing orphaned stock updates or desynchronized ledger states.

---

### 3.4 Frontend Architecture & State Strategy

The web frontend uses a modular, feature-oriented structure with clear separation between server state, application state, and presentation:

- **Server-State Management**: TanStack Query manages all data fetching, caching, deduplication, and stale-while-revalidate cycles. Operational mutations (e.g. validating a transfer) immediately trigger cache invalidation for related products and stock levels.
- **Client-Side State**: Zustand handles client-only ephemeral state:
  - `authStore`: Access tokens, refresh tokens, user profile, and permission checks.
  - Active warehouse selection for global filtering.
  - Operational table filter parameters (search keywords, status pills, date ranges).
- **Component Design System**: Reusable primitives built on Tailwind CSS and DaisyUI, featuring dense, accessible tables, status pills (`Draft`, `Waiting`, `Ready`, `Done`, `Canceled`), modal forms, and KPI summaries.

---

### 3.5 REST API Specifications

The Hono backend exposes clean REST endpoints versioned under `/api/v1` (with convenience aliases under `/api`):

| Module | Method | Endpoint | Description |
|---|---|---|---|
| **Health** | `GET` | `/health` | Live database connectivity and server uptime status |
| **Auth** | `POST` | `/auth/signup` | Register a new user account |
| | `POST` | `/auth/login` | Authenticate credentials and receive JWT access tokens |
| | `POST` | `/auth/otp/request` | Request password reset OTP |
| | `POST` | `/auth/otp/verify` | Verify OTP code authenticity |
| | `POST` | `/auth/reset-password` | Set new password with verified OTP |
| **Products** | `GET` | `/api/v1/products` | Retrieve list of products (filterable by category, SKU) |
| | `POST` | `/api/v1/products` | Create a new product (Manager only) |
| | `GET` | `/api/v1/products/:id` | Get detailed product specifications |
| | `PUT/PATCH` | `/api/v1/products/:id` | Update product information |
| | `DELETE` | `/api/v1/products/:id` | Soft-delete / deactivate product |
| | `GET` | `/api/v1/products/:id/stock` | Get real-time stock levels across all locations |
| | `GET/POST` | `/api/v1/products/:id/reorder-rules` | View or configure min/max reorder rules |
| **Categories** | `GET/POST`| `/api/v1/categories` | Manage product taxonomy and hierarchy |
| **Warehouses** | `GET/POST`| `/api/v1/warehouses` | Manage physical facilities and internal rack locations |
| **Transfers** | `GET` | `/api/v1/transfers` | List internal transfers with status filters |
| | `POST` | `/api/v1/transfers` | Create a new transfer order |
| | `GET` | `/api/v1/transfers/:id` | View transfer details and line items |
| | `PATCH` | `/api/v1/transfers/:id` | Update or validate transfer (triggers dual-line movement) |
| **Adjustments**| `GET` | `/api/v1/adjustments` | List stock reconciliation audits |
| | `POST` | `/api/v1/adjustments` | Create physical count audit |
| | `PATCH` | `/api/v1/adjustments/:id` | Validate adjustment (reconciles stock & appends delta) |
| **Ledger** | `GET` | `/api/v1/history` | Retrieve complete, filterable Move History audit trail |

---

### 3.6 Repository & Monorepo Structure

StockSense is configured as an npm workspaces monorepo containing the decoupled backend and frontend codebases:

```
StockSense/
├── backend/                         # Hono API, Drizzle ORM, & Database Service
│   ├── src/
│   │   ├── config/                  # Environment parsing (Zod) & Neon DB client
│   │   ├── db/
│   │   │   ├── schema/              # Drizzle table schemas, enums, & relations
│   │   │   ├── migrations/          # Generated SQL migration files
│   │   │   ├── migrate.ts           # Migration runner
│   │   │   ├── seed.ts              # Initial demo data seeder
│   │   │   └── check-connection.ts  # Database connection test utility
│   │   ├── middleware/              # Auth guard, error handling, CORS, logger
│   │   ├── modules/
│   │   │   └── auth/                # Auth routes, JWT controllers, OTP service
│   │   ├── routes/
│   │   │   ├── adjustments/         # Stock adjustment endpoints & business helpers
│   │   │   ├── categories/          # Category taxonomy management
│   │   │   ├── history/             # Immutable ledger Move History queries
│   │   │   ├── products/            # Product catalog, stock lookup, reorder rules
│   │   │   ├── transfers/           # Internal transfer operations
│   │   │   └── warehouse/           # Facility & rack location configuration
│   │   ├── services/
│   │   │   └── stock.service.ts     # Core transactional inventory manipulation
│   │   └── shared/                  # Shared Zod validators and domain constants
│   ├── drizzle.config.ts            # Drizzle Kit CLI configuration
│   └── package.json
│
├── frontend/                        # React 19 Client SPA
│   ├── src/
│   │   ├── components/              # Shared UI components (layout, tables, inputs, modals)
│   │   ├── features/
│   │   │   ├── adjustments/         # Adjustments list, count entry modals
│   │   │   ├── dashboard/           # KPI metric summaries, stock velocity charts
│   │   │   ├── history/             # Move history data tables & audit filters
│   │   │   ├── products/            # Product catalog cards, stock inspection drawers
│   │   │   └── transfers/           # Transfer creation and dispatch workflows
│   │   ├── hooks/                   # Custom data-fetching hooks (TanStack Query)
│   │   ├── lib/                     # API client, utility functions, formatting
│   │   ├── pages/                   # Top-level view routes (Auth, Dashboard, Operations)
│   │   ├── router/                  # Protected routes and application navigation
│   │   ├── store/                   # Zustand global stores (auth, filters)
│   │   └── types/                   # TypeScript interfaces and API contract models
│   ├── vite.config.ts               # Vite bundler configuration
│   └── package.json
│
├── docs/                            # Architecture specs, diagrams, & planning guides
├── plan.md                          # Master engineering implementation roadmap
├── package.json                     # Root monorepo workspace configuration
└── README.md                        # Project documentation
```

---

## 4. Getting Started & Local Development

### Prerequisites

- **Node.js**: v20.0.0 or higher
- **Package Manager**: `npm` v10+ (or `pnpm` / `bun`)
- **Database**: A PostgreSQL database (a free serverless database on [Neon.tech](https://neon.tech) is recommended)

### 1. Clone the Repository

```bash
git clone https://github.com/Manchina/Stock-Sense.git
cd StockSense
```

### 2. Install Dependencies

Install all dependencies across the monorepo root and all workspaces:

```bash
npm install
```

### 3. Configure Environment Variables

Create the `.env` configuration file in `backend/`:

```bash
# In backend/.env
DATABASE_URL=postgresql://user:password@ep-example.neon.tech/stocksense?sslmode=require
PORT=3000
NODE_ENV=development
JWT_SECRET=super-secret-jwt-key-replace-in-production
JWT_REFRESH_SECRET=super-secret-refresh-key-replace-in-production
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

And in `frontend/`:

```bash
# In frontend/.env
VITE_API_URL=http://localhost:3000
```

### 4. Setup Database Schema & Seed Data

Push the Drizzle schema directly to your Postgres database and populate sample warehouses, products, and users:

```bash
# Verify database connection
npm run db:check

# Push Drizzle schema to PostgreSQL
npm run db:push

# Seed demo users, categories, products, and locations
npm run db:seed
```

### 5. Launch the Development Environment

You can run both the API server and the frontend client concurrently from the monorepo root:

```bash
# Terminal 1: Run Hono API backend (listens on http://localhost:3000)
npm run dev:backend

# Terminal 2: Run Vite frontend (listens on http://localhost:5173)
npm run dev:frontend
```

Now open [http://localhost:5173](http://localhost:5173) in your browser to access StockSense!

---

## 5. Testing & Quality Verification

StockSense uses Vitest for rigorous testing of core transactional logic, API route integrity, and domain calculations:

```bash
# Run all workspace test suites
npm run test

# Run backend tests only
npm run test --workspace=backend
```

---

## 6. Engineering Roadmap

For an in-depth breakdown of the phased engineering implementation, test-driven milestones, and upcoming features (including barcode scanning, multi-currency valuation, and automated supplier PO dispatch), refer to [plan.md](plan.md).
