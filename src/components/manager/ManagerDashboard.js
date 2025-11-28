import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Paper, Grid, Card, CardContent, Alert, MenuItem, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab, IconButton, Tooltip, InputAdornment, ToggleButton, ToggleButtonGroup, Stack, } from '@mui/material';
import { Logout as LogoutIcon, Edit as EditIcon, Visibility as VisibilityIcon, Notifications as NotificationsIcon, Search as SearchIcon, FilterList as FilterIcon, ChevronLeft, ChevronRight, Security as SecurityIcon, VerifiedUser as VerifiedUserIcon, } from '@mui/icons-material';
import { DEFAULT_SETTINGS } from '../../types';
import { apiService } from '../../services/apiService';
import { authService } from '../../services/authService';
import { AuditService } from '../../services/auditService';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths, addDays, subDays } from 'date-fns';
import TwoFactorSetup from '../auth/TwoFactorSetup';
export default function ManagerDashboard() {
    const navigate = useNavigate();
    const [tabValue, setTabValue] = useState(0);
    const [sales, setSales] = useState([]);
    const [entries, setEntries] = useState([]);
    const [settlements, setSettlements] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [bagPrices, setBagPrices] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [viewMode, setViewMode] = useState('month');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [dateRange, setDateRange] = useState({
        start: new Date(),
        end: new Date(),
    });
    // Filters
    const [filterDriver, setFilterDriver] = useState('all');
    const [filterSaleType, setFilterSaleType] = useState('all');
    const [filterEntryType, setFilterEntryType] = useState('all');
    const [filterSettlementStatus, setFilterSettlementStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [settlementDialogOpen, setSettlementDialogOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);
    const [settlementAmount, setSettlementAmount] = useState('');
    const [settlementHistoryDialogOpen, setSettlementHistoryDialogOpen] = useState(false);
    const [selectedSettlementHistory, setSelectedSettlementHistory] = useState(null);
    const [settlementPayments, setSettlementPayments] = useState([]);
    const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
    const [updateType, setUpdateType] = useState('sale');
    const [updateItem, setUpdateItem] = useState(null);
    const [updateField, setUpdateField] = useState('');
    const [updateValue, setUpdateValue] = useState('');
    const [updateReason, setUpdateReason] = useState('');
    const [twoFactorSetupOpen, setTwoFactorSetupOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    useEffect(() => {
        loadData();
        loadNotifications();
        loadEmployees();
        loadCurrentUser();
    }, [selectedMonth, viewMode, selectedDate, dateRange]);
    useEffect(() => {
        loadEmployees();
        loadCurrentUser();
    }, []);
    const loadCurrentUser = async () => {
        try {
            const session = authService.getCurrentSession();
            if (session) {
                const user = await apiService.getUser(session.userId);
                setCurrentUser(user);
            }
        }
        catch (error) {
            console.error('Error loading current user:', error);
        }
    };
    const loadEmployees = async () => {
        try {
            const data = await apiService.getEmployees();
            setEmployees(data.filter(e => e.role === 'Driver'));
        }
        catch (error) {
            console.error('Error loading employees:', error);
        }
    };
    const loadData = async () => {
        try {
            let startDate;
            let endDate;
            if (viewMode === 'month') {
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
            const [salesData, entriesData, settlementsData, settingsData, bagPricesData] = await Promise.all([
                apiService.getReceptionistSales(startDate, endDate),
                apiService.getStorekeeperEntries(startDate, endDate),
                apiService.getSettlements(startDate, endDate),
                apiService.getSettings(),
                apiService.getBagPrices(),
            ]);
            setSales(salesData);
            setEntries(entriesData);
            setSettlements(settlementsData);
            setSettings(settingsData || DEFAULT_SETTINGS);
            // Filter and sort active bag prices
            const activePrices = bagPricesData.filter(p => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
            setBagPrices(activePrices);
        }
        catch (error) {
            console.error('Error loading data:', error);
        }
    };
    const loadNotifications = async () => {
        try {
            const session = authService.getCurrentSession();
            if (session) {
                const notifs = await apiService.getNotifications(session.userId, false);
                setNotifications(notifs);
            }
        }
        catch (error) {
            console.error('Error loading notifications:', error);
        }
    };
    const handleOpenSettlement = (sale) => {
        const existingSettlement = settlements.find(s => s.receptionistSaleId === sale.id);
        // Check if settlement is fully settled (locked)
        if (existingSettlement && existingSettlement.isSettled) {
            alert('This sale has been fully settled and is locked from further edits.');
            return;
        }
        // Clear the input for new incremental payment
        setSettlementAmount('');
        setSelectedSale(sale);
        setSettlementDialogOpen(true);
    };
    const handleSaveSettlement = async () => {
        if (!selectedSale)
            return;
        const session = authService.getCurrentSession();
        if (!session) {
            alert('Session expired. Please login again.');
            navigate('/login');
            return;
        }
        const paymentAmount = parseFloat(settlementAmount) || 0;
        if (paymentAmount <= 0) {
            alert('Please enter a valid payment amount');
            return;
        }
        // Use expectedAmount from sale (calculated and stored in backend)
        // Fallback to calculation for legacy data
        let expectedAmount = selectedSale.expectedAmount || 0;
        if (expectedAmount === 0) {
            if (selectedSale.priceBreakdown && selectedSale.priceBreakdown.length > 0) {
                expectedAmount = selectedSale.priceBreakdown.reduce((sum, item) => sum + (item.bags * item.amount), 0);
            }
            else {
                expectedAmount = (selectedSale.bagsAtPrice1 * settings.salesPrice1) +
                    (selectedSale.bagsAtPrice2 * settings.salesPrice2);
            }
        }
        try {
            const existingSettlement = settlements.find(s => s.receptionistSaleId === selectedSale.id);
            // Use existing settlement's expectedAmount if it exists (should never change)
            // Otherwise use the calculated expectedAmount from the sale
            const finalExpectedAmount = existingSettlement?.expectedAmount || expectedAmount;
            let newSettledAmount;
            if (existingSettlement) {
                // Add this payment to existing settled amount (INCREMENTAL)
                newSettledAmount = existingSettlement.settledAmount + paymentAmount;
            }
            else {
                // First payment
                newSettledAmount = paymentAmount;
            }
            const newRemainingBalance = finalExpectedAmount - newSettledAmount;
            const isSettled = newRemainingBalance <= 0;
            // Prevent overpayment
            if (newRemainingBalance < 0) {
                alert(`Payment exceeds remaining balance. Remaining balance: ₦${(finalExpectedAmount - (existingSettlement?.settledAmount || 0)).toLocaleString()}`);
                return;
            }
            let settlementId;
            if (existingSettlement) {
                await apiService.updateSettlement(existingSettlement.id, {
                    settledAmount: newSettledAmount,
                    remainingBalance: newRemainingBalance,
                    isSettled: isSettled,
                    settledAt: isSettled ? new Date() : undefined,
                });
                settlementId = existingSettlement.id;
            }
            else {
                const newSettlement = await apiService.createSettlement({
                    date: selectedSale.date,
                    receptionistSaleId: selectedSale.id,
                    expectedAmount: finalExpectedAmount,
                    settledAmount: newSettledAmount,
                    remainingBalance: newRemainingBalance,
                    isSettled: isSettled,
                    settledBy: session.userId,
                    settledAt: isSettled ? new Date() : undefined,
                });
                settlementId = newSettlement.id;
            }
            // Record this individual payment
            await apiService.createSettlementPayment({
                settlementId: settlementId,
                amount: paymentAmount,
                paidBy: session.userId,
                paidAt: new Date().toISOString(),
                notes: `Payment of ₦${paymentAmount.toLocaleString()}`,
            });
            // Create notification for receptionist
            // Note: Notifications API not yet implemented, skipping for now
            // TODO: Implement notifications backend when ready
            setSettlementDialogOpen(false);
            setSelectedSale(null);
            setSettlementAmount('');
            await loadData();
            await loadNotifications();
            if (isSettled) {
                alert('Settlement completed! This sale is now fully settled and locked.');
            }
            else {
                alert(`Payment recorded! Remaining balance: ₦${newRemainingBalance.toLocaleString()}`);
            }
        }
        catch (error) {
            console.error('Error saving settlement:', error);
            alert('Error saving settlement. Please try again.');
        }
    };
    const handleOpenUpdate = (item, type) => {
        // Check if receptionist sale has any settlement - if yes, block updates
        if (type === 'sale') {
            const settlement = settlements.find(s => s.receptionistSaleId === item.id);
            if (settlement) {
                alert('Cannot update entry after settlement has started. Settlement must be deleted first.');
                return;
            }
        }
        // Check if storekeeper entry was already updated once
        if (type === 'entry') {
            // TODO: Add update tracking in backend to check if entry was already updated
            // For now, we'll allow one update per session
            // For storekeeper entries, automatically set the field to 'bagsCount' and show current value
            setUpdateField('bagsCount');
            setUpdateValue(''); // Start with empty, user will enter new value
        }
        else {
            // For receptionist sales, user will select the field
            setUpdateField('');
            setUpdateValue('');
        }
        setUpdateItem(item);
        setUpdateType(type);
        setUpdateReason('');
        setUpdateDialogOpen(true);
    };
    const handleSaveUpdate = async () => {
        if (!updateItem || !updateValue || !updateReason) {
            alert('Please fill all fields');
            return;
        }
        // For storekeeper entries, updateField is automatically 'bagsCount'
        const fieldToUpdate = updateType === 'entry' ? 'bagsCount' : updateField;
        if (!fieldToUpdate) {
            alert('Please select a field to update');
            return;
        }
        const session = authService.getCurrentSession();
        if (!session) {
            alert('Session expired. Please login again.');
            navigate('/login');
            return;
        }
        try {
            // Get old value - handle price breakdown items
            let oldValue;
            if (fieldToUpdate.startsWith('price_')) {
                const priceId = parseInt(fieldToUpdate.replace('price_', ''));
                const sale = updateItem;
                const priceItem = sale.priceBreakdown?.find(p => p.priceId === priceId);
                oldValue = priceItem?.bags || 0;
            }
            else {
                oldValue = updateItem[fieldToUpdate];
            }
            const newValue = fieldToUpdate.includes('bags') || fieldToUpdate === 'bagsCount' || fieldToUpdate.startsWith('price_')
                ? parseInt(updateValue)
                : updateValue;
            // Create audit log
            await AuditService.logUpdate(updateType === 'sale' ? 'receptionist_sale' : 'storekeeper_entry', updateItem.id, fieldToUpdate, oldValue, newValue, updateReason);
            // Update the item
            if (updateType === 'sale') {
                const sale = updateItem;
                let updatedSale = { ...sale };
                // Check if updating a price breakdown item
                if (fieldToUpdate.startsWith('price_')) {
                    const priceId = parseInt(fieldToUpdate.replace('price_', ''));
                    const price = bagPrices.find(p => p.id === priceId);
                    if (!price) {
                        alert('Price not found. Please try again.');
                        return;
                    }
                    // Get or create priceBreakdown array
                    let priceBreakdown = sale.priceBreakdown ? [...sale.priceBreakdown] : [];
                    // Find existing price item or create new one
                    const existingIndex = priceBreakdown.findIndex(p => p.priceId === priceId);
                    const bagsValue = parseInt(updateValue);
                    if (existingIndex >= 0) {
                        // Update existing price item
                        if (bagsValue > 0) {
                            priceBreakdown[existingIndex] = {
                                ...priceBreakdown[existingIndex],
                                bags: bagsValue,
                                amount: price.amount,
                                label: price.label
                            };
                        }
                        else {
                            // Remove if bags is 0
                            priceBreakdown.splice(existingIndex, 1);
                        }
                    }
                    else if (bagsValue > 0) {
                        // Add new price item
                        priceBreakdown.push({
                            priceId: price.id,
                            amount: price.amount,
                            bags: bagsValue,
                            label: price.label
                        });
                    }
                    // Recalculate totalBags and expectedAmount
                    updatedSale.priceBreakdown = priceBreakdown;
                    updatedSale.totalBags = priceBreakdown.reduce((sum, item) => sum + item.bags, 0);
                    updatedSale.expectedAmount = priceBreakdown.reduce((sum, item) => sum + (item.bags * item.amount), 0);
                }
                else {
                    // Legacy field update (for backward compatibility)
                    updatedSale[fieldToUpdate] = newValue;
                    if (fieldToUpdate === 'bagsAtPrice1' || fieldToUpdate === 'bagsAtPrice2') {
                        updatedSale.totalBags = (updatedSale.bagsAtPrice1 || 0) + (updatedSale.bagsAtPrice2 || 0);
                    }
                }
                await apiService.updateReceptionistSale(sale.id, updatedSale);
            }
            else {
                await apiService.updateStorekeeperEntry(updateItem.id, { [fieldToUpdate]: newValue });
            }
            setUpdateDialogOpen(false);
            await loadData();
            alert('Update saved successfully');
        }
        catch (error) {
            console.error('Error updating:', error);
            alert('Error updating. Please try again.');
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
        // Driver filter
        if (filterDriver !== 'all' && sale.driverName !== filterDriver) {
            return false;
        }
        // Sale type filter
        if (filterSaleType !== 'all' && sale.saleType !== filterSaleType) {
            return false;
        }
        // Search filter
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
        // Entry type filter
        if (filterEntryType !== 'all' && entry.entryType !== filterEntryType) {
            return false;
        }
        // Driver/Packer filter
        if (filterDriver !== 'all') {
            if (entry.entryType === 'driver_pickup' && entry.driverName !== filterDriver) {
                return false;
            }
            if (entry.entryType === 'packer_production' && entry.packerName !== filterDriver) {
                return false;
            }
        }
        // Search filter
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
    // Apply filters to settlements
    const filteredSettlements = settlements.filter(settlement => {
        // Settlement status filter
        if (filterSettlementStatus !== 'all') {
            if (filterSettlementStatus === 'settled' && !settlement.isSettled) {
                return false;
            }
            if (filterSettlementStatus === 'pending' && settlement.isSettled) {
                return false;
            }
        }
        // Search filter
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            const sale = sales.find(s => s.id === settlement.receptionistSaleId);
            return (settlement.expectedAmount.toString().includes(search) ||
                settlement.settledAmount.toString().includes(search) ||
                settlement.remainingBalance.toString().includes(search) ||
                (sale && sale.driverName && sale.driverName.toLowerCase().includes(search)));
        }
        return true;
    });
    return (_jsxs(Box, { sx: {
            p: { xs: 1, sm: 2, md: 3 },
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            minHeight: '100vh'
        }, children: [_jsx(Paper, { elevation: 3, sx: {
                    p: { xs: 2, sm: 3 },
                    mb: 3,
                    background: 'linear-gradient(135deg, #3f7a6a 0%, #2d5a4f 100%)',
                    color: 'white',
                    borderRadius: 3
                }, children: _jsxs(Box, { sx: {
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: { xs: 2, sm: 0 }
                    }, children: [_jsx(Typography, { variant: "h4", sx: {
                                fontSize: { xs: '1.5rem', sm: '2rem' },
                                fontWeight: 700,
                                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }, children: "Manager Dashboard" }), _jsxs(Box, { sx: { display: 'flex', gap: { xs: 1, sm: 2 }, alignItems: 'center', width: { xs: '100%', sm: 'auto' } }, children: [notifications.length > 0 && (_jsx(Chip, { icon: _jsx(NotificationsIcon, {}), label: notifications.length, color: "error", size: "small" })), _jsxs(Box, { sx: { display: 'flex', gap: 1, alignItems: 'center' }, children: [currentUser && !currentUser.twoFactorEnabled && (_jsx(Tooltip, { title: "Enable 2FA", children: _jsx(IconButton, { onClick: () => {
                                                    setTwoFactorSetupOpen(true);
                                                }, sx: {
                                                    color: 'white',
                                                    bgcolor: 'rgba(255,255,255,0.2)',
                                                    '&:hover': {
                                                        bgcolor: 'rgba(255,255,255,0.3)',
                                                    }
                                                }, children: _jsx(SecurityIcon, {}) }) })), currentUser && currentUser.twoFactorEnabled && (_jsx(Tooltip, { title: "2FA Enabled", children: _jsx("span", { children: _jsx(IconButton, { disabled: true, sx: {
                                                        color: 'white',
                                                        bgcolor: 'rgba(76, 175, 80, 0.3)',
                                                        cursor: 'not-allowed'
                                                    }, children: _jsx(VerifiedUserIcon, {}) }) }) })), _jsxs(Button, { variant: "contained", startIcon: _jsx(LogoutIcon, {}), onClick: handleLogout, fullWidth: false, size: window.innerWidth < 600 ? 'small' : 'medium', sx: {
                                                bgcolor: 'rgba(255,255,255,0.2)',
                                                color: 'white',
                                                '&:hover': {
                                                    bgcolor: 'rgba(255,255,255,0.3)',
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                                },
                                                transition: 'all 0.3s ease'
                                            }, children: [_jsx(Box, { component: "span", sx: { display: { xs: 'none', sm: 'inline' } }, children: "Logout" }), _jsx(Box, { component: "span", sx: { display: { xs: 'inline', sm: 'none' } }, children: "Out" })] })] })] })] }) }), _jsx(Paper, { elevation: 2, sx: {
                    p: { xs: 1.5, sm: 2 },
                    mb: { xs: 2, sm: 3 },
                    borderRadius: 2,
                    bgcolor: 'background.paper'
                }, children: _jsxs(Stack, { spacing: 2, children: [_jsx(Box, { sx: {
                                display: 'flex',
                                flexDirection: { xs: 'column', sm: 'row' },
                                alignItems: { xs: 'stretch', sm: 'center' },
                                gap: { xs: 2, sm: 2 }
                            }, children: _jsxs(ToggleButtonGroup, { value: viewMode, exclusive: true, onChange: (_, newMode) => {
                                    if (newMode)
                                        setViewMode(newMode);
                                }, size: "small", children: [_jsx(ToggleButton, { value: "month", children: "Month" }), _jsx(ToggleButton, { value: "day", children: "Day" }), _jsx(ToggleButton, { value: "range", children: "Range" })] }) }), viewMode === 'month' && (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Button, { onClick: () => setSelectedMonth(subMonths(selectedMonth, 1)), children: "Previous Month" }), _jsx(TextField, { type: "month", value: format(selectedMonth, 'yyyy-MM'), onChange: (e) => {
                                        const [year, month] = e.target.value.split('-').map(Number);
                                        setSelectedMonth(new Date(year, month - 1, 1));
                                    }, InputLabelProps: { shrink: true } }), _jsx(Button, { onClick: () => setSelectedMonth(new Date()), children: "Current Month" })] })), viewMode === 'day' && (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(IconButton, { onClick: () => setSelectedDate(subDays(selectedDate, 1)), children: _jsx(ChevronLeft, {}) }), _jsx(TextField, { type: "date", value: format(selectedDate, 'yyyy-MM-dd'), onChange: (e) => {
                                        const date = new Date(e.target.value);
                                        setSelectedDate(date);
                                    }, InputLabelProps: { shrink: true } }), _jsx(IconButton, { onClick: () => setSelectedDate(addDays(selectedDate, 1)), children: _jsx(ChevronRight, {}) }), _jsx(Button, { onClick: () => setSelectedDate(new Date()), children: "Today" })] })), viewMode === 'range' && (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(TextField, { label: "Start Date", type: "date", value: format(dateRange.start, 'yyyy-MM-dd'), onChange: (e) => {
                                        setDateRange({ ...dateRange, start: new Date(e.target.value) });
                                    }, InputLabelProps: { shrink: true } }), _jsx(TextField, { label: "End Date", type: "date", value: format(dateRange.end, 'yyyy-MM-dd'), onChange: (e) => {
                                        setDateRange({ ...dateRange, end: new Date(e.target.value) });
                                    }, InputLabelProps: { shrink: true } })] }))] }) }), _jsx(Paper, { elevation: 2, sx: {
                    p: 2,
                    mb: 3,
                    borderRadius: 2,
                    bgcolor: 'background.paper'
                }, children: _jsxs(Stack, { spacing: 2, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(FilterIcon, {}), _jsx(Typography, { variant: "h6", children: "Filters" })] }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(TextField, { fullWidth: true, label: "Search", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), InputProps: {
                                            startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(SearchIcon, {}) })),
                                        }, placeholder: "Search by name, type, amount..." }) }), tabValue === 0 && (_jsxs(_Fragment, { children: [_jsx(Grid, { item: true, xs: 12, md: 3, children: _jsxs(TextField, { fullWidth: true, label: "Driver", select: true, value: filterDriver, onChange: (e) => setFilterDriver(e.target.value), children: [_jsx(MenuItem, { value: "all", children: "All Drivers" }), employees.map((emp) => (_jsx(MenuItem, { value: emp.name, children: emp.name }, emp.id)))] }) }), _jsx(Grid, { item: true, xs: 12, md: 3, children: _jsxs(TextField, { fullWidth: true, label: "Sale Type", select: true, value: filterSaleType, onChange: (e) => setFilterSaleType(e.target.value), children: [_jsx(MenuItem, { value: "all", children: "All Types" }), _jsx(MenuItem, { value: "driver", children: "Driver Sale" }), _jsx(MenuItem, { value: "general", children: "General Sales" }), _jsx(MenuItem, { value: "mini_store", children: "Mini Store" })] }) })] })), tabValue === 1 && (_jsxs(_Fragment, { children: [_jsx(Grid, { item: true, xs: 12, md: 3, children: _jsxs(TextField, { fullWidth: true, label: "Entry Type", select: true, value: filterEntryType, onChange: (e) => setFilterEntryType(e.target.value), children: [_jsx(MenuItem, { value: "all", children: "All Types" }), _jsx(MenuItem, { value: "driver_pickup", children: "Driver Pickup" }), _jsx(MenuItem, { value: "general_sales", children: "General Sales" }), _jsx(MenuItem, { value: "ministore_pickup", children: "Mini Store Pickup" }), _jsx(MenuItem, { value: "packer_production", children: "Packer Production" })] }) }), _jsx(Grid, { item: true, xs: 12, md: 3, children: _jsxs(TextField, { fullWidth: true, label: "Driver/Packer", select: true, value: filterDriver, onChange: (e) => setFilterDriver(e.target.value), children: [_jsx(MenuItem, { value: "all", children: "All" }), employees.map((emp) => (_jsx(MenuItem, { value: emp.name, children: emp.name }, emp.id)))] }) })] })), tabValue === 2 && (_jsx(Grid, { item: true, xs: 12, md: 3, children: _jsxs(TextField, { fullWidth: true, label: "Settlement Status", select: true, value: filterSettlementStatus, onChange: (e) => setFilterSettlementStatus(e.target.value), children: [_jsx(MenuItem, { value: "all", children: "All" }), _jsx(MenuItem, { value: "settled", children: "Settled" }), _jsx(MenuItem, { value: "pending", children: "Pending" })] }) }))] })] }) }), _jsx(Paper, { sx: { mb: 3 }, children: _jsxs(Tabs, { value: tabValue, onChange: (_, newValue) => setTabValue(newValue), children: [_jsx(Tab, { label: "Receptionist Sales" }), _jsx(Tab, { label: "Storekeeper Entries" }), _jsx(Tab, { label: "Settlements" })] }) }), tabValue === 0 && (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }, children: [_jsxs(Typography, { variant: "h6", children: ["Sales by Driver - ", viewMode === 'month' ? format(selectedMonth, 'MMMM yyyy') :
                                        viewMode === 'day' ? format(selectedDate, 'MMM d, yyyy') :
                                            `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`] }), _jsx(Chip, { label: `${filteredSales.length} ${filteredSales.length === 1 ? 'entry' : 'entries'}`, color: "primary", variant: "outlined" })] }), _jsxs(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: [_jsx(Grid, { item: true, xs: 12, sm: 4, children: _jsx(Card, { elevation: 3, sx: {
                                        borderRadius: 2,
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: 6
                                        },
                                        background: 'linear-gradient(135deg, #3f7a6a 0%, #2d5a4f 100%)',
                                        color: 'white'
                                    }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "body2", sx: { opacity: 0.9, mb: 1 }, gutterBottom: true, children: "Total Sales" }), _jsx(Typography, { variant: "h4", sx: { fontWeight: 700 }, children: filteredSales.length })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 4, children: _jsx(Card, { elevation: 3, sx: {
                                        borderRadius: 2,
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: 6
                                        },
                                        background: 'linear-gradient(135deg, #5a9a8a 0%, #3f7a6a 100%)',
                                        color: 'white'
                                    }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "body2", sx: { opacity: 0.9, mb: 1 }, gutterBottom: true, children: "Total Bags" }), _jsx(Typography, { variant: "h4", sx: { fontWeight: 700 }, children: filteredSales.reduce((sum, s) => sum + s.totalBags, 0).toLocaleString() })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 4, children: _jsx(Card, { elevation: 3, sx: {
                                        borderRadius: 2,
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: 6
                                        },
                                        background: 'linear-gradient(135deg, #3f7a6a 0%, #5a9a8a 100%)',
                                        color: 'white'
                                    }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "body2", sx: { opacity: 0.9, mb: 1 }, gutterBottom: true, children: "Expected Amount" }), _jsx(Typography, { variant: "h4", sx: { fontWeight: 700 }, children: formatCurrency(filteredSales.reduce((sum, s) => {
                                                    // Use expectedAmount from sale, fallback to calculation for legacy data
                                                    let expected = s.expectedAmount || 0;
                                                    if (expected === 0) {
                                                        if (s.priceBreakdown && s.priceBreakdown.length > 0) {
                                                            expected = s.priceBreakdown.reduce((subSum, item) => subSum + (item.bags * item.amount), 0);
                                                        }
                                                        else {
                                                            expected = (s.bagsAtPrice1 * settings.salesPrice1) +
                                                                (s.bagsAtPrice2 * settings.salesPrice2);
                                                        }
                                                    }
                                                    return sum + expected;
                                                }, 0)) })] }) }) })] }), filteredSales.length === 0 ? (_jsx(Paper, { sx: { p: 4, textAlign: 'center' }, children: _jsx(Typography, { variant: "h6", color: "text.secondary", children: "No sales found matching the filters" }) })) : (_jsx(TableContainer, { component: Paper, sx: {
                            overflowX: 'auto',
                            '& .MuiTableCell-root': {
                                whiteSpace: { xs: 'nowrap', md: 'normal' },
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }
                        }, children: _jsxs(Table, { sx: { minWidth: 650 }, children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Date" }), _jsx(TableCell, { children: "Driver/Type" }), _jsx(TableCell, { children: "Price Breakdown" }), _jsx(TableCell, { children: "Total Bags" }), _jsx(TableCell, { children: "Expected Amount" }), _jsx(TableCell, { children: "Settlement Status" }), _jsx(TableCell, { children: "Actions" })] }) }), _jsx(TableBody, { children: filteredSales.map((sale) => {
                                        // Use expected amount from sale (calculated and stored in backend)
                                        // Fallback to frontend calculation only for legacy data
                                        let expectedAmount = sale.expectedAmount || 0;
                                        if (expectedAmount === 0) {
                                            // Fallback calculation for old sales without expectedAmount
                                            if (sale.priceBreakdown && sale.priceBreakdown.length > 0) {
                                                expectedAmount = sale.priceBreakdown.reduce((sum, item) => sum + (item.bags * item.amount), 0);
                                            }
                                            else {
                                                expectedAmount = (sale.bagsAtPrice1 * settings.salesPrice1) +
                                                    (sale.bagsAtPrice2 * settings.salesPrice2);
                                            }
                                        }
                                        const settlement = settlements.find(s => s.receptionistSaleId === sale.id);
                                        return (_jsxs(TableRow, { children: [_jsx(TableCell, { children: format(new Date(sale.date), 'MMM d, yyyy') }), _jsx(TableCell, { children: sale.saleType === 'driver' ? sale.driverName :
                                                        sale.saleType === 'general' ? 'General Sales' : 'Mini Store' }), _jsx(TableCell, { children: sale.priceBreakdown && sale.priceBreakdown.length > 0 ? (_jsx(Box, { children: sale.priceBreakdown.map((item, idx) => (_jsxs(Typography, { variant: "body2", children: [item.bags.toLocaleString(), " @ \u20A6", item.amount.toLocaleString(), item.label ? ` (${item.label})` : ''] }, idx))) })) : (_jsxs(Box, { children: [sale.bagsAtPrice1 > 0 && (_jsxs(Typography, { variant: "body2", children: [sale.bagsAtPrice1.toLocaleString(), " @ \u20A6", settings.salesPrice1] })), sale.bagsAtPrice2 > 0 && (_jsxs(Typography, { variant: "body2", children: [sale.bagsAtPrice2.toLocaleString(), " @ \u20A6", settings.salesPrice2] }))] })) }), _jsx(TableCell, { children: sale.totalBags.toLocaleString() }), _jsx(TableCell, { children: formatCurrency(expectedAmount) }), _jsx(TableCell, { children: settlement ? (settlement.isSettled ? (_jsx(Tooltip, { title: `Fully Settled - Paid: ${formatCurrency(settlement.settledAmount)}`, children: _jsx(Chip, { label: "\u2713 Settled", color: "success", size: "small" }) })) : (_jsx(Tooltip, { title: `Paid: ${formatCurrency(settlement.settledAmount)} of ${formatCurrency(expectedAmount)}`, children: _jsx(Chip, { label: `₦${settlement.remainingBalance.toLocaleString()} due`, color: "warning", size: "small" }) }))) : (_jsx(Chip, { label: "Not Settled", color: "error", size: "small" })) }), _jsx(TableCell, { children: _jsxs(Box, { sx: { display: 'flex', gap: 0.5 }, children: [settlement?.isSettled ? (_jsx(Tooltip, { title: "Settlement locked (fully settled)", children: _jsx("span", { children: _jsx(IconButton, { size: "small", disabled: true, children: _jsx(EditIcon, {}) }) }) })) : (_jsx(Tooltip, { title: settlement ? "Add Payment" : "Start Settlement", children: _jsx(IconButton, { size: "small", onClick: () => handleOpenSettlement(sale), color: "primary", children: _jsx(EditIcon, {}) }) })), settlement ? (_jsxs(_Fragment, { children: [_jsx(Tooltip, { title: "Cannot update after settlement started", children: _jsx("span", { children: _jsx(IconButton, { size: "small", disabled: true, children: _jsx(VisibilityIcon, {}) }) }) }), _jsx(Tooltip, { title: "View Settlement Details", children: _jsx(IconButton, { size: "small", onClick: async () => {
                                                                                setSelectedSale(sale);
                                                                                setSelectedSettlementHistory(settlement);
                                                                                // Load payment history for this settlement
                                                                                try {
                                                                                    const payments = await apiService.getSettlementPayments(settlement.id);
                                                                                    setSettlementPayments(payments);
                                                                                }
                                                                                catch (error) {
                                                                                    console.error('Error loading payment history:', error);
                                                                                    setSettlementPayments([]);
                                                                                }
                                                                                setSettlementHistoryDialogOpen(true);
                                                                            }, color: "info", children: _jsx(VisibilityIcon, {}) }) })] })) : (_jsx(Tooltip, { title: "Update Entry (Bags)", children: _jsx(IconButton, { size: "small", onClick: () => handleOpenUpdate(sale, 'sale'), color: "secondary", children: _jsx(EditIcon, {}) }) }))] }) })] }, sale.id));
                                    }) })] }) }))] })), tabValue === 1 && (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }, children: [_jsxs(Typography, { variant: "h6", children: ["Storekeeper Entries - ", viewMode === 'month' ? format(selectedMonth, 'MMMM yyyy') :
                                        viewMode === 'day' ? format(selectedDate, 'MMM d, yyyy') :
                                            `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`] }), _jsx(Chip, { label: `${filteredEntries.length} ${filteredEntries.length === 1 ? 'entry' : 'entries'}`, color: "primary", variant: "outlined" })] }), _jsxs(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(Card, { elevation: 3, sx: {
                                        borderRadius: 2,
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: 6
                                        },
                                        background: 'linear-gradient(135deg, #3f7a6a 0%, #2d5a4f 100%)',
                                        color: 'white'
                                    }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "body2", sx: { opacity: 0.9, mb: 1 }, gutterBottom: true, children: "Total Entries" }), _jsx(Typography, { variant: "h4", sx: { fontWeight: 700 }, children: filteredEntries.length })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(Card, { elevation: 3, sx: {
                                        borderRadius: 2,
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: 6
                                        },
                                        background: 'linear-gradient(135deg, #5a9a8a 0%, #3f7a6a 100%)',
                                        color: 'white'
                                    }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "body2", sx: { opacity: 0.9, mb: 1 }, gutterBottom: true, children: "Total Bags" }), _jsx(Typography, { variant: "h4", sx: { fontWeight: 700 }, children: filteredEntries.reduce((sum, e) => sum + e.bagsCount, 0).toLocaleString() })] }) }) })] }), filteredEntries.length === 0 ? (_jsx(Paper, { sx: { p: 4, textAlign: 'center' }, children: _jsx(Typography, { variant: "h6", color: "text.secondary", children: "No entries found matching the filters" }) })) : (_jsx(TableContainer, { component: Paper, sx: {
                            overflowX: 'auto',
                            '& .MuiTableCell-root': {
                                whiteSpace: { xs: 'nowrap', md: 'normal' },
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }
                        }, children: _jsxs(Table, { sx: { minWidth: 650 }, children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Date" }), _jsx(TableCell, { children: "Type" }), _jsx(TableCell, { children: "Driver/Packer" }), _jsx(TableCell, { children: "Bags" }), _jsx(TableCell, { children: "Actions" })] }) }), _jsx(TableBody, { children: filteredEntries.map((entry) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: format(new Date(entry.date), 'MMM d, yyyy') }), _jsx(TableCell, { children: entry.entryType === 'driver_pickup' ? 'Driver Pickup' :
                                                    entry.entryType === 'general_sales' ? 'General Sales' :
                                                        entry.entryType === 'ministore_pickup' ? 'Mini Store Pickup' : 'Packer Production' }), _jsx(TableCell, { children: entry.driverName || entry.packerName || 'N/A' }), _jsx(TableCell, { children: entry.bagsCount.toLocaleString() }), _jsx(TableCell, { children: _jsx(Tooltip, { title: "Update Entry", children: _jsx(IconButton, { size: "small", onClick: () => handleOpenUpdate(entry, 'entry'), children: _jsx(EditIcon, {}) }) }) })] }, entry.id))) })] }) }))] })), tabValue === 2 && (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }, children: [_jsxs(Typography, { variant: "h6", children: ["Settlements - ", viewMode === 'month' ? format(selectedMonth, 'MMMM yyyy') :
                                        viewMode === 'day' ? format(selectedDate, 'MMM d, yyyy') :
                                            `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`] }), _jsx(Chip, { label: `${filteredSettlements.length} ${filteredSettlements.length === 1 ? 'settlement' : 'settlements'}`, color: "primary", variant: "outlined" })] }), _jsxs(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: [_jsx(Grid, { item: true, xs: 12, sm: 4, children: _jsx(Card, { elevation: 3, sx: {
                                        borderRadius: 2,
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: 6
                                        },
                                        background: 'linear-gradient(135deg, #3f7a6a 0%, #2d5a4f 100%)',
                                        color: 'white'
                                    }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "body2", sx: { opacity: 0.9, mb: 1 }, gutterBottom: true, children: "Total Settlements" }), _jsx(Typography, { variant: "h4", sx: { fontWeight: 700 }, children: filteredSettlements.length })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 4, children: _jsx(Card, { elevation: 3, sx: {
                                        borderRadius: 2,
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: 6
                                        },
                                        background: 'linear-gradient(135deg, #3f7a6a 0%, #5a9a8a 100%)',
                                        color: 'white'
                                    }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "body2", sx: { opacity: 0.9, mb: 1 }, gutterBottom: true, children: "Total Settled" }), _jsx(Typography, { variant: "h4", sx: { fontWeight: 700 }, children: formatCurrency(filteredSettlements.reduce((sum, s) => sum + s.settledAmount, 0)) })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 4, children: _jsx(Card, { elevation: 3, sx: {
                                        borderRadius: 2,
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: 6
                                        },
                                        background: filteredSettlements.reduce((sum, s) => sum + s.remainingBalance, 0) > 0
                                            ? 'linear-gradient(135deg, #5a9a8a 0%, #3f7a6a 100%)'
                                            : 'linear-gradient(135deg, #3f7a6a 0%, #5a9a8a 100%)',
                                        color: 'white'
                                    }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "body2", sx: { opacity: 0.9, mb: 1 }, gutterBottom: true, children: "Remaining Balance" }), _jsx(Typography, { variant: "h4", sx: { fontWeight: 700 }, children: formatCurrency(filteredSettlements.reduce((sum, s) => sum + s.remainingBalance, 0)) })] }) }) })] }), filteredSettlements.length === 0 ? (_jsx(Paper, { sx: { p: 4, textAlign: 'center' }, children: _jsx(Typography, { variant: "h6", color: "text.secondary", children: "No settlements found matching the filters" }) })) : (_jsx(Grid, { container: true, spacing: 2, children: filteredSettlements.map((settlement) => {
                            const sale = sales.find(s => s.id === settlement.receptionistSaleId);
                            // Get transaction type label
                            const getTransactionTypeLabel = (type) => {
                                switch (type) {
                                    case 'driver': return 'Driver Sale';
                                    case 'general': return 'General Sales';
                                    case 'mini_store': return 'Mini Store Dispatch';
                                    default: return type;
                                }
                            };
                            return (_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(Card, { elevation: 2, sx: {
                                        borderRadius: 2,
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: 4
                                        },
                                        height: '100%'
                                    }, children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'start' }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", children: sale ? format(new Date(sale.date), 'MMM d, yyyy') : 'Unknown Date' }), sale && (_jsxs(_Fragment, { children: [_jsxs(Typography, { variant: "body2", color: "text.secondary", sx: { mt: 0.5 }, children: [_jsx("strong", { children: "Type:" }), " ", getTransactionTypeLabel(sale.saleType)] }), sale.saleType === 'driver' && sale.driverName && (_jsxs(Typography, { variant: "body2", color: "text.secondary", children: [_jsx("strong", { children: "Driver:" }), " ", sale.driverName] })), sale.saleType === 'mini_store' && (_jsx(Typography, { variant: "body2", color: "primary.main", children: _jsx("strong", { children: "Mini Store" }) }))] }))] }), settlement.isSettled ? (_jsx(Chip, { label: "Settled", color: "success", size: "small" })) : (_jsx(Chip, { label: "Pending", color: "warning", size: "small" }))] }), _jsxs(Box, { sx: { mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }, children: [sale && (_jsxs(Typography, { variant: "body2", sx: { mb: 1 }, children: [_jsx("strong", { children: "Total Bags:" }), " ", sale.totalBags.toLocaleString()] })), _jsxs(Typography, { variant: "body2", sx: { mb: 1 }, children: [_jsx("strong", { children: "Expected:" }), " ", formatCurrency(settlement.expectedAmount)] }), _jsxs(Typography, { variant: "body2", sx: { mb: 1 }, children: [_jsx("strong", { children: "Settled:" }), " ", formatCurrency(settlement.settledAmount)] }), _jsxs(Typography, { variant: "body2", color: settlement.remainingBalance > 0 ? 'error.main' : 'success.main', sx: { fontWeight: 'bold' }, children: [_jsx("strong", { children: "Balance:" }), " ", formatCurrency(settlement.remainingBalance)] })] }), sale && sale.priceBreakdown && sale.priceBreakdown.length > 0 && (_jsxs(Box, { sx: { mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 1 }, children: _jsx("strong", { children: "Price Breakdown:" }) }), sale.priceBreakdown.map((item, idx) => (_jsxs(Typography, { variant: "body2", sx: { ml: 2 }, children: [item.bags.toLocaleString(), " bags @ \u20A6", item.amount.toLocaleString(), item.label ? ` (${item.label})` : ''] }, idx)))] }))] }) }) }, settlement.id));
                        }) }))] })), _jsxs(Dialog, { open: settlementDialogOpen, onClose: () => setSettlementDialogOpen(false), maxWidth: "sm", fullWidth: true, fullScreen: window.innerWidth < 600, PaperProps: {
                    sx: {
                        m: { xs: 0, sm: 2 },
                        height: { xs: '100%', sm: 'auto' }
                    }
                }, children: [_jsx(DialogTitle, { children: "Add Settlement Payment" }), _jsx(DialogContent, { children: selectedSale && (() => {
                            // Use expectedAmount from sale (calculated and stored in backend)
                            // Fallback to calculation for legacy data
                            let expectedAmount = selectedSale.expectedAmount || 0;
                            if (expectedAmount === 0) {
                                if (selectedSale.priceBreakdown && selectedSale.priceBreakdown.length > 0) {
                                    expectedAmount = selectedSale.priceBreakdown.reduce((sum, item) => sum + (item.bags * item.amount), 0);
                                }
                                else {
                                    expectedAmount = (selectedSale.bagsAtPrice1 * settings.salesPrice1) +
                                        (selectedSale.bagsAtPrice2 * settings.salesPrice2);
                                }
                            }
                            const existingSettlement = settlements.find(s => s.receptionistSaleId === selectedSale.id);
                            const alreadyPaid = existingSettlement?.settledAmount || 0;
                            const remainingBalance = expectedAmount - alreadyPaid;
                            return (_jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }, children: [_jsx(Alert, { severity: "info", children: "Enter the amount being paid now. This will be added to any previous payments." }), _jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "Sale Date:" }), " ", format(new Date(selectedSale.date), 'MMM d, yyyy')] }), _jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "Total Bags:" }), " ", selectedSale.totalBags.toLocaleString()] }), selectedSale.priceBreakdown && selectedSale.priceBreakdown.length > 0 && (_jsxs(Box, { sx: { bgcolor: 'background.paper', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }, children: [_jsx(Typography, { variant: "body2", sx: { mb: 1, fontWeight: 'bold' }, children: "Price Breakdown:" }), selectedSale.priceBreakdown.map((item, idx) => (_jsxs(Typography, { variant: "body2", sx: { ml: 2, mb: 0.5 }, children: ["\u2022 ", item.bags.toLocaleString(), " bags @ \u20A6", item.amount.toLocaleString(), item.label ? ` (${item.label})` : '', _jsxs("span", { style: { marginLeft: '8px', color: '#666' }, children: ["= \u20A6", (item.bags * item.amount).toLocaleString()] })] }, idx)))] })), _jsxs(Box, { sx: { bgcolor: 'background.paper', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }, children: [_jsxs(Typography, { variant: "h6", color: "primary", children: ["Total Expected: ", formatCurrency(expectedAmount)] }), alreadyPaid > 0 && (_jsxs(_Fragment, { children: [_jsxs(Typography, { variant: "body2", color: "success.main", sx: { mt: 1 }, children: ["Already Paid: ", formatCurrency(alreadyPaid)] }), _jsx(Typography, { variant: "body2", color: "warning.main", sx: { mt: 0.5 }, children: _jsxs("strong", { children: ["Remaining Balance: ", formatCurrency(remainingBalance)] }) })] }))] }), _jsx(TextField, { label: "Payment Amount (\u20A6)", fullWidth: true, type: "number", value: settlementAmount, onChange: (e) => setSettlementAmount(e.target.value), required: true, helperText: `Enter the amount being paid now (Max: ₦${remainingBalance.toLocaleString()})`, InputProps: {
                                            startAdornment: _jsx(Typography, { sx: { mr: 1 }, children: "\u20A6" }),
                                        } })] }));
                        })() }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setSettlementDialogOpen(false), children: "Cancel" }), _jsx(Button, { onClick: handleSaveSettlement, variant: "contained", children: "Save Settlement" })] })] }), _jsxs(Dialog, { open: updateDialogOpen, onClose: () => setUpdateDialogOpen(false), maxWidth: "sm", fullWidth: true, fullScreen: window.innerWidth < 600, PaperProps: {
                    sx: {
                        m: { xs: 0, sm: 2 },
                        height: { xs: '100%', sm: 'auto' }
                    }
                }, children: [_jsx(DialogTitle, { children: updateType === 'sale' ? 'Update Receptionist Sale' : 'Update Storekeeper Entry' }), _jsx(DialogContent, { children: _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }, children: [_jsx(Alert, { severity: "info", children: updateType === 'sale'
                                        ? 'Update the number of bags sold. This can only be done BEFORE any settlement payment.'
                                        : 'Update the bags count for this storekeeper entry. This action will be recorded in the audit log.' }), updateType === 'sale' ? (
                                // For receptionist sales, show dropdown to select which field
                                _jsxs(_Fragment, { children: [updateItem && updateItem.priceBreakdown && updateItem.priceBreakdown.length > 0 && (_jsxs(Box, { sx: { bgcolor: 'background.paper', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider', mb: 2 }, children: [_jsx(Typography, { variant: "body2", sx: { mb: 1, fontWeight: 'bold' }, children: "Current Price Breakdown:" }), updateItem.priceBreakdown.map((item, idx) => (_jsxs(Typography, { variant: "body2", sx: { ml: 2, mb: 0.5 }, children: ["\u2022 ", item.bags.toLocaleString(), " bags @ \u20A6", item.amount.toLocaleString(), item.label ? ` (${item.label})` : '', _jsxs("span", { style: { marginLeft: '8px', color: '#666' }, children: ["= \u20A6", (item.bags * item.amount).toLocaleString()] })] }, idx))), _jsxs(Typography, { variant: "body2", sx: { mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider', fontWeight: 'bold' }, children: ["Total: \u20A6", updateItem.expectedAmount?.toLocaleString() ||
                                                            updateItem.priceBreakdown.reduce((sum, item) => sum + (item.bags * item.amount), 0).toLocaleString()] })] })), _jsx(TextField, { label: "Field to Update", fullWidth: true, select: true, value: updateField, onChange: (e) => {
                                                setUpdateField(e.target.value);
                                                // Set initial value for the field
                                                if (updateItem) {
                                                    if (e.target.value.startsWith('price_')) {
                                                        const priceId = parseInt(e.target.value.replace('price_', ''));
                                                        const sale = updateItem;
                                                        const priceItem = sale.priceBreakdown?.find(p => p.priceId === priceId);
                                                        setUpdateValue(priceItem ? String(priceItem.bags) : '0');
                                                    }
                                                    else {
                                                        const currentVal = updateItem[e.target.value];
                                                        setUpdateValue(currentVal !== undefined ? String(currentVal) : '');
                                                    }
                                                }
                                            }, required: true, helperText: "Select which field you want to update", children: bagPrices.map((price) => (_jsxs(MenuItem, { value: `price_${price.id}`, children: ["Bags at \u20A6", price.amount.toLocaleString(), " ", price.label ? `(${price.label})` : ''] }, price.id))) }), _jsx(TextField, { label: "New Value", fullWidth: true, type: "number", value: updateValue, onChange: (e) => setUpdateValue(e.target.value), required: true, placeholder: "Enter number of bags", helperText: updateField ? (() => {
                                                if (updateField.startsWith('price_')) {
                                                    const priceId = parseInt(updateField.replace('price_', ''));
                                                    const sale = updateItem;
                                                    const priceItem = sale.priceBreakdown?.find(p => p.priceId === priceId);
                                                    return `Current value: ${priceItem?.bags || 0} bags`;
                                                }
                                                return `Current value: ${updateItem?.[updateField] || 'N/A'}`;
                                            })() : 'Select a field first', disabled: !updateField })] })) : (
                                // For storekeeper entries, directly show bags count field (no dropdown)
                                _jsxs(_Fragment, { children: [_jsx(TextField, { label: "Current Bags Count", fullWidth: true, type: "number", value: updateItem?.bagsCount || 0, disabled: true, helperText: "Current value" }), _jsx(TextField, { label: "New Bags Count", fullWidth: true, type: "number", value: updateValue, onChange: (e) => setUpdateValue(e.target.value), required: true, placeholder: "Enter new number of bags", inputProps: { min: 0, step: 1 }, autoFocus: true })] })), _jsx(TextField, { label: "Reason for Update", fullWidth: true, multiline: true, rows: 3, value: updateReason, onChange: (e) => setUpdateReason(e.target.value), required: true, helperText: "This will be recorded in the audit log" })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setUpdateDialogOpen(false), children: "Cancel" }), _jsx(Button, { onClick: handleSaveUpdate, variant: "contained", children: "Save Update" })] })] }), _jsxs(Dialog, { open: settlementHistoryDialogOpen, onClose: () => setSettlementHistoryDialogOpen(false), maxWidth: "md", fullWidth: true, fullScreen: window.innerWidth < 960, PaperProps: {
                    sx: {
                        m: { xs: 0, sm: 2 },
                        height: { xs: '100%', sm: 'auto' }
                    }
                }, children: [_jsx(DialogTitle, { children: "Settlement Details" }), _jsx(DialogContent, { children: selectedSettlementHistory && selectedSale && (_jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }, children: [_jsxs(Alert, { severity: "info", children: ["This settlement has been ", selectedSettlementHistory.isSettled ? 'fully settled' : 'partially settled', "."] }), _jsx(Typography, { variant: "h6", sx: { mt: 2 }, children: "Sale Information" }), _jsxs(Box, { sx: { bgcolor: 'background.paper', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }, children: [_jsxs(Typography, { variant: "body2", sx: { mb: 1 }, children: [_jsx("strong", { children: "Date:" }), " ", format(new Date(selectedSale.date), 'MMM d, yyyy')] }), _jsxs(Typography, { variant: "body2", sx: { mb: 1 }, children: [_jsx("strong", { children: "Transaction Type:" }), " ", selectedSale.saleType === 'driver' ? 'Driver Sale' :
                                                    selectedSale.saleType === 'general' ? 'General Sales' :
                                                        selectedSale.saleType === 'mini_store' ? 'Mini Store Dispatch' :
                                                            selectedSale.saleType] }), selectedSale.saleType === 'driver' && selectedSale.driverName && (_jsxs(Typography, { variant: "body2", sx: { mb: 1 }, children: [_jsx("strong", { children: "Driver:" }), " ", selectedSale.driverName] })), selectedSale.saleType === 'mini_store' && (_jsx(Typography, { variant: "body2", color: "primary.main", sx: { mb: 1 }, children: _jsx("strong", { children: "Mini Store Transaction" }) })), _jsxs(Typography, { variant: "body2", sx: { mb: 1 }, children: [_jsx("strong", { children: "Total Bags:" }), " ", selectedSale.totalBags.toLocaleString()] }), selectedSale.priceBreakdown && selectedSale.priceBreakdown.length > 0 && (_jsxs(Box, { sx: { mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }, children: [_jsx(Typography, { variant: "body2", sx: { mb: 1, fontWeight: 'bold' }, children: "Price Breakdown:" }), selectedSale.priceBreakdown.map((item, idx) => (_jsxs(Typography, { variant: "body2", sx: { ml: 2, mb: 0.5 }, children: ["\u2022 ", item.bags.toLocaleString(), " bags @ \u20A6", item.amount.toLocaleString(), item.label ? ` (${item.label})` : ''] }, idx)))] }))] }), _jsx(Typography, { variant: "h6", sx: { mt: 2 }, children: "Settlement Summary" }), _jsxs(Box, { sx: { bgcolor: 'background.paper', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }, children: [_jsxs(Typography, { variant: "body1", color: "primary", sx: { mb: 1 }, children: [_jsx("strong", { children: "Total Expected:" }), " ", formatCurrency(selectedSettlementHistory.expectedAmount)] }), _jsxs(Typography, { variant: "body1", color: "success.main", sx: { mb: 1 }, children: [_jsx("strong", { children: "Total Paid:" }), " ", formatCurrency(selectedSettlementHistory.settledAmount)] }), _jsxs(Typography, { variant: "body1", color: selectedSettlementHistory.isSettled ? "success.main" : "warning.main", children: [_jsx("strong", { children: "Remaining Balance:" }), " ", formatCurrency(selectedSettlementHistory.remainingBalance)] }), selectedSettlementHistory.isSettled && (_jsxs(Typography, { variant: "body2", color: "success.main", sx: { mt: 2 }, children: ["\u2713 Fully Settled on ", format(new Date(selectedSettlementHistory.settledAt), 'MMM d, yyyy h:mm a')] }))] }), _jsx(Typography, { variant: "h6", sx: { mt: 3 }, children: "Payment History" }), settlementPayments.length === 0 ? (_jsx(Alert, { severity: "info", children: "No payment records found." })) : (_jsx(TableContainer, { component: Paper, sx: { mt: 1 }, children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "#" }), _jsx(TableCell, { children: "Date & Time" }), _jsx(TableCell, { align: "right", children: "Amount" })] }) }), _jsxs(TableBody, { children: [settlementPayments.map((payment, index) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: index + 1 }), _jsx(TableCell, { children: format(new Date(payment.paidAt), 'MMM d, yyyy h:mm a') }), _jsx(TableCell, { align: "right", children: _jsx(Typography, { color: "success.main", fontWeight: "bold", children: formatCurrency(payment.amount) }) })] }, payment.id))), _jsxs(TableRow, { children: [_jsx(TableCell, { colSpan: 2, children: _jsx(Typography, { variant: "body2", fontWeight: "bold", children: "Total" }) }), _jsx(TableCell, { align: "right", children: _jsx(Typography, { variant: "body1", fontWeight: "bold", color: "primary", children: formatCurrency(settlementPayments.reduce((sum, p) => sum + p.amount, 0)) }) })] })] })] }) }))] })) }), _jsx(DialogActions, { children: _jsx(Button, { onClick: () => setSettlementHistoryDialogOpen(false), children: "Close" }) })] }), currentUser && (_jsx(TwoFactorSetup, { open: twoFactorSetupOpen, onClose: () => setTwoFactorSetupOpen(false), onSuccess: async () => {
                    setTwoFactorSetupOpen(false);
                    await loadCurrentUser();
                    // Reload to refresh 2FA status
                    window.location.reload();
                }, userId: currentUser.id, userEmail: currentUser.email, userName: currentUser.name }))] }));
}
