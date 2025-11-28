import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { AppBar, Box, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, useTheme, useMediaQuery, } from '@mui/material';
import { Menu as MenuIcon, Dashboard as DashboardIcon, People as PeopleIcon, AttachMoney as MoneyIcon, ShoppingCart as SalesIcon, Inventory as MaterialsIcon, AccountBalance as SalariesIcon, Assessment as ReportsIcon, TrendingUp as CommissionsIcon, Settings as SettingsIcon, AdminPanelSettings as ManagementIcon, } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import { Logout as LogoutIcon } from '@mui/icons-material';
const drawerWidth = 240;
const menuItems = [
    { text: 'Dashboard', icon: _jsx(DashboardIcon, {}), path: '/dashboard' },
    { text: 'Employees', icon: _jsx(PeopleIcon, {}), path: '/employees' },
    { text: 'Sales', icon: _jsx(SalesIcon, {}), path: '/sales' },
    { text: 'Packers', icon: _jsx(PeopleIcon, {}), path: '/packers' },
    { text: 'Commissions', icon: _jsx(CommissionsIcon, {}), path: '/commissions' },
    { text: 'Expenses', icon: _jsx(MoneyIcon, {}), path: '/expenses' },
    { text: 'Materials', icon: _jsx(MaterialsIcon, {}), path: '/materials' },
    { text: 'Salaries', icon: _jsx(SalariesIcon, {}), path: '/salaries' },
    { text: 'Reports', icon: _jsx(ReportsIcon, {}), path: '/reports' },
    { text: 'Management', icon: _jsx(ManagementIcon, {}), path: '/management' },
    { text: 'Settings', icon: _jsx(SettingsIcon, {}), path: '/settings' },
];
export default function Layout({ children }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };
    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };
    const drawer = (_jsxs(Box, { children: [_jsx(Toolbar, { children: _jsx(Typography, { variant: "h6", noWrap: true, component: "div", children: "MatSplash Finance" }) }), _jsx(List, { children: menuItems.map((item) => (_jsx(ListItem, { disablePadding: true, children: _jsxs(ListItemButton, { selected: location.pathname === item.path, onClick: () => {
                            navigate(item.path);
                            if (isMobile)
                                setMobileOpen(false);
                        }, children: [_jsx(ListItemIcon, { children: item.icon }), _jsx(ListItemText, { primary: item.text })] }) }, item.text))) })] }));
    return (_jsxs(Box, { sx: { display: 'flex' }, children: [_jsx(AppBar, { position: "fixed", sx: {
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    ml: { sm: `${drawerWidth}px` },
                }, children: _jsxs(Toolbar, { children: [_jsx(IconButton, { color: "inherit", "aria-label": "open drawer", edge: "start", onClick: handleDrawerToggle, sx: { mr: 2, display: { sm: 'none' } }, children: _jsx(MenuIcon, {}) }), _jsx(Typography, { variant: "h6", noWrap: true, component: "div", sx: { flexGrow: 1 }, children: "Financial Management System" }), _jsx(IconButton, { color: "inherit", onClick: handleLogout, "aria-label": "logout", children: _jsx(LogoutIcon, {}) })] }) }), _jsxs(Box, { component: "nav", sx: { width: { sm: drawerWidth }, flexShrink: { sm: 0 } }, children: [_jsx(Drawer, { variant: "temporary", open: mobileOpen, onClose: handleDrawerToggle, ModalProps: {
                            keepMounted: true,
                        }, sx: {
                            display: { xs: 'block', sm: 'none' },
                            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                        }, children: drawer }), _jsx(Drawer, { variant: "permanent", sx: {
                            display: { xs: 'none', sm: 'block' },
                            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                        }, open: true, children: drawer })] }), _jsxs(Box, { component: "main", sx: {
                    flexGrow: 1,
                    p: 3,
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                }, children: [_jsx(Toolbar, {}), children] })] }));
}
