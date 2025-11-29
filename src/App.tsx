// App component
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Employees from './components/Employees';
import Expenses from './components/Expenses';
import Sales from './components/Sales';
import Packers from './components/Packers';
import Materials from './components/Materials';
import Reports from './components/Reports';
import Salaries from './components/Salaries';
import Commissions from './components/Commissions';
import Settings from './components/Settings';
import Layout from './components/Layout';
import Login from './components/auth/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ReceptionistDashboard from './components/receptionist/ReceptionistDashboard';
import StorekeeperDashboard from './components/storekeeper/StorekeeperDashboard';
import ManagerDashboard from './components/manager/ManagerDashboard';
import DirectorDashboard from './components/director/DirectorDashboard';
import DirectorDashboardWrapper from './components/director/DirectorDashboardWrapper';
import NotFound from './components/NotFound';
import { authService } from './services/authService';
// import { initializeDefaultDirector, initializeDefaultAccounts } from './services/setupService';

const theme = createTheme({
  palette: {
    primary: {
      main: '#3f7a6a',
      light: '#5a9a8a',
      dark: '#2d5a4f',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  // IndexedDB initialization removed - all data is now managed through the backend API
  // The backend handles all database operations via SQLite

  // Check if user is already logged in and redirect
  const getDefaultRoute = () => {
    const session = authService.getCurrentSession();
    if (session && authService.isAuthenticated()) {
      switch (session.role) {
        case 'director':
          return '/dashboard'; // Director goes to main financial dashboard
        case 'manager':
          return '/manager';
        case 'receptionist':
          return '/receptionist';
        case 'storekeeper':
          return '/storekeeper';
        default:
          return '/dashboard';
      }
    }
    // Redirect to login with secret path if not authenticated
    const secretPath = import.meta.env?.VITE_LOGIN_SECRET_PATH || 'matsplash-fin-2jg1wCHqcMOEhlBr';
    return `/login/${secretPath}`;
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          {/* Public Routes - Login requires secret path for security */}
          {/* IMPORTANT: More specific routes must come first */}
          <Route path="/login/:secretPath" element={<Login />} />
          {/* Redirect plain /login to 404 for security */}
          <Route path="/login" element={<Navigate to="/404" replace />} />
          <Route path="/404" element={<NotFound />} />
          {/* Catch-all for unmatched routes */}
          <Route path="*" element={<NotFound />} />
          
          {/* Protected Role-Based Routes */}
          <Route
            path="/director"
            element={
              <ProtectedRoute allowedRoles={['director']}>
                <DirectorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager"
            element={
              <ProtectedRoute allowedRoles={['manager']}>
                <ManagerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/receptionist"
            element={
              <ProtectedRoute allowedRoles={['receptionist']}>
                <ReceptionistDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/storekeeper"
            element={
              <ProtectedRoute allowedRoles={['storekeeper']}>
                <StorekeeperDashboard />
              </ProtectedRoute>
            }
          />

          {/* Original Dashboard Routes (for director/main system) */}
          {/* Redirect root to login with secret path */}
          <Route
            path="/"
            element={<Navigate to={getDefaultRoute()} replace />}
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['director']}>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute allowedRoles={['director']}>
                <Layout>
                  <Employees />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute allowedRoles={['director']}>
                <Layout>
                  <Expenses />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales"
            element={
              <ProtectedRoute allowedRoles={['director']}>
                <Layout>
                  <Sales />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/packers"
            element={
              <ProtectedRoute allowedRoles={['director']}>
                <Layout>
                  <Packers />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/materials"
            element={
              <ProtectedRoute allowedRoles={['director']}>
                <Layout>
                  <Materials />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/salaries"
            element={
              <ProtectedRoute allowedRoles={['director']}>
                <Layout>
                  <Salaries />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/commissions"
            element={
              <ProtectedRoute allowedRoles={['director']}>
                <Layout>
                  <Commissions />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={['director']}>
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['director']}>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/management"
            element={
              <ProtectedRoute allowedRoles={['director']}>
                <Layout>
                  <DirectorDashboardWrapper />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

