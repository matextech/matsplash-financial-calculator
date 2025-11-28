import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Paper, Grid, Card, CardContent, Alert, MenuItem, Chip, IconButton, ToggleButton, ToggleButtonGroup, } from '@mui/material';
import { Add as AddIcon, CheckCircle as CheckCircleIcon, Warning as WarningIcon, Logout as LogoutIcon, Notifications as NotificationsIcon, Security as SecurityIcon, VerifiedUser as VerifiedUserIcon, } from '@mui/icons-material';
import { DEFAULT_SETTINGS } from '../../types';
import { apiService } from '../../services/apiService';
import { authService } from '../../services/authService';
import { AuditService } from '../../services/auditService';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfDay, endOfDay, isSameDay } from 'date-fns';
import TwoFactorSetup from '../auth/TwoFactorSetup';
import { Tooltip } from '@mui/material';
export default function ReceptionistDashboard() {
    const navigate = useNavigate();
    const [sales, setSales] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [bagPrices, setBagPrices] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [open, setOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingSale, setPendingSale] = useState(null);
    const [filterType, setFilterType] = useState('all');
    const [dateFilter, setDateFilter] = useState('2days');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [twoFactorSetupOpen, setTwoFactorSetupOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [formData, setFormData] = useState({
        date: new Date(),
        saleType: 'driver',
        driverId: '',
        bagsAtPrice1: '',
        bagsAtPrice2: '',
        notes: '',
    });
    // Dynamic price breakdown state (for new dynamic pricing system)
    const [priceBreakdown, setPriceBreakdown] = useState({});
    useEffect(() => {
        loadData();
        loadNotifications();
        loadCurrentUser();
        // Refresh notifications every 30 seconds
        const interval = setInterval(loadNotifications, 30000);
        return () => clearInterval(interval);
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
    const loadData = async () => {
        try {
            // Calculate date range (default to last 2 days)
            const twoDaysAgo = startOfDay(subDays(new Date(), 2));
            const today = endOfDay(new Date());
            const [salesData, employeesData, settingsData, bagPricesData] = await Promise.all([
                apiService.getReceptionistSales(twoDaysAgo, today),
                apiService.getEmployees(),
                apiService.getSettings(),
                apiService.getBagPrices(),
            ]);
            setSales(salesData);
            setDrivers(employeesData.filter(e => e.role === 'Driver'));
            setSettings(settingsData || DEFAULT_SETTINGS);
            // Filter and sort active bag prices
            const activePrices = bagPricesData.filter(p => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
            setBagPrices(activePrices);
        }
        catch (error) {
            console.error('Error loading data:', error);
        }
    };
    const handleOpen = () => {
        setFormData({
            date: new Date(),
            saleType: 'driver',
            driverId: '',
            bagsAtPrice1: '',
            bagsAtPrice2: '',
            notes: '',
        });
        // Initialize dynamic price breakdown
        const initialBreakdown = {};
        bagPrices.forEach(price => {
            initialBreakdown[price.id] = '';
        });
        setPriceBreakdown(initialBreakdown);
        setOpen(true);
    };
    const handleClose = () => {
        setOpen(false);
        setPendingSale(null);
    };
    const handleSubmit = () => {
        // Calculate total bags from dynamic price breakdown
        const breakdown = bagPrices.map(price => {
            const bags = parseInt(priceBreakdown[price.id]) || 0;
            return {
                priceId: price.id,
                amount: price.amount,
                bags,
                label: price.label,
            };
        }).filter(item => item.bags > 0);
        // Calculate total bags (sum of all bags)
        const totalBags = breakdown.reduce((sum, item) => sum + item.bags, 0);
        // Calculate expected amount (bags × price for each tier, then sum)
        const expectedAmount = breakdown.reduce((sum, item) => sum + (item.bags * item.amount), 0);
        if (totalBags === 0) {
            alert('Please enter at least one bag count');
            return;
        }
        if (formData.saleType === 'driver' && !formData.driverId) {
            alert('Please select a driver');
            return;
        }
        const session = authService.getCurrentSession();
        if (!session) {
            alert('Session expired. Please login again.');
            navigate('/login');
            return;
        }
        const selectedDriver = formData.driverId ? drivers.find(d => d.id?.toString() === formData.driverId) : null;
        // For backward compatibility, still populate bagsAtPrice1 and bagsAtPrice2
        const bags1 = breakdown.length > 0 ? breakdown[0].bags : 0;
        const bags2 = breakdown.length > 1 ? breakdown[1].bags : 0;
        const sale = {
            date: formData.date,
            saleType: formData.saleType,
            driverId: formData.saleType === 'driver' ? parseInt(formData.driverId) : undefined,
            driverName: formData.saleType === 'driver' && selectedDriver ? selectedDriver.name : undefined,
            bagsAtPrice1: bags1,
            bagsAtPrice2: bags2,
            totalBags: totalBags,
            expectedAmount: expectedAmount, // Calculate and send expected amount
            priceBreakdown: breakdown,
            notes: formData.notes || undefined,
        };
        setPendingSale(sale);
        setOpen(false);
        setConfirmOpen(true);
    };
    const handleConfirmSubmit = async () => {
        if (!pendingSale)
            return;
        try {
            const session = authService.getCurrentSession();
            if (!session) {
                alert('Session expired. Please login again.');
                navigate('/login');
                return;
            }
            const result = await apiService.createReceptionistSale({
                ...pendingSale,
                submittedAt: new Date(),
                submittedBy: session.userId,
                isSubmitted: true,
            });
            // Log the submission
            if (result && result.id) {
                await AuditService.logSubmit('receptionist_sale', result.id);
            }
            setConfirmOpen(false);
            setPendingSale(null);
            await loadData();
            alert('Sale submitted successfully!');
        }
        catch (error) {
            console.error('Error submitting sale:', error);
            alert('Error submitting sale. Please try again.');
        }
    };
    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };
    const formatDateForInput = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const parseDateFromInput = (dateString) => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    };
    // Since backend already filters by date, just apply type filter
    // (The sales array already contains the date-filtered data from the API)
    const filteredSales = filterType === 'all'
        ? sales
        : sales.filter(sale => sale.saleType === filterType);
    const visibleSales = sales; // For backward compatibility with stats display
    // Group sales by type
    const groupedSales = {
        driver: filteredSales.filter(s => s.saleType === 'driver'),
        general: filteredSales.filter(s => s.saleType === 'general'),
        mini_store: filteredSales.filter(s => s.saleType === 'mini_store'),
    };
    const todaySales = visibleSales.filter(sale => {
        const saleDate = sale.date instanceof Date ? sale.date : new Date(sale.date);
        return isSameDay(saleDate, new Date());
    });
    const getSaleTypeLabel = (type) => {
        switch (type) {
            case 'driver':
                return 'Driver Sales';
            case 'general':
                return 'General Sales';
            case 'mini_store':
                return 'Mini Store Dispatch';
            default:
                return type;
        }
    };
    const renderSaleCard = (sale) => (_jsx(Card, { elevation: 2, sx: {
            borderRadius: 2,
            transition: 'all 0.3s ease',
            '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4
            },
            height: '100%'
        }, children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", children: sale.saleType === 'driver' ? sale.driverName :
                                        sale.saleType === 'general' ? 'General Sales' : 'Mini Store Dispatch' }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: format(new Date(sale.date), 'MMM d, yyyy') })] }), _jsxs(Box, { sx: { textAlign: 'right' }, children: [_jsx(Typography, { variant: "h5", color: "primary", children: sale.totalBags.toLocaleString() }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "bags" })] })] }), sale.priceBreakdown && sale.priceBreakdown.length > 0 ? (_jsx(Box, { sx: { mb: 1 }, children: sale.priceBreakdown.map((item, idx) => (_jsxs(Typography, { variant: "body2", children: ["@ \u20A6", item.amount.toLocaleString(), "/bag ", item.label ? `(${item.label})` : '', ": ", item.bags.toLocaleString(), " bags", _jsxs("span", { style: { marginLeft: '8px', color: '#666' }, children: ["= \u20A6", (item.bags * item.amount).toLocaleString()] })] }, idx))) })) : (sale.bagsAtPrice1 > 0 || sale.bagsAtPrice2 > 0) && (_jsxs(Box, { sx: { mb: 1 }, children: [sale.bagsAtPrice1 > 0 && (_jsxs(Typography, { variant: "body2", children: ["@ \u20A6", settings.salesPrice1, "/bag: ", sale.bagsAtPrice1.toLocaleString(), " bags"] })), sale.bagsAtPrice2 > 0 && (_jsxs(Typography, { variant: "body2", children: ["@ \u20A6", settings.salesPrice2, "/bag: ", sale.bagsAtPrice2.toLocaleString(), " bags"] }))] })), sale.notes && (_jsxs(Typography, { variant: "body2", sx: { mt: 1 }, children: ["Note: ", sale.notes] })), _jsx(Box, { sx: { mt: 2, display: 'flex', alignItems: 'center', gap: 1 }, children: sale.isSubmitted ? (_jsxs(_Fragment, { children: [_jsx(CheckCircleIcon, { color: "success", fontSize: "small" }), _jsxs(Typography, { variant: "caption", color: "success.main", children: ["Submitted ", sale.submittedAt ? format(new Date(sale.submittedAt), 'MMM d, h:mm a') : ''] })] })) : (_jsxs(_Fragment, { children: [_jsx(WarningIcon, { color: "warning", fontSize: "small" }), _jsx(Typography, { variant: "caption", color: "warning.main", children: "Pending submission" })] })) })] }) }));
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
                            }, children: "Receptionist Dashboard" }), _jsxs(Box, { sx: { display: 'flex', gap: { xs: 1, sm: 2 }, alignItems: 'center', width: { xs: '100%', sm: 'auto' } }, children: [notifications.length > 0 && (_jsx(Chip, { icon: _jsx(NotificationsIcon, {}), label: notifications.length, color: "error", size: "small", onClick: async () => {
                                        // Mark all as read
                                        for (const n of notifications) {
                                            if (n.id)
                                                await apiService.markNotificationAsRead(n.id);
                                        }
                                        loadNotifications();
                                    } })), _jsxs(Box, { sx: { display: 'flex', gap: 1, alignItems: 'center' }, children: [currentUser && !currentUser.twoFactorEnabled && (_jsx(Tooltip, { title: "Enable 2FA", children: _jsx(IconButton, { onClick: () => {
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
                                                    }, children: _jsx(VerifiedUserIcon, {}) }) }) })), _jsx(Button, { variant: "contained", startIcon: _jsx(LogoutIcon, {}), onClick: handleLogout, sx: {
                                                bgcolor: 'rgba(255,255,255,0.2)',
                                                color: 'white',
                                                '&:hover': {
                                                    bgcolor: 'rgba(255,255,255,0.3)',
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                                },
                                                transition: 'all 0.3s ease'
                                            }, children: "Logout" })] })] })] }) }), notifications.length > 0 && (_jsxs(Alert, { severity: "info", sx: { mb: 3 }, children: [_jsxs(Typography, { variant: "h6", gutterBottom: true, children: ["Notifications (", notifications.length, ")"] }), notifications.map((notif) => (_jsx(Typography, { variant: "body2", children: notif.message }, notif.id)))] })), _jsx(Alert, { severity: "info", sx: { mb: 3 }, children: "You can only view sales from the last 2 days. Once submitted, sales cannot be modified." }), _jsxs(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: [_jsx(Grid, { item: true, xs: 12, sm: 4, children: _jsx(Card, { elevation: 3, sx: {
                                borderRadius: 2,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: 6
                                },
                                background: 'linear-gradient(135deg, #3f7a6a 0%, #2d5a4f 100%)',
                                color: 'white'
                            }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", sx: { opacity: 0.9, mb: 1 }, gutterBottom: true, children: "Today's Sales" }), _jsx(Typography, { variant: "h4", sx: { fontWeight: 700 }, children: todaySales.length }), _jsx(Typography, { variant: "body2", sx: { opacity: 0.8, mt: 1 }, children: "entries" })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 4, children: _jsx(Card, { elevation: 3, sx: {
                                borderRadius: 2,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: 6
                                },
                                background: 'linear-gradient(135deg, #5a9a8a 0%, #3f7a6a 100%)',
                                color: 'white'
                            }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", sx: { opacity: 0.9, mb: 1 }, gutterBottom: true, children: "Total Bags Today" }), _jsx(Typography, { variant: "h4", sx: { fontWeight: 700 }, children: todaySales.reduce((sum, s) => sum + s.totalBags, 0).toLocaleString() }), _jsx(Typography, { variant: "body2", sx: { opacity: 0.8, mt: 1 }, children: "bags" })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 4, children: _jsx(Card, { elevation: 3, sx: {
                                borderRadius: 2,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: 6
                                },
                                background: 'linear-gradient(135deg, #3f7a6a 0%, #5a9a8a 100%)',
                                color: 'white'
                            }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", sx: { opacity: 0.9, mb: 1 }, gutterBottom: true, children: "Last 2 Days" }), _jsx(Typography, { variant: "h4", sx: { fontWeight: 700 }, children: visibleSales.length }), _jsx(Typography, { variant: "body2", sx: { opacity: 0.8, mt: 1 }, children: "total entries" })] }) }) })] }), _jsxs(Box, { sx: { mb: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }, children: [_jsx(Button, { variant: "contained", size: "large", startIcon: _jsx(AddIcon, {}), onClick: handleOpen, sx: {
                                    borderRadius: 2,
                                    px: 3,
                                    py: 1.5,
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    boxShadow: 3,
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: 6
                                    },
                                    transition: 'all 0.3s ease'
                                }, children: "Record Sale" }), _jsxs(Box, { sx: { display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }, children: [_jsx(Typography, { variant: "body2", sx: { fontWeight: 'bold' }, children: "Date:" }), _jsxs(ToggleButtonGroup, { value: dateFilter, exclusive: true, onChange: (_, newValue) => newValue && setDateFilter(newValue), size: "small", children: [_jsx(ToggleButton, { value: "today", children: "Today" }), _jsx(ToggleButton, { value: "yesterday", children: "Yesterday" }), _jsx(ToggleButton, { value: "2days", children: "Last 2 Days" }), _jsx(ToggleButton, { value: "custom", children: "Custom" })] }), dateFilter === 'custom' && (_jsx(TextField, { type: "date", size: "small", value: format(selectedDate, 'yyyy-MM-dd'), onChange: (e) => setSelectedDate(new Date(e.target.value)), sx: { width: 150 } }))] })] }), _jsxs(Box, { sx: { display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsx(Typography, { variant: "body2", sx: { fontWeight: 'bold' }, children: "Type:" }), _jsx(Chip, { label: "All", onClick: () => setFilterType('all'), color: filterType === 'all' ? 'primary' : 'default', variant: filterType === 'all' ? 'filled' : 'outlined' }), _jsx(Chip, { label: "Driver Sales", onClick: () => setFilterType('driver'), color: filterType === 'driver' ? 'primary' : 'default', variant: filterType === 'driver' ? 'filled' : 'outlined' }), _jsx(Chip, { label: "General Sales", onClick: () => setFilterType('general'), color: filterType === 'general' ? 'primary' : 'default', variant: filterType === 'general' ? 'filled' : 'outlined' }), _jsx(Chip, { label: "Mini Store", onClick: () => setFilterType('mini_store'), color: filterType === 'mini_store' ? 'primary' : 'default', variant: filterType === 'mini_store' ? 'filled' : 'outlined' })] })] }), filteredSales.length === 0 ? (_jsx(Paper, { sx: { p: 4, textAlign: 'center' }, children: _jsx(Typography, { variant: "h6", color: "text.secondary", children: filterType === 'all'
                        ? 'No sales recorded in the last 2 days'
                        : `No ${getSaleTypeLabel(filterType)} in the last 2 days` }) })) : filterType === 'all' ? (
            // Show grouped view when "All" is selected
            _jsxs(Box, { children: [groupedSales.driver.length > 0 && (_jsxs(Box, { sx: { mb: 4 }, children: [_jsxs(Typography, { variant: "h6", sx: { mb: 2, display: 'flex', alignItems: 'center', gap: 1 }, children: ["Driver Sales", _jsx(Chip, { label: groupedSales.driver.length, size: "small", color: "primary" })] }), _jsx(Grid, { container: true, spacing: 2, children: groupedSales.driver.map((sale) => (_jsx(Grid, { item: true, xs: 12, md: 6, children: renderSaleCard(sale) }, sale.id))) })] })), groupedSales.general.length > 0 && (_jsxs(Box, { sx: { mb: 4 }, children: [_jsxs(Typography, { variant: "h6", sx: { mb: 2, display: 'flex', alignItems: 'center', gap: 1 }, children: ["General Sales", _jsx(Chip, { label: groupedSales.general.length, size: "small", color: "success" })] }), _jsx(Grid, { container: true, spacing: 2, children: groupedSales.general.map((sale) => (_jsx(Grid, { item: true, xs: 12, md: 6, children: renderSaleCard(sale) }, sale.id))) })] })), groupedSales.mini_store.length > 0 && (_jsxs(Box, { sx: { mb: 4 }, children: [_jsxs(Typography, { variant: "h6", sx: { mb: 2, display: 'flex', alignItems: 'center', gap: 1 }, children: ["Mini Store Dispatch", _jsx(Chip, { label: groupedSales.mini_store.length, size: "small", color: "warning" })] }), _jsx(Grid, { container: true, spacing: 2, children: groupedSales.mini_store.map((sale) => (_jsx(Grid, { item: true, xs: 12, md: 6, children: renderSaleCard(sale) }, sale.id))) })] }))] })) : (
            // Show filtered view
            _jsx(Grid, { container: true, spacing: 2, children: filteredSales.map((sale) => (_jsx(Grid, { item: true, xs: 12, md: 6, children: renderSaleCard(sale) }, sale.id))) })), _jsxs(Dialog, { open: open, onClose: handleClose, maxWidth: "sm", fullWidth: true, fullScreen: window.innerWidth < 600, PaperProps: {
                    sx: {
                        m: { xs: 0, sm: 2 },
                        height: { xs: '100%', sm: 'auto' }
                    }
                }, children: [_jsx(DialogTitle, { children: "Record Sale" }), _jsx(DialogContent, { children: _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }, children: [_jsx(TextField, { label: "Date", type: "date", fullWidth: true, value: formatDateForInput(formData.date), onChange: (e) => setFormData({ ...formData, date: parseDateFromInput(e.target.value) }), InputLabelProps: { shrink: true }, required: true }), _jsxs(TextField, { label: "Sale Type", fullWidth: true, select: true, value: formData.saleType, onChange: (e) => {
                                        const newSaleType = e.target.value;
                                        setFormData({ ...formData, saleType: newSaleType, driverId: '' });
                                        // For mini_store, auto-select ₦250 price (or closest to 250)
                                        if (newSaleType === 'mini_store') {
                                            const miniStorePrice = bagPrices.find(p => p.amount === 250) || bagPrices[0];
                                            if (miniStorePrice) {
                                                const newBreakdown = {};
                                                bagPrices.forEach(price => {
                                                    newBreakdown[price.id] = price.id === miniStorePrice.id ? '0' : '';
                                                });
                                                setPriceBreakdown(newBreakdown);
                                            }
                                        }
                                        else {
                                            // Clear price breakdown for other sale types
                                            const newBreakdown = {};
                                            bagPrices.forEach(price => {
                                                newBreakdown[price.id] = '';
                                            });
                                            setPriceBreakdown(newBreakdown);
                                        }
                                    }, required: true, children: [_jsx(MenuItem, { value: "driver", children: "Driver Sale" }), _jsx(MenuItem, { value: "general", children: "General Sales" }), _jsx(MenuItem, { value: "mini_store", children: "Mini Store Dispatch" })] }), formData.saleType === 'driver' && (_jsxs(TextField, { label: "Select Driver", fullWidth: true, select: true, value: formData.driverId, onChange: (e) => setFormData({ ...formData, driverId: e.target.value }), required: true, children: [_jsx(MenuItem, { value: "", children: "Select Driver" }), drivers.map((driver) => (_jsx(MenuItem, { value: driver.id?.toString(), children: driver.name }, driver.id)))] })), formData.saleType === 'mini_store' ? (
                                // For mini store, show only ₦250 price (or closest to 250)
                                (() => {
                                    const miniStorePrice = bagPrices.find(p => p.amount === 250) || bagPrices[0];
                                    return miniStorePrice ? (_jsx(TextField, { label: `Bags at ₦${miniStorePrice.amount.toLocaleString()} ${miniStorePrice.label ? `(${miniStorePrice.label})` : ''} - Mini Store Price`, fullWidth: true, type: "number", value: priceBreakdown[miniStorePrice.id] || '', onChange: (e) => setPriceBreakdown({ ...priceBreakdown, [miniStorePrice.id]: e.target.value }), inputProps: { min: 0, step: 1 }, required: true }, miniStorePrice.id)) : null;
                                })()) : (
                                // For driver and general sales, show all prices
                                bagPrices.map((price) => (_jsx(TextField, { label: `Bags at ₦${price.amount.toLocaleString()} ${price.label ? `(${price.label})` : ''}`, fullWidth: true, type: "number", value: priceBreakdown[price.id] || '', onChange: (e) => setPriceBreakdown({ ...priceBreakdown, [price.id]: e.target.value }), inputProps: { min: 0, step: 1 } }, price.id)))), _jsx(TextField, { label: "Notes (Optional)", fullWidth: true, multiline: true, rows: 2, value: formData.notes, onChange: (e) => setFormData({ ...formData, notes: e.target.value }) })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: handleClose, children: "Cancel" }), _jsx(Button, { onClick: handleSubmit, variant: "contained", children: "Review & Submit" })] })] }), _jsxs(Dialog, { open: confirmOpen, onClose: () => setConfirmOpen(false), fullScreen: window.innerWidth < 600, PaperProps: {
                    sx: {
                        m: { xs: 0, sm: 2 },
                        maxWidth: { xs: '100%', sm: '500px' }
                    }
                }, children: [_jsx(DialogTitle, { children: "Confirm Submission" }), _jsxs(DialogContent, { children: [_jsx(Alert, { severity: "warning", sx: { mb: 2 }, children: "Once submitted, this sale cannot be modified. Are you sure you want to proceed?" }), pendingSale && (_jsxs(Box, { children: [_jsxs(Typography, { variant: "body2", gutterBottom: true, children: [_jsx("strong", { children: "Date:" }), " ", format(new Date(pendingSale.date), 'MMM d, yyyy')] }), _jsxs(Typography, { variant: "body2", gutterBottom: true, children: [_jsx("strong", { children: "Type:" }), " ", pendingSale.saleType === 'driver' ? pendingSale.driverName :
                                                pendingSale.saleType === 'general' ? 'General Sales' : 'Mini Store Dispatch'] }), pendingSale.priceBreakdown && pendingSale.priceBreakdown.length > 0 ? (pendingSale.priceBreakdown.map((item, idx) => (_jsxs(Typography, { variant: "body2", gutterBottom: true, children: [_jsxs("strong", { children: ["Bags at \u20A6", item.amount.toLocaleString(), " ", item.label ? `(${item.label})` : '', ":"] }), " ", item.bags.toLocaleString(), _jsxs("span", { style: { marginLeft: '8px', color: '#666' }, children: ["= \u20A6", (item.bags * item.amount).toLocaleString()] })] }, idx)))) : (_jsxs(_Fragment, { children: [_jsxs(Typography, { variant: "body2", gutterBottom: true, children: [_jsxs("strong", { children: ["Bags at \u20A6", settings.salesPrice1, ":"] }), " ", pendingSale.bagsAtPrice1.toLocaleString()] }), _jsxs(Typography, { variant: "body2", gutterBottom: true, children: [_jsxs("strong", { children: ["Bags at \u20A6", settings.salesPrice2, ":"] }), " ", pendingSale.bagsAtPrice2.toLocaleString()] })] })), _jsxs(Typography, { variant: "h6", sx: { mt: 2 }, children: [_jsx("strong", { children: "Total Bags:" }), " ", pendingSale.totalBags.toLocaleString()] })] }))] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setConfirmOpen(false), children: "Cancel" }), _jsx(Button, { onClick: handleConfirmSubmit, variant: "contained", color: "primary", children: "Confirm & Submit" })] })] }), currentUser && (_jsx(TwoFactorSetup, { open: twoFactorSetupOpen, onClose: () => setTwoFactorSetupOpen(false), onSuccess: async () => {
                    setTwoFactorSetupOpen(false);
                    await loadCurrentUser();
                    // Reload to refresh 2FA status
                    window.location.reload();
                }, userId: currentUser.id, userEmail: currentUser.email, userName: currentUser.name }))] }));
}
