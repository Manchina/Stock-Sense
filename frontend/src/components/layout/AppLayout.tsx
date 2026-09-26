import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Breadcrumbs } from './Breadcrumbs';
import { useUiStore } from '../../store/uiStore';
import { ToastContainer } from '../ui/ToastContainer';

export const AppLayout: React.FC = () => {
  const { sidebarOpen, setSidebarOpen } = useUiStore();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Global Toast & Zod Notification Container */}
      <ToastContainer />

      {/* Backdrop for mobile drawer */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all duration-300">
        <Header />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>
    </div>
  );
};
