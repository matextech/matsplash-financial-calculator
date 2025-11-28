import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Paper, Grid, Card, CardContent, Alert, MenuItem, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab, IconButton, Tooltip, Switch, FormControlLabel, InputAdornment, ToggleButton, ToggleButtonGroup, Stack, } from '@mui/material';
import { Logout as LogoutIcon, Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, PersonAdd as PersonAddIcon, Security as SecurityIcon, Search as SearchIcon, FilterList as FilterIcon, ChevronLeft, ChevronRight, Visibility as VisibilityIcon, VisibilityOff as VisibilityOffIcon, Refresh as RefreshIcon, VerifiedUser as VerifiedUserIcon, } from '@mui/icons-material';
import { DEFAULT_SETTINGS } from '../../types';
import { authService } from '../../services/authService';
import { apiService } from '../../services/apiService';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, addDays, subDays } from 'date-fns';
import TwoFactorSetup from '../auth/TwoFactorSetup';
export default function DirectorDashboard({ hideHeader = false }) {
    const navigate = useNavigate();
    const [tabValue, setTabValue] = useState(0);
    const [subTabValue, setSubTabValue] = useState(0);
    const [users, setUsers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [sales, setSales] = useState([]);
    const [entries, setEntries] = useState([]);
    const [settlements, setSettlements] = useState([]);
    const [settlementPayments, setSettlementPayments] = useState({});
    const [auditLogs, setAuditLogs] = useState([]);
    const [selectedSettlement, setSelectedSettlement] = useState(null);
    const [settlementDetailsOpen, setSettlementDetailsOpen] = useState(false);
    // Load settlement payments when dialog opens
    useEffect(() => {
        if (settlementDetailsOpen && selectedSettlement?.id && !settlementPayments[selectedSettlement.id]) {
            apiService.getSettlementPayments(selectedSettlement.id)
                .then(data => {
                setSettlementPayments(prev => ({
                    ...prev,
                    [selectedSettlement.id]: data || []
                }));
            })
                .catch(error => {
                console.error('Error loading payments:', error);
                setSettlementPayments(prev => ({
                    ...prev,
                    [selectedSettlement.id]: []
                }));
            });
        }
    }, [settlementDetailsOpen, selectedSettlement?.id]);
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [bagPrices, setBagPrices] = useState([]);
    const [materialPrices, setMaterialPrices] = useState([]);
    const [editingMaterialPrice, setEditingMaterialPrice] = useState(null);
    const [materialPriceDialogOpen, setMaterialPriceDialogOpen] = useState(false);
    const [materialPriceFormData, setMaterialPriceFormData] = useState({
        type: 'sachet_roll',
        cost: 0,
        bagsPerUnit: 0,
        label: '',
        sortOrder: 0,
        isActive: true,
    });
    const [twoFactorSetupOpen, setTwoFactorSetupOpen] = useState(false);
    const [selectedUserFor2FA, setSelectedUserFor2FA] = useState(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [viewMode, setViewMode] = useState('year');
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [dateRange, setDateRange] = useState({
        start: new Date(),
        end: new Date(),
    });
    // Filters
    const [filterDriver, setFilterDriver] = useState('all');
    const [filterSaleType, setFilterSaleType] = useState('all');
    const [filterEntryType, setFilterEntryType] = useState('all');
    const [filterEntityType, setFilterEntityType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [allUsers, setAllUsers] = useState([]);
    // User management dialogs
    const [userDialogOpen, setUserDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userFormData, setUserFormData] = useState({
        phone: '',
        email: '',
        password: '',
        pin: '',
        role: 'manager',
        name: '',
        twoFactorEnabled: false,
        isActive: true,
    });
    // PIN reset password verification dialog (for non-directors)
    const [pinResetDialogOpen, setPinResetDialogOpen] = useState(false);
    const [pinResetPassword, setPinResetPassword] = useState('');
    const [pinResetNewPin, setPinResetNewPin] = useState('');
    const [pinResetUserId, setPinResetUserId] = useState(null);
    const [showPinResetPassword, setShowPinResetPassword] = useState(false);
    // Password reset 2FA verification dialog (for directors)
    const [passwordResetDialogOpen, setPasswordResetDialogOpen] = useState(false);
    const [passwordResetTwoFactorCode, setPasswordResetTwoFactorCode] = useState('');
    const [passwordResetNewPassword, setPasswordResetNewPassword] = useState('');
    const [passwordResetConfirmPassword, setPasswordResetConfirmPassword] = useState('');
    const [passwordResetUserId, setPasswordResetUserId] = useState(null);
    const [showPasswordResetNewPassword, setShowPasswordResetNewPassword] = useState(false);
    const [showPasswordResetConfirmPassword, setShowPasswordResetConfirmPassword] = useState(false);
    // Employee management dialogs
    const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [employeeFormData, setEmployeeFormData] = useState({
        name: '',
        email: '',
        phone: '',
        role: 'Driver',
    });
    useEffect(() => {
        loadData();
    }, [selectedYear, selectedMonth, selectedDate, dateRange, viewMode, tabValue, subTabValue]);
    const loadData = async () => {
        try {
            let startDate;
            let endDate;
            if (viewMode === 'year') {
                startDate = new Date(selectedYear, 0, 1);
                endDate = new Date(selectedYear, 11, 31, 23, 59, 59);
            }
            else if (viewMode === 'month') {
                startDate = startOfMonth(selectedMonth);
                endDate = endOfMonth(selectedMonth);
            }
            else if (viewMode === 'day') {
                startDate = startOfDay(selectedDate);
                endDate = endOfDay(selectedDate);
            }
            else {
                startDate = startOfDay(dateRange.start);
                endDate = endOfDay(dateRange.end);
            }
            if (tabValue === 0) {
                // Main dashboard view
                const [salesData, entriesData, settlementsData] = await Promise.all([
                    apiService.getReceptionistSales(startDate, endDate),
                    apiService.getStorekeeperEntries(startDate, endDate),
                    apiService.getSettlements(startDate, endDate),
                ]);
                setSales(salesData);
                setEntries(entriesData);
                setSettlements(settlementsData);
            }
            else if (tabValue === 1) {
                // User management
                const usersData = await apiService.getUsers();
                setUsers(usersData);
            }
            else if (tabValue === 2) {
                // Employee management
                const employeesData = await apiService.getEmployees();
                setEmployees(employeesData.filter(e => e.role === 'Driver' || e.role === 'Packers'));
            }
            else if (tabValue === 3) {
                // Audit logs
                const logsData = await apiService.getAuditLogs(undefined, undefined, startDate, endDate);
                setAuditLogs(logsData);
            }
            else if (tabValue === 4) {
                // Settings
                // Load bag prices independently so it doesn't fail if material prices fails
                try {
                    const token = localStorage.getItem('authToken');
                    const bagPricesResponse = await fetch('http://localhost:3001/api/bag-prices?includeInactive=true', {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    });
                    const bagPricesResult = await bagPricesResponse.json();
                    if (bagPricesResult && bagPricesResult.data && Array.isArray(bagPricesResult.data)) {
                        setBagPrices([...bagPricesResult.data]);
                    }
                    else {
                        setBagPrices([]);
                    }
                }
                catch (error) {
                    console.error('Error loading bag prices:', error);
                    setBagPrices([]);
                }
                // Load settings
                try {
                    const settingsData = await apiService.getSettings();
                    setSettings(settingsData || DEFAULT_SETTINGS);
                }
                catch (error) {
                    console.error('Error loading settings:', error);
                }
                // Load material prices (optional - don't fail if this fails)
                try {
                    const materialPricesData = await apiService.getMaterialPrices(undefined, true);
                    if (Array.isArray(materialPricesData)) {
                        setMaterialPrices([...materialPricesData]);
                    }
                    else {
                        setMaterialPrices([]);
                    }
                }
                catch (error) {
                    // Material prices route might not be available yet, that's OK
                    setMaterialPrices([]);
                }
            }
            // Load users for audit log display
            if (tabValue === 1 || tabValue === 3) {
                const usersData = await apiService.getUsers();
                setAllUsers(usersData);
            }
        }
        catch (error) {
            console.error('Error loading data:', error);
        }
    };
    const handleOpenUserDialog = (user) => {
        if (user) {
            setEditingUser(user);
            setUserFormData({
                phone: user.phone || '',
                email: user.email || '',
                password: '',
                pin: user.pin || '',
                role: user.role,
                name: user.name || '',
                twoFactorEnabled: user.twoFactorEnabled ?? false,
                isActive: user.isActive ?? true,
            });
        }
        else {
            setEditingUser(null);
            setUserFormData({
                phone: '',
                email: '',
                password: '',
                pin: '',
                role: 'manager',
                name: '',
                twoFactorEnabled: false,
                isActive: true,
            });
        }
        setUserDialogOpen(true);
    };
    const handleSaveUser = async () => {
        try {
            if (editingUser) {
                await apiService.updateUser(editingUser.id, userFormData);
            }
            else {
                await apiService.createUser(userFormData);
            }
            setUserDialogOpen(false);
            await loadData();
        }
        catch (error) {
            console.error('Error saving user:', error);
            alert('Error saving user. Please try again.');
        }
    };
    const handleResetPin = async (userId) => {
        const targetUser = users.find(u => u.id === userId);
        if (!targetUser)
            return;
        // If director, use password reset with 2FA
        if (targetUser.role === 'director') {
            setPasswordResetUserId(userId);
            setPasswordResetTwoFactorCode('');
            setPasswordResetNewPassword('');
            setPasswordResetConfirmPassword('');
            setPasswordResetDialogOpen(true);
        }
        else {
            // For non-directors, use PIN reset with password verification
            setPinResetUserId(userId);
            setPinResetPassword('');
            setPinResetNewPin('');
            setPinResetDialogOpen(true);
        }
    };
    const handleDeleteUser = async (userId) => {
        try {
            const user = users.find(u => u.id === userId);
            if (!user) {
                throw new Error('User not found');
            }
            if (user.role === 'director') {
                alert('Cannot delete Director account.');
                return;
            }
            await apiService.deleteUser(userId);
            alert(`User ${user.name} deleted successfully.`);
            await loadData();
        }
        catch (error) {
            console.error('Error deleting user:', error);
            alert(`Error deleting user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };
    // Cleanup functions removed for production security
    const handleConfirmPasswordReset = async () => {
        if (!passwordResetUserId)
            return;
        if (!passwordResetTwoFactorCode) {
            alert('Please enter your 2FA code');
            return;
        }
        if (!passwordResetNewPassword || !passwordResetConfirmPassword) {
            alert('Please enter and confirm your new password');
            return;
        }
        if (passwordResetNewPassword !== passwordResetConfirmPassword) {
            alert('Passwords do not match');
            return;
        }
        if (passwordResetNewPassword.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }
        try {
            console.log('🔐 Resetting password for director:', passwordResetUserId);
            // Get current director session
            const session = authService.getCurrentSession();
            if (!session) {
                throw new Error('Session expired. Please login again.');
            }
            // Get current director (the one performing the reset)
            const currentDirector = users.find(u => u.id === session.userId);
            if (!currentDirector || currentDirector.role !== 'director') {
                throw new Error('Only directors can reset passwords');
            }
            // Get target user
            const targetUser = users.find(u => u.id === passwordResetUserId);
            if (!targetUser) {
                throw new Error('Target user not found');
            }
            if (targetUser.role !== 'director') {
                throw new Error('This dialog is only for resetting director passwords');
            }
            // Verify 2FA code for the current director (to authorize the reset)
            // Use the verify-2fa-authenticated endpoint (no password needed since user is already authenticated)
            try {
                await apiService.verify2FACodeAuthenticated(currentDirector.id, passwordResetTwoFactorCode);
            }
            catch (error) {
                throw new Error(error.message || 'Invalid 2FA code. Please try again.');
            }
            // 2FA verified, now update the target director's password
            const updateResult = await apiService.updateUser(passwordResetUserId, {
                password: passwordResetNewPassword
            });
            console.log('✅ Password reset successful');
            alert(`✅ Password reset successful!\n\n` +
                `User: ${targetUser.name}\n\n` +
                `The password has been updated successfully.`);
            setPasswordResetDialogOpen(false);
            setPasswordResetTwoFactorCode('');
            setPasswordResetNewPassword('');
            setPasswordResetConfirmPassword('');
            setPasswordResetUserId(null);
            await loadData();
        }
        catch (error) {
            console.error('❌ Error resetting password:', error);
            alert(`Error resetting password: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };
    const handleConfirmPinReset = async () => {
        if (!pinResetUserId)
            return;
        if (!pinResetPassword) {
            alert('Please enter your password');
            return;
        }
        if (!pinResetNewPin) {
            alert('Please enter the new PIN');
            return;
        }
        // Validate PIN
        if (!/^\d{4,6}$/.test(pinResetNewPin)) {
            alert('❌ Invalid PIN. Must be 4-6 digits.');
            return;
        }
        try {
            console.log('🔐 Resetting PIN for user:', pinResetUserId);
            // Get current director session
            const session = authService.getCurrentSession();
            if (!session) {
                throw new Error('Session expired. Please login again.');
            }
            // Get director's identifier
            const director = users.find(u => u.id === session.userId);
            if (!director || director.role !== 'director') {
                throw new Error('Only directors can reset PINs');
            }
            // Verify password using dedicated verification endpoint
            const directorIdentifier = director.email || director.phone;
            if (!directorIdentifier) {
                throw new Error('Director email or phone not found');
            }
            // Verify password without creating a new session
            const passwordVerification = await apiService.verifyDirectorPassword(directorIdentifier, pinResetPassword);
            if (!passwordVerification.success || !passwordVerification.isValid) {
                throw new Error('Invalid password. Please try again.');
            }
            // Get target user
            const targetUser = users.find(u => u.id === pinResetUserId);
            if (!targetUser) {
                throw new Error('Target user not found');
            }
            // Update user PIN (password verified above)
            await apiService.updateUser(pinResetUserId, {
                pin: pinResetNewPin,
                pinResetRequired: true
            });
            console.log('✅ PIN reset successful. New PIN:', pinResetNewPin);
            alert(`✅ PIN reset successful!\n\n` +
                `User: ${targetUser.name}\n` +
                `New temporary PIN: ${pinResetNewPin}\n\n` +
                `The user will be required to change this PIN on their next login.`);
            setPinResetDialogOpen(false);
            setPinResetPassword('');
            setPinResetNewPin('');
            setPinResetUserId(null);
            await loadData();
        }
        catch (error) {
            console.error('❌ Error resetting PIN:', error);
            alert(`Error resetting PIN: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };
    const handleOpenEmployeeDialog = (employee) => {
        if (employee) {
            setEditingEmployee(employee);
            setEmployeeFormData({
                name: employee.name,
                email: employee.email,
                phone: employee.phone || '',
                role: (employee.role === 'Driver' || employee.role === 'Packers') ? employee.role : 'Driver',
            });
        }
        else {
            setEditingEmployee(null);
            setEmployeeFormData({
                name: '',
                email: '',
                phone: '',
                role: 'Driver',
            });
        }
        setEmployeeDialogOpen(true);
    };
    const handleSaveEmployee = async () => {
        try {
            if (editingEmployee) {
                await apiService.updateEmployee(editingEmployee.id, {
                    name: employeeFormData.name,
                    email: employeeFormData.email,
                    phone: employeeFormData.phone,
                    role: employeeFormData.role,
                });
            }
            else {
                await apiService.createEmployee({
                    name: employeeFormData.name,
                    email: employeeFormData.email,
                    phone: employeeFormData.phone,
                    role: employeeFormData.role,
                    salaryType: 'commission',
                    commissionRate: employeeFormData.role === 'Driver' ? 15 : 4,
                });
            }
            setEmployeeDialogOpen(false);
            await loadData();
        }
        catch (error) {
            console.error('Error saving employee:', error);
            alert('Error saving employee. Please try again.');
        }
    };
    const handleAddPrice = async () => {
        try {
            const newPrice = await apiService.createBagPrice({
                amount: 250, // Default to 250, user can edit
                label: 'New Price',
                sortOrder: bagPrices.length + 1,
                isActive: true,
            });
            console.log('New price created:', newPrice);
            // Force reload bag prices - wait a bit for DB to be ready
            await new Promise(resolve => setTimeout(resolve, 100));
            // Reload bag prices to get the updated list
            const updatedBagPrices = await apiService.getBagPrices(true); // Include inactive
            console.log('Fetched bag prices:', updatedBagPrices);
            console.log('Type of bagPrices:', typeof updatedBagPrices, Array.isArray(updatedBagPrices));
            // API service already extracts data.data || data, so it should be an array
            if (Array.isArray(updatedBagPrices)) {
                console.log('Setting bag prices state with', updatedBagPrices.length, 'prices:', updatedBagPrices);
                setBagPrices([...updatedBagPrices]); // Create new array to force re-render
            }
            else {
                console.error('Bag prices is not an array:', updatedBagPrices, typeof updatedBagPrices);
                // Try to reload all data as fallback
                if (tabValue === 4) {
                    await loadData();
                }
            }
            alert('New price added! Please update the amount and label.');
        }
        catch (error) {
            console.error('Error adding price:', error);
            alert('Error adding price. Please try again.');
        }
    };
    const handleUpdatePrice = async (priceId, updates) => {
        try {
            await apiService.updateBagPrice(priceId, updates);
            // Update local state for immediate feedback
            setBagPrices(bagPrices.map(p => p.id === priceId ? { ...p, ...updates } : p));
        }
        catch (error) {
            console.error('Error updating price:', error);
            alert('Error updating price. Please try again.');
        }
    };
    const handleDeletePrice = async (priceId) => {
        if (!confirm('Are you sure you want to delete this price? This cannot be undone.')) {
            return;
        }
        try {
            await apiService.deleteBagPrice(priceId);
            // Reload bag prices to get the updated list
            const updatedBagPrices = await apiService.getBagPrices(true); // Include inactive
            setBagPrices(updatedBagPrices || []);
            alert('Price deleted successfully');
        }
        catch (error) {
            console.error('Error deleting price:', error);
            alert('Error deleting price. Please try again.');
        }
    };
    const handleSavePrices = async () => {
        try {
            // All prices are auto-saved on change, so just show confirmation
            alert('All bag prices saved successfully!');
        }
        catch (error) {
            console.error('Error saving prices:', error);
            alert('Error saving prices. Please try again.');
        }
    };
    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(amount);
    };
    // Apply filters to sales
    const filteredSales = sales.filter(sale => {
        if (filterDriver !== 'all' && sale.driverName !== filterDriver) {
            return false;
        }
        if (filterSaleType !== 'all' && sale.saleType !== filterSaleType) {
            return false;
        }
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            return ((sale.driverName && sale.driverName.toLowerCase().includes(search)) ||
                sale.saleType.toLowerCase().includes(search) ||
                sale.totalBags.toString().includes(search) ||
                (sale.notes && sale.notes.toLowerCase().includes(search)));
        }
        return true;
    });
    // Apply filters to entries
    const filteredEntries = entries.filter(entry => {
        if (filterEntryType !== 'all' && entry.entryType !== filterEntryType) {
            return false;
        }
        if (filterDriver !== 'all') {
            if (entry.entryType === 'driver_pickup' && entry.driverName !== filterDriver) {
                return false;
            }
            if (entry.entryType === 'packer_production' && entry.packerName !== filterDriver) {
                return false;
            }
        }
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            return ((entry.driverName && entry.driverName.toLowerCase().includes(search)) ||
                (entry.packerName && entry.packerName.toLowerCase().includes(search)) ||
                entry.entryType.toLowerCase().includes(search) ||
                entry.bagsCount.toString().includes(search) ||
                (entry.notes && entry.notes.toLowerCase().includes(search)));
        }
        return true;
    });
    // Apply filters to audit logs
    const filteredAuditLogs = auditLogs.filter(log => {
        if (filterEntityType !== 'all' && log.entityType !== filterEntityType) {
            return false;
        }
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            return (log.entityType.toLowerCase().includes(search) ||
                log.action.toLowerCase().includes(search) ||
                (log.field && log.field.toLowerCase().includes(search)) ||
                (log.oldValue && log.oldValue.toString().toLowerCase().includes(search)) ||
                (log.newValue && log.newValue.toString().toLowerCase().includes(search)) ||
                (log.reason && log.reason.toLowerCase().includes(search)));
        }
        return true;
    });
    return (_jsxs(Box, { children: [!hideHeader && (_jsxs(Box, { sx: {
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    mb: { xs: 2, sm: 3 },
                    gap: { xs: 2, sm: 0 }
                }, children: [_jsx(Typography, { variant: "h4", sx: { fontSize: { xs: '1.5rem', sm: '2rem' } }, children: "Director Dashboard" }), _jsxs(Button, { variant: "outlined", startIcon: _jsx(LogoutIcon, {}), onClick: handleLogout, size: window.innerWidth < 600 ? 'small' : 'medium', children: [_jsx(Box, { component: "span", sx: { display: { xs: 'none', sm: 'inline' } }, children: "Logout" }), _jsx(Box, { component: "span", sx: { display: { xs: 'inline', sm: 'none' } }, children: "Out" })] })] })), _jsx(Paper, { sx: { p: 2, mb: 3 }, children: _jsxs(Stack, { spacing: 2, children: [_jsx(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: _jsxs(ToggleButtonGroup, { value: viewMode, exclusive: true, onChange: (_, newMode) => {
                                    if (newMode)
                                        setViewMode(newMode);
                                }, size: "small", children: [_jsx(ToggleButton, { value: "year", children: "Year" }), _jsx(ToggleButton, { value: "month", children: "Month" }), _jsx(ToggleButton, { value: "day", children: "Day" }), _jsx(ToggleButton, { value: "range", children: "Range" })] }) }), viewMode === 'year' && (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Button, { onClick: () => setSelectedYear(selectedYear - 1), children: "Previous Year" }), _jsx(TextField, { type: "number", label: "Year", value: selectedYear, onChange: (e) => setSelectedYear(parseInt(e.target.value)), InputLabelProps: { shrink: true }, sx: { width: 120 } }), _jsx(Button, { onClick: () => setSelectedYear(new Date().getFullYear()), children: "Current Year" })] })), viewMode === 'month' && (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Button, { onClick: () => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1)), children: "Previous Month" }), _jsx(TextField, { type: "month", value: format(selectedMonth, 'yyyy-MM'), onChange: (e) => {
                                        const [year, month] = e.target.value.split('-').map(Number);
                                        setSelectedMonth(new Date(year, month - 1, 1));
                                    }, InputLabelProps: { shrink: true } }), _jsx(Button, { onClick: () => setSelectedMonth(new Date()), children: "Current Month" })] })), viewMode === 'day' && (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(IconButton, { onClick: () => setSelectedDate(subDays(selectedDate, 1)), children: _jsx(ChevronLeft, {}) }), _jsx(TextField, { type: "date", value: format(selectedDate, 'yyyy-MM-dd'), onChange: (e) => {
                                        const date = new Date(e.target.value);
                                        setSelectedDate(date);
                                    }, InputLabelProps: { shrink: true } }), _jsx(IconButton, { onClick: () => setSelectedDate(addDays(selectedDate, 1)), children: _jsx(ChevronRight, {}) }), _jsx(Button, { onClick: () => setSelectedDate(new Date()), children: "Today" })] })), viewMode === 'range' && (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(TextField, { label: "Start Date", type: "date", value: format(dateRange.start, 'yyyy-MM-dd'), onChange: (e) => {
                                        setDateRange({ ...dateRange, start: new Date(e.target.value) });
                                    }, InputLabelProps: { shrink: true } }), _jsx(TextField, { label: "End Date", type: "date", value: format(dateRange.end, 'yyyy-MM-dd'), onChange: (e) => {
                                        setDateRange({ ...dateRange, end: new Date(e.target.value) });
                                    }, InputLabelProps: { shrink: true } })] }))] }) }), (tabValue === 0 || tabValue === 3) && (_jsx(Paper, { sx: { p: 2, mb: 3 }, children: _jsxs(Stack, { spacing: 2, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(FilterIcon, {}), _jsx(Typography, { variant: "h6", children: "Filters" })] }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(TextField, { fullWidth: true, label: "Search", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), InputProps: {
                                            startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(SearchIcon, {}) })),
                                        }, placeholder: "Search..." }) }), tabValue === 0 && subTabValue === 1 && (_jsxs(_Fragment, { children: [_jsx(Grid, { item: true, xs: 12, md: 3, children: _jsxs(TextField, { fullWidth: true, label: "Driver", select: true, value: filterDriver, onChange: (e) => setFilterDriver(e.target.value), children: [_jsx(MenuItem, { value: "all", children: "All Drivers" }), employees.filter(e => e.role === 'Driver').map((emp) => (_jsx(MenuItem, { value: emp.name, children: emp.name }, emp.id)))] }) }), _jsx(Grid, { item: true, xs: 12, md: 3, children: _jsxs(TextField, { fullWidth: true, label: "Sale Type", select: true, value: filterSaleType, onChange: (e) => setFilterSaleType(e.target.value), children: [_jsx(MenuItem, { value: "all", children: "All Types" }), _jsx(MenuItem, { value: "driver", children: "Driver Sale" }), _jsx(MenuItem, { value: "general", children: "General Sales" }), _jsx(MenuItem, { value: "mini_store", children: "Mini Store" })] }) })] })), tabValue === 0 && subTabValue === 2 && (_jsxs(_Fragment, { children: [_jsx(Grid, { item: true, xs: 12, md: 3, children: _jsxs(TextField, { fullWidth: true, label: "Entry Type", select: true, value: filterEntryType, onChange: (e) => setFilterEntryType(e.target.value), children: [_jsx(MenuItem, { value: "all", children: "All Types" }), _jsx(MenuItem, { value: "driver_pickup", children: "Driver Pickup" }), _jsx(MenuItem, { value: "general_sales", children: "General Sales" }), _jsx(MenuItem, { value: "ministore_pickup", children: "Mini Store Pickup" }), _jsx(MenuItem, { value: "packer_production", children: "Packer Production" })] }) }), _jsx(Grid, { item: true, xs: 12, md: 3, children: _jsxs(TextField, { fullWidth: true, label: "Driver/Packer", select: true, value: filterDriver, onChange: (e) => setFilterDriver(e.target.value), children: [_jsx(MenuItem, { value: "all", children: "All" }), employees.map((emp) => (_jsx(MenuItem, { value: emp.name, children: emp.name }, emp.id)))] }) })] })), tabValue === 3 && (_jsx(Grid, { item: true, xs: 12, md: 3, children: _jsxs(TextField, { fullWidth: true, label: "Entity Type", select: true, value: filterEntityType, onChange: (e) => setFilterEntityType(e.target.value), children: [_jsx(MenuItem, { value: "all", children: "All Types" }), _jsx(MenuItem, { value: "receptionist_sale", children: "Receptionist Sale" }), _jsx(MenuItem, { value: "storekeeper_entry", children: "Storekeeper Entry" }), _jsx(MenuItem, { value: "settlement", children: "Settlement" }), _jsx(MenuItem, { value: "user", children: "User" })] }) }))] })] }) })), _jsx(Paper, { sx: { mb: 3 }, children: _jsxs(Tabs, { value: tabValue, onChange: (_, newValue) => setTabValue(newValue), children: [_jsx(Tab, { label: "Overview" }), _jsx(Tab, { label: "User Management" }), _jsx(Tab, { label: "Employee Management" }), _jsx(Tab, { label: "Audit Logs" }), _jsx(Tab, { label: "Settings" })] }) }), tabValue === 0 && (_jsxs(Box, { children: [_jsx(Paper, { sx: { mb: 3 }, children: _jsxs(Tabs, { value: subTabValue, onChange: (_, newValue) => setSubTabValue(newValue), children: [_jsx(Tab, { label: "Manager View" }), _jsx(Tab, { label: "Receptionist View" }), _jsx(Tab, { label: "Storekeeper View" })] }) }), subTabValue === 0 && (_jsxs(Box, { children: [_jsxs(Typography, { variant: "h6", gutterBottom: true, children: ["Manager View - ", viewMode === 'year' ? selectedYear :
                                        viewMode === 'month' ? format(selectedMonth, 'MMMM yyyy') :
                                            viewMode === 'day' ? format(selectedDate, 'MMM d, yyyy') :
                                                `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`] }), _jsxs(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "Total Sales" }), _jsx(Typography, { variant: "h4", children: filteredSales.length })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "Total Settlements" }), _jsx(Typography, { variant: "h4", children: settlements.length })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "Total Settled" }), _jsx(Typography, { variant: "h4", children: formatCurrency(settlements.reduce((sum, s) => sum + s.settledAmount, 0)) })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "Pending Balance" }), _jsx(Typography, { variant: "h4", color: "warning.main", children: formatCurrency(settlements.reduce((sum, s) => sum + s.remainingBalance, 0)) })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "Fully Settled" }), _jsx(Typography, { variant: "h4", color: "success.main", children: settlements.filter(s => s.isSettled).length })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "Partially Settled" }), _jsx(Typography, { variant: "h4", color: "warning.main", children: settlements.filter(s => !s.isSettled && s.settledAmount > 0).length })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "Unsettled" }), _jsx(Typography, { variant: "h4", color: "error.main", children: settlements.filter(s => s.settledAmount === 0).length })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "Total Expected" }), _jsx(Typography, { variant: "h4", children: formatCurrency(settlements.reduce((sum, s) => sum + s.expectedAmount, 0)) })] }) }) })] }), _jsx(Typography, { variant: "h6", sx: { mb: 2, mt: 4 }, children: "Sales & Settlement Status" }), _jsx(TableContainer, { component: Paper, sx: {
                                    mb: 4,
                                    overflowX: 'auto',
                                    '& .MuiTableCell-root': {
                                        whiteSpace: { xs: 'nowrap', md: 'normal' },
                                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                    }
                                }, children: _jsxs(Table, { sx: { minWidth: 800 }, children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Date" }), _jsx(TableCell, { children: "Type" }), _jsx(TableCell, { children: "Driver" }), _jsx(TableCell, { children: "Price Breakdown" }), _jsx(TableCell, { children: "Total Bags" }), _jsx(TableCell, { children: "Expected Amount" }), _jsx(TableCell, { children: "Settlement Status" }), _jsx(TableCell, { children: "Settled Amount" }), _jsx(TableCell, { children: "Balance" }), _jsx(TableCell, { children: "Actions" })] }) }), _jsx(TableBody, { children: filteredSales.map((sale) => {
                                                const settlement = settlements.find(s => s.receptionistSaleId === sale.id);
                                                const expectedAmount = sale.expectedAmount || 0;
                                                return (_jsxs(TableRow, { children: [_jsx(TableCell, { children: format(new Date(sale.date), 'MMM d, yyyy') }), _jsx(TableCell, { children: sale.saleType === 'driver' ? 'Driver Sale' :
                                                                sale.saleType === 'general' ? 'General Sales' :
                                                                    sale.saleType === 'mini_store' ? 'Mini Store' : sale.saleType }), _jsx(TableCell, { children: sale.driverName || 'N/A' }), _jsx(TableCell, { children: sale.priceBreakdown && sale.priceBreakdown.length > 0 ? (_jsx(Box, { children: sale.priceBreakdown.map((item, idx) => (_jsxs(Typography, { variant: "body2", children: [item.bags.toLocaleString(), " @ \u20A6", item.amount.toLocaleString(), item.label ? ` (${item.label})` : ''] }, idx))) })) : (_jsxs(Typography, { variant: "body2", color: "text.secondary", children: [sale.bagsAtPrice1 > 0 && `${sale.bagsAtPrice1} @ ₦250`, sale.bagsAtPrice1 > 0 && sale.bagsAtPrice2 > 0 && ', ', sale.bagsAtPrice2 > 0 && `${sale.bagsAtPrice2} @ ₦270`, !sale.bagsAtPrice1 && !sale.bagsAtPrice2 && 'N/A'] })) }), _jsx(TableCell, { children: sale.totalBags.toLocaleString() }), _jsx(TableCell, { children: formatCurrency(expectedAmount) }), _jsx(TableCell, { children: settlement ? (_jsx(Chip, { label: settlement.isSettled ? 'Fully Settled' : 'Partially Settled', color: settlement.isSettled ? 'success' : 'warning', size: "small" })) : (_jsx(Chip, { label: "Not Settled", color: "error", size: "small" })) }), _jsx(TableCell, { children: settlement ? formatCurrency(settlement.settledAmount) : '₦0' }), _jsx(TableCell, { children: settlement ? (_jsx(Typography, { variant: "body2", color: settlement.remainingBalance > 0 ? 'warning.main' : 'success.main', fontWeight: "bold", children: formatCurrency(settlement.remainingBalance) })) : (_jsx(Typography, { variant: "body2", color: "error.main", fontWeight: "bold", children: formatCurrency(expectedAmount) })) }), _jsx(TableCell, { children: settlement && (_jsx(IconButton, { size: "small", onClick: () => {
                                                                    setSelectedSettlement(settlement);
                                                                    setSettlementDetailsOpen(true);
                                                                }, color: "primary", children: _jsx(VisibilityIcon, {}) })) })] }, sale.id));
                                            }) })] }) }), _jsx(Typography, { variant: "h6", sx: { mb: 2 }, children: "All Settlements" }), _jsx(TableContainer, { component: Paper, sx: {
                                    overflowX: 'auto',
                                    '& .MuiTableCell-root': {
                                        whiteSpace: { xs: 'nowrap', md: 'normal' },
                                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                    }
                                }, children: _jsxs(Table, { sx: { minWidth: 650 }, children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Date" }), _jsx(TableCell, { children: "Sale Date" }), _jsx(TableCell, { children: "Sale Type" }), _jsx(TableCell, { children: "Driver" }), _jsx(TableCell, { children: "Expected Amount" }), _jsx(TableCell, { children: "Settled Amount" }), _jsx(TableCell, { children: "Remaining Balance" }), _jsx(TableCell, { children: "Status" }), _jsx(TableCell, { children: "Payments" }), _jsx(TableCell, { children: "Actions" })] }) }), _jsx(TableBody, { children: settlements.map((settlement) => {
                                                const sale = sales.find(s => s.id === settlement.receptionistSaleId);
                                                const payments = settlementPayments[settlement.id] || [];
                                                return (_jsxs(TableRow, { children: [_jsx(TableCell, { children: format(new Date(settlement.date), 'MMM d, yyyy') }), _jsx(TableCell, { children: sale ? format(new Date(sale.date), 'MMM d, yyyy') : 'N/A' }), _jsx(TableCell, { children: sale ? (sale.saleType === 'driver' ? 'Driver Sale' :
                                                                sale.saleType === 'general' ? 'General Sales' :
                                                                    sale.saleType === 'mini_store' ? 'Mini Store' : sale.saleType) : 'N/A' }), _jsx(TableCell, { children: sale?.driverName || 'N/A' }), _jsx(TableCell, { children: formatCurrency(settlement.expectedAmount) }), _jsx(TableCell, { children: formatCurrency(settlement.settledAmount) }), _jsx(TableCell, { children: _jsx(Typography, { variant: "body2", color: settlement.remainingBalance > 0 ? 'warning.main' : 'success.main', fontWeight: "bold", children: formatCurrency(settlement.remainingBalance) }) }), _jsx(TableCell, { children: _jsx(Chip, { label: settlement.isSettled ? 'Fully Settled' : 'Pending', color: settlement.isSettled ? 'success' : 'warning', size: "small" }) }), _jsx(TableCell, { children: _jsxs(Typography, { variant: "body2", children: [settlementPayments[settlement.id]?.length || 0, " payment", (settlementPayments[settlement.id]?.length || 0) !== 1 ? 's' : ''] }) }), _jsx(TableCell, { children: _jsx(IconButton, { size: "small", onClick: () => {
                                                                    setSelectedSettlement(settlement);
                                                                    setSettlementDetailsOpen(true);
                                                                }, color: "primary", children: _jsx(VisibilityIcon, {}) }) })] }, settlement.id));
                                            }) })] }) })] })), subTabValue === 1 && (_jsxs(Box, { children: [_jsxs(Typography, { variant: "h6", gutterBottom: true, children: ["Receptionist Sales - ", selectedYear] }), _jsx(TableContainer, { component: Paper, sx: {
                                    overflowX: 'auto',
                                    '& .MuiTableCell-root': {
                                        whiteSpace: { xs: 'nowrap', md: 'normal' },
                                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                    }
                                }, children: _jsxs(Table, { sx: { minWidth: 650 }, children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Date" }), _jsx(TableCell, { children: "Type" }), _jsx(TableCell, { children: "Driver" }), _jsx(TableCell, { children: "Price Breakdown" }), _jsx(TableCell, { children: "Total Bags" }), _jsx(TableCell, { children: "Expected Amount" })] }) }), _jsx(TableBody, { children: filteredSales.map((sale) => {
                                                const expectedAmount = sale.expectedAmount || 0;
                                                return (_jsxs(TableRow, { children: [_jsx(TableCell, { children: format(new Date(sale.date), 'MMM d, yyyy') }), _jsx(TableCell, { children: sale.saleType }), _jsx(TableCell, { children: sale.driverName || 'N/A' }), _jsx(TableCell, { children: sale.priceBreakdown && sale.priceBreakdown.length > 0 ? (_jsx(Box, { children: sale.priceBreakdown.map((item, idx) => (_jsxs(Typography, { variant: "body2", children: [item.bags.toLocaleString(), " @ \u20A6", item.amount.toLocaleString(), item.label ? ` (${item.label})` : ''] }, idx))) })) : (_jsxs(Typography, { variant: "body2", color: "text.secondary", children: [sale.bagsAtPrice1 > 0 && `${sale.bagsAtPrice1} @ ₦250`, sale.bagsAtPrice1 > 0 && sale.bagsAtPrice2 > 0 && ', ', sale.bagsAtPrice2 > 0 && `${sale.bagsAtPrice2} @ ₦270`, !sale.bagsAtPrice1 && !sale.bagsAtPrice2 && 'N/A'] })) }), _jsx(TableCell, { children: sale.totalBags.toLocaleString() }), _jsx(TableCell, { children: formatCurrency(expectedAmount) })] }, sale.id));
                                            }) })] }) })] })), subTabValue === 2 && (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }, children: [_jsxs(Typography, { variant: "h6", children: ["Storekeeper Entries - ", viewMode === 'year' ? selectedYear :
                                                viewMode === 'month' ? format(selectedMonth, 'MMMM yyyy') :
                                                    viewMode === 'day' ? format(selectedDate, 'MMM d, yyyy') :
                                                        `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`] }), _jsx(Chip, { label: `${filteredEntries.length} ${filteredEntries.length === 1 ? 'entry' : 'entries'}`, color: "primary", variant: "outlined" })] }), filteredEntries.length === 0 ? (_jsx(Paper, { sx: { p: 4, textAlign: 'center' }, children: _jsx(Typography, { variant: "h6", color: "text.secondary", children: "No entries found matching the filters" }) })) : (_jsx(TableContainer, { component: Paper, children: _jsxs(Table, { children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Date" }), _jsx(TableCell, { children: "Type" }), _jsx(TableCell, { children: "Driver/Packer" }), _jsx(TableCell, { children: "Bags" })] }) }), _jsx(TableBody, { children: filteredEntries.map((entry) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: format(new Date(entry.date), 'MMM d, yyyy') }), _jsx(TableCell, { children: entry.entryType === 'driver_pickup' ? 'Driver Pickup' :
                                                            entry.entryType === 'general_sales' ? 'General Sales' :
                                                                entry.entryType === 'ministore_pickup' ? 'Mini Store Pickup' : 'Packer Production' }), _jsx(TableCell, { children: entry.entryType === 'ministore_pickup' ? 'Mini Store' :
                                                            entry.driverName || entry.packerName || 'N/A' }), _jsx(TableCell, { children: entry.bagsCount.toLocaleString() })] }, entry.id))) })] }) }))] }))] })), tabValue === 1 && (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }, children: [_jsx(Typography, { variant: "h6", children: "User Accounts" }), _jsx(Box, { sx: { display: 'flex', gap: 1 }, children: _jsx(Button, { variant: "contained", startIcon: _jsx(PersonAddIcon, {}), onClick: () => handleOpenUserDialog(), children: "Add User" }) })] }), _jsx(TableContainer, { component: Paper, children: _jsxs(Table, { children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Name" }), _jsx(TableCell, { children: "Phone/Email" }), _jsx(TableCell, { children: "Role" }), _jsx(TableCell, { children: "2FA" }), _jsx(TableCell, { children: "Status" }), _jsx(TableCell, { children: "Actions" })] }) }), _jsx(TableBody, { children: users.map((user) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: user.name }), _jsx(TableCell, { children: user.phone || user.email }), _jsx(TableCell, { children: _jsx(Chip, { label: user.role, size: "small" }) }), _jsx(TableCell, { children: user.twoFactorEnabled ? (_jsx(Chip, { label: "Enabled", color: "success", size: "small" })) : (_jsx(Chip, { label: "Disabled", size: "small" })) }), _jsx(TableCell, { children: user.isActive ? (_jsx(Chip, { label: "Active", color: "success", size: "small" })) : (_jsx(Chip, { label: "Inactive", color: "error", size: "small" })) }), _jsxs(TableCell, { children: [_jsx(Tooltip, { title: "Edit", children: _jsx(IconButton, { size: "small", onClick: () => handleOpenUserDialog(user), children: _jsx(EditIcon, {}) }) }), _jsx(Tooltip, { title: user.role === 'director' ? 'Reset Password' : 'Reset PIN', children: _jsx(IconButton, { size: "small", onClick: () => handleResetPin(user.id), children: _jsx(SecurityIcon, {}) }) }), user.role !== 'director' && (_jsx(Tooltip, { title: "Delete User", children: _jsx(IconButton, { size: "small", onClick: () => {
                                                                if (window.confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
                                                                    handleDeleteUser(user.id);
                                                                }
                                                            }, sx: { color: 'error.main' }, children: _jsx(DeleteIcon, {}) }) })), _jsx(Tooltip, { title: user.twoFactorEnabled ? 'Disable 2FA (Director Only)' : 'Enable 2FA (Director Only)', children: _jsx(IconButton, { size: "small", onClick: () => {
                                                                if (user.twoFactorEnabled) {
                                                                    if (window.confirm(`Are you sure you want to disable 2FA for ${user.name}? This will reduce account security.`)) {
                                                                        apiService.disable2FA(user.id)
                                                                            .then(() => {
                                                                            alert('2FA disabled successfully');
                                                                            loadData();
                                                                        })
                                                                            .catch((error) => {
                                                                            console.error('Error disabling 2FA:', error);
                                                                            alert('Error disabling 2FA. Please try again.');
                                                                        });
                                                                    }
                                                                }
                                                                else {
                                                                    setSelectedUserFor2FA(user);
                                                                    setTwoFactorSetupOpen(true);
                                                                }
                                                            }, children: user.twoFactorEnabled ? _jsx(VerifiedUserIcon, {}) : _jsx(SecurityIcon, {}) }) })] })] }, user.id))) })] }) })] })), tabValue === 2 && (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }, children: [_jsx(Typography, { variant: "h6", children: "Drivers & Packers" }), _jsx(Button, { variant: "contained", startIcon: _jsx(AddIcon, {}), onClick: () => handleOpenEmployeeDialog(), children: "Add Employee" })] }), _jsx(TableContainer, { component: Paper, children: _jsxs(Table, { children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Name" }), _jsx(TableCell, { children: "Email" }), _jsx(TableCell, { children: "Phone" }), _jsx(TableCell, { children: "Role" }), _jsx(TableCell, { children: "Actions" })] }) }), _jsx(TableBody, { children: employees.map((emp) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: emp.name }), _jsx(TableCell, { children: emp.email }), _jsx(TableCell, { children: emp.phone || 'N/A' }), _jsx(TableCell, { children: _jsx(Chip, { label: emp.role, size: "small" }) }), _jsx(TableCell, { children: _jsx(Tooltip, { title: "Edit", children: _jsx(IconButton, { size: "small", onClick: () => handleOpenEmployeeDialog(emp), children: _jsx(EditIcon, {}) }) }) })] }, emp.id))) })] }) })] })), tabValue === 3 && (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }, children: [_jsxs(Typography, { variant: "h6", children: ["Audit Logs - ", viewMode === 'year' ? selectedYear :
                                        viewMode === 'month' ? format(selectedMonth, 'MMMM yyyy') :
                                            viewMode === 'day' ? format(selectedDate, 'MMM d, yyyy') :
                                                `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`] }), _jsx(Chip, { label: `${filteredAuditLogs.length} ${filteredAuditLogs.length === 1 ? 'log' : 'logs'}`, color: "primary", variant: "outlined" })] }), filteredAuditLogs.length === 0 ? (_jsx(Paper, { sx: { p: 4, textAlign: 'center' }, children: _jsx(Typography, { variant: "h6", color: "text.secondary", children: "No audit logs found matching the filters" }) })) : (_jsx(TableContainer, { component: Paper, children: _jsxs(Table, { children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Date" }), _jsx(TableCell, { children: "Entity" }), _jsx(TableCell, { children: "Action" }), _jsx(TableCell, { children: "Field" }), _jsx(TableCell, { children: "Old Value" }), _jsx(TableCell, { children: "New Value" }), _jsx(TableCell, { children: "Changed By" }), _jsx(TableCell, { children: "Reason" })] }) }), _jsx(TableBody, { children: filteredAuditLogs.map((log) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: format(new Date(log.changedAt), 'MMM d, yyyy HH:mm') }), _jsx(TableCell, { children: log.entityType }), _jsx(TableCell, { children: log.action }), _jsx(TableCell, { children: log.field || 'N/A' }), _jsx(TableCell, { children: log.oldValue || 'N/A' }), _jsx(TableCell, { children: log.newValue || 'N/A' }), _jsx(TableCell, { children: allUsers.find(u => u.id === log.changedBy)?.name || `User ${log.changedBy}` }), _jsx(TableCell, { children: log.reason || 'N/A' })] }, log.id))) })] }) }))] })), tabValue === 4 && (_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", sx: { mb: 3 }, children: "System Settings" }), _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Bag Sales Prices" }), _jsx(Alert, { severity: "info", sx: { mb: 3 }, children: "Configure the selling prices for bags. These prices are used for calculating expected settlement amounts." }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(TextField, { fullWidth: true, label: "Price 1 (\u20A6)", type: "number", value: settings.salesPrice1, onChange: (e) => setSettings({ ...settings, salesPrice1: parseFloat(e.target.value) || 0 }), InputProps: {
                                                                startAdornment: _jsx(InputAdornment, { position: "start", children: "\u20A6" }),
                                                            }, helperText: "Default: \u20A6250 per bag" }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(TextField, { fullWidth: true, label: "Price 2 (\u20A6)", type: "number", value: settings.salesPrice2, onChange: (e) => setSettings({ ...settings, salesPrice2: parseFloat(e.target.value) || 0 }), InputProps: {
                                                                startAdornment: _jsx(InputAdornment, { position: "start", children: "\u20A6" }),
                                                            }, helperText: "Default: \u20A6270 per bag" }) })] }), _jsx(Box, { sx: { mt: 3 }, children: _jsx(Button, { variant: "contained", onClick: async () => {
                                                        try {
                                                            await apiService.updateSettings(settings);
                                                            alert('Prices updated successfully!');
                                                        }
                                                        catch (error) {
                                                            console.error('Error updating settings:', error);
                                                            alert('Error updating settings. Please try again.');
                                                        }
                                                    }, children: "Save Prices" }) })] }) }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }, children: [_jsx(Typography, { variant: "h6", children: "Material Prices" }), _jsx(Button, { variant: "contained", startIcon: _jsx(AddIcon, {}), onClick: () => {
                                                            setEditingMaterialPrice(null);
                                                            setMaterialPriceFormData({
                                                                type: 'sachet_roll',
                                                                cost: 31000,
                                                                bagsPerUnit: 450,
                                                                label: '',
                                                                sortOrder: 0,
                                                                isActive: true,
                                                            });
                                                            setMaterialPriceDialogOpen(true);
                                                        }, children: "Add Material Price" })] }), _jsx(Alert, { severity: "info", sx: { mb: 3 }, children: "Configure multiple price models for sachet rolls and packing nylon. These prices can be selected when entering sales." }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, mb: 2 }, children: [_jsx(Typography, { variant: "subtitle1", sx: { fontWeight: 'bold' }, children: "Sachet Roll Prices" }), materialPrices.filter(p => p.type === 'sachet_roll').length === 0 && (_jsx(Button, { variant: "outlined", startIcon: _jsx(AddIcon, {}), onClick: () => {
                                                            setEditingMaterialPrice(null);
                                                            setMaterialPriceFormData({
                                                                type: 'sachet_roll',
                                                                cost: 31000,
                                                                bagsPerUnit: 450,
                                                                label: '',
                                                                sortOrder: 0,
                                                                isActive: true,
                                                            });
                                                            setMaterialPriceDialogOpen(true);
                                                        }, size: "small", children: "Add Sachet Roll Price" }))] }), materialPrices.filter(p => p.type === 'sachet_roll').length === 0 ? (_jsxs(Paper, { sx: { p: 4, textAlign: 'center', mb: 3 }, children: [_jsx(Typography, { variant: "body1", color: "text.secondary", sx: { mb: 2 }, children: "No sachet roll prices configured yet." }), _jsx(Button, { variant: "contained", startIcon: _jsx(AddIcon, {}), onClick: () => {
                                                            setEditingMaterialPrice(null);
                                                            setMaterialPriceFormData({
                                                                type: 'sachet_roll',
                                                                cost: 31000,
                                                                bagsPerUnit: 450,
                                                                label: '',
                                                                sortOrder: 0,
                                                                isActive: true,
                                                            });
                                                            setMaterialPriceDialogOpen(true);
                                                        }, children: "Add Your First Sachet Roll Price" })] })) : (_jsx(TableContainer, { component: Paper, sx: { mb: 3 }, children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Label" }), _jsx(TableCell, { children: "Cost (\u20A6)" }), _jsx(TableCell, { children: "Bags/Roll" }), _jsx(TableCell, { children: "Cost/Bag" }), _jsx(TableCell, { children: "Sort Order" }), _jsx(TableCell, { children: "Status" }), _jsx(TableCell, { children: "Actions" })] }) }), _jsx(TableBody, { children: materialPrices
                                                                .filter(p => p.type === 'sachet_roll')
                                                                .sort((a, b) => a.sortOrder - b.sortOrder)
                                                                .map((price) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: price.label || 'Unnamed' }), _jsx(TableCell, { children: price.cost.toLocaleString() }), _jsx(TableCell, { children: price.bagsPerUnit.toLocaleString() }), _jsxs(TableCell, { children: ["\u20A6", (price.cost / price.bagsPerUnit).toFixed(2)] }), _jsx(TableCell, { children: price.sortOrder }), _jsx(TableCell, { children: _jsx(Chip, { label: price.isActive ? 'Active' : 'Inactive', color: price.isActive ? 'success' : 'default', size: "small" }) }), _jsxs(TableCell, { children: [_jsx(IconButton, { size: "small", onClick: () => {
                                                                                    setEditingMaterialPrice(price);
                                                                                    setMaterialPriceFormData({
                                                                                        type: price.type,
                                                                                        cost: price.cost,
                                                                                        bagsPerUnit: price.bagsPerUnit,
                                                                                        label: price.label || '',
                                                                                        sortOrder: price.sortOrder,
                                                                                        isActive: price.isActive,
                                                                                    });
                                                                                    setMaterialPriceDialogOpen(true);
                                                                                }, children: _jsx(EditIcon, {}) }), _jsx(IconButton, { size: "small", onClick: async () => {
                                                                                    if (window.confirm('Are you sure you want to delete this material price?')) {
                                                                                        try {
                                                                                            await apiService.deleteMaterialPrice(price.id);
                                                                                            await loadData();
                                                                                        }
                                                                                        catch (error) {
                                                                                            console.error('Error deleting material price:', error);
                                                                                            alert('Error deleting material price. Please try again.');
                                                                                        }
                                                                                    }
                                                                                }, children: _jsx(DeleteIcon, {}) })] })] }, price.id))) })] }) })), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, mb: 2 }, children: [_jsx(Typography, { variant: "subtitle1", sx: { fontWeight: 'bold' }, children: "Packing Nylon Prices" }), materialPrices.filter(p => p.type === 'packing_nylon').length === 0 && (_jsx(Button, { variant: "outlined", startIcon: _jsx(AddIcon, {}), onClick: () => {
                                                            setEditingMaterialPrice(null);
                                                            setMaterialPriceFormData({
                                                                type: 'packing_nylon',
                                                                cost: 100000,
                                                                bagsPerUnit: 10000,
                                                                label: '',
                                                                sortOrder: 0,
                                                                isActive: true,
                                                            });
                                                            setMaterialPriceDialogOpen(true);
                                                        }, size: "small", children: "Add Packing Nylon Price" }))] }), materialPrices.filter(p => p.type === 'packing_nylon').length === 0 ? (_jsxs(Paper, { sx: { p: 4, textAlign: 'center' }, children: [_jsx(Typography, { variant: "body1", color: "text.secondary", sx: { mb: 2 }, children: "No packing nylon prices configured yet." }), _jsx(Button, { variant: "contained", startIcon: _jsx(AddIcon, {}), onClick: () => {
                                                            setEditingMaterialPrice(null);
                                                            setMaterialPriceFormData({
                                                                type: 'packing_nylon',
                                                                cost: 100000,
                                                                bagsPerUnit: 10000,
                                                                label: '',
                                                                sortOrder: 0,
                                                                isActive: true,
                                                            });
                                                            setMaterialPriceDialogOpen(true);
                                                        }, children: "Add Your First Packing Nylon Price" })] })) : (_jsx(TableContainer, { component: Paper, children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Label" }), _jsx(TableCell, { children: "Cost (\u20A6)" }), _jsx(TableCell, { children: "Bags/Package" }), _jsx(TableCell, { children: "Cost/Bag" }), _jsx(TableCell, { children: "Sort Order" }), _jsx(TableCell, { children: "Status" }), _jsx(TableCell, { children: "Actions" })] }) }), _jsx(TableBody, { children: materialPrices
                                                                .filter(p => p.type === 'packing_nylon')
                                                                .sort((a, b) => a.sortOrder - b.sortOrder)
                                                                .map((price) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: price.label || 'Unnamed' }), _jsx(TableCell, { children: price.cost.toLocaleString() }), _jsx(TableCell, { children: price.bagsPerUnit.toLocaleString() }), _jsxs(TableCell, { children: ["\u20A6", (price.cost / price.bagsPerUnit).toFixed(2)] }), _jsx(TableCell, { children: price.sortOrder }), _jsx(TableCell, { children: _jsx(Chip, { label: price.isActive ? 'Active' : 'Inactive', color: price.isActive ? 'success' : 'default', size: "small" }) }), _jsxs(TableCell, { children: [_jsx(IconButton, { size: "small", onClick: () => {
                                                                                    setEditingMaterialPrice(price);
                                                                                    setMaterialPriceFormData({
                                                                                        type: price.type,
                                                                                        cost: price.cost,
                                                                                        bagsPerUnit: price.bagsPerUnit,
                                                                                        label: price.label || '',
                                                                                        sortOrder: price.sortOrder,
                                                                                        isActive: price.isActive,
                                                                                    });
                                                                                    setMaterialPriceDialogOpen(true);
                                                                                }, children: _jsx(EditIcon, {}) }), _jsx(IconButton, { size: "small", onClick: async () => {
                                                                                    if (window.confirm('Are you sure you want to delete this material price?')) {
                                                                                        try {
                                                                                            await apiService.deleteMaterialPrice(price.id);
                                                                                            await loadData();
                                                                                        }
                                                                                        catch (error) {
                                                                                            console.error('Error deleting material price:', error);
                                                                                            alert('Error deleting material price. Please try again.');
                                                                                        }
                                                                                    }
                                                                                }, children: _jsx(DeleteIcon, {}) })] })] }, price.id))) })] }) }))] }) }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Bag Sales Prices" }), _jsx(Alert, { severity: "info", sx: { mb: 3 }, children: "Add and manage unlimited bag prices. Receptionist will see all active prices when recording sales." }), bagPrices.length === 0 ? (_jsx(Alert, { severity: "warning", sx: { mb: 2 }, children: "No bag prices found. Click \"Add New Price\" to create your first price tier." })) : (_jsx(Box, { sx: { mb: 3 }, children: bagPrices
                                                    .sort((a, b) => a.sortOrder - b.sortOrder)
                                                    .map((price) => (_jsxs(Box, { sx: {
                                                        display: 'flex',
                                                        gap: 2,
                                                        mb: 2,
                                                        alignItems: 'center',
                                                        p: 2,
                                                        bgcolor: price.isActive ? 'background.paper' : 'action.disabledBackground',
                                                        border: '1px solid',
                                                        borderColor: 'divider',
                                                        borderRadius: 1,
                                                    }, children: [_jsx(TextField, { label: "Price Amount (\u20A6)", type: "number", value: price.amount, onChange: (e) => handleUpdatePrice(price.id, { amount: parseFloat(e.target.value) || 0 }), size: "small", sx: { width: '150px' }, InputProps: {
                                                                startAdornment: _jsx(InputAdornment, { position: "start", children: "\u20A6" }),
                                                            } }), _jsx(TextField, { label: "Label", value: price.label, onChange: (e) => handleUpdatePrice(price.id, { label: e.target.value }), size: "small", sx: { flexGrow: 1 }, placeholder: "e.g., Standard, Premium, Deluxe" }), _jsx(TextField, { label: "Order", type: "number", value: price.sortOrder, onChange: (e) => handleUpdatePrice(price.id, { sortOrder: parseInt(e.target.value) || 0 }), size: "small", sx: { width: '80px' }, helperText: "Display order" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: price.isActive, onChange: (e) => handleUpdatePrice(price.id, { isActive: e.target.checked }), size: "small" }), label: "Active", labelPlacement: "top" }), _jsx(IconButton, { color: "error", onClick: () => handleDeletePrice(price.id), size: "small", sx: { ml: 1 }, children: _jsx(DeleteIcon, {}) })] }, price.id))) })), _jsxs(Box, { sx: { display: 'flex', gap: 2, flexWrap: 'wrap' }, children: [_jsx(Button, { startIcon: _jsx(AddIcon, {}), onClick: handleAddPrice, variant: "outlined", children: "Add New Price" }), _jsx(Button, { variant: "outlined", onClick: async () => {
                                                            console.log('Manual refresh clicked');
                                                            const refreshed = await apiService.getBagPrices(true);
                                                            console.log('Refreshed bag prices:', refreshed);
                                                            if (Array.isArray(refreshed)) {
                                                                setBagPrices([...refreshed]);
                                                                console.log('State updated with', refreshed.length, 'prices');
                                                            }
                                                        }, startIcon: _jsx(RefreshIcon, {}), children: "Refresh" }), _jsx(Button, { variant: "contained", onClick: handleSavePrices, children: "All Changes Saved \u2713" })] })] }) }) })] })] })), _jsxs(Dialog, { open: userDialogOpen, onClose: () => setUserDialogOpen(false), maxWidth: "sm", fullWidth: true, fullScreen: window.innerWidth < 600, PaperProps: {
                    sx: {
                        m: { xs: 0, sm: 2 },
                        height: { xs: '100%', sm: 'auto' }
                    }
                }, children: [_jsx(DialogTitle, { children: editingUser ? 'Edit User' : 'Add User' }), _jsx(DialogContent, { children: _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }, children: [_jsx(TextField, { label: "Name", fullWidth: true, value: userFormData.name, onChange: (e) => setUserFormData({ ...userFormData, name: e.target.value }), required: true }), _jsx(TextField, { label: "Phone Number", fullWidth: true, value: userFormData.phone, onChange: (e) => setUserFormData({ ...userFormData, phone: e.target.value }), required: userFormData.role !== 'director' }), _jsx(TextField, { label: "Email", fullWidth: true, type: "email", value: userFormData.email, onChange: (e) => setUserFormData({ ...userFormData, email: e.target.value }), required: userFormData.role === 'director' }), _jsxs(TextField, { label: "Role", fullWidth: true, select: true, value: userFormData.role, onChange: (e) => setUserFormData({ ...userFormData, role: e.target.value }), required: true, children: [_jsx(MenuItem, { value: "director", children: "Director" }), _jsx(MenuItem, { value: "manager", children: "Manager" }), _jsx(MenuItem, { value: "receptionist", children: "Receptionist" }), _jsx(MenuItem, { value: "storekeeper", children: "Storekeeper" })] }), !editingUser && (_jsx(_Fragment, { children: userFormData.role === 'director' ? (_jsx(TextField, { label: "Password", fullWidth: true, type: "password", value: userFormData.password, onChange: (e) => setUserFormData({ ...userFormData, password: e.target.value }), required: true })) : (_jsx(TextField, { label: "PIN (4 digits)", fullWidth: true, type: "text", value: userFormData.pin, onChange: (e) => setUserFormData({ ...userFormData, pin: e.target.value }), inputProps: { maxLength: 4, pattern: '[0-9]*' }, required: true })) })), editingUser && editingUser.role === 'director' && (_jsx(TextField, { label: "New Password (leave blank to keep current)", fullWidth: true, type: "password", value: userFormData.password, onChange: (e) => setUserFormData({ ...userFormData, password: e.target.value }), helperText: "Enter a new password to change it, or leave blank to keep the current password" })), editingUser && editingUser.role !== 'director' && (_jsx(TextField, { label: "New PIN (leave blank to keep current)", fullWidth: true, type: "text", value: userFormData.pin, onChange: (e) => setUserFormData({ ...userFormData, pin: e.target.value }), inputProps: { maxLength: 6, pattern: '[0-9]*' }, helperText: "Enter a new PIN (4-6 digits) to change it, or leave blank to keep the current PIN" })), userFormData.role === 'director' && (_jsx(FormControlLabel, { control: _jsx(Switch, { checked: userFormData.twoFactorEnabled, onChange: (e) => setUserFormData({ ...userFormData, twoFactorEnabled: e.target.checked }) }), label: "Enable 2FA" })), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: userFormData.isActive, onChange: (e) => setUserFormData({ ...userFormData, isActive: e.target.checked }), disabled: editingUser?.role === 'director' }), label: editingUser?.role === 'director' ? 'Active (Director cannot be deactivated)' : 'Active' })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setUserDialogOpen(false), children: "Cancel" }), _jsx(Button, { onClick: handleSaveUser, variant: "contained", children: "Save" })] })] }), _jsxs(Dialog, { open: pinResetDialogOpen, onClose: () => {
                    setPinResetDialogOpen(false);
                    setPinResetPassword('');
                    setPinResetNewPin('');
                    setPinResetUserId(null);
                }, maxWidth: "sm", fullWidth: true, children: [_jsx(DialogTitle, { children: "Verify Password to Reset PIN" }), _jsx(DialogContent, { children: _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "Enter your password to verify your identity before resetting the PIN." }), _jsx(TextField, { label: "Your Password", type: showPinResetPassword ? 'text' : 'password', value: pinResetPassword, onChange: (e) => setPinResetPassword(e.target.value), fullWidth: true, required: true, InputProps: {
                                        endAdornment: (_jsx(InputAdornment, { position: "end", children: _jsx(IconButton, { onClick: () => setShowPinResetPassword(!showPinResetPassword), edge: "end", size: "small", children: showPinResetPassword ? _jsx(VisibilityOffIcon, {}) : _jsx(VisibilityIcon, {}) }) })),
                                    } }), _jsx(TextField, { label: "New PIN (4-6 digits)", type: "text", value: pinResetNewPin, onChange: (e) => setPinResetNewPin(e.target.value), fullWidth: true, required: true, inputProps: { maxLength: 6, pattern: '[0-9]*' }, helperText: "Enter the new PIN for the user" })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => {
                                    setPinResetDialogOpen(false);
                                    setPinResetPassword('');
                                    setPinResetNewPin('');
                                    setPinResetUserId(null);
                                }, children: "Cancel" }), _jsx(Button, { onClick: handleConfirmPinReset, variant: "contained", disabled: !pinResetPassword || !pinResetNewPin, children: "Reset PIN" })] })] }), _jsxs(Dialog, { open: passwordResetDialogOpen, onClose: () => {
                    setPasswordResetDialogOpen(false);
                    setPasswordResetTwoFactorCode('');
                    setPasswordResetNewPassword('');
                    setPasswordResetConfirmPassword('');
                    setPasswordResetUserId(null);
                }, maxWidth: "sm", fullWidth: true, children: [_jsx(DialogTitle, { children: "Verify 2FA to Reset Password" }), _jsx(DialogContent, { children: _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "Enter your 2FA code from your authenticator app to verify your identity before resetting the password." }), _jsx(TextField, { label: "2FA Code", type: "text", value: passwordResetTwoFactorCode, onChange: (e) => setPasswordResetTwoFactorCode(e.target.value), fullWidth: true, required: true, inputProps: { maxLength: 6, pattern: '[0-9]*' }, helperText: "Enter 6-digit code from your authenticator app" }), _jsx(TextField, { label: "New Password", type: showPasswordResetNewPassword ? 'text' : 'password', value: passwordResetNewPassword, onChange: (e) => setPasswordResetNewPassword(e.target.value), fullWidth: true, required: true, InputProps: {
                                        endAdornment: (_jsx(InputAdornment, { position: "end", children: _jsx(IconButton, { onClick: () => setShowPasswordResetNewPassword(!showPasswordResetNewPassword), edge: "end", size: "small", children: showPasswordResetNewPassword ? _jsx(VisibilityOffIcon, {}) : _jsx(VisibilityIcon, {}) }) })),
                                    } }), _jsx(TextField, { label: "Confirm New Password", type: showPasswordResetConfirmPassword ? 'text' : 'password', value: passwordResetConfirmPassword, onChange: (e) => setPasswordResetConfirmPassword(e.target.value), fullWidth: true, required: true, InputProps: {
                                        endAdornment: (_jsx(InputAdornment, { position: "end", children: _jsx(IconButton, { onClick: () => setShowPasswordResetConfirmPassword(!showPasswordResetConfirmPassword), edge: "end", size: "small", children: showPasswordResetConfirmPassword ? _jsx(VisibilityOffIcon, {}) : _jsx(VisibilityIcon, {}) }) })),
                                    } })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => {
                                    setPasswordResetDialogOpen(false);
                                    setPasswordResetTwoFactorCode('');
                                    setPasswordResetNewPassword('');
                                    setPasswordResetConfirmPassword('');
                                    setPasswordResetUserId(null);
                                }, children: "Cancel" }), _jsx(Button, { onClick: handleConfirmPasswordReset, variant: "contained", disabled: !passwordResetTwoFactorCode || !passwordResetNewPassword || !passwordResetConfirmPassword, children: "Reset Password" })] })] }), _jsxs(Dialog, { open: employeeDialogOpen, onClose: () => setEmployeeDialogOpen(false), maxWidth: "sm", fullWidth: true, children: [_jsx(DialogTitle, { children: editingEmployee ? 'Edit Employee' : 'Add Employee' }), _jsx(DialogContent, { children: _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }, children: [_jsx(TextField, { label: "Name", fullWidth: true, value: employeeFormData.name, onChange: (e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value }), required: true }), _jsx(TextField, { label: "Email", fullWidth: true, type: "email", value: employeeFormData.email, onChange: (e) => setEmployeeFormData({ ...employeeFormData, email: e.target.value }), required: true }), _jsx(TextField, { label: "Phone", fullWidth: true, value: employeeFormData.phone, onChange: (e) => setEmployeeFormData({ ...employeeFormData, phone: e.target.value }) }), _jsxs(TextField, { label: "Role", fullWidth: true, select: true, value: employeeFormData.role, onChange: (e) => setEmployeeFormData({ ...employeeFormData, role: e.target.value }), required: true, children: [_jsx(MenuItem, { value: "Driver", children: "Driver" }), _jsx(MenuItem, { value: "Packers", children: "Packer" })] })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setEmployeeDialogOpen(false), children: "Cancel" }), _jsx(Button, { onClick: handleSaveEmployee, variant: "contained", children: "Save" })] })] }), _jsxs(Dialog, { open: settlementDetailsOpen, onClose: () => setSettlementDetailsOpen(false), maxWidth: "md", fullWidth: true, fullScreen: window.innerWidth < 960, PaperProps: {
                    sx: {
                        m: { xs: 0, sm: 2 },
                        height: { xs: '100%', sm: 'auto' }
                    }
                }, children: [_jsx(DialogTitle, { children: "Settlement Details" }), _jsx(DialogContent, { children: selectedSettlement && (() => {
                            const sale = sales.find(s => s.id === selectedSettlement.receptionistSaleId);
                            const paymentsList = settlementPayments[selectedSettlement.id] || [];
                            return (_jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }, children: [_jsxs(Alert, { severity: selectedSettlement.isSettled ? 'success' : 'info', children: ["This settlement is ", selectedSettlement.isSettled ? 'fully settled' : 'partially settled', "."] }), _jsx(Typography, { variant: "h6", children: "Sale Information" }), _jsx(Box, { sx: { bgcolor: 'background.paper', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }, children: _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsxs(Typography, { variant: "body2", sx: { mb: 1 }, children: [_jsx("strong", { children: "Sale Date:" }), " ", sale ? format(new Date(sale.date), 'MMM d, yyyy') : 'N/A'] }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsxs(Typography, { variant: "body2", sx: { mb: 1 }, children: [_jsx("strong", { children: "Transaction Type:" }), " ", sale ? (sale.saleType === 'driver' ? 'Driver Sale' :
                                                                sale.saleType === 'general' ? 'General Sales' :
                                                                    sale.saleType === 'mini_store' ? 'Mini Store Dispatch' : sale.saleType) : 'N/A'] }) }), sale?.driverName && (_jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsxs(Typography, { variant: "body2", sx: { mb: 1 }, children: [_jsx("strong", { children: "Driver:" }), " ", sale.driverName] }) })), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsxs(Typography, { variant: "body2", sx: { mb: 1 }, children: [_jsx("strong", { children: "Total Bags:" }), " ", sale?.totalBags.toLocaleString() || 'N/A'] }) }), sale?.priceBreakdown && sale.priceBreakdown.length > 0 && (_jsxs(Grid, { item: true, xs: 12, children: [_jsx(Typography, { variant: "body2", sx: { mb: 1, fontWeight: 'bold' }, children: "Price Breakdown:" }), sale.priceBreakdown.map((item, idx) => (_jsxs(Typography, { variant: "body2", sx: { ml: 2, mb: 0.5 }, children: ["\u2022 ", item.bags.toLocaleString(), " bags @ \u20A6", item.amount.toLocaleString(), item.label ? ` (${item.label})` : '', _jsxs("span", { style: { marginLeft: '8px', color: '#666' }, children: ["= \u20A6", (item.bags * item.amount).toLocaleString()] })] }, idx)))] }))] }) }), _jsx(Typography, { variant: "h6", children: "Settlement Summary" }), _jsxs(Box, { sx: { bgcolor: 'background.paper', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }, children: [_jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 12, sm: 4, children: _jsxs(Typography, { variant: "body1", color: "primary", sx: { mb: 1 }, children: [_jsx("strong", { children: "Expected Amount:" }), " ", formatCurrency(selectedSettlement.expectedAmount)] }) }), _jsx(Grid, { item: true, xs: 12, sm: 4, children: _jsxs(Typography, { variant: "body1", color: "success.main", sx: { mb: 1 }, children: [_jsx("strong", { children: "Settled Amount:" }), " ", formatCurrency(selectedSettlement.settledAmount)] }) }), _jsx(Grid, { item: true, xs: 12, sm: 4, children: _jsxs(Typography, { variant: "body1", color: selectedSettlement.remainingBalance > 0 ? 'warning.main' : 'success.main', children: [_jsx("strong", { children: "Remaining Balance:" }), " ", formatCurrency(selectedSettlement.remainingBalance)] }) })] }), selectedSettlement.isSettled && selectedSettlement.settledAt && (_jsxs(Typography, { variant: "body2", color: "success.main", sx: { mt: 2 }, children: ["\u2713 Fully Settled on ", format(new Date(selectedSettlement.settledAt), 'MMM d, yyyy h:mm a')] }))] }), paymentsList.length > 0 && (_jsxs(_Fragment, { children: [_jsx(Typography, { variant: "h6", children: "Payment History" }), _jsx(TableContainer, { component: Paper, children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Date" }), _jsx(TableCell, { children: "Amount" }), _jsx(TableCell, { children: "Paid By" }), _jsx(TableCell, { children: "Notes" })] }) }), _jsx(TableBody, { children: paymentsList.map((payment) => {
                                                                const paidByUser = allUsers.find(u => u.id === payment.paidBy);
                                                                return (_jsxs(TableRow, { children: [_jsx(TableCell, { children: format(new Date(payment.paidAt), 'MMM d, yyyy h:mm a') }), _jsx(TableCell, { children: formatCurrency(payment.amount) }), _jsx(TableCell, { children: paidByUser?.name || `User #${payment.paidBy}` }), _jsx(TableCell, { children: payment.notes || '-' })] }, payment.id));
                                                            }) })] }) })] }))] }));
                        })() }), _jsx(DialogActions, { children: _jsx(Button, { onClick: () => setSettlementDetailsOpen(false), children: "Close" }) })] }), _jsxs(Dialog, { open: materialPriceDialogOpen, onClose: () => setMaterialPriceDialogOpen(false), maxWidth: "sm", fullWidth: true, fullScreen: window.innerWidth < 600, PaperProps: {
                    sx: {
                        m: { xs: 0, sm: 2 },
                        height: { xs: '100%', sm: 'auto' }
                    }
                }, children: [_jsx(DialogTitle, { children: editingMaterialPrice ? 'Edit Material Price' : 'Add Material Price' }), _jsx(DialogContent, { children: _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }, children: [_jsxs(TextField, { label: "Type", fullWidth: true, select: true, value: materialPriceFormData.type, onChange: (e) => setMaterialPriceFormData({ ...materialPriceFormData, type: e.target.value }), required: true, children: [_jsx(MenuItem, { value: "sachet_roll", children: "Sachet Roll" }), _jsx(MenuItem, { value: "packing_nylon", children: "Packing Nylon" })] }), _jsx(TextField, { label: "Label (Optional)", fullWidth: true, value: materialPriceFormData.label, onChange: (e) => setMaterialPriceFormData({ ...materialPriceFormData, label: e.target.value }), placeholder: "e.g., Supplier A, Premium Quality" }), _jsx(TextField, { label: materialPriceFormData.type === 'sachet_roll' ? 'Cost per Roll (₦)' : 'Cost per Package (₦)', fullWidth: true, type: "number", value: materialPriceFormData.cost, onChange: (e) => setMaterialPriceFormData({ ...materialPriceFormData, cost: parseFloat(e.target.value) || 0 }), required: true, InputProps: {
                                        startAdornment: _jsx(InputAdornment, { position: "start", children: "\u20A6" }),
                                    } }), _jsx(TextField, { label: materialPriceFormData.type === 'sachet_roll' ? 'Bags per Roll' : 'Bags per Package', fullWidth: true, type: "number", value: materialPriceFormData.bagsPerUnit, onChange: (e) => setMaterialPriceFormData({ ...materialPriceFormData, bagsPerUnit: parseInt(e.target.value) || 0 }), required: true, inputProps: { min: 1 } }), materialPriceFormData.cost > 0 && materialPriceFormData.bagsPerUnit > 0 && (_jsxs(Alert, { severity: "info", children: ["Cost per bag: \u20A6", (materialPriceFormData.cost / materialPriceFormData.bagsPerUnit).toFixed(2)] })), _jsx(TextField, { label: "Sort Order", fullWidth: true, type: "number", value: materialPriceFormData.sortOrder, onChange: (e) => setMaterialPriceFormData({ ...materialPriceFormData, sortOrder: parseInt(e.target.value) || 0 }), helperText: "Lower numbers appear first" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: materialPriceFormData.isActive, onChange: (e) => setMaterialPriceFormData({ ...materialPriceFormData, isActive: e.target.checked }) }), label: "Active (visible in sales entry)" })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setMaterialPriceDialogOpen(false), children: "Cancel" }), _jsx(Button, { variant: "contained", onClick: async () => {
                                    try {
                                        if (!materialPriceFormData.cost || materialPriceFormData.cost <= 0) {
                                            alert('Please enter a valid cost');
                                            return;
                                        }
                                        if (!materialPriceFormData.bagsPerUnit || materialPriceFormData.bagsPerUnit <= 0) {
                                            alert('Please enter a valid bags per unit');
                                            return;
                                        }
                                        if (editingMaterialPrice) {
                                            await apiService.updateMaterialPrice(editingMaterialPrice.id, materialPriceFormData);
                                            alert('Material price updated successfully!');
                                        }
                                        else {
                                            await apiService.createMaterialPrice(materialPriceFormData);
                                            alert('Material price created successfully!');
                                        }
                                        setMaterialPriceDialogOpen(false);
                                        await loadData();
                                    }
                                    catch (error) {
                                        console.error('Error saving material price:', error);
                                        alert('Error saving material price. Please try again.');
                                    }
                                }, children: editingMaterialPrice ? 'Update' : 'Create' })] })] }), selectedUserFor2FA && (_jsx(TwoFactorSetup, { open: twoFactorSetupOpen, onClose: () => {
                    setTwoFactorSetupOpen(false);
                    setSelectedUserFor2FA(null);
                }, onSuccess: async () => {
                    setTwoFactorSetupOpen(false);
                    setSelectedUserFor2FA(null);
                    await loadData();
                }, userId: selectedUserFor2FA.id, userEmail: selectedUserFor2FA.email, userName: selectedUserFor2FA.name }))] }));
}
