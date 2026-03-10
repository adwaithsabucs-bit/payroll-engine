import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WorkforcePage from './pages/WorkforcePage';
import AttendancePage from './pages/AttendancePage';
import PayrollPage from './pages/PayrollPage';
import UsersPage from './pages/UsersPage';
import HierarchyPage from './pages/HierarchyPage';

// Protected route wrapper
const ProtectedRoute = ({ children, roles }: { children: React.ReactNode; roles?: string[] }) => {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#64748b',
    }}>
      Loading...
    </div>
  );

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/attendance" replace />;
  }

  return <Layout>{children}</Layout>;
};

const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated
          ? <Navigate to={user?.role === 'HR' ? '/dashboard' : '/attendance'} replace />
          : <LoginPage />}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roles={['HR']}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute roles={['HR']}>
            <UsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workforce"
        element={
          <ProtectedRoute roles={['HR', 'SUPERVISOR', 'CONTRACTOR']}>
            <WorkforcePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <AttendancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll"
        element={
          <ProtectedRoute>
            <PayrollPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hierarchy"
        element={
          <ProtectedRoute>
          <HierarchyPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;