import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Paper, Grid, Card, CardContent, IconButton, Divider, Chip, MenuItem, ToggleButton, ToggleButtonGroup, Stack, useMediaQuery, useTheme, } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, CalendarToday as CalendarIcon, Person as PersonIcon, Inventory as BagsIcon, ChevronLeft, ChevronRight, } from '@mui/icons-material';
import { apiService } from '../services/apiService';
import { format, startOfDay, endOfDay, isSameDay, isToday, addDays, subDays } from 'date-fns';
export default function Packers() {
    const [entries, setEntries] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('day');
    const [dateRange, setDateRange] = useState({
        start: new Date(),
        end: new Date(),
    });
    const [filterPacker, setFilterPacker] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [open, setOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [formData, setFormData] = useState({
        packerName: '',
        packerEmail: '',
        date: new Date(),
        bagsPacked: '',
        notes: '',
    });
    useEffect(() => {
        loadEntries();
        loadEmployees();
    }, []);
    const loadEntries = async () => {
        try {
            const data = await apiService.getPackerEntries();
            // Handle both array and object with data property
            const entriesList = Array.isArray(data) ? data : (data.data || []);
            console.log('Packer entries loaded:', entriesList.length, 'entries');
            setEntries(entriesList);
        }
        catch (error) {
            console.error('Error loading packer entries:', error);
            setEntries([]);
        }
    };
    const loadEmployees = async () => {
        try {
            const data = await apiService.getEmployees();
            // Handle both array and object with data property
            const employeesList = Array.isArray(data) ? data : (data.data || []);
            // Filter to only show packers
            const packers = employeesList.filter(emp => emp.role === 'Packers');
            setEmployees(packers);
        }
        catch (error) {
            console.error('Error loading employees:', error);
            setEmployees([]);
        }
    };
    const getEntriesForDate = (date) => {
        return entries.filter(entry => {
            const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
            return isSameDay(entryDate, date);
        });
    };
    const getEntriesForRange = (start, end) => {
        const startDay = startOfDay(start);
        const endDay = endOfDay(end);
        return entries.filter(entry => {
            const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
            return entryDate >= startDay && entryDate <= endDay;
        });
    };
    const currentEntries = viewMode === 'day'
        ? getEntriesForDate(selectedDate)
        : getEntriesForRange(dateRange.start, dateRange.end);
    // Filter by packer name
    let filteredEntries = currentEntries;
    if (filterPacker !== 'all') {
        filteredEntries = filteredEntries.filter(entry => entry.packerName.toLowerCase().includes(filterPacker.toLowerCase()));
    }
    // Search filter
    if (searchTerm) {
        filteredEntries = filteredEntries.filter(entry => entry.packerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (entry.notes && entry.notes.toLowerCase().includes(searchTerm.toLowerCase())));
    }
    const totalBags = filteredEntries.reduce((sum, entry) => sum + (entry.bagsPacked || 0), 0);
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
    const handleOpen = (entry, date) => {
        if (entry) {
            setEditingEntry(entry);
            const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
            setFormData({
                packerName: entry.packerName,
                packerEmail: entry.packerEmail || '',
                date: entryDate,
                bagsPacked: entry.bagsPacked.toString(),
                notes: entry.notes || '',
            });
        }
        else {
            setEditingEntry(null);
            setFormData({
                packerName: '',
                packerEmail: '',
                date: date || selectedDate,
                bagsPacked: '',
                notes: '',
            });
        }
        setOpen(true);
    };
    const handleClose = () => {
        setOpen(false);
        setEditingEntry(null);
        setFormData({
            packerName: '',
            packerEmail: '',
            date: new Date(),
            bagsPacked: '',
            notes: '',
        });
    };
    const handleSubmit = async () => {
        if (!formData.packerName.trim()) {
            alert('Please select or enter a packer name.');
            return;
        }
        const bagsPacked = parseInt(formData.bagsPacked);
        if (isNaN(bagsPacked) || bagsPacked <= 0) {
            alert('Please enter a valid number of bags packed.');
            return;
        }
        // Find matching employee by name
        let matchingEmployee;
        if (formData.packerName.trim()) {
            matchingEmployee = employees.find(emp => emp.name.toLowerCase().trim() === formData.packerName.toLowerCase().trim());
        }
        const entryData = {
            packerName: formData.packerName.trim(),
            packerEmail: formData.packerEmail?.trim() || undefined,
            employeeId: matchingEmployee?.id,
            bagsPacked: bagsPacked,
            date: formData.date,
            notes: formData.notes?.trim() || undefined,
        };
        try {
            if (editingEntry?.id) {
                await apiService.updatePackerEntry(editingEntry.id, entryData);
                console.log('Packer entry updated successfully');
            }
            else {
                await apiService.createPackerEntry(entryData);
                console.log('Packer entry added successfully');
            }
            handleClose();
            setTimeout(() => {
                loadEntries();
            }, 100);
        }
        catch (error) {
            console.error('Error saving packer entry:', error);
            const errorMessage = error?.message || 'Error saving packer entry. Please try again.';
            alert(errorMessage);
        }
    };
    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this packer entry?')) {
            return;
        }
        try {
            await apiService.deletePackerEntry(id);
            console.log('Packer entry deleted successfully');
            loadEntries();
        }
        catch (error) {
            console.error('Error deleting packer entry:', error);
            const errorMessage = error?.message || 'Error deleting packer entry. Please try again.';
            alert(errorMessage);
        }
    };
    // Get unique packer names for filter
    const uniquePackers = Array.from(new Set(entries.map(e => e.packerName))).sort();
    return (_jsxs(Box, { sx: { p: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }, children: [_jsxs(Typography, { variant: "h4", sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(BagsIcon, {}), "Packers - Bags Packed"] }), _jsx(Button, { variant: "contained", startIcon: _jsx(AddIcon, {}), onClick: () => handleOpen(), children: "Add Entry" })] }), _jsx(Box, { sx: { mb: 3 }, children: _jsxs(ToggleButtonGroup, { value: viewMode, exclusive: true, onChange: (e, newMode) => {
                        if (newMode !== null)
                            setViewMode(newMode);
                    }, "aria-label": "view mode", children: [_jsx(ToggleButton, { value: "day", children: "Day View" }), _jsx(ToggleButton, { value: "range", children: "Date Range" })] }) }), viewMode === 'day' ? (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }, children: [_jsx(IconButton, { onClick: () => handleDateChange('prev'), children: _jsx(ChevronLeft, {}) }), _jsx(Button, { variant: isToday(selectedDate) ? 'contained' : 'outlined', startIcon: _jsx(CalendarIcon, {}), onClick: () => handleDateChange('today'), children: isToday(selectedDate) ? 'Today' : format(selectedDate, 'MMM d, yyyy') }), _jsx(IconButton, { onClick: () => handleDateChange('next'), children: _jsx(ChevronRight, {}) }), !isToday(selectedDate) && (_jsx(TextField, { type: "date", size: "small", value: formatDateForInput(selectedDate), onChange: (e) => setSelectedDate(parseDateFromInput(e.target.value)), InputLabelProps: { shrink: true } }))] })) : (_jsxs(Box, { sx: { display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }, children: [_jsx(TextField, { label: "Start Date", type: "date", size: "small", value: formatDateForInput(dateRange.start), onChange: (e) => setDateRange({ ...dateRange, start: parseDateFromInput(e.target.value) }), InputLabelProps: { shrink: true } }), _jsx(TextField, { label: "End Date", type: "date", size: "small", value: formatDateForInput(dateRange.end), onChange: (e) => setDateRange({ ...dateRange, end: parseDateFromInput(e.target.value) }), InputLabelProps: { shrink: true } })] })), _jsxs(Box, { sx: { display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }, children: [_jsxs(TextField, { label: "Filter by Packer", select: true, size: "small", value: filterPacker, onChange: (e) => setFilterPacker(e.target.value), sx: { minWidth: 200 }, children: [_jsx(MenuItem, { value: "all", children: "All Packers" }), uniquePackers.map((name) => (_jsx(MenuItem, { value: name, children: name }, name)))] }), _jsx(TextField, { label: "Search", size: "small", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), placeholder: "Search by name or notes...", sx: { flexGrow: 1, maxWidth: 400 } })] }), _jsx(Card, { sx: { mb: 3 }, children: _jsx(CardContent, { children: _jsxs(Grid, { container: true, spacing: 2, children: [_jsxs(Grid, { item: true, xs: 12, sm: 6, md: 3, children: [_jsx(Typography, { color: "text.secondary", variant: "body2", children: "Total Entries" }), _jsx(Typography, { variant: "h5", children: filteredEntries.length })] }), _jsxs(Grid, { item: true, xs: 12, sm: 6, md: 3, children: [_jsx(Typography, { color: "text.secondary", variant: "body2", children: "Total Bags Packed" }), _jsx(Typography, { variant: "h5", color: "primary.main", children: totalBags.toLocaleString() })] })] }) }) }), filteredEntries.length === 0 ? (_jsxs(Paper, { sx: { p: 4, textAlign: 'center' }, children: [_jsx(Typography, { variant: "h6", color: "text.secondary", children: "No packer entries found for the selected period" }), _jsx(Button, { variant: "contained", startIcon: _jsx(AddIcon, {}), onClick: () => handleOpen(), sx: { mt: 2 }, children: "Add First Entry" })] })) : (_jsx(Grid, { container: true, spacing: 2, children: filteredEntries.map((entry) => (_jsx(Grid, { item: true, xs: 12, sm: 6, md: 4, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }, children: [_jsxs(Box, { children: [_jsxs(Typography, { variant: "h6", sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(PersonIcon, { color: "primary" }), entry.packerName] }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: format(new Date(entry.date), 'MMM d, yyyy') })] }), _jsxs(Box, { children: [_jsx(IconButton, { size: "small", onClick: () => handleOpen(entry), color: "primary", children: _jsx(EditIcon, {}) }), _jsx(IconButton, { size: "small", onClick: () => handleDelete(entry.id), color: "error", children: _jsx(DeleteIcon, {}) })] })] }), _jsx(Divider, { sx: { my: 2 } }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "Bags Packed" }), _jsx(Chip, { label: `${entry.bagsPacked.toLocaleString()} bags`, color: "primary", icon: _jsx(BagsIcon, {}) })] }), entry.notes && (_jsxs(Box, { sx: { mt: 2 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "Notes:" }), _jsx(Typography, { variant: "body2", children: entry.notes })] }))] }) }) }, entry.id))) })), _jsxs(Dialog, { open: open, onClose: handleClose, fullScreen: isMobile, maxWidth: "sm", fullWidth: true, children: [_jsx(DialogTitle, { children: editingEntry ? 'Edit Packer Entry' : 'Add Packer Entry' }), _jsx(DialogContent, { children: _jsxs(Stack, { spacing: 3, sx: { mt: 1 }, children: [_jsx(TextField, { label: "Packer Name", fullWidth: true, required: true, select: true, value: formData.packerName, onChange: (e) => {
                                        const selectedName = e.target.value;
                                        setFormData({ ...formData, packerName: selectedName });
                                        // Auto-fill email if employee found
                                        const employee = employees.find(emp => emp.name === selectedName);
                                        if (employee && employee.email) {
                                            setFormData(prev => ({ ...prev, packerEmail: employee.email }));
                                        }
                                    }, children: employees.map((employee) => (_jsx(MenuItem, { value: employee.name, children: employee.name }, employee.id))) }), _jsx(TextField, { label: "Packer Email (Optional)", fullWidth: true, value: formData.packerEmail, onChange: (e) => setFormData({ ...formData, packerEmail: e.target.value }), type: "email", placeholder: "packer@example.com" }), _jsx(TextField, { label: "Date", type: "date", fullWidth: true, required: true, value: formatDateForInput(formData.date), onChange: (e) => setFormData({ ...formData, date: parseDateFromInput(e.target.value) }), InputLabelProps: { shrink: true } }), _jsx(TextField, { label: "Number of Bags Packed", fullWidth: true, required: true, type: "number", value: formData.bagsPacked, onChange: (e) => setFormData({ ...formData, bagsPacked: e.target.value }), inputProps: { min: 0, step: 1 }, placeholder: "Enter number of bags", helperText: formData.bagsPacked ? `${formData.bagsPacked} bags will be recorded for ${formData.packerName || 'this packer'}` : 'Enter the number of bags packed' }), _jsx(TextField, { label: "Notes (Optional)", fullWidth: true, multiline: true, rows: 3, value: formData.notes, onChange: (e) => setFormData({ ...formData, notes: e.target.value }), placeholder: "Any additional notes..." })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: handleClose, children: "Cancel" }), _jsx(Button, { onClick: handleSubmit, variant: "contained", children: editingEntry ? 'Update' : 'Add' })] })] })] }));
}
