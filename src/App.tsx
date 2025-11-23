import { useEffect, useState } from 'react';
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
import { dbService } from './services/database';
import { authService } from './services/authService';
// import { initializeDefaultDirector, initializeDefaultAccounts } from './services/setupService';

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
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const initDb = async () => {
      try {
        console.log('Initializing database...');
        await Promise.race([
          dbService.init(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database initialization timeout')), 30000)
          )
        ]);
        console.log('Database initialized successfully');
        
        // Initialize default director account if needed
        // NOTE: Default users including director are created by backend on first run
        console.log('Default users are created by backend API on initialization');
        
        // NOTE: User accounts are now managed by the backend API
        // The frontend no longer creates or updates users via IndexedDB
        // All user management is done through the /api/users endpoints
        console.log('User management is handled by backend API');
        
        setDbInitialized(true);
        console.log('App initialization complete');
      } catch (error) {
        console.error('Failed to initialize database:', error);
        console.error('Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        // Still set initialized to true after a shorter timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          console.warn('Database initialization failed or timed out, proceeding anyway...');
          console.warn('Some features may not work. Please refresh the page or clear IndexedDB.');
          setDbInitialized(true);
        }, 3000);
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

