# StockSense Frontend

A modern, fast, and modular Inventory Management System frontend built with **Vite + React + TypeScript + Tailwind CSS + daisyUI**.

## Features

- **Dashboard**: Real-time KPI summaries (Total Stock, Low Stock, Pending Receipts, Pending Deliveries, Internal Transfers Scheduled) with dynamic operation filters.
- **Product Management**: SKU/Code tracking, categories, units of measure, reordering rules, and location-based stock availability.
- **Operations (Incoming, Outgoing & Moves)**:
  - **Receipts**: Inbound purchase receipts, vendor intake, and automated stock increments.
  - **Deliveries**: Outbound customer delivery orders, pick & pack workflows, and stock deductions.
  - **Internal Transfers**: Multi-warehouse & rack-to-rack movement with full audit trail.
  - **Adjustments**: Physical count vs recorded stock mismatch reconciliation.
  - **Move History**: Complete stock ledger audit trail.
- **Settings & Warehouse Management**: Multi-warehouse location hierarchy configuration.
- **Authentication & Security**: Login, Signup, OTP-based password reset, and user profile management.

## Tech Stack

- **Framework**: React 18 / 19 + TypeScript + Vite
- **Styling**: Tailwind CSS + daisyUI
- **Icons**: Lucide React
- **State Management**: Zustand
- **Routing**: React Router v6+

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Build for production
npm run build
```
