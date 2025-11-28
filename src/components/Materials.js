import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Paper, Grid, Card, CardContent, IconButton, Chip, InputAdornment, Tooltip, ToggleButton, ToggleButtonGroup, Stack, MenuItem, } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Inventory as InventoryIcon, ChevronLeft, ChevronRight, } from '@mui/icons-material';
import { DEFAULT_SETTINGS } from '../types';
import { apiService } from '../services/apiService';
import { InventoryService } from '../services/inventoryService';
import { startOfDay, endOfDay, isSameDay, isToday, addDays, subDays } from 'date-fns';
export default function Materials() {
    const [purchases, setPurchases] = useState([]);
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [inventoryStatus, setInventoryStatus] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('day');
    const [dateRange, setDateRange] = useState({
        start: new Date(),
        end: new Date(),
    });
    const [filterType, setFilterType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [open, setOpen] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState(null);
    const [formData, setFormData] = useState({
        type: 'sachet_roll',
        quantity: '1',
        cost: '',
        date: new Date(),
        notes: '',
    });
    useEffect(() => {
        loadPurchases();
        loadSettings();
        // Listen for settings updates to reload inventory with new threshold
        const handleSettingsUpdated = () => {
            loadSettings();
        };
        window.addEventListener('settingsUpdated', handleSettingsUpdated);
        return () => {
            window.removeEventListener('settingsUpdated', handleSettingsUpdated);
        };
    }, []);
    // Reload inventory status when settings change
    useEffect(() => {
        if (settings.inventoryLowThreshold !== undefined) {
            loadInventoryStatus();
        }
    }, [settings.inventoryLowThreshold]);
    const loadInventoryStatus = async () => {
        try {
            // Use threshold from settings, fallback to default if not available
            const threshold = settings.inventoryLowThreshold || DEFAULT_SETTINGS.inventoryLowThreshold || 4000;
            const status = await InventoryService.getInventoryStatus(threshold);
            setInventoryStatus(status);
        }
        catch (error) {
            console.error('Error loading inventory status:', error);
        }
    };
    const loadSettings = async () => {
        try {
            const data = await apiService.getSettings();
            // apiService returns { success: true, data: {...} } or direct object
            const settingsData = data.data || data;
            setSettings(settingsData);
            // Reload inventory status with the correct threshold from settings
            const threshold = settingsData.inventoryLowThreshold || DEFAULT_SETTINGS.inventoryLowThreshold || 4000;
            const status = await InventoryService.getInventoryStatus(threshold);
            setInventoryStatus(status);
        }
        catch (error) {
            console.error('Error loading settings:', error);
            setSettings(DEFAULT_SETTINGS);
        }
    };
    const loadPurchases = async () => {
        try {
            const data = await apiService.getMaterialPurchases();
            // apiService returns array directly
            setPurchases(Array.isArray(data) ? data : []);
        }
        catch (error) {
            console.error('Error loading material purchases:', error);
            setPurchases([]);
        }
    };
    const getPurchasesForDate = (date) => {
        let filtered = purchases.filter(purchase => {
            const purchaseDate = purchase.date instanceof Date ? purchase.date : new Date(purchase.date);
            return isSameDay(purchaseDate, date);
        });
        // Apply type filter
        if (filterType !== 'all') {
            filtered = filtered.filter(p => p.type === filterType);
        }
        // Apply search filter
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(p => p.type.toLowerCase().includes(search) ||
                p.cost.toString().includes(search) ||
                (p.notes && p.notes.toLowerCase().includes(search)));
        }
        return filtered;
    };
    const getPurchasesForRange = (start, end) => {
        const startDay = startOfDay(start);
        const endDay = endOfDay(end);
        let filtered = purchases.filter(purchase => {
            const purchaseDate = purchase.date instanceof Date ? purchase.date : new Date(purchase.date);
            return purchaseDate >= startDay && purchaseDate <= endDay;
        });
        // Apply type filter
        if (filterType !== 'all') {
            filtered = filtered.filter(p => p.type === filterType);
        }
        // Apply search filter
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(p => p.type.toLowerCase().includes(search) ||
                p.cost.toString().includes(search) ||
                (p.notes && p.notes.toLowerCase().includes(search)));
        }
        return filtered;
    };
    const currentPurchases = viewMode === 'day'
        ? getPurchasesForDate(selectedDate)
        : getPurchasesForRange(dateRange.start, dateRange.end);
    const groupedPurchases = {
        sachet_roll: currentPurchases.filter(p => p.type === 'sachet_roll'),
        packing_nylon: currentPurchases.filter(p => p.type === 'packing_nylon'),
    };
    const totalByType = {
        sachet_roll: groupedPurchases.sachet_roll.reduce((sum, p) => sum + p.cost, 0),
        packing_nylon: groupedPurchases.packing_nylon.reduce((sum, p) => sum + p.cost, 0),
    };
    const totalCost = totalByType.sachet_roll + totalByType.packing_nylon;
    const totalBags = groupedPurchases.sachet_roll.reduce((sum, p) => sum + (p.quantity * settings.sachetRollBagsPerRoll), 0) +
        groupedPurchases.packing_nylon.reduce((sum, p) => sum + (p.quantity * settings.packingNylonBagsPerPackage), 0);
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(amount);
    };
    const formatDateForInput = (date) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const parseDateFromInput = (dateString) => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    };
    const handleDateChange = (direction) => {
        if (direction === 'today') {
            setSelectedDate(new Date());
        }
        else if (direction === 'prev') {
            setSelectedDate(prev => subDays(prev, 1));
        }
        else {
            setSelectedDate(prev => addDays(prev, 1));
        }
    };
    const handleOpen = (purchase, date) => {
        if (purchase) {
            setEditingPurchase(purchase);
            const purchaseDate = purchase.date instanceof Date ? purchase.date : new Date(purchase.date);
            setFormData({
                type: purchase.type,
                quantity: purchase.quantity.toString(),
                cost: purchase.cost.toString(),
                date: purchaseDate,
                notes: purchase.notes || '',
            });
            console.log('Opening purchase for editing:', purchase);
        }
        else {
            setEditingPurchase(null);
            setFormData({
                type: 'sachet_roll',
                quantity: '1',
                cost: settings.sachetRollCost.toString(),
                date: date || selectedDate,
                notes: '',
            });
        }
        setOpen(true);
    };
    const handleClose = () => {
        setOpen(false);
        setEditingPurchase(null);
    };
    const handleTypeChange = (type) => {
        const standardCost = type === 'sachet_roll'
            ? settings.sachetRollCost
            : settings.packingNylonCost;
        const quantity = parseInt(formData.quantity) || 1;
        const newCost = (standardCost * quantity).toString();
        setFormData({
            ...formData,
            type,
            cost: newCost,
        });
    };
    const handleQuantityChange = (quantity) => {
        const qty = parseInt(quantity) || 0;
        const standardCost = formData.type === 'sachet_roll'
            ? settings.sachetRollCost
            : settings.packingNylonCost;
        const newCost = (standardCost * qty).toString();
        setFormData({
            ...formData,
            quantity: quantity,
            cost: newCost,
        });
    };
    const handleSubmit = async () => {
        try {
            const quantity = parseInt(formData.quantity);
            const cost = parseFloat(formData.cost);
            if (isNaN(quantity) || quantity <= 0) {
                alert('Please enter a valid quantity.');
                return;
            }
            if (isNaN(cost) || cost <= 0) {
                alert('Please enter a valid cost.');
                return;
            }
            const purchaseData = {
                type: formData.type,
                quantity,
                cost,
                date: formData.date,
                notes: formData.notes?.trim() || undefined,
            };
            console.log('Saving purchase:', purchaseData);
            if (editingPurchase?.id) {
                try {
                    await apiService.updateMaterialPurchase(editingPurchase.id, purchaseData);
                    console.log('Purchase updated successfully');
                    handleClose();
                    setTimeout(() => {
                        loadPurchases();
                        loadInventoryStatus();
                    }, 100);
                    // Dispatch event to refresh dashboard
                    window.dispatchEvent(new Event('expensesUpdated'));
                }
                catch (error) {
                    console.error('Error updating purchase:', error);
                    alert(`Error updating purchase: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
            else {
                try {
                    await apiService.createMaterialPurchase(purchaseData);
                    console.log('Purchase added successfully');
                    handleClose();
                    setTimeout(() => {
                        loadPurchases();
                        loadInventoryStatus();
                    }, 100);
                    // Dispatch event to refresh dashboard
                    window.dispatchEvent(new Event('expensesUpdated'));
                }
                catch (error) {
                    console.error('Error adding purchase:', error);
                    alert(`Error adding purchase: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
        }
        catch (error) {
            console.error('Error saving purchase:', error);
            alert(`Error saving purchase: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };
    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this purchase?')) {
            try {
                await apiService.deleteMaterialPurchase(id);
                loadPurchases();
                // Dispatch event to refresh dashboard
                window.dispatchEvent(new Event('expensesUpdated'));
                loadInventoryStatus();
            }
            catch (error) {
                console.error('Error deleting purchase:', error);
                alert('Error deleting purchase. Please try again.');
            }
        }
    };
    const PurchaseCard = ({ title, purchases, total, color }) => (_jsx(Card, { sx: { mb: 2 }, children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 2 }, children: [_jsx(InventoryIcon, { sx: { color, mr: 1 } }), _jsx(Typography, { variant: "h6", sx: { flexGrow: 1 }, children: title }), _jsx(Chip, { label: formatCurrency(total), color: "primary", size: "small" })] }), purchases.length === 0 ? (_jsxs(Typography, { variant: "body2", color: "text.secondary", sx: { py: 2, textAlign: 'center' }, children: ["No ", title.toLowerCase(), " purchases"] })) : (_jsx(Stack, { spacing: 1, children: purchases.map((purchase) => {
                        const bagsCapacity = purchase.type === 'sachet_roll'
                            ? purchase.quantity * settings.sachetRollBagsPerRoll
                            : purchase.quantity * settings.packingNylonBagsPerPackage;
                        return (_jsx(Paper, { variant: "outlined", sx: { p: 1.5 }, children: _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }, children: [_jsxs(Box, { sx: { flexGrow: 1 }, children: [_jsxs(Typography, { variant: "body2", fontWeight: "medium", children: [purchase.quantity, " ", purchase.type === 'sachet_roll' ? 'roll(s)' : 'package(s)'] }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: ["Capacity: ", bagsCapacity.toLocaleString(), " bags"] }), purchase.notes && (_jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: purchase.notes }))] }), _jsx(Typography, { variant: "body2", fontWeight: "bold", sx: { mr: 1 }, children: formatCurrency(purchase.cost) }), _jsxs(Box, { children: [_jsx(Tooltip, { title: "Edit", children: _jsx(IconButton, { size: "small", onClick: () => handleOpen(purchase), children: _jsx(EditIcon, { fontSize: "small" }) }) }), _jsx(Tooltip, { title: "Delete", children: _jsx(IconButton, { size: "small", onClick: () => purchase.id && handleDelete(purchase.id), color: "error", children: _jsx(DeleteIcon, { fontSize: "small" }) }) })] })] }) }, purchase.id));
                    }) }))] }) }));
    return (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }, children: [_jsx(Typography, { variant: "h4", children: "Material Purchases" }), _jsx(Button, { variant: "contained", startIcon: _jsx(AddIcon, {}), onClick: () => handleOpen(), size: "large", children: "Add Purchase" })] }), viewMode === 'day' && (_jsx(Paper, { sx: { p: 2, mb: 3 }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(IconButton, { onClick: () => handleDateChange('prev'), children: _jsx(ChevronLeft, {}) }), _jsx(TextField, { type: "date", value: formatDateForInput(selectedDate), onChange: (e) => setSelectedDate(parseDateFromInput(e.target.value)), InputLabelProps: { shrink: true }, sx: { minWidth: 200 } }), _jsx(IconButton, { onClick: () => handleDateChange('next'), children: _jsx(ChevronRight, {}) }), !isToday(selectedDate) && (_jsx(Button, { variant: "outlined", size: "small", onClick: () => handleDateChange('today'), children: "Today" }))] }), _jsxs(ToggleButtonGroup, { value: viewMode, exclusive: true, onChange: (_, newMode) => newMode && setViewMode(newMode), size: "small", children: [_jsx(ToggleButton, { value: "day", children: "Day View" }), _jsx(ToggleButton, { value: "range", children: "Range View" })] })] }) })), viewMode === 'range' && (_jsx(Paper, { sx: { p: 2, mb: 3 }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }, children: [_jsx(TextField, { label: "Start Date", type: "date", value: formatDateForInput(dateRange.start), onChange: (e) => setDateRange({ ...dateRange, start: parseDateFromInput(e.target.value) }), InputLabelProps: { shrink: true } }), _jsx(TextField, { label: "End Date", type: "date", value: formatDateForInput(dateRange.end), onChange: (e) => setDateRange({ ...dateRange, end: parseDateFromInput(e.target.value) }), InputLabelProps: { shrink: true } }), _jsxs(ToggleButtonGroup, { value: viewMode, exclusive: true, onChange: (_, newMode) => newMode && setViewMode(newMode), size: "small", children: [_jsx(ToggleButton, { value: "day", children: "Day View" }), _jsx(ToggleButton, { value: "range", children: "Range View" })] })] }) })), _jsx(Paper, { sx: { p: 2, mb: 3 }, children: _jsxs(Grid, { container: true, spacing: 2, alignItems: "center", children: [_jsx(Grid, { item: true, xs: 12, sm: 6, md: 4, children: _jsx(TextField, { label: "Search Purchases", fullWidth: true, size: "small", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), placeholder: "Type, cost, notes...", InputProps: {
                                    startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(InventoryIcon, { fontSize: "small" }) })),
                                } }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 4, children: _jsxs(TextField, { label: "Filter by Type", fullWidth: true, select: true, size: "small", value: filterType, onChange: (e) => setFilterType(e.target.value), children: [_jsx(MenuItem, { value: "all", children: "All Types" }), _jsx(MenuItem, { value: "sachet_roll", children: "Sachet Roll" }), _jsx(MenuItem, { value: "packing_nylon", children: "Packing Nylon" })] }) }), (searchTerm || filterType !== 'all') && (_jsx(Grid, { item: true, xs: 12, sm: 12, md: 4, children: _jsx(Button, { variant: "outlined", onClick: () => {
                                    setSearchTerm('');
                                    setFilterType('all');
                                }, fullWidth: true, children: "Clear Filters" }) }))] }) }), _jsxs(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: [_jsxs(Grid, { item: true, xs: 12, sm: 6, md: 4, children: [inventoryStatus && (_jsx(Card, { sx: { backgroundColor: 'info.light', color: 'info.contrastText', mb: 2 }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Sachet Rolls - Remaining" }), _jsx(Typography, { variant: "h4", children: inventoryStatus.sachetRolls.remainingBags.toLocaleString() }), _jsxs(Typography, { variant: "body2", children: [inventoryStatus.sachetRolls.totalRolls, " rolls (", inventoryStatus.sachetRolls.usedBags.toLocaleString(), " used)"] })] }) })), _jsx(Card, { sx: { backgroundColor: 'info.light', color: 'info.contrastText' }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Sachet Rolls - Capacity" }), _jsx(Typography, { variant: "h4", children: formatCurrency(totalByType.sachet_roll) }), _jsxs(Typography, { variant: "body2", children: [groupedPurchases.sachet_roll.length, " purchase", groupedPurchases.sachet_roll.length !== 1 ? 's' : ''] })] }) })] }), _jsxs(Grid, { item: true, xs: 12, sm: 6, md: 4, children: [inventoryStatus && (_jsx(Card, { sx: { backgroundColor: 'warning.light', color: 'warning.contrastText', mb: 2 }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Packing Nylon - Remaining" }), _jsx(Typography, { variant: "h4", children: inventoryStatus.packingNylon.remainingBags.toLocaleString() }), _jsxs(Typography, { variant: "body2", children: [inventoryStatus.packingNylon.totalPackages, " packages (", inventoryStatus.packingNylon.usedBags.toLocaleString(), " used)"] })] }) })), _jsx(Card, { sx: { backgroundColor: 'warning.light', color: 'warning.contrastText' }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Packing Nylon - Capacity" }), _jsx(Typography, { variant: "h4", children: formatCurrency(totalByType.packing_nylon) }), _jsxs(Typography, { variant: "body2", children: [groupedPurchases.packing_nylon.length, " purchase", groupedPurchases.packing_nylon.length !== 1 ? 's' : ''] })] }) })] }), _jsxs(Grid, { item: true, xs: 12, sm: 6, md: 4, children: [inventoryStatus && (_jsx(Card, { sx: { backgroundColor: inventoryStatus.needsRestock ? 'error.light' : 'success.light', color: inventoryStatus.needsRestock ? 'error.contrastText' : 'success.contrastText', mb: 2 }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Total Remaining Inventory" }), _jsx(Typography, { variant: "h4", children: inventoryStatus.totalRemainingBags.toLocaleString() }), _jsx(Typography, { variant: "body2", children: "bags available for production" }), inventoryStatus.needsRestock && (_jsx(Typography, { variant: "body2", sx: { mt: 1, fontWeight: 'bold' }, children: "\u26A0\uFE0F Restock needed!" }))] }) })), _jsx(Card, { sx: { backgroundColor: 'success.light', color: 'success.contrastText' }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Total Bag Capacity" }), _jsx(Typography, { variant: "h4", children: totalBags.toLocaleString() }), _jsx(Typography, { variant: "body2", children: "bags from purchases" })] }) })] })] }), _jsx(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: _jsx(Grid, { item: true, xs: 12, sm: 6, md: 4, children: _jsx(Card, { sx: { backgroundColor: 'primary.light', color: 'primary.contrastText' }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Total Cost" }), _jsx(Typography, { variant: "h4", children: formatCurrency(totalCost) }), _jsxs(Typography, { variant: "body2", children: [currentPurchases.length, " purchase", currentPurchases.length !== 1 ? 's' : ''] })] }) }) }) }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(PurchaseCard, { title: "Sachet Rolls", purchases: groupedPurchases.sachet_roll, total: totalByType.sachet_roll, color: "primary.main" }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(PurchaseCard, { title: "Packing Nylon", purchases: groupedPurchases.packing_nylon, total: totalByType.packing_nylon, color: "success.main" }) })] }), _jsxs(Dialog, { open: open, onClose: handleClose, maxWidth: "sm", fullWidth: true, children: [_jsx(DialogTitle, { children: editingPurchase ? 'Edit Material Purchase' : 'Add Material Purchase' }), _jsx(DialogContent, { children: _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }, children: [_jsx(TextField, { label: "Date", type: "date", fullWidth: true, value: formatDateForInput(formData.date), onChange: (e) => setFormData({ ...formData, date: parseDateFromInput(e.target.value) }), InputLabelProps: { shrink: true }, required: true }), _jsxs(TextField, { label: "Material Type", fullWidth: true, select: true, value: formData.type, onChange: (e) => handleTypeChange(e.target.value), required: true, children: [_jsxs(MenuItem, { value: "sachet_roll", children: ["Sachet Roll - \u20A6", settings.sachetRollCost.toLocaleString(), " per roll (", settings.sachetRollBagsPerRoll, " bags)"] }), _jsxs(MenuItem, { value: "packing_nylon", children: ["Packing Nylon - \u20A6", settings.packingNylonCost.toLocaleString(), " per package (", settings.packingNylonBagsPerPackage.toLocaleString(), " bags)"] })] }), _jsx(TextField, { label: "Quantity", fullWidth: true, type: "number", value: formData.quantity, onChange: (e) => handleQuantityChange(e.target.value), required: true, inputProps: { min: 1 }, helperText: `Standard: ${formData.type === 'sachet_roll' ? `₦${settings.sachetRollCost.toLocaleString()}` : `₦${settings.packingNylonCost.toLocaleString()}`} per ${formData.type === 'sachet_roll' ? 'roll' : 'package'}` }), _jsx(TextField, { label: "Total Cost (\u20A6)", fullWidth: true, type: "number", value: formData.cost, onChange: (e) => setFormData({ ...formData, cost: e.target.value }), required: true, InputProps: {
                                        startAdornment: _jsx(InputAdornment, { position: "start", children: "\u20A6" }),
                                    }, helperText: `Auto-calculated: ${formData.quantity} × ${formData.type === 'sachet_roll' ? `₦${settings.sachetRollCost.toLocaleString()}` : `₦${settings.packingNylonCost.toLocaleString()}`} = ${formatCurrency(parseFloat(formData.cost || '0'))}` }), _jsx(TextField, { label: "Notes (Optional)", fullWidth: true, multiline: true, rows: 2, value: formData.notes, onChange: (e) => setFormData({ ...formData, notes: e.target.value }), placeholder: "Additional notes about this purchase" })] }) }), _jsxs(DialogActions, { sx: { p: 2 }, children: [_jsx(Button, { onClick: handleClose, children: "Cancel" }), _jsxs(Button, { onClick: handleSubmit, variant: "contained", size: "large", children: [editingPurchase ? 'Update' : 'Add', " Purchase"] })] })] })] }));
}
