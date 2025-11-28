import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
        return '/login';
    };
    return (_jsxs(ThemeProvider, { theme: theme, children: [_jsx(CssBaseline, {}), _jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login/:secretPath?", element: _jsx(Login, {}) }), _jsx(Route, { path: "/login", element: _jsx(Navigate, { to: "/404", replace: true }) }), _jsx(Route, { path: "/director", element: _jsx(ProtectedRoute, { allowedRoles: ['director'], children: _jsx(DirectorDashboard, {}) }) }), _jsx(Route, { path: "/manager", element: _jsx(ProtectedRoute, { allowedRoles: ['manager'], children: _jsx(ManagerDashboard, {}) }) }), _jsx(Route, { path: "/receptionist", element: _jsx(ProtectedRoute, { allowedRoles: ['receptionist'], children: _jsx(ReceptionistDashboard, {}) }) }), _jsx(Route, { path: "/storekeeper", element: _jsx(ProtectedRoute, { allowedRoles: ['storekeeper'], children: _jsx(StorekeeperDashboard, {}) }) }), _jsx(Route, { path: "/", element: _jsx(Navigate, { to: getDefaultRoute(), replace: true }) }), _jsx(Route, { path: "/dashboard", element: _jsx(ProtectedRoute, { allowedRoles: ['director'], children: _jsx(Layout, { children: _jsx(Dashboard, {}) }) }) }), _jsx(Route, { path: "/employees", element: _jsx(ProtectedRoute, { allowedRoles: ['director'], children: _jsx(Layout, { children: _jsx(Employees, {}) }) }) }), _jsx(Route, { path: "/expenses", element: _jsx(ProtectedRoute, { allowedRoles: ['director'], children: _jsx(Layout, { children: _jsx(Expenses, {}) }) }) }), _jsx(Route, { path: "/sales", element: _jsx(ProtectedRoute, { allowedRoles: ['director'], children: _jsx(Layout, { children: _jsx(Sales, {}) }) }) }), _jsx(Route, { path: "/packers", element: _jsx(ProtectedRoute, { allowedRoles: ['director'], children: _jsx(Layout, { children: _jsx(Packers, {}) }) }) }), _jsx(Route, { path: "/materials", element: _jsx(ProtectedRoute, { allowedRoles: ['director'], children: _jsx(Layout, { children: _jsx(Materials, {}) }) }) }), _jsx(Route, { path: "/salaries", element: _jsx(ProtectedRoute, { allowedRoles: ['director'], children: _jsx(Layout, { children: _jsx(Salaries, {}) }) }) }), _jsx(Route, { path: "/commissions", element: _jsx(ProtectedRoute, { allowedRoles: ['director'], children: _jsx(Layout, { children: _jsx(Commissions, {}) }) }) }), _jsx(Route, { path: "/reports", element: _jsx(ProtectedRoute, { allowedRoles: ['director'], children: _jsx(Layout, { children: _jsx(Reports, {}) }) }) }), _jsx(Route, { path: "/settings", element: _jsx(ProtectedRoute, { allowedRoles: ['director'], children: _jsx(Layout, { children: _jsx(Settings, {}) }) }) }), _jsx(Route, { path: "/management", element: _jsx(ProtectedRoute, { allowedRoles: ['director'], children: _jsx(Layout, { children: _jsx(DirectorDashboardWrapper, {}) }) }) })] }) })] }));
}
export default App;
