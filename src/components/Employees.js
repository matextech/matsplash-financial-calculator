import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, MenuItem, Chip, InputAdornment, Tooltip, } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon, FilterList as FilterIcon, Clear as ClearIcon } from '@mui/icons-material';
import { apiService } from '../services/apiService';
export default function Employees() {
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [open, setOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        role: 'General',
        salaryType: 'fixed',
        fixedSalary: '',
        commissionRate: '',
    });
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [filterSalaryType, setFilterSalaryType] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    useEffect(() => {
        loadEmployees();
    }, []);
    useEffect(() => {
        applyFilters();
    }, [employees, searchTerm, filterRole, filterSalaryType]);
    const loadEmployees = async () => {
        try {
            const data = await apiService.getEmployees();
            // apiService returns { success: true, data: [...] } or direct array
            const employeesList = Array.isArray(data) ? data : (data.data || []);
            setEmployees(employeesList);
            setFilteredEmployees(employeesList);
        }
        catch (error) {
            console.error('Error loading employees:', error);
            setEmployees([]);
            setFilteredEmployees([]);
        }
    };
    const applyFilters = () => {
        let filtered = [...employees];
        // Search filter
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(e => e.name.toLowerCase().includes(search) ||
                e.email.toLowerCase().includes(search) ||
                (e.phone && e.phone.toLowerCase().includes(search)));
        }
        // Role filter
        if (filterRole !== 'all') {
            filtered = filtered.filter(e => e.role === filterRole);
        }
        // Salary type filter
        if (filterSalaryType !== 'all') {
            filtered = filtered.filter(e => e.salaryType === filterSalaryType);
        }
        setFilteredEmployees(filtered);
    };
    const clearFilters = () => {
        setSearchTerm('');
        setFilterRole('all');
        setFilterSalaryType('all');
    };
    const handleOpen = (employee) => {
        if (employee) {
            setEditingEmployee(employee);
            setFormData({
                name: employee.name,
                email: employee.email,
                phone: employee.phone || '',
                role: employee.role || 'General',
                salaryType: employee.salaryType,
                fixedSalary: employee.fixedSalary?.toString() || '',
                commissionRate: employee.commissionRate?.toString() || '',
            });
        }
        else {
            setEditingEmployee(null);
            setFormData({
                name: '',
                email: '',
                phone: '',
                role: 'General',
                salaryType: 'fixed',
                fixedSalary: '',
                commissionRate: '',
            });
        }
        setOpen(true);
    };
    const handleClose = () => {
        setOpen(false);
        setEditingEmployee(null);
    };
    const handleSubmit = async () => {
        const employeeData = {
            name: formData.name,
            email: formData.email,
            phone: formData.phone || undefined,
            role: formData.role || 'General',
            salaryType: formData.salaryType,
            fixedSalary: formData.fixedSalary ? parseFloat(formData.fixedSalary) : undefined,
            commissionRate: formData.commissionRate ? parseFloat(formData.commissionRate) : undefined,
        };
        try {
            if (editingEmployee?.id) {
                await apiService.updateEmployee(editingEmployee.id, employeeData);
            }
            else {
                await apiService.createEmployee(employeeData);
            }
            handleClose();
            loadEmployees();
            // Dispatch event to refresh dashboard
            window.dispatchEvent(new Event('expensesUpdated'));
        }
        catch (error) {
            console.error('Error saving employee:', error);
            const errorMessage = error?.message || 'Error saving employee. Please try again.';
            alert(errorMessage);
        }
    };
    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this employee?')) {
            try {
                await apiService.deleteEmployee(id);
                loadEmployees();
                // Dispatch event to refresh dashboard
                window.dispatchEvent(new Event('expensesUpdated'));
            }
            catch (error) {
                console.error('Error deleting employee:', error);
                alert('Error deleting employee. Please try again.');
            }
        }
    };
    const formatCurrency = (amount) => {
        if (!amount)
            return 'N/A';
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(amount);
    };
    return (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }, children: [_jsx(Typography, { variant: "h4", children: "Employees" }), _jsxs(Box, { sx: { display: 'flex', gap: 1 }, children: [_jsx(Button, { variant: "outlined", startIcon: _jsx(FilterIcon, {}), onClick: () => setShowFilters(!showFilters), children: "Filters" }), _jsx(Button, { variant: "contained", startIcon: _jsx(AddIcon, {}), onClick: () => handleOpen(), children: "Add Employee" })] })] }), showFilters && (_jsx(Paper, { sx: { p: 2, mb: 3 }, children: _jsxs(Box, { sx: { display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsx(TextField, { placeholder: "Search employees...", size: "small", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), InputProps: {
                                startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(SearchIcon, {}) })),
                            }, sx: { minWidth: 250 } }), _jsxs(TextField, { label: "Role", size: "small", select: true, value: filterRole, onChange: (e) => setFilterRole(e.target.value), sx: { minWidth: 150 }, children: [_jsx(MenuItem, { value: "all", children: "All Roles" }), _jsx(MenuItem, { value: "General", children: "General" }), _jsx(MenuItem, { value: "Driver", children: "Driver" }), _jsx(MenuItem, { value: "Packers", children: "Packers" }), _jsx(MenuItem, { value: "Manager", children: "Manager" })] }), _jsxs(TextField, { label: "Salary Type", size: "small", select: true, value: filterSalaryType, onChange: (e) => setFilterSalaryType(e.target.value), sx: { minWidth: 150 }, children: [_jsx(MenuItem, { value: "all", children: "All Types" }), _jsx(MenuItem, { value: "fixed", children: "Fixed Salary" }), _jsx(MenuItem, { value: "commission", children: "Commission Only" }), _jsx(MenuItem, { value: "both", children: "Fixed + Commission" })] }), (searchTerm || filterRole !== 'all' || filterSalaryType !== 'all') && (_jsx(Button, { size: "small", startIcon: _jsx(ClearIcon, {}), onClick: clearFilters, children: "Clear" }))] }) })), _jsx(Paper, { sx: { p: 2, mb: 3, backgroundColor: 'primary.light', color: 'primary.contrastText' }, children: _jsxs(Typography, { variant: "h6", children: ["Total Employees: ", filteredEmployees.length, " (", employees.length, " total)"] }) }), _jsx(TableContainer, { component: Paper, children: _jsxs(Table, { children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Name" }), _jsx(TableCell, { children: "Email" }), _jsx(TableCell, { children: "Phone" }), _jsx(TableCell, { children: "Role" }), _jsx(TableCell, { children: "Salary Type" }), _jsx(TableCell, { children: "Fixed Salary" }), _jsx(TableCell, { children: "Commission Rate (\u20A6 per bag)" }), _jsx(TableCell, { children: "Actions" })] }) }), _jsx(TableBody, { children: filteredEmployees.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 8, align: "center", children: _jsx(Typography, { color: "text.secondary", children: employees.length === 0 ? 'No employees found' : 'No employees match your filters' }) }) })) : (filteredEmployees.map((employee) => (_jsxs(TableRow, { hover: true, children: [_jsx(TableCell, { children: employee.name }), _jsx(TableCell, { children: employee.email }), _jsx(TableCell, { children: employee.phone || 'N/A' }), _jsx(TableCell, { children: _jsx(Chip, { label: employee.role || 'General', size: "small", color: employee.role === 'Manager'
                                                ? 'primary'
                                                : employee.role === 'Driver'
                                                    ? 'secondary'
                                                    : employee.role === 'Packers'
                                                        ? 'primary'
                                                        : 'default' }) }), _jsx(TableCell, { children: _jsx(Chip, { label: employee.salaryType, size: "small", color: employee.salaryType === 'fixed'
                                                ? 'primary'
                                                : employee.salaryType === 'commission'
                                                    ? 'secondary'
                                                    : 'success' }) }), _jsx(TableCell, { children: formatCurrency(employee.fixedSalary) }), _jsx(TableCell, { children: employee.commissionRate ? `₦${employee.commissionRate.toFixed(2)}/bag` : 'N/A' }), _jsxs(TableCell, { align: "center", children: [_jsx(Tooltip, { title: "Edit", children: _jsx(IconButton, { size: "small", onClick: () => handleOpen(employee), children: _jsx(EditIcon, { fontSize: "small" }) }) }), _jsx(Tooltip, { title: "Delete", children: _jsx(IconButton, { size: "small", onClick: () => employee.id && handleDelete(employee.id), color: "error", children: _jsx(DeleteIcon, { fontSize: "small" }) }) })] })] }, employee.id)))) })] }) }), _jsxs(Dialog, { open: open, onClose: handleClose, maxWidth: "sm", fullWidth: true, children: [_jsx(DialogTitle, { children: editingEmployee ? 'Edit Employee' : 'Add Employee' }), _jsx(DialogContent, { children: _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }, children: [_jsx(TextField, { label: "Name", fullWidth: true, value: formData.name, onChange: (e) => setFormData({ ...formData, name: e.target.value }) }), _jsx(TextField, { label: "Email", fullWidth: true, type: "email", value: formData.email, onChange: (e) => setFormData({ ...formData, email: e.target.value }) }), _jsx(TextField, { label: "Phone", fullWidth: true, value: formData.phone, onChange: (e) => setFormData({ ...formData, phone: e.target.value }) }), _jsxs(TextField, { label: "Role", fullWidth: true, select: true, value: formData.role, onChange: (e) => setFormData({ ...formData, role: e.target.value }), children: [_jsx(MenuItem, { value: "General", children: "General" }), _jsx(MenuItem, { value: "Driver", children: "Driver" }), _jsx(MenuItem, { value: "Packers", children: "Packers" }), _jsx(MenuItem, { value: "Manager", children: "Manager" })] }), _jsxs(TextField, { label: "Salary Type", fullWidth: true, select: true, value: formData.salaryType, onChange: (e) => setFormData({ ...formData, salaryType: e.target.value }), children: [_jsx(MenuItem, { value: "fixed", children: "Fixed Salary" }), _jsx(MenuItem, { value: "commission", children: "Commission Only" }), _jsx(MenuItem, { value: "both", children: "Fixed + Commission" })] }), (formData.salaryType === 'fixed' || formData.salaryType === 'both') && (_jsx(TextField, { label: "Fixed Salary (Monthly)", fullWidth: true, type: "number", value: formData.fixedSalary, onChange: (e) => setFormData({ ...formData, fixedSalary: e.target.value }) })), (formData.salaryType === 'commission' || formData.salaryType === 'both') && (_jsx(TextField, { label: "Commission Rate (\u20A6 per bag)", fullWidth: true, type: "number", value: formData.commissionRate, onChange: (e) => setFormData({ ...formData, commissionRate: e.target.value }), helperText: "Fixed amount per bag (e.g., \u20A615 for drivers, \u20A64 for packers)" }))] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: handleClose, children: "Cancel" }), _jsx(Button, { onClick: handleSubmit, variant: "contained", children: editingEmployee ? 'Update' : 'Add' })] })] })] }));
}
