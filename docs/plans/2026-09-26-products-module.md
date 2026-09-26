# Products Module Implementation Plan

> **For AI / Engineers:** Follow strict TDD, clean architecture, and modular domain separation. Each step must be implemented with comprehensive validation and zero regressions.

**Goal:** Implement the full-stack **Products Module** for StockSense, featuring product master catalog management, categories CRUD, SKU uniqueness validation, multi-location stock level aggregation, atomic initial inventory movement with immutable ledger logging, and dynamic frontend UI integration with live API data.

**Architecture:** 
- **Backend:** Hono REST API modular route handlers (`/api/v1/products`, `/api/v1/categories`) built on Drizzle ORM and Neon Postgres. Incorporates a transactional stock movement engine (`executeStockMovement`) to enforce the mathematical invariant that every initial inventory allocation updates `stock_levels` and appends an immutable entry to `stock_ledger` within the exact same database transaction.
- **Frontend:** React 19 + TypeScript + Vite connected via `api.ts` to backend endpoints, featuring live catalog table with search/filtering, product registration with dynamic warehouse/location selector, category selection, stock per location breakdown, and resilient offline/fallback states.
- **Database:** Relational schema across `products`, `categories`, `stock_levels`, `stock_ledger`, and `reorder_rules`.

**Tech Stack:** TypeScript 5.5+, Hono v4, Drizzle ORM, Neon Postgres, Zod v3, Vitest, React 19, Tailwind CSS.

---

## User Review Required

> [!IMPORTANT]
> **Atomic Ledger Invariant on Initial Stock:**
> When a product is registered with `initialStock > 0`, the system will execute an atomic database transaction that:
> 1. Inserts the `products` record.
> 2. Upserts the `stock_levels` balance for the designated location.
> 3. Inserts an immutable row into `stock_ledger` with `source_type = 'initial_inventory'`, `delta_qty = +N`, and `balance_after = N`.
> If any step fails, the entire transaction rolls back. Products created with 0 or omitted initial stock will NOT create ledger rows.

> [!NOTE]
> **Category Creation Flexibility:**
> To ensure seamless developer and user experience, product creation will accept either a category UUID (`categoryId`) or a category name (`category: "Raw Materials"`). If a category name is supplied and does not exist in the database, the backend will automatically create it with an auto-generated slug.

---

## Proposed Changes

### Backend: Transactional Stock Movement Engine & Services
- Create `backend/src/services/stock.service.ts`: Implements `executeStockMovement` handling atomic `stock_levels` upsert and `stock_ledger` append.

### Backend: Categories Module
- Create `backend/src/routes/categories/category.schema.ts`
- Create `backend/src/routes/categories/categories.ts`
- Create `backend/src/routes/categories/index.ts`

### Backend: Products Module
- Create `backend/src/routes/products/product.schema.ts`
- Create `backend/src/routes/products/get-products.ts`
- Create `backend/src/routes/products/get-product-by-id.ts`
- Create `backend/src/routes/products/create-product.ts`
- Create `backend/src/routes/products/update-product.ts`
- Create `backend/src/routes/products/delete-product.ts`
- Create `backend/src/routes/products/get-product-stock.ts`
- Create `backend/src/routes/products/reorder-rules.ts`
- Create `backend/src/routes/products/index.ts`
- Modify `backend/src/index.ts`: Mount `/api/v1/products` and `/api/v1/categories` routes
- Modify `backend/src/db/seed.ts`: Seed default categories and initial demo items

### Frontend: Product Module API & UI Integration
- Modify `frontend/src/features/products/api.ts`: Connect to backend endpoints with fallback handling
- Modify `frontend/src/features/products/components/ProductForm.tsx`: Dynamic category and warehouse/location options
- Modify `frontend/src/pages/products/Products.tsx`: Refresh button, live API data, and alert handling
- Modify `frontend/src/pages/products/ProductCreate.tsx`: Handle API error feedback
- Modify `frontend/src/pages/products/ProductEdit.tsx`: Update via backend API
- Modify `frontend/src/pages/products/ProductDetails.tsx`: Live stock breakdown by location

---

## Verification Plan

### Automated Tests
- Run `npm test` in `backend` covering new integration suite `tests/integration/products.test.ts`.
- Run `npm run build` in `frontend` verifying TypeScript compilation and bundle health.
