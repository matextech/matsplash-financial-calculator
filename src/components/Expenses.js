import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Paper, Grid, Card, CardContent, IconButton, Divider, Chip, InputAdornment, Tooltip, ToggleButton, ToggleButtonGroup, Stack, } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, LocalGasStation as FuelIcon, DirectionsCar as DriverIcon, Receipt as OtherIcon, ChevronLeft, ChevronRight, } from '@mui/icons-material';
import { apiService } from '../services/apiService';
import { startOfDay, endOfDay, isSameDay, isToday, addDays, subDays } from 'date-fns';
export default function Expenses() {
    const [expenses, setExpenses] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('day');
    const [dateRange, setDateRange] = useState({
        start: new Date(),
        end: new Date(),
    });
    const [open, setOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    // Multi-entry form data
    const [formData, setFormData] = useState({
        date: new Date(),
        fuel: {
            amount: '',
            description: '',
            reference: '',
        },
        driverFuel: {
            amount: '',
            description: '',
            reference: '',
        },
        other: {
            amount: '',
            description: '',
            reference: '',
        },
    });
    useEffect(() => {
        loadExpenses();
    }, []);
    const loadExpenses = async () => {
        try {
            const data = await apiService.getExpenses();
            // apiService returns array directly
            const expensesList = Array.isArray(data) ? data : [];
            console.log('Expenses loaded:', expensesList.length, 'expenses');
            console.log('Expenses by type:', {
                fuel: expensesList.filter(e => e.type === 'fuel' || e.type === 'generator_fuel').length,
                driver_fuel: expensesList.filter(e => e.type === 'driver_fuel' || e.type === 'driver_payment').length,
                other: expensesList.filter(e => e.type === 'other').length,
            });
            setExpenses(expensesList);
        }
        catch (error) {
            console.error('Error loading expenses:', error);
            setExpenses([]);
        }
    };
    const getExpensesForDate = (date) => {
        return expenses.filter(expense => {
            const expenseDate = expense.date instanceof Date ? expense.date : new Date(expense.date);
            return isSameDay(expenseDate, date);
        });
    };
    const getExpensesForRange = (start, end) => {
        const startDay = startOfDay(start);
        const endDay = endOfDay(end);
        return expenses.filter(expense => {
            const expenseDate = expense.date instanceof Date ? expense.date : new Date(expense.date);
            return expenseDate >= startDay && expenseDate <= endDay;
        });
    };
    const currentExpenses = viewMode === 'day'
        ? getExpensesForDate(selectedDate)
        : getExpensesForRange(dateRange.start, dateRange.end);
    const groupedExpenses = {
        fuel: currentExpenses.filter(e => {
            const type = e.type || e.type;
            return type === 'fuel' || type === 'generator_fuel';
        }),
        driverFuel: currentExpenses.filter(e => {
            const type = e.type || e.type;
            return type === 'driver_fuel' || type === 'driver_payment';
        }),
        other: currentExpenses.filter(e => {
            const type = e.type || e.type;
            return type === 'other';
        }),
    };
    const totalByType = {
        fuel: groupedExpenses.fuel.reduce((sum, e) => sum + (e.amount || 0), 0),
        driverFuel: groupedExpenses.driverFuel.reduce((sum, e) => sum + (e.amount || 0), 0),
        other: groupedExpenses.other.reduce((sum, e) => sum + (e.amount || 0), 0),
    };
    const totalExpenses = totalByType.fuel + totalByType.driverFuel + totalByType.other;
    // Expenses loaded - no logging needed in production
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
    const handleOpen = (expense, date) => {
        if (expense) {
            setEditingExpense(expense);
            const expenseDate = expense.date instanceof Date ? expense.date : new Date(expense.date);
            const expenseType = expense.type || expense.type;
            setFormData({
                date: expenseDate,
                fuel: expenseType === 'fuel' || expenseType === 'generator_fuel'
                    ? { amount: expense.amount.toString(), description: expense.description, reference: expense.reference || '' }
                    : { amount: '', description: '', reference: '' },
                driverFuel: expenseType === 'driver_fuel' || expenseType === 'driver_payment'
                    ? { amount: expense.amount.toString(), description: expense.description, reference: expense.reference || '' }
                    : { amount: '', description: '', reference: '' },
                other: expenseType === 'other'
                    ? { amount: expense.amount.toString(), description: expense.description, reference: expense.reference || '' }
                    : { amount: '', description: '', reference: '' },
            });
            console.log('Form data set:', {
                fuel: expenseType === 'fuel' || expenseType === 'generator_fuel' ? expense.amount : 'empty',
                driverFuel: expenseType === 'driver_fuel' || expenseType === 'driver_payment' ? expense.amount : 'empty',
                other: expenseType === 'other' ? expense.amount : 'empty',
            });
        }
        else {
            setEditingExpense(null);
            setFormData({
                date: date || selectedDate,
                fuel: { amount: '', description: '', reference: '' },
                driverFuel: { amount: '', description: '', reference: '' },
                other: { amount: '', description: '', reference: '' },
            });
        }
        setOpen(true);
    };
    const handleClose = () => {
        setOpen(false);
        setEditingExpense(null);
    };
    const handleSubmit = async () => {
        try {
            // Helper function to validate and parse amount
            const parseAmount = (amountStr) => {
                if (!amountStr || amountStr.trim() === '')
                    return null;
                const parsed = parseFloat(amountStr);
                return isNaN(parsed) || parsed <= 0 ? null : parsed;
            };
            if (editingExpense?.id) {
                // Update single expense - determine which type based on which field has data
                // Check in order: fuel, driverFuel, other
                let expenseType = null;
                let amount = null;
                let description = '';
                let reference = '';
                const fuelAmount = parseAmount(formData.fuel.amount);
                const driverAmount = parseAmount(formData.driverFuel.amount);
                const otherAmount = parseAmount(formData.other.amount);
                if (fuelAmount !== null) {
                    expenseType = 'fuel';
                    amount = fuelAmount;
                    description = formData.fuel.description.trim() || 'Generator Fuel';
                    reference = formData.fuel.reference?.trim() || '';
                }
                else if (driverAmount !== null) {
                    expenseType = 'driver_fuel';
                    amount = driverAmount;
                    description = formData.driverFuel.description.trim() || 'Drivers Fuel';
                    reference = formData.driverFuel.reference?.trim() || '';
                }
                else if (otherAmount !== null) {
                    expenseType = 'other';
                    amount = otherAmount;
                    description = formData.other.description.trim() || 'Other expense';
                    reference = formData.other.reference?.trim() || '';
                }
                console.log('Editing expense:', {
                    originalId: editingExpense.id,
                    originalType: editingExpense.type,
                    fuelAmount,
                    driverAmount,
                    otherAmount,
                    selectedType: expenseType,
                    amount,
                    description
                });
                if (expenseType && amount !== null) {
                    const updateData = {
                        type: expenseType,
                        description,
                        amount,
                        date: formData.date,
                        reference: reference || undefined,
                    };
                    console.log('Updating expense with:', updateData);
                    try {
                        await apiService.updateExpense(editingExpense.id, updateData);
                        handleClose();
                        setTimeout(() => {
                            loadExpenses();
                        }, 100);
                        // Dispatch event to refresh dashboard
                        window.dispatchEvent(new Event('expensesUpdated'));
                    }
                    catch (error) {
                        console.error('Error updating expense:', error);
                        const errorMessage = error?.message || 'Error updating expense. Please try again.';
                        alert(errorMessage);
                    }
                }
                else {
                    alert('Please enter a valid amount for the expense.');
                    return;
                }
            }
            else {
                // Add multiple expenses - validate and save each type independently
                const expensesToSave = [];
                // Save fuel expense if provided
                const fuelAmount = parseAmount(formData.fuel.amount);
                if (fuelAmount !== null) {
                    expensesToSave.push({
                        type: 'fuel',
                        description: formData.fuel.description.trim() || 'Generator Fuel',
                        amount: fuelAmount,
                        date: formData.date,
                        reference: formData.fuel.reference?.trim() || undefined,
                    });
                }
                // Save driver fuel if provided
                const driverAmount = parseAmount(formData.driverFuel.amount);
                if (driverAmount !== null) {
                    expensesToSave.push({
                        type: 'driver_fuel',
                        description: formData.driverFuel.description.trim() || 'Drivers Fuel',
                        amount: driverAmount,
                        date: formData.date,
                        reference: formData.driverFuel.reference?.trim() || undefined,
                    });
                }
                // Save other expense if provided
                const otherAmount = parseAmount(formData.other.amount);
                if (otherAmount !== null) {
                    expensesToSave.push({
                        type: 'other',
                        description: formData.other.description.trim() || 'Other expense',
                        amount: otherAmount,
                        date: formData.date,
                        reference: formData.other.reference?.trim() || undefined,
                    });
                }
                if (expensesToSave.length === 0) {
                    alert('Please enter at least one expense amount.');
                    return;
                }
                console.log('Saving expenses:', expensesToSave);
                // Save all expenses sequentially
                for (const expense of expensesToSave) {
                    try {
                        const result = await apiService.createExpense(expense);
                        const id = result.id || result.data?.id;
                        console.log('Expense saved with ID:', id, expense);
                    }
                    catch (error) {
                        console.error('Error saving individual expense:', expense, error);
                        const errorMessage = error?.message || 'Error saving expense. Please try again.';
                        alert(errorMessage);
                        throw error;
                    }
                }
                console.log('All expenses saved successfully');
            }
            handleClose();
            // Reload expenses after a short delay to ensure DB is updated
            setTimeout(() => {
                loadExpenses();
                // Trigger a custom event to notify Dashboard to refresh
                window.dispatchEvent(new CustomEvent('expensesUpdated'));
            }, 100);
        }
        catch (error) {
            console.error('Error saving expenses:', error);
            const errorMessage = error?.message || 'Error saving expenses. Please try again.';
            alert(errorMessage);
        }
    };
    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this expense?')) {
            try {
                await apiService.deleteExpense(id);
                loadExpenses();
                // Trigger a custom event to notify Dashboard to refresh
                window.dispatchEvent(new CustomEvent('expensesUpdated'));
            }
            catch (error) {
                console.error('Error deleting expense:', error);
                alert('Error deleting expense. Please try again.');
            }
        }
    };
    const ExpenseCard = ({ title, icon, expenses, total, color }) => (_jsx(Card, { sx: { mb: 2 }, children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 2 }, children: [_jsx(Box, { sx: { color, mr: 1 }, children: icon }), _jsx(Typography, { variant: "h6", sx: { flexGrow: 1 }, children: title }), _jsx(Chip, { label: formatCurrency(total), color: "primary", size: "small" })] }), expenses.length === 0 ? (_jsxs(Typography, { variant: "body2", color: "text.secondary", sx: { py: 2, textAlign: 'center' }, children: ["No ", title.toLowerCase(), " expenses"] })) : (_jsx(Stack, { spacing: 1, children: expenses.map((expense) => (_jsx(Paper, { variant: "outlined", sx: { p: 1.5 }, children: _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }, children: [_jsxs(Box, { sx: { flexGrow: 1 }, children: [_jsx(Typography, { variant: "body2", fontWeight: "medium", children: expense.description }), expense.reference && (_jsxs(Typography, { variant: "caption", color: "text.secondary", children: ["Ref: ", expense.reference] }))] }), _jsx(Typography, { variant: "body2", fontWeight: "bold", sx: { mr: 1 }, children: formatCurrency(expense.amount) }), _jsxs(Box, { children: [_jsx(Tooltip, { title: "Edit", children: _jsx(IconButton, { size: "small", onClick: () => handleOpen(expense), children: _jsx(EditIcon, { fontSize: "small" }) }) }), _jsx(Tooltip, { title: "Delete", children: _jsx(IconButton, { size: "small", onClick: () => expense.id && handleDelete(expense.id), color: "error", children: _jsx(DeleteIcon, { fontSize: "small" }) }) })] })] }) }, expense.id))) }))] }) }));
    return (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }, children: [_jsx(Typography, { variant: "h4", children: "Daily Expenses" }), _jsx(Button, { variant: "contained", startIcon: _jsx(AddIcon, {}), onClick: () => handleOpen(), size: "large", children: "Add Expenses" })] }), viewMode === 'day' && (_jsx(Paper, { sx: { p: 2, mb: 3 }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(IconButton, { onClick: () => handleDateChange('prev'), children: _jsx(ChevronLeft, {}) }), _jsx(TextField, { type: "date", value: formatDateForInput(selectedDate), onChange: (e) => setSelectedDate(parseDateFromInput(e.target.value)), InputLabelProps: { shrink: true }, sx: { minWidth: 200 } }), _jsx(IconButton, { onClick: () => handleDateChange('next'), children: _jsx(ChevronRight, {}) }), !isToday(selectedDate) && (_jsx(Button, { variant: "outlined", size: "small", onClick: () => handleDateChange('today'), children: "Today" }))] }), _jsxs(ToggleButtonGroup, { value: viewMode, exclusive: true, onChange: (_, newMode) => newMode && setViewMode(newMode), size: "small", children: [_jsx(ToggleButton, { value: "day", children: "Day View" }), _jsx(ToggleButton, { value: "range", children: "Range View" })] })] }) })), viewMode === 'range' && (_jsx(Paper, { sx: { p: 2, mb: 3 }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }, children: [_jsx(TextField, { label: "Start Date", type: "date", value: formatDateForInput(dateRange.start), onChange: (e) => setDateRange({ ...dateRange, start: parseDateFromInput(e.target.value) }), InputLabelProps: { shrink: true } }), _jsx(TextField, { label: "End Date", type: "date", value: formatDateForInput(dateRange.end), onChange: (e) => setDateRange({ ...dateRange, end: parseDateFromInput(e.target.value) }), InputLabelProps: { shrink: true } }), _jsxs(ToggleButtonGroup, { value: viewMode, exclusive: true, onChange: (_, newMode) => newMode && setViewMode(newMode), size: "small", children: [_jsx(ToggleButton, { value: "day", children: "Day View" }), _jsx(ToggleButton, { value: "range", children: "Range View" })] })] }) })), _jsxs(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: [_jsx(Grid, { item: true, xs: 12, sm: 4, children: _jsx(Card, { sx: { backgroundColor: 'error.light', color: 'error.contrastText' }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Generator Fuel" }), _jsx(Typography, { variant: "h4", children: formatCurrency(totalByType.fuel) }), _jsxs(Typography, { variant: "body2", children: [groupedExpenses.fuel.length, " expense", groupedExpenses.fuel.length !== 1 ? 's' : ''] })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 4, children: _jsx(Card, { sx: { backgroundColor: 'info.light', color: 'info.contrastText' }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Drivers Fuel" }), _jsx(Typography, { variant: "h4", children: formatCurrency(totalByType.driverFuel) }), _jsxs(Typography, { variant: "body2", children: [groupedExpenses.driverFuel.length, " expense", groupedExpenses.driverFuel.length !== 1 ? 's' : ''] })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 4, children: _jsx(Card, { sx: { backgroundColor: 'primary.light', color: 'primary.contrastText' }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Total Expenses" }), _jsx(Typography, { variant: "h4", children: formatCurrency(totalExpenses) }), _jsxs(Typography, { variant: "body2", children: [currentExpenses.length, " total expense", currentExpenses.length !== 1 ? 's' : ''] })] }) }) })] }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 12, md: 4, children: _jsx(ExpenseCard, { title: "Generator Fuel", icon: _jsx(FuelIcon, {}), expenses: groupedExpenses.fuel, total: totalByType.fuel, color: "error.main" }) }), _jsx(Grid, { item: true, xs: 12, md: 4, children: _jsx(ExpenseCard, { title: "Drivers Fuel", icon: _jsx(DriverIcon, {}), expenses: groupedExpenses.driverFuel, total: totalByType.driverFuel, color: "info.main" }) }), _jsx(Grid, { item: true, xs: 12, md: 4, children: _jsx(ExpenseCard, { title: "Other Expenses", icon: _jsx(OtherIcon, {}), expenses: groupedExpenses.other, total: totalByType.other, color: "primary.main" }) })] }), _jsxs(Dialog, { open: open, onClose: handleClose, maxWidth: "md", fullWidth: true, children: [_jsx(DialogTitle, { children: editingExpense ? 'Edit Expense' : 'Add Daily Expenses' }), _jsx(DialogContent, { children: _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }, children: [_jsx(TextField, { label: "Date", type: "date", fullWidth: true, value: formatDateForInput(formData.date), onChange: (e) => setFormData({ ...formData, date: parseDateFromInput(e.target.value) }), InputLabelProps: { shrink: true }, required: true }), _jsx(Divider, { children: "Generator Fuel" }), _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2, p: 2, backgroundColor: 'error.50', borderRadius: 1 }, children: [_jsx(TextField, { label: "Generator Fuel Amount (\u20A6)", fullWidth: true, type: "number", value: formData.fuel.amount, onChange: (e) => setFormData({
                                                ...formData,
                                                fuel: { ...formData.fuel, amount: e.target.value }
                                            }), InputProps: {
                                                startAdornment: _jsx(InputAdornment, { position: "start", children: "\u20A6" }),
                                            }, placeholder: "Enter generator fuel amount" }), _jsx(TextField, { label: "Description", fullWidth: true, value: formData.fuel.description, onChange: (e) => setFormData({
                                                ...formData,
                                                fuel: { ...formData.fuel, description: e.target.value }
                                            }), placeholder: "e.g., Generator fuel for factory" }), _jsx(TextField, { label: "Reference (Optional)", fullWidth: true, value: formData.fuel.reference, onChange: (e) => setFormData({
                                                ...formData,
                                                fuel: { ...formData.fuel, reference: e.target.value }
                                            }), placeholder: "Trip ID, receipt number, etc." })] }), _jsx(Divider, { children: "Drivers Fuel" }), _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2, p: 2, backgroundColor: 'info.50', borderRadius: 1 }, children: [_jsx(TextField, { label: "Drivers Fuel Amount (\u20A6)", fullWidth: true, type: "number", value: formData.driverFuel.amount, onChange: (e) => setFormData({
                                                ...formData,
                                                driverFuel: { ...formData.driverFuel, amount: e.target.value }
                                            }), InputProps: {
                                                startAdornment: _jsx(InputAdornment, { position: "start", children: "\u20A6" }),
                                            }, placeholder: "Enter drivers fuel amount" }), _jsx(TextField, { label: "Description", fullWidth: true, value: formData.driverFuel.description, onChange: (e) => setFormData({
                                                ...formData,
                                                driverFuel: { ...formData.driverFuel, description: e.target.value }
                                            }), placeholder: "e.g., Fuel for driver vehicles" }), _jsx(TextField, { label: "Reference (Optional)", fullWidth: true, value: formData.driverFuel.reference, onChange: (e) => setFormData({
                                                ...formData,
                                                driverFuel: { ...formData.driverFuel, reference: e.target.value }
                                            }), placeholder: "Trip ID, driver name, etc." })] }), _jsx(Divider, { children: "Other Expenses" }), _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2, p: 2, backgroundColor: 'primary.50', borderRadius: 1 }, children: [_jsx(TextField, { label: "Other Expense Amount (\u20A6)", fullWidth: true, type: "number", value: formData.other.amount, onChange: (e) => setFormData({
                                                ...formData,
                                                other: { ...formData.other, amount: e.target.value }
                                            }), InputProps: {
                                                startAdornment: _jsx(InputAdornment, { position: "start", children: "\u20A6" }),
                                            }, placeholder: "Enter other expense amount" }), _jsx(TextField, { label: "Description", fullWidth: true, value: formData.other.description, onChange: (e) => setFormData({
                                                ...formData,
                                                other: { ...formData.other, description: e.target.value }
                                            }), placeholder: "e.g., Maintenance, supplies, etc." }), _jsx(TextField, { label: "Reference (Optional)", fullWidth: true, value: formData.other.reference, onChange: (e) => setFormData({
                                                ...formData,
                                                other: { ...formData.other, reference: e.target.value }
                                            }), placeholder: "Receipt number, invoice, etc." })] })] }) }), _jsxs(DialogActions, { sx: { p: 2 }, children: [_jsx(Button, { onClick: handleClose, children: "Cancel" }), _jsx(Button, { onClick: handleSubmit, variant: "contained", size: "large", children: editingExpense ? 'Update' : 'Save Expenses' })] })] })] }));
}
