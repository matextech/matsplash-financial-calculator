import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Paper, Grid, Card, CardContent, IconButton, Divider, Chip, InputAdornment, Tooltip, ToggleButton, ToggleButtonGroup, Stack, MenuItem, Autocomplete, } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, ShoppingCart as SalesIcon, Person as PersonIcon, ChevronLeft, ChevronRight, } from '@mui/icons-material';
import { DEFAULT_SETTINGS } from '../types';
import { apiService } from '../services/apiService';
import { format, startOfDay, endOfDay, isSameDay, isToday, addDays, subDays } from 'date-fns';
export default function Sales() {
    const [sales, setSales] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('day');
    const [dateRange, setDateRange] = useState({
        start: new Date(),
        end: new Date(),
    });
    const [filterDriver, setFilterDriver] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [open, setOpen] = useState(false);
    const [editingSale, setEditingSale] = useState(null);
    const [materialPrices, setMaterialPrices] = useState([]);
    const [sachetRollPrices, setSachetRollPrices] = useState([]);
    const [packingNylonPrices, setPackingNylonPrices] = useState([]);
    const [bagPrices, setBagPrices] = useState([]);
    const [formData, setFormData] = useState({
        driverName: '',
        driverEmail: '',
        date: new Date(),
        bagsByPriceId: {}, // Dynamic: priceId -> bags count
        combinedBags: '',
        combinedPrice: '',
        notes: '',
        sachetRollPriceId: '',
        packingNylonPriceId: '',
    });
    useEffect(() => {
        loadSales();
        loadEmployees();
        loadSettings();
        loadMaterialPrices();
        loadBagPrices();
    }, []);
    const loadMaterialPrices = async () => {
        try {
            const prices = await apiService.getMaterialPrices();
            // Handle API response - it might be wrapped in data property or be an array directly
            const pricesArray = Array.isArray(prices) ? prices : (prices?.data || []);
            setMaterialPrices(pricesArray);
            setSachetRollPrices(pricesArray.filter((p) => p.type === 'sachet_roll' && p.isActive));
            setPackingNylonPrices(pricesArray.filter((p) => p.type === 'packing_nylon' && p.isActive));
        }
        catch (error) {
            // Material prices route might not be available yet - that's OK, just use empty arrays
            // This is a non-critical feature, so we don't need to show errors to the user
            setMaterialPrices([]);
            setSachetRollPrices([]);
            setPackingNylonPrices([]);
        }
    };
    const loadBagPrices = async () => {
        try {
            const prices = await apiService.getBagPrices();
            const pricesArray = Array.isArray(prices) ? prices : (prices?.data || []);
            setBagPrices(pricesArray.filter((p) => p.isActive));
        }
        catch (error) {
            console.error('Error loading bag prices:', error);
            // Fallback to settings if bag prices fail
            setBagPrices([]);
        }
    };
    const loadSettings = async () => {
        try {
            const data = await apiService.getSettings();
            // apiService returns { success: true, data: {...} } or direct object
            const settingsData = data.data || data;
            setSettings(settingsData);
            // Initialize form with default price
            setFormData(prev => ({
                ...prev,
                combinedPrice: settingsData.salesPrice1?.toString() || DEFAULT_SETTINGS.salesPrice1.toString(),
            }));
        }
        catch (error) {
            console.error('Error loading settings:', error);
            setSettings(DEFAULT_SETTINGS);
            setFormData(prev => ({
                ...prev,
                combinedPrice: DEFAULT_SETTINGS.salesPrice1.toString(),
            }));
        }
    };
    const loadSales = async () => {
        try {
            const data = await apiService.getSales();
            // apiService returns array directly
            setSales(Array.isArray(data) ? data : []);
        }
        catch (error) {
            console.error('Error loading sales:', error);
            setSales([]);
        }
    };
    const loadEmployees = async () => {
        try {
            const data = await apiService.getEmployees();
            // apiService returns { success: true, data: [...] } or direct array
            const employeesList = Array.isArray(data) ? data : (data.data || []);
            setEmployees(employeesList);
        }
        catch (error) {
            console.error('Error loading employees:', error);
            setEmployees([]);
        }
    };
    const getSalesForDate = (date) => {
        let filtered = sales.filter(sale => {
            const saleDate = sale.date instanceof Date ? sale.date : new Date(sale.date);
            return isSameDay(saleDate, date);
        });
        // Apply driver filter
        if (filterDriver !== 'all') {
            filtered = filtered.filter(s => s.driverName === filterDriver);
        }
        // Apply search filter
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(s => s.driverName.toLowerCase().includes(search) ||
                (s.driverEmail && s.driverEmail.toLowerCase().includes(search)) ||
                s.bagsSold.toString().includes(search) ||
                (s.notes && s.notes.toLowerCase().includes(search)));
        }
        return filtered;
    };
    const getSalesForRange = (start, end) => {
        const startDay = startOfDay(start);
        const endDay = endOfDay(end);
        let filtered = sales.filter(sale => {
            const saleDate = sale.date instanceof Date ? sale.date : new Date(sale.date);
            return saleDate >= startDay && saleDate <= endDay;
        });
        // Apply driver filter
        if (filterDriver !== 'all') {
            filtered = filtered.filter(s => s.driverName === filterDriver);
        }
        // Apply search filter
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(s => s.driverName.toLowerCase().includes(search) ||
                (s.driverEmail && s.driverEmail.toLowerCase().includes(search)) ||
                s.bagsSold.toString().includes(search) ||
                (s.notes && s.notes.toLowerCase().includes(search)));
        }
        return filtered;
    };
    const currentSales = viewMode === 'day'
        ? getSalesForDate(selectedDate)
        : getSalesForRange(dateRange.start, dateRange.end);
    // Group sales by driver
    const salesByDriver = currentSales.reduce((acc, sale) => {
        const key = sale.driverEmail || sale.driverName || 'Unknown';
        if (!acc[key]) {
            acc[key] = {
                driverName: sale.driverName,
                driverEmail: sale.driverEmail,
                sales: [],
                totalBags: 0,
                totalAmount: 0,
            };
        }
        acc[key].sales.push(sale);
        acc[key].totalBags += sale.bagsSold;
        acc[key].totalAmount += sale.totalAmount;
        return acc;
    }, {});
    const totalBags = currentSales.reduce((sum, s) => sum + s.bagsSold, 0);
    const totalRevenue = currentSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const averageBagsPerSale = currentSales.length > 0 ? totalBags / currentSales.length : 0;
    const averagePricePerBag = totalBags > 0 ? totalRevenue / totalBags : 0;
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
    const handleOpen = (sale, date) => {
        if (sale) {
            setEditingSale(sale);
            const saleDate = sale.date instanceof Date ? sale.date : new Date(sale.date);
            // When editing, we'll show the sale in the combined field since we can't split it
            const pricePerBag = sale.pricePerBag;
            // Check if this is a general/factory sale
            const isGeneralSale = sale.driverName === 'General/Factory' || !sale.employeeId;
            // Find which bag price this sale matches, or use combined
            const matchingPrice = bagPrices.find(p => p.amount === pricePerBag);
            const isCombined = !matchingPrice;
            // Build bagsByPriceId object - set the matching price's bags
            const bagsByPriceId = {};
            if (matchingPrice && matchingPrice.id) {
                bagsByPriceId[matchingPrice.id] = sale.bagsSold.toString();
            }
            setFormData({
                driverName: isGeneralSale ? 'General' : sale.driverName,
                driverEmail: sale.driverEmail || '',
                date: saleDate,
                bagsByPriceId: bagsByPriceId,
                combinedBags: isCombined ? sale.bagsSold.toString() : '',
                combinedPrice: isCombined ? pricePerBag.toString() : (bagPrices[0]?.amount || settings.salesPrice1).toString(),
                notes: sale.notes || '',
                sachetRollPriceId: sale.sachetRollPriceId || '',
                packingNylonPriceId: sale.packingNylonPriceId || '',
            });
            console.log('Opening sale for editing:', sale);
        }
        else {
            setEditingSale(null);
            setFormData({
                driverName: '',
                driverEmail: '',
                date: date || selectedDate,
                bagsByPriceId: {},
                combinedBags: '',
                combinedPrice: (bagPrices[0]?.amount || settings.salesPrice1).toString(),
                notes: '',
                sachetRollPriceId: '',
                packingNylonPriceId: '',
            });
        }
        setOpen(true);
    };
    const handleClose = () => {
        setOpen(false);
        setEditingSale(null);
    };
    const handleDriverSelect = (driver) => {
        if (driver) {
            setFormData({
                ...formData,
                driverName: driver.name,
                driverEmail: driver.email,
            });
        }
    };
    const handleSubmit = async () => {
        try {
            // Allow general/factory sales without a driver
            const isGeneralSale = formData.driverName.trim().toLowerCase() === 'general' ||
                formData.driverName.trim().toLowerCase() === 'factory' ||
                formData.driverName.trim() === '';
            if (!isGeneralSale && !formData.driverName.trim()) {
                alert('Please select or enter a driver name, or enter "General" for factory sales.');
                return;
            }
            // Helper function to validate and parse bags
            const parseBags = (bagsStr) => {
                if (!bagsStr || bagsStr.trim() === '')
                    return null;
                // Use parseFloat first to handle any decimals, then Math.floor to ensure whole numbers
                // This prevents any rounding issues
                const parsed = Math.floor(parseFloat(bagsStr));
                return isNaN(parsed) || parsed <= 0 ? null : parsed;
            };
            const combinedBags = parseBags(formData.combinedBags);
            const combinedPrice = parseFloat(formData.combinedPrice);
            // Find matching employee by name or email (only if not general/factory sale)
            let matchingEmployee;
            if (!isGeneralSale && formData.driverName.trim()) {
                matchingEmployee = employees.find(emp => emp.name.toLowerCase().trim() === formData.driverName.trim().toLowerCase() ||
                    (formData.driverEmail && emp.email.toLowerCase().trim() === formData.driverEmail.trim().toLowerCase()));
                // If no match by name/email, try to find by role (Driver)
                if (!matchingEmployee) {
                    const driverEmployees = employees.filter(emp => emp.role === 'Driver');
                    if (driverEmployees.length === 1) {
                        // If only one driver, use it
                        matchingEmployee = driverEmployees[0];
                    }
                }
            }
            const salesToSave = [];
            // Process all bag prices dynamically
            for (const price of bagPrices) {
                if (!price.id)
                    continue;
                const bagsCount = parseBags(formData.bagsByPriceId[price.id]);
                if (bagsCount !== null && bagsCount > 0) {
                    salesToSave.push({
                        driverName: isGeneralSale ? 'General/Factory' : formData.driverName.trim(),
                        driverEmail: isGeneralSale ? undefined : formData.driverEmail?.trim() || undefined,
                        employeeId: isGeneralSale ? undefined : matchingEmployee?.id,
                        bagsSold: bagsCount,
                        pricePerBag: price.amount,
                        totalAmount: bagsCount * price.amount,
                        date: formData.date,
                        notes: formData.notes?.trim() || undefined,
                        sachetRollPriceId: formData.sachetRollPriceId ? parseInt(String(formData.sachetRollPriceId)) : undefined,
                        packingNylonPriceId: formData.packingNylonPriceId ? parseInt(String(formData.packingNylonPriceId)) : undefined,
                    });
                }
            }
            // Save combined bags if provided (for other prices or when only one entry is used)
            if (combinedBags !== null) {
                if (isNaN(combinedPrice) || combinedPrice <= 0) {
                    alert('Please enter a valid price for combined bags.');
                    return;
                }
                salesToSave.push({
                    driverName: isGeneralSale ? 'General/Factory' : formData.driverName.trim(),
                    driverEmail: isGeneralSale ? undefined : formData.driverEmail?.trim() || undefined,
                    employeeId: isGeneralSale ? undefined : matchingEmployee?.id,
                    bagsSold: combinedBags,
                    pricePerBag: combinedPrice,
                    totalAmount: combinedBags * combinedPrice,
                    date: formData.date,
                    notes: formData.notes?.trim() || undefined,
                    sachetRollPriceId: formData.sachetRollPriceId ? parseInt(String(formData.sachetRollPriceId)) : undefined,
                    packingNylonPriceId: formData.packingNylonPriceId ? parseInt(String(formData.packingNylonPriceId)) : undefined,
                });
            }
            if (salesToSave.length === 0) {
                alert(`Please enter at least one sale entry (bags at ₦${settings.salesPrice1}, ₦${settings.salesPrice2}, or combined).`);
                return;
            }
            if (editingSale?.id) {
                // When editing, update the single sale - determine which entry was used
                let saleDataToUpdate = null;
                // Check if this is a general/factory sale
                const isGeneralSaleEdit = formData.driverName.trim().toLowerCase() === 'general' ||
                    formData.driverName.trim().toLowerCase() === 'factory' ||
                    formData.driverName.trim() === '';
                // Find matching employee by name or email (only if not general/factory sale)
                let matchingEmployee;
                if (!isGeneralSaleEdit && formData.driverName.trim()) {
                    matchingEmployee = employees.find(emp => emp.name.toLowerCase().trim() === formData.driverName.trim().toLowerCase() ||
                        (formData.driverEmail && emp.email.toLowerCase().trim() === formData.driverEmail.trim().toLowerCase()));
                    // If no match by name/email, try to find by role (Driver)
                    if (!matchingEmployee) {
                        const driverEmployees = employees.filter(emp => emp.role === 'Driver');
                        if (driverEmployees.length === 1) {
                            // If only one driver, use it
                            matchingEmployee = driverEmployees[0];
                        }
                    }
                }
                // Check if any bag price has bags entered
                let foundBagPriceEntry = false;
                for (const price of bagPrices) {
                    if (!price.id)
                        continue;
                    const bagsCount = parseBags(formData.bagsByPriceId[price.id]);
                    if (bagsCount !== null && bagsCount > 0) {
                        saleDataToUpdate = {
                            driverName: isGeneralSaleEdit ? 'General/Factory' : formData.driverName.trim(),
                            driverEmail: isGeneralSaleEdit ? undefined : formData.driverEmail?.trim() || undefined,
                            employeeId: isGeneralSaleEdit ? undefined : matchingEmployee?.id,
                            bagsSold: bagsCount,
                            pricePerBag: price.amount,
                            totalAmount: bagsCount * price.amount,
                            date: formData.date,
                            notes: formData.notes?.trim() || undefined,
                            sachetRollPriceId: formData.sachetRollPriceId ? parseInt(String(formData.sachetRollPriceId)) : undefined,
                            packingNylonPriceId: formData.packingNylonPriceId ? parseInt(String(formData.packingNylonPriceId)) : undefined,
                        };
                        foundBagPriceEntry = true;
                        break; // Only update with first found price (single sale edit)
                    }
                }
                if (!foundBagPriceEntry && combinedBags !== null) {
                    if (isNaN(combinedPrice) || combinedPrice <= 0) {
                        alert('Please enter a valid price for combined bags.');
                        return;
                    }
                    saleDataToUpdate = {
                        driverName: isGeneralSaleEdit ? 'General/Factory' : formData.driverName.trim(),
                        driverEmail: isGeneralSaleEdit ? undefined : formData.driverEmail?.trim() || undefined,
                        employeeId: isGeneralSaleEdit ? undefined : matchingEmployee?.id,
                        bagsSold: combinedBags,
                        pricePerBag: combinedPrice,
                        totalAmount: combinedBags * combinedPrice,
                        date: formData.date,
                        notes: formData.notes?.trim() || undefined,
                        sachetRollPriceId: formData.sachetRollPriceId ? parseInt(String(formData.sachetRollPriceId)) : undefined,
                        packingNylonPriceId: formData.packingNylonPriceId ? parseInt(String(formData.packingNylonPriceId)) : undefined,
                    };
                }
                if (saleDataToUpdate) {
                    console.log('Updating sale with:', saleDataToUpdate);
                    try {
                        await apiService.updateSale(editingSale.id, saleDataToUpdate);
                        console.log('Sale updated successfully');
                        handleClose();
                        setTimeout(() => {
                            loadSales();
                        }, 100);
                        // Dispatch event to refresh dashboard
                        window.dispatchEvent(new Event('expensesUpdated'));
                    }
                    catch (error) {
                        console.error('Error updating sale:', error);
                        const errorMessage = error?.message || 'Error updating sale. Please try again.';
                        alert(errorMessage);
                    }
                    return;
                }
                else {
                    const priceList = bagPrices.length > 0
                        ? bagPrices.map(p => `₦${p.amount}${p.label ? ` (${p.label})` : ''}`).join(', ')
                        : `₦${settings.salesPrice1}, ₦${settings.salesPrice2}`;
                    alert(`Please enter at least one sale entry (bags at ${priceList}, or combined).`);
                    return;
                }
            }
            else {
                // Add all sales
                for (const saleData of salesToSave) {
                    await apiService.createSale(saleData);
                }
                handleClose();
                setTimeout(() => {
                    loadSales();
                }, 100);
                // Dispatch event to refresh dashboard
                window.dispatchEvent(new Event('expensesUpdated'));
            }
        }
        catch (error) {
            console.error('Error saving sale:', error);
            const errorMessage = error?.message || 'Error saving sale. Please try again.';
            alert(errorMessage);
        }
    };
    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this sale?')) {
            try {
                await apiService.deleteSale(id);
                loadSales();
                // Dispatch event to refresh dashboard
                window.dispatchEvent(new Event('expensesUpdated'));
            }
            catch (error) {
                console.error('Error deleting sale:', error);
                alert('Error deleting sale. Please try again.');
            }
        }
    };
    const driverOptions = employees.filter(e => e.role === 'Driver' || !e.role);
    return (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }, children: [_jsx(Typography, { variant: "h4", children: "Daily Sales" }), _jsx(Button, { variant: "contained", startIcon: _jsx(AddIcon, {}), onClick: () => handleOpen(), size: "large", children: "Record Sale" })] }), viewMode === 'day' && (_jsx(Paper, { sx: { p: 2, mb: 3 }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(IconButton, { onClick: () => handleDateChange('prev'), children: _jsx(ChevronLeft, {}) }), _jsx(TextField, { type: "date", value: formatDateForInput(selectedDate), onChange: (e) => setSelectedDate(parseDateFromInput(e.target.value)), InputLabelProps: { shrink: true }, sx: { minWidth: 200 } }), _jsx(IconButton, { onClick: () => handleDateChange('next'), children: _jsx(ChevronRight, {}) }), !isToday(selectedDate) && (_jsx(Button, { variant: "outlined", size: "small", onClick: () => handleDateChange('today'), children: "Today" }))] }), _jsxs(ToggleButtonGroup, { value: viewMode, exclusive: true, onChange: (_, newMode) => newMode && setViewMode(newMode), size: "small", children: [_jsx(ToggleButton, { value: "day", children: "Day View" }), _jsx(ToggleButton, { value: "range", children: "Range View" })] })] }) })), viewMode === 'range' && (_jsx(Paper, { sx: { p: 2, mb: 3 }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }, children: [_jsx(TextField, { label: "Start Date", type: "date", value: formatDateForInput(dateRange.start), onChange: (e) => setDateRange({ ...dateRange, start: parseDateFromInput(e.target.value) }), InputLabelProps: { shrink: true } }), _jsx(TextField, { label: "End Date", type: "date", value: formatDateForInput(dateRange.end), onChange: (e) => setDateRange({ ...dateRange, end: parseDateFromInput(e.target.value) }), InputLabelProps: { shrink: true } }), _jsxs(ToggleButtonGroup, { value: viewMode, exclusive: true, onChange: (_, newMode) => newMode && setViewMode(newMode), size: "small", children: [_jsx(ToggleButton, { value: "day", children: "Day View" }), _jsx(ToggleButton, { value: "range", children: "Range View" })] })] }) })), _jsx(Paper, { sx: { p: 2, mb: 3 }, children: _jsxs(Grid, { container: true, spacing: 2, alignItems: "center", children: [_jsx(Grid, { item: true, xs: 12, sm: 6, md: 4, children: _jsx(TextField, { label: "Search Sales", fullWidth: true, size: "small", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), placeholder: "Driver name, email, bags...", InputProps: {
                                    startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(SalesIcon, { fontSize: "small" }) })),
                                } }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 4, children: _jsxs(TextField, { label: "Filter by Driver", fullWidth: true, select: true, size: "small", value: filterDriver, onChange: (e) => setFilterDriver(e.target.value), children: [_jsx(MenuItem, { value: "all", children: "All Drivers" }), Array.from(new Set(sales.map(s => s.driverName).filter(Boolean))).map((driverName, idx) => (_jsx(MenuItem, { value: driverName, children: driverName }, idx)))] }) }), (searchTerm || filterDriver !== 'all') && (_jsx(Grid, { item: true, xs: 12, sm: 12, md: 4, children: _jsx(Button, { variant: "outlined", onClick: () => {
                                    setSearchTerm('');
                                    setFilterDriver('all');
                                }, fullWidth: true, children: "Clear Filters" }) }))] }) }), _jsxs(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { sx: { backgroundColor: 'success.light', color: 'success.contrastText' }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Total Revenue" }), _jsx(Typography, { variant: "h4", children: formatCurrency(totalRevenue) }), _jsxs(Typography, { variant: "body2", children: [currentSales.length, " sale", currentSales.length !== 1 ? 's' : ''] })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { sx: { backgroundColor: 'primary.light', color: 'primary.contrastText' }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Total Bags" }), _jsx(Typography, { variant: "h4", children: totalBags.toLocaleString() }), _jsxs(Typography, { variant: "body2", children: ["Avg: ", averageBagsPerSale.toFixed(1), " per sale"] })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { sx: { backgroundColor: 'info.light', color: 'info.contrastText' }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Avg Price/Bag" }), _jsx(Typography, { variant: "h4", children: formatCurrency(averagePricePerBag) }), _jsxs(Typography, { variant: "body2", children: [currentSales.length, " sale", currentSales.length !== 1 ? 's' : ''] })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { sx: { backgroundColor: 'warning.light', color: 'warning.contrastText' }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Active Drivers" }), _jsx(Typography, { variant: "h4", children: Object.keys(salesByDriver).length }), _jsx(Typography, { variant: "body2", children: viewMode === 'day' ? 'Today' : 'In range' })] }) }) })] }), currentSales.length === 0 ? (_jsxs(Paper, { sx: { p: 4, textAlign: 'center' }, children: [_jsx(Typography, { variant: "h6", color: "text.secondary", gutterBottom: true, children: "No sales found" }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: viewMode === 'day'
                            ? `No sales recorded for ${format(selectedDate, 'MMM d, yyyy')}`
                            : 'No sales found in the selected date range' })] })) : (_jsx(Grid, { container: true, spacing: 2, children: Object.entries(salesByDriver).map(([key, driverData]) => (_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 2 }, children: [_jsx(PersonIcon, { sx: { mr: 1, color: 'primary.main' } }), _jsx(Typography, { variant: "h6", sx: { flexGrow: 1 }, children: driverData.driverName }), _jsx(Chip, { label: `${driverData.sales.length} sale${driverData.sales.length !== 1 ? 's' : ''}`, size: "small", color: "primary" })] }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "Total Bags" }), _jsx(Typography, { variant: "h6", children: driverData.totalBags.toLocaleString() })] }), _jsxs(Box, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "Total Revenue" }), _jsx(Typography, { variant: "h6", color: "success.main", children: formatCurrency(driverData.totalAmount) })] })] }), _jsx(Divider, { sx: { my: 2 } }), _jsx(Stack, { spacing: 1, children: driverData.sales.map((sale) => (_jsx(Paper, { variant: "outlined", sx: { p: 1.5 }, children: _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }, children: [_jsxs(Box, { sx: { flexGrow: 1 }, children: [_jsxs(Typography, { variant: "body2", fontWeight: "medium", children: [sale.bagsSold, " bags @ ", formatCurrency(sale.pricePerBag), "/bag"] }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: format(new Date(sale.date), 'MMM d, yyyy') }), sale.notes && (_jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: sale.notes }))] }), _jsx(Box, { sx: { textAlign: 'right', mr: 1 }, children: _jsx(Typography, { variant: "body2", fontWeight: "bold", color: "success.main", children: formatCurrency(sale.totalAmount) }) }), _jsxs(Box, { children: [_jsx(Tooltip, { title: "Edit", children: _jsx(IconButton, { size: "small", onClick: () => handleOpen(sale), children: _jsx(EditIcon, { fontSize: "small" }) }) }), _jsx(Tooltip, { title: "Delete", children: _jsx(IconButton, { size: "small", onClick: () => sale.id && handleDelete(sale.id), color: "error", children: _jsx(DeleteIcon, { fontSize: "small" }) }) })] })] }) }, sale.id))) })] }) }) }, key))) })), _jsxs(Dialog, { open: open, onClose: handleClose, maxWidth: "sm", fullWidth: true, children: [_jsx(DialogTitle, { children: editingSale ? 'Edit Sale' : 'Record Sale' }), _jsx(DialogContent, { children: _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }, children: [_jsx(TextField, { label: "Date", type: "date", fullWidth: true, value: formatDateForInput(formData.date), onChange: (e) => setFormData({ ...formData, date: parseDateFromInput(e.target.value) }), InputLabelProps: { shrink: true }, required: true }), _jsx(Autocomplete, { options: driverOptions, getOptionLabel: (option) => option.name, value: driverOptions.find(e => e.email === formData.driverEmail) || null, onChange: (_, newValue) => handleDriverSelect(newValue), renderInput: (params) => (_jsx(TextField, { ...params, label: "Select Driver (Optional)", placeholder: "Start typing or select from list" })), freeSolo: true, onInputChange: (_, value) => {
                                        setFormData({ ...formData, driverName: value });
                                    } }), _jsx(TextField, { label: "Driver Name (or 'General' for factory sales)", fullWidth: true, value: formData.driverName, onChange: (e) => setFormData({ ...formData, driverName: e.target.value }), placeholder: "Enter driver name, or 'General'/'Factory' for factory sales", helperText: "Leave empty or enter 'General'/'Factory' for sales at the factory without a specific driver" }), _jsx(TextField, { label: "Driver Email (Optional)", fullWidth: true, value: formData.driverEmail, onChange: (e) => setFormData({ ...formData, driverEmail: e.target.value }), type: "email", placeholder: "driver@example.com" }), bagPrices.length > 0 ? (bagPrices.map((price, index) => {
                                    if (!price.id)
                                        return null;
                                    const bagsValue = formData.bagsByPriceId[price.id] || '';
                                    const bagsCount = parseFloat(bagsValue) || 0;
                                    const backgroundColor = index % 2 === 0 ? 'success.50' : 'info.50';
                                    return (_jsxs(Box, { children: [_jsxs(Divider, { sx: { my: 2 }, children: ["Bags at \u20A6", price.amount, " ", price.label ? `(${price.label})` : ''] }), _jsx(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2, p: 2, backgroundColor, borderRadius: 1 }, children: _jsx(TextField, { label: `Bags Sold at ₦${price.amount}${price.label ? ` (${price.label})` : ''}`, fullWidth: true, type: "number", value: bagsValue, onChange: (e) => {
                                                        const value = e.target.value;
                                                        setFormData({
                                                            ...formData,
                                                            bagsByPriceId: {
                                                                ...formData.bagsByPriceId,
                                                                [price.id]: value,
                                                            },
                                                        });
                                                    }, inputProps: { min: 0, step: 1 }, placeholder: "Enter number of bags", helperText: bagsValue ? `${bagsValue} bags × ₦${price.amount} = ${formatCurrency(bagsCount * price.amount)}` : `Optional: Enter bags sold at ₦${price.amount}` }) })] }, price.id));
                                })) : (
                                // Fallback to settings if no bag prices loaded
                                _jsxs(_Fragment, { children: [_jsxs(Divider, { children: ["Bags at \u20A6", settings.salesPrice1] }), _jsx(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2, p: 2, backgroundColor: 'success.50', borderRadius: 1 }, children: _jsx(TextField, { label: `Bags Sold at ₦${settings.salesPrice1}`, fullWidth: true, type: "number", value: formData.bagsByPriceId[0] || '', onChange: (e) => {
                                                    setFormData({
                                                        ...formData,
                                                        bagsByPriceId: { ...formData.bagsByPriceId, 0: e.target.value },
                                                    });
                                                }, inputProps: { min: 0, step: 1 }, placeholder: "Enter number of bags", helperText: formData.bagsByPriceId[0] ? `${formData.bagsByPriceId[0]} bags × ₦${settings.salesPrice1} = ${formatCurrency((parseFloat(formData.bagsByPriceId[0]) || 0) * settings.salesPrice1)}` : `Optional: Enter bags sold at ₦${settings.salesPrice1}` }) }), _jsxs(Divider, { children: ["Bags at \u20A6", settings.salesPrice2] }), _jsx(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2, p: 2, backgroundColor: 'info.50', borderRadius: 1 }, children: _jsx(TextField, { label: `Bags Sold at ₦${settings.salesPrice2}`, fullWidth: true, type: "number", value: formData.bagsByPriceId[1] || '', onChange: (e) => {
                                                    setFormData({
                                                        ...formData,
                                                        bagsByPriceId: { ...formData.bagsByPriceId, 1: e.target.value },
                                                    });
                                                }, inputProps: { min: 0, step: 1 }, placeholder: "Enter number of bags", helperText: formData.bagsByPriceId[1] ? `${formData.bagsByPriceId[1]} bags × ₦${settings.salesPrice2} = ${formatCurrency((parseFloat(formData.bagsByPriceId[1]) || 0) * settings.salesPrice2)}` : `Optional: Enter bags sold at ₦${settings.salesPrice2}` }) })] })), _jsx(Divider, { children: "Combined Entry (Other Prices)" }), _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2, p: 2, backgroundColor: 'primary.50', borderRadius: 1 }, children: [_jsx(TextField, { label: "Bags Sold", fullWidth: true, type: "number", value: formData.combinedBags, onChange: (e) => {
                                                const value = e.target.value;
                                                // Preserve the exact value as string, only validate on submit
                                                setFormData({ ...formData, combinedBags: value });
                                            }, inputProps: { min: 0, step: 1 }, placeholder: "Enter number of bags", helperText: "Use this if bags are sold at a different price, or if only one price point is available" }), _jsx(TextField, { label: "Price per Bag (\u20A6)", fullWidth: true, type: "number", value: formData.combinedPrice, onChange: (e) => {
                                                const value = e.target.value;
                                                // Preserve the exact value as string
                                                setFormData({ ...formData, combinedPrice: value });
                                            }, InputProps: {
                                                startAdornment: _jsx(InputAdornment, { position: "start", children: "\u20A6" }),
                                            }, inputProps: { min: 0, step: 1 }, helperText: formData.combinedBags && formData.combinedPrice ? `Total: ${formatCurrency(Math.floor(parseFloat(formData.combinedBags || '0')) * parseFloat(formData.combinedPrice || '0'))}` : 'Enter price per bag for combined entry' })] }), _jsxs(Box, { sx: { p: 2, backgroundColor: 'grey.100', borderRadius: 1, mt: 1 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: _jsx("strong", { children: "Total Summary:" }) }), bagPrices.length > 0 ? (bagPrices.map((price) => {
                                            if (!price.id)
                                                return null;
                                            const bagsValue = formData.bagsByPriceId[price.id] || '';
                                            const bagsCount = Math.floor(parseFloat(bagsValue) || 0);
                                            if (bagsCount === 0)
                                                return null;
                                            return (_jsxs(Typography, { variant: "body2", children: ["\u20A6", price.amount, price.label ? ` (${price.label})` : '', ": ", bagsCount, " bags = ", formatCurrency(bagsCount * price.amount)] }, price.id));
                                        })) : (_jsxs(_Fragment, { children: [_jsxs(Typography, { variant: "body2", children: ["\u20A6", settings.salesPrice1, ": ", Math.floor(parseFloat(formData.bagsByPriceId[0] || '0')), " bags = ", formatCurrency(Math.floor(parseFloat(formData.bagsByPriceId[0] || '0')) * settings.salesPrice1)] }), _jsxs(Typography, { variant: "body2", children: ["\u20A6", settings.salesPrice2, ": ", Math.floor(parseFloat(formData.bagsByPriceId[1] || '0')), " bags = ", formatCurrency(Math.floor(parseFloat(formData.bagsByPriceId[1] || '0')) * settings.salesPrice2)] })] })), formData.combinedBags && (_jsxs(Typography, { variant: "body2", children: ["\u20A6", formData.combinedPrice, ": ", Math.floor(parseFloat(formData.combinedBags || '0')), " bags = ", formatCurrency(Math.floor(parseFloat(formData.combinedBags || '0')) * parseFloat(formData.combinedPrice || '0'))] })), _jsxs(Typography, { variant: "body2", fontWeight: "bold", sx: { mt: 1 }, children: ["Grand Total: ", formatCurrency((() => {
                                                    let total = 0;
                                                    // Sum all bag prices
                                                    if (bagPrices.length > 0) {
                                                        bagPrices.forEach((price) => {
                                                            if (price.id) {
                                                                const bagsCount = Math.floor(parseFloat(formData.bagsByPriceId[price.id] || '0') || 0);
                                                                total += bagsCount * price.amount;
                                                            }
                                                        });
                                                    }
                                                    else {
                                                        // Fallback to settings
                                                        total += Math.floor(parseFloat(formData.bagsByPriceId[0] || '0') || 0) * settings.salesPrice1;
                                                        total += Math.floor(parseFloat(formData.bagsByPriceId[1] || '0') || 0) * settings.salesPrice2;
                                                    }
                                                    // Add combined bags
                                                    total += Math.floor(parseFloat(formData.combinedBags || '0') || 0) * parseFloat(formData.combinedPrice || '0');
                                                    return total;
                                                })())] })] }), _jsx(Divider, { sx: { my: 2 }, children: "Material Prices (for Profit Calculations)" }), sachetRollPrices && sachetRollPrices.length > 0 && (_jsxs(TextField, { label: "Sachet Roll Price Model (Optional)", fullWidth: true, select: true, value: formData.sachetRollPriceId || '', onChange: (e) => setFormData({ ...formData, sachetRollPriceId: e.target.value ? parseInt(e.target.value) : '' }), helperText: "Select which sachet roll price model to use for profit calculations", children: [_jsx(MenuItem, { value: "", children: "Use default from settings" }), sachetRollPrices.map((price) => (_jsxs(MenuItem, { value: price.id, children: [price.label || 'Unnamed', " - \u20A6", price.cost.toLocaleString(), " per roll (", price.bagsPerUnit, " bags) = \u20A6", (price.cost / price.bagsPerUnit).toFixed(2), "/bag"] }, price.id)))] })), packingNylonPrices && packingNylonPrices.length > 0 && (_jsxs(TextField, { label: "Packing Nylon Price Model (Optional)", fullWidth: true, select: true, value: formData.packingNylonPriceId || '', onChange: (e) => setFormData({ ...formData, packingNylonPriceId: e.target.value ? parseInt(e.target.value) : '' }), helperText: "Select which packing nylon price model to use for profit calculations", children: [_jsx(MenuItem, { value: "", children: "Use default from settings" }), packingNylonPrices.map((price) => (_jsxs(MenuItem, { value: price.id, children: [price.label || 'Unnamed', " - \u20A6", price.cost.toLocaleString(), " per package (", price.bagsPerUnit, " bags) = \u20A6", (price.cost / price.bagsPerUnit).toFixed(2), "/bag"] }, price.id)))] })), _jsx(TextField, { label: "Notes (Optional)", fullWidth: true, multiline: true, rows: 2, value: formData.notes, onChange: (e) => setFormData({ ...formData, notes: e.target.value }), placeholder: "Additional notes about this sale" })] }) }), _jsxs(DialogActions, { sx: { p: 2 }, children: [_jsx(Button, { onClick: handleClose, children: "Cancel" }), _jsxs(Button, { onClick: handleSubmit, variant: "contained", size: "large", children: [editingSale ? 'Update' : 'Record', " Sale"] })] })] })] }));
}
