import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';

// Auth Pages
import { Login } from '../pages/auth/Login';
import { Signup } from '../pages/auth/Signup';
import { ForgotPassword } from '../pages/auth/ForgotPassword';
import { ResetPassword } from '../pages/auth/ResetPassword';

// Dashboard
import { Dashboard } from '../pages/dashboard/Dashboard';

// Products Pages
import { Products } from '../pages/products/Products';
import { ProductCreate } from '../pages/products/ProductCreate';
import { ProductEdit } from '../pages/products/ProductEdit';
import { ProductDetails } from '../pages/products/ProductDetails';

// Operations Pages
import { Receipts } from '../pages/operations/receipts/Receipts';
import { ReceiptCreate } from '../pages/operations/receipts/ReceiptCreate';
import { ReceiptDetails } from '../pages/operations/receipts/ReceiptDetails';

import { Deliveries } from '../pages/operations/deliveries/Deliveries';
import { DeliveryCreate } from '../pages/operations/deliveries/DeliveryCreate';
import { DeliveryDetails } from '../pages/operations/deliveries/DeliveryDetails';

import { Transfers } from '../pages/operations/transfers/Transfers';
import { TransferCreate } from '../pages/operations/transfers/TransferCreate';
import { TransferDetails } from '../pages/operations/transfers/TransferDetails';

import { Adjustments } from '../pages/operations/adjustments/Adjustments';
import { AdjustmentCreate } from '../pages/operations/adjustments/AdjustmentCreate';
import { AdjustmentDetails } from '../pages/operations/adjustments/AdjustmentDetails';

import { MoveHistory } from '../pages/operations/MoveHistory';

// Settings Pages
import { Warehouses } from '../pages/settings/warehouses/Warehouses';
import { WarehouseCreate } from '../pages/settings/warehouses/WarehouseCreate';
import { WarehouseEdit } from '../pages/settings/warehouses/WarehouseEdit';

// Profile
import { Profile } from '../pages/profile/Profile';

export const router = createBrowserRouter([
  // Public Auth Routes
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPassword />,
  },
  {
    path: '/reset-password',
    element: <ResetPassword />,
  },

  // Authenticated App Shell Routes
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },

      // Products
      {
        path: 'products',
        children: [
          { index: true, element: <Products /> },
          { path: 'new', element: <ProductCreate /> },
          { path: ':productId', element: <ProductDetails /> },
          { path: ':productId/edit', element: <ProductEdit /> },
        ],
      },

      // Operations
      {
        path: 'operations',
        children: [
          // Receipts
          {
            path: 'receipts',
            children: [
              { index: true, element: <Receipts /> },
              { path: 'new', element: <ReceiptCreate /> },
              { path: ':receiptId', element: <ReceiptDetails /> },
            ],
          },
          // Deliveries
          {
            path: 'deliveries',
            children: [
              { index: true, element: <Deliveries /> },
              { path: 'new', element: <DeliveryCreate /> },
              { path: ':deliveryId', element: <DeliveryDetails /> },
            ],
          },
          // Transfers
          {
            path: 'transfers',
            children: [
              { index: true, element: <Transfers /> },
              { path: 'new', element: <TransferCreate /> },
              { path: ':transferId', element: <TransferDetails /> },
            ],
          },
          // Adjustments
          {
            path: 'adjustments',
            children: [
              { index: true, element: <Adjustments /> },
              { path: 'new', element: <AdjustmentCreate /> },
              { path: ':adjustmentId', element: <AdjustmentDetails /> },
            ],
          },
          // Move History Ledger
          {
            path: 'move-history',
            element: <MoveHistory />,
          },
        ],
      },

      // Settings
      {
        path: 'settings',
        children: [
          {
            path: 'warehouses',
            children: [
              { index: true, element: <Warehouses /> },
              { path: 'new', element: <WarehouseCreate /> },
              { path: ':warehouseId/edit', element: <WarehouseEdit /> },
            ],
          },
        ],
      },

      // Profile
      {
        path: 'profile',
        element: <Profile />,
      },
    ],
  },

  // Fallback
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
