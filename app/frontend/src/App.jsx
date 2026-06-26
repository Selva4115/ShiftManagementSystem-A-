import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Import Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Shifts from './pages/Shifts';
import Attendance from './pages/Attendance';
import Leaves from './pages/Leaves';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';

// Import Components
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

// Protected Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token } = useAuth();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Application Shell Layout (Sidebar + Topbar + Content Panel)
const AppLayout = ({ children, title }) => {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Topbar title={title} />
        <div style={contentInnerStyle} className="slide-up">
          {children}
        </div>
      </main>
    </div>
  );
};

const contentInnerStyle = {
  marginTop: '1.5rem',
};

const App = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            {/* Public Authentication Route */}
            <Route path="/login" element={<Login />} />

            {/* Secure System Core Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'employee']}>
                  <AppLayout title="Dashboard Overview">
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/employees"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <AppLayout title="Employee Registry">
                    <Employees />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/shifts"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'employee']}>
                  <AppLayout title="Workforce Shift Roster">
                    <Shifts />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/attendance"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'employee']}>
                  <AppLayout title="Attendance Terminal">
                    <Attendance />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/leaves"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'employee']}>
                  <AppLayout title="Leaves Request Center">
                    <Leaves />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <AppLayout title="Reports & Performance Metrics">
                    <Reports />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/notifications"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'employee']}>
                  <AppLayout title="System Bulletins">
                    <Notifications />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Redirect rule */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
