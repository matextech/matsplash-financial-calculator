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
import { dbService } from './services/database';

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
        // Clear all data - ONE TIME ONLY
        try {
          await dbService.clearAllData();
          console.log('All database data has been cleared.');
        } catch (error) {
          console.error('Error clearing data:', error);
        }
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/salaries" element={<Salaries />} />
            <Route path="/commissions" element={<Commissions />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

