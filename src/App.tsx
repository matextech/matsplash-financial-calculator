import { useEffect, useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Employees from './components/Employees';
import Expenses from './components/Expenses';
import Sales from './components/Sales';
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
import { dbService } from './services/database';
import { authService } from './services/authService';
import { initializeDefaultDirector } from './services/setupService';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [dbInitialized, setDbInitialized] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const initDb = async () => {
      try {
        await dbService.init();
        // Initialize default director account if needed
        await initializeDefaultDirector();
        setDbInitialized(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        // Still set initialized to true after a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          console.warn('Database initialization timed out, proceeding anyway...');
          setDbInitialized(true);
        }, 5000);
      }
    };

    initDb();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  if (!dbInitialized) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}>
          <div>Initializing database...</div>
        </div>
      </ThemeProvider>
    );
  }

  // Check if user is already logged in and redirect
  const getDefaultRoute = () => {
    const session = authService.getCurrentSession();
    if (session && authService.isAuthenticated()) {
      switch (session.role) {
        case 'director':
          return '/director';
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
    return '/login';
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          
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
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

