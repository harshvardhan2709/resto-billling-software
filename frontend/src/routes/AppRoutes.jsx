import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { Tables } from '../pages/Tables';
import { Billing } from '../pages/Billing';
import { MenuManagement } from '../pages/MenuManagement';
import { BillHistory } from '../pages/BillHistory';
import { Reports } from '../pages/Reports';

export const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      {/* Public Route */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={user?.role === 'admin' ? '/dashboard' : '/tables'} replace />
          ) : (
            <Login />
          )
        }
      />

      {/* Protected Layout Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* Dashboard: Accessible to authenticated users */}
        <Route path="dashboard" element={<Dashboard />} />

        {/* Tables & Orders: Accessible to Admin and Cashier */}
        <Route path="tables" element={<Tables />} />

        {/* Billing & POS Checkout: Accessible to Admin and Cashier */}
        <Route path="billing" element={<Billing />} />

        {/* Menu Management: Admin Only */}
        <Route
          path="menu"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MenuManagement />
            </ProtectedRoute>
          }
        />

        {/* Bill History: Accessible to Admin and Cashier */}
        <Route path="bills" element={<BillHistory />} />

        {/* Reports: Admin Only */}
        <Route
          path="reports"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Reports />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
