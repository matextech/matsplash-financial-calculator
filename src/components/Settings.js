import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Container, Divider, Grid, TextField, Typography, Paper, Alert, Snackbar, InputAdornment, Switch, FormControlLabel, } from '@mui/material';
import { Settings as SettingsIcon, Save as SaveIcon, Inventory as MaterialsIcon, AttachMoney as MoneyIcon, } from '@mui/icons-material';
import { DEFAULT_SETTINGS } from '../types';
import { apiService } from '../services/apiService';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
export default function Settings() {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [bagPrices, setBagPrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    useEffect(() => {
        loadSettings();
        loadBagPrices();
    }, []);
    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await apiService.getSettings();
            // apiService returns { success: true, data: {...} } or direct object
            const settingsData = data?.data || data;
            setSettings(settingsData);
        }
        catch (error) {
            console.error('Error loading settings:', error);
            setSnackbar({ open: true, message: 'Error loading settings', severity: 'error' });
        }
        finally {
            setLoading(false);
        }
    };
    const loadBagPrices = async () => {
        try {
            const prices = await apiService.getBagPrices(true); // Include inactive
            const pricesArray = Array.isArray(prices) ? prices : (prices?.data || []);
            setBagPrices(pricesArray);
        }
        catch (error) {
            console.error('Error loading bag prices:', error);
            setBagPrices([]);
        }
    };
    const handleAddBagPrice = async () => {
        try {
            await apiService.createBagPrice({
                amount: 250,
                label: 'New Price',
                sortOrder: bagPrices.length + 1,
                isActive: true,
            });
            await loadBagPrices();
            setSnackbar({ open: true, message: 'Bag price added successfully', severity: 'success' });
        }
        catch (error) {
            console.error('Error adding bag price:', error);
            setSnackbar({ open: true, message: 'Error adding bag price', severity: 'error' });
        }
    };
    const handleUpdateBagPrice = async (priceId, updates) => {
        try {
            await apiService.updateBagPrice(priceId, updates);
            await loadBagPrices();
        }
        catch (error) {
            console.error('Error updating bag price:', error);
            setSnackbar({ open: true, message: 'Error updating bag price', severity: 'error' });
        }
    };
    const handleDeleteBagPrice = async (priceId) => {
        if (!window.confirm('Are you sure you want to delete this bag price?')) {
            return;
        }
        try {
            await apiService.deleteBagPrice(priceId);
            await loadBagPrices();
            setSnackbar({ open: true, message: 'Bag price deleted successfully', severity: 'success' });
        }
        catch (error) {
            console.error('Error deleting bag price:', error);
            setSnackbar({ open: true, message: 'Error deleting bag price', severity: 'error' });
        }
    };
    const handleChange = (field, value) => {
        const numValue = parseFloat(value) || 0;
        setSettings(prev => ({
            ...prev,
            [field]: numValue,
        }));
    };
    const handleSave = async () => {
        try {
            setSaving(true);
            // Validate settings
            if (settings.sachetRollCost <= 0 || settings.sachetRollBagsPerRoll <= 0) {
                setSnackbar({ open: true, message: 'Sachet roll cost and bags per roll must be greater than 0', severity: 'error' });
                return;
            }
            if (settings.packingNylonCost <= 0 || settings.packingNylonBagsPerPackage <= 0) {
                setSnackbar({ open: true, message: 'Packing nylon cost and bags per package must be greater than 0', severity: 'error' });
                return;
            }
            // Note: Bag prices are now managed separately, so we don't validate salesPrice1/salesPrice2 here
            await apiService.updateSettings(settings);
            setSnackbar({ open: true, message: 'Settings saved successfully!', severity: 'success' });
            // Dispatch event to notify other components that settings have been updated
            window.dispatchEvent(new Event('settingsUpdated'));
        }
        catch (error) {
            console.error('Error saving settings:', error);
            setSnackbar({ open: true, message: 'Error saving settings', severity: 'error' });
        }
        finally {
            setSaving(false);
        }
    };
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(amount);
    };
    const calculateCostPerBag = (cost, bags) => {
        return bags > 0 ? cost / bags : 0;
    };
    if (loading) {
        return (_jsx(Container, { children: _jsx(Typography, { children: "Loading settings..." }) }));
    }
    return (_jsxs(Container, { maxWidth: "lg", children: [_jsxs(Box, { sx: { mb: 4 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 2 }, children: [_jsx(SettingsIcon, { sx: { mr: 2, fontSize: 32 } }), _jsx(Typography, { variant: "h4", component: "h1", children: "Settings & Management" })] }), _jsx(Typography, { variant: "body1", color: "text.secondary", children: "Configure material costs, sales prices, and other system settings" })] }), _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 3 }, children: [_jsx(MaterialsIcon, { sx: { mr: 1, color: 'primary.main' } }), _jsx(Typography, { variant: "h5", component: "h2", children: "Material Costs" })] }), _jsx(Divider, { sx: { mb: 3 } }), _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(Paper, { sx: { p: 3, backgroundColor: 'grey.50' }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Sachet Roll" }), _jsx(TextField, { fullWidth: true, label: "Cost per Roll", type: "number", value: settings.sachetRollCost, onChange: (e) => handleChange('sachetRollCost', e.target.value), InputProps: {
                                                                startAdornment: _jsx(InputAdornment, { position: "start", children: "\u20A6" }),
                                                            }, sx: { mb: 2 } }), _jsx(TextField, { fullWidth: true, label: "Bags per Roll", type: "number", value: settings.sachetRollBagsPerRoll, onChange: (e) => handleChange('sachetRollBagsPerRoll', e.target.value), sx: { mb: 2 } }), _jsx(Box, { sx: { p: 2, backgroundColor: 'primary.light', borderRadius: 1 }, children: _jsxs(Typography, { variant: "body2", color: "primary.contrastText", children: [_jsx("strong", { children: "Cost per Bag:" }), " ", formatCurrency(calculateCostPerBag(settings.sachetRollCost, settings.sachetRollBagsPerRoll))] }) })] }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(Paper, { sx: { p: 3, backgroundColor: 'grey.50' }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Packing Nylon" }), _jsx(TextField, { fullWidth: true, label: "Cost per Package", type: "number", value: settings.packingNylonCost, onChange: (e) => handleChange('packingNylonCost', e.target.value), InputProps: {
                                                                startAdornment: _jsx(InputAdornment, { position: "start", children: "\u20A6" }),
                                                            }, sx: { mb: 2 } }), _jsx(TextField, { fullWidth: true, label: "Bags per Package", type: "number", value: settings.packingNylonBagsPerPackage, onChange: (e) => handleChange('packingNylonBagsPerPackage', e.target.value), sx: { mb: 2 } }), _jsx(Box, { sx: { p: 2, backgroundColor: 'primary.light', borderRadius: 1 }, children: _jsxs(Typography, { variant: "body2", color: "primary.contrastText", children: [_jsx("strong", { children: "Cost per Bag:" }), " ", formatCurrency(calculateCostPerBag(settings.packingNylonCost, settings.packingNylonBagsPerPackage))] }) })] }) })] })] }) }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(MoneyIcon, { sx: { mr: 1, color: 'primary.main' } }), _jsx(Typography, { variant: "h5", component: "h2", children: "Bag Sales Prices" })] }), _jsx(Button, { variant: "contained", startIcon: _jsx(AddIcon, {}), onClick: handleAddBagPrice, size: "small", children: "Add Price" })] }), _jsx(Divider, { sx: { mb: 3 } }), _jsx(Alert, { severity: "info", sx: { mb: 3 }, children: "Manage bag prices for sales entries. These prices will be available when entering sales." }), bagPrices.length === 0 ? (_jsx(Alert, { severity: "warning", sx: { mb: 2 }, children: "No bag prices configured. Click \"Add Price\" to create your first price tier." })) : (_jsx(Box, { sx: { mb: 3 }, children: bagPrices
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
                                            }, children: [_jsx(TextField, { label: "Price Amount (\u20A6)", type: "number", value: price.amount, onChange: (e) => handleUpdateBagPrice(price.id, { amount: parseFloat(e.target.value) || 0 }), size: "small", sx: { width: '150px' }, InputProps: {
                                                        startAdornment: _jsx(InputAdornment, { position: "start", children: "\u20A6" }),
                                                    } }), _jsx(TextField, { label: "Label", value: price.label, onChange: (e) => handleUpdateBagPrice(price.id, { label: e.target.value }), size: "small", sx: { flexGrow: 1 }, placeholder: "e.g., Standard, Premium, Deluxe" }), _jsx(TextField, { label: "Order", type: "number", value: price.sortOrder, onChange: (e) => handleUpdateBagPrice(price.id, { sortOrder: parseInt(e.target.value) || 0 }), size: "small", sx: { width: '80px' }, helperText: "Display order" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: price.isActive, onChange: (e) => handleUpdateBagPrice(price.id, { isActive: e.target.checked }), size: "small" }), label: "Active", labelPlacement: "top" }), _jsx(Button, { variant: "outlined", color: "error", startIcon: _jsx(DeleteIcon, {}), onClick: () => handleDeleteBagPrice(price.id), size: "small", children: "Delete" })] }, price.id))) }))] }) }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 3 }, children: [_jsx(MaterialsIcon, { sx: { mr: 1, color: 'primary.main' } }), _jsx(Typography, { variant: "h5", component: "h2", children: "Inventory Settings" })] }), _jsx(Divider, { sx: { mb: 3 } }), _jsx(Grid, { container: true, spacing: 3, children: _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(TextField, { fullWidth: true, label: "Low Inventory Threshold (Bags)", type: "number", value: settings.inventoryLowThreshold || 4000, onChange: (e) => {
                                                    const value = parseInt(e.target.value) || 0;
                                                    setSettings(prev => ({
                                                        ...prev,
                                                        inventoryLowThreshold: value,
                                                    }));
                                                }, helperText: "Alert when inventory falls below this number of bags", sx: { mb: 2 } }) }) })] }) }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Current Configuration Summary" }), _jsx(Divider, { sx: { my: 2 } }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsxs(Grid, { item: true, xs: 12, md: 6, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "Sachet Roll" }), _jsxs(Typography, { variant: "body1", children: [formatCurrency(settings.sachetRollCost), " per roll (", settings.sachetRollBagsPerRoll, " bags)"] }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: [formatCurrency(calculateCostPerBag(settings.sachetRollCost, settings.sachetRollBagsPerRoll)), " per bag"] })] }), _jsxs(Grid, { item: true, xs: 12, md: 6, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "Packing Nylon" }), _jsxs(Typography, { variant: "body1", children: [formatCurrency(settings.packingNylonCost), " per package (", settings.packingNylonBagsPerPackage, " bags)"] }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: [formatCurrency(calculateCostPerBag(settings.packingNylonCost, settings.packingNylonBagsPerPackage)), " per bag"] })] }), _jsxs(Grid, { item: true, xs: 12, md: 6, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "Sales Price 1" }), _jsxs(Typography, { variant: "body1", children: [formatCurrency(settings.salesPrice1), " per bag"] })] }), _jsxs(Grid, { item: true, xs: 12, md: 6, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "Sales Price 2" }), _jsxs(Typography, { variant: "body1", children: [formatCurrency(settings.salesPrice2), " per bag"] })] }), _jsxs(Grid, { item: true, xs: 12, md: 6, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "Low Inventory Threshold" }), _jsxs(Typography, { variant: "body1", children: [settings.inventoryLowThreshold || 4000, " bags"] })] })] })] }) }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(Box, { sx: { display: 'flex', justifyContent: 'flex-end', gap: 2 }, children: _jsx(Button, { variant: "contained", size: "large", startIcon: _jsx(SaveIcon, {}), onClick: handleSave, disabled: saving, children: saving ? 'Saving...' : 'Save Settings' }) }) })] }), _jsx(Snackbar, { open: snackbar.open, autoHideDuration: 6000, onClose: () => setSnackbar({ ...snackbar, open: false }), children: _jsx(Alert, { onClose: () => setSnackbar({ ...snackbar, open: false }), severity: snackbar.severity, sx: { width: '100%' }, children: snackbar.message }) })] }));
}
