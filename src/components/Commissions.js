import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, Fragment } from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent, TextField, MenuItem, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, InputAdornment, Tooltip, IconButton, Collapse, } from '@mui/material';
import { TrendingUp as TrendingUpIcon, Person as PersonIcon, LocalShipping as ShippingIcon, FilterList as FilterIcon, Clear as ClearIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon, } from '@mui/icons-material';
import { apiService } from '../services/apiService';
import { FinancialCalculator } from '../services/financialCalculator';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
export default function Commissions() {
    const [employees, setEmployees] = useState([]);
    const [commissionData, setCommissionData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [expandedEmployees, setExpandedEmployees] = useState(new Set());
    // Filters
    const [filterEmployee, setFilterEmployee] = useState('all');
    const [filterRole, setFilterRole] = useState('all');
    const [dateRange, setDateRange] = useState('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(true);
    useEffect(() => {
        loadData();
    }, []);
    useEffect(() => {
        applyFilters();
    }, [commissionData, filterEmployee, filterRole, dateRange, customStartDate, customEndDate, searchTerm]);
    const loadData = async () => {
        try {
            const employeesData = await apiService.getEmployees();
            // Handle both array and object with data property
            const employeesList = Array.isArray(employeesData) ? employeesData : (employeesData.data || []);
            // Normalize employee data - handle both snake_case and camelCase
            const normalizedEmployees = employeesList.map(emp => ({
                ...emp,
                salaryType: emp.salaryType || emp.salary_type,
                commissionRate: emp.commissionRate !== undefined ? emp.commissionRate : (emp.commission_rate !== undefined ? emp.commission_rate : null),
                fixedSalary: emp.fixedSalary !== undefined ? emp.fixedSalary : (emp.fixed_salary !== undefined ? emp.fixed_salary : null),
                role: emp.role,
                id: emp.id,
                name: emp.name,
                email: emp.email,
            }));
            setEmployees(normalizedEmployees);
            // Calculate commission for each employee with commission rates
            // Include ALL employees with commission rates, even if they have 0 commission
            const commissionPromises = normalizedEmployees
                .filter(emp => (emp.salaryType === 'commission' || emp.salaryType === 'both') && emp.commissionRate)
                .map(async (emp) => {
                if (!emp.id)
                    return null;
                try {
                    let commissionInfo;
                    // Use packer entries for packers, sales for drivers and others
                    if (emp.role === 'Packers' || emp.role === 'Packer') {
                        commissionInfo = await FinancialCalculator.calculateCommissionFromPackerEntries(emp.id);
                        return {
                            employee: emp,
                            totalBags: commissionInfo.totalBags || 0,
                            commission: commissionInfo.commission || 0,
                            sales: [], // Packer entries don't have sales
                            salesCount: commissionInfo.entries?.length || 0, // Use entries count instead
                        };
                    }
                    else {
                        // Drivers and other roles use sales
                        commissionInfo = await FinancialCalculator.calculateCommissionFromSales(emp.id);
                        return {
                            employee: emp,
                            totalBags: commissionInfo.totalBags || 0,
                            commission: commissionInfo.commission || 0,
                            sales: commissionInfo.sales || [],
                            salesCount: commissionInfo.sales?.length || 0,
                        };
                    }
                }
                catch (error) {
                    console.error(`Error loading commission for employee ${emp.id}:`, error);
                    // Return employee with 0 values instead of null, so they still show up
                    return {
                        employee: emp,
                        totalBags: 0,
                        commission: 0,
                        sales: [],
                        salesCount: 0,
                    };
                }
            });
            const results = await Promise.all(commissionPromises);
            const validResults = results.filter((r) => r !== null);
            setCommissionData(validResults);
        }
        catch (error) {
            console.error('Error loading commission data:', error);
            setCommissionData([]);
        }
    };
    const getDateRange = () => {
        const today = new Date();
        switch (dateRange) {
            case 'today':
                return { start: startOfDay(today), end: endOfDay(today) };
            case 'week':
                return { start: startOfDay(subDays(today, 7)), end: endOfDay(today) };
            case 'month':
                return { start: startOfDay(subDays(today, 30)), end: endOfDay(today) };
            case 'custom':
                if (customStartDate && customEndDate) {
                    return {
                        start: startOfDay(new Date(customStartDate)),
                        end: endOfDay(new Date(customEndDate)),
                    };
                }
                return {};
            default:
                return {};
        }
    };
    const applyFilters = async () => {
        let filtered = [...commissionData];
        const { start, end } = getDateRange();
        // Filter by employee
        if (filterEmployee !== 'all') {
            filtered = filtered.filter(item => item.employee.id?.toString() === filterEmployee);
        }
        // Filter by role
        if (filterRole !== 'all') {
            filtered = filtered.filter(item => item.employee.role === filterRole);
        }
        // Filter by date range - recalculate commission for the date range
        if (start && end) {
            const filteredWithDates = await Promise.all(filtered.map(async (item) => {
                if (!item.employee.id)
                    return null;
                try {
                    let commissionInfo;
                    // Use packer entries for packers, sales for drivers and others
                    if (item.employee.role === 'Packers' || item.employee.role === 'Packer') {
                        commissionInfo = await FinancialCalculator.calculateCommissionFromPackerEntries(item.employee.id, start, end);
                        return {
                            ...item,
                            totalBags: commissionInfo.totalBags,
                            commission: commissionInfo.commission,
                            sales: [], // Packer entries don't have sales
                            salesCount: commissionInfo.entries.length, // Use entries count instead
                        };
                    }
                    else {
                        // Drivers and other roles use sales
                        commissionInfo = await FinancialCalculator.calculateCommissionFromSales(item.employee.id, start, end);
                        return {
                            ...item,
                            totalBags: commissionInfo.totalBags,
                            commission: commissionInfo.commission,
                            sales: commissionInfo.sales || [],
                            salesCount: commissionInfo.sales?.length || 0,
                        };
                    }
                }
                catch (error) {
                    console.error(`Error calculating commission for employee ${item.employee.id}:`, error);
                    return null;
                }
            }));
            filtered = filteredWithDates.filter((r) => r !== null);
        }
        // Filter by search term
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(item => item.employee.name.toLowerCase().includes(search) ||
                item.employee.email.toLowerCase().includes(search) ||
                item.totalBags.toString().includes(search) ||
                item.commission.toString().includes(search));
        }
        // Sort by commission (highest first)
        filtered.sort((a, b) => b.commission - a.commission);
        setFilteredData(filtered);
    };
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(amount);
    };
    const formatDateForInput = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const toggleEmployeeExpansion = (employeeId) => {
        const newExpanded = new Set(expandedEmployees);
        if (newExpanded.has(employeeId)) {
            newExpanded.delete(employeeId);
        }
        else {
            newExpanded.add(employeeId);
        }
        setExpandedEmployees(newExpanded);
    };
    const clearFilters = () => {
        setFilterEmployee('all');
        setFilterRole('all');
        setDateRange('all');
        setCustomStartDate('');
        setCustomEndDate('');
        setSearchTerm('');
    };
    const totalCommission = filteredData.reduce((sum, item) => sum + item.commission, 0);
    const totalBags = filteredData.reduce((sum, item) => sum + item.totalBags, 0);
    const totalSales = filteredData.reduce((sum, item) => sum + item.salesCount, 0);
    return (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }, children: [_jsx(Typography, { variant: "h4", children: "Employee Commissions" }), _jsxs(Box, { sx: { display: 'flex', gap: 1 }, children: [_jsx(Button, { variant: "outlined", startIcon: showFilters ? _jsx(FilterIcon, {}) : _jsx(FilterIcon, {}), onClick: () => setShowFilters(!showFilters), children: showFilters ? 'Hide Filters' : 'Show Filters' }), (filterEmployee !== 'all' || filterRole !== 'all' || dateRange !== 'all' || searchTerm) && (_jsx(Button, { variant: "outlined", startIcon: _jsx(ClearIcon, {}), onClick: clearFilters, children: "Clear Filters" }))] })] }), _jsx(Collapse, { in: showFilters, children: _jsx(Paper, { sx: { p: 2, mb: 3 }, children: _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(TextField, { label: "Search", fullWidth: true, size: "small", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), placeholder: "Name, email, bags, commission...", InputProps: {
                                        startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(PersonIcon, { fontSize: "small" }) })),
                                    } }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsxs(TextField, { label: "Filter by Employee", fullWidth: true, select: true, size: "small", value: filterEmployee, onChange: (e) => setFilterEmployee(e.target.value), children: [_jsx(MenuItem, { value: "all", children: "All Employees" }), employees
                                            .filter(emp => emp.salaryType === 'commission' || emp.salaryType === 'both')
                                            .map((emp) => (_jsx(MenuItem, { value: emp.id?.toString(), children: emp.name }, emp.id)))] }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsxs(TextField, { label: "Filter by Role", fullWidth: true, select: true, size: "small", value: filterRole, onChange: (e) => setFilterRole(e.target.value), children: [_jsx(MenuItem, { value: "all", children: "All Roles" }), _jsx(MenuItem, { value: "Driver", children: "Driver" }), _jsx(MenuItem, { value: "Packers", children: "Packers" }), _jsx(MenuItem, { value: "Manager", children: "Manager" }), _jsx(MenuItem, { value: "General", children: "General" })] }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsxs(TextField, { label: "Date Range", fullWidth: true, select: true, size: "small", value: dateRange, onChange: (e) => setDateRange(e.target.value), children: [_jsx(MenuItem, { value: "all", children: "All Time" }), _jsx(MenuItem, { value: "today", children: "Today" }), _jsx(MenuItem, { value: "week", children: "Last 7 Days" }), _jsx(MenuItem, { value: "month", children: "Last 30 Days" }), _jsx(MenuItem, { value: "custom", children: "Custom Range" })] }) }), dateRange === 'custom' && (_jsxs(_Fragment, { children: [_jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(TextField, { label: "Start Date", type: "date", fullWidth: true, size: "small", value: customStartDate, onChange: (e) => setCustomStartDate(e.target.value), InputLabelProps: { shrink: true } }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(TextField, { label: "End Date", type: "date", fullWidth: true, size: "small", value: customEndDate, onChange: (e) => setCustomEndDate(e.target.value), InputLabelProps: { shrink: true } }) })] }))] }) }) }), _jsxs(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, md: 4, children: _jsx(Card, { sx: { backgroundColor: 'primary.light', color: 'primary.contrastText' }, children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 1 }, children: [_jsx(TrendingUpIcon, { sx: { mr: 1 } }), _jsx(Typography, { variant: "h6", children: "Total Commission" })] }), _jsx(Typography, { variant: "h4", children: formatCurrency(totalCommission) }), _jsxs(Typography, { variant: "body2", children: [filteredData.length, " employee", filteredData.length !== 1 ? 's' : ''] })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 4, children: _jsx(Card, { sx: { backgroundColor: 'success.light', color: 'success.contrastText' }, children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 1 }, children: [_jsx(ShippingIcon, { sx: { mr: 1 } }), _jsx(Typography, { variant: "h6", children: "Total Bags Sold" })] }), _jsx(Typography, { variant: "h4", children: totalBags.toLocaleString() }), _jsx(Typography, { variant: "body2", children: "bags across all sales" })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 4, children: _jsx(Card, { sx: { backgroundColor: 'info.light', color: 'info.contrastText' }, children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 1 }, children: [_jsx(PersonIcon, { sx: { mr: 1 } }), _jsx(Typography, { variant: "h6", children: "Total Sales" })] }), _jsx(Typography, { variant: "h4", children: totalSales }), _jsxs(Typography, { variant: "body2", children: ["sale", totalSales !== 1 ? 's' : '', " recorded"] })] }) }) })] }), filteredData.length === 0 ? (_jsxs(Paper, { sx: { p: 4, textAlign: 'center' }, children: [_jsx(Typography, { variant: "h6", color: "text.secondary", gutterBottom: true, children: "No commission data found" }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: commissionData.length === 0
                            ? 'No employees with commission rates found. Add employees with commission-based salaries.'
                            : 'No data matches your current filters. Try adjusting your filters.' })] })) : (_jsx(TableContainer, { component: Paper, children: _jsxs(Table, { children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Employee" }), _jsx(TableCell, { children: "Role" }), _jsx(TableCell, { children: "Commission Rate" }), _jsx(TableCell, { align: "right", children: "Bags Sold" }), _jsx(TableCell, { align: "right", children: "Sales Count" }), _jsx(TableCell, { align: "right", children: "Total Commission" }), _jsx(TableCell, { children: "Details" })] }) }), _jsx(TableBody, { children: filteredData.map((item) => {
                                const isExpanded = expandedEmployees.has(item.employee.id || 0);
                                return (_jsxs(Fragment, { children: [_jsxs(TableRow, { hover: true, children: [_jsx(TableCell, { children: _jsxs(Box, { children: [_jsx(Typography, { variant: "body2", fontWeight: "bold", children: item.employee.name }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: item.employee.email })] }) }), _jsx(TableCell, { children: _jsx(Chip, { label: item.employee.role || 'General', size: "small", color: item.employee.role === 'Driver'
                                                            ? 'secondary'
                                                            : item.employee.role === 'Packers'
                                                                ? 'info'
                                                                : item.employee.role === 'Manager'
                                                                    ? 'primary'
                                                                    : 'default' }) }), _jsx(TableCell, { children: item.employee.commissionRate
                                                        ? `₦${item.employee.commissionRate.toFixed(2)}/bag`
                                                        : 'N/A' }), _jsx(TableCell, { align: "right", children: _jsx(Typography, { variant: "body2", fontWeight: "bold", children: item.totalBags.toLocaleString() }) }), _jsx(TableCell, { align: "right", children: item.salesCount }), _jsx(TableCell, { align: "right", children: _jsx(Typography, { variant: "body2", fontWeight: "bold", color: "success.main", children: formatCurrency(item.commission) }) }), _jsx(TableCell, { children: _jsx(Tooltip, { title: isExpanded ? 'Hide Details' : 'Show Details', children: _jsx(IconButton, { size: "small", onClick: () => item.employee.id && toggleEmployeeExpansion(item.employee.id), children: isExpanded ? _jsx(ExpandLessIcon, {}) : _jsx(ExpandMoreIcon, {}) }) }) })] }), isExpanded && (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 7, sx: { py: 2, backgroundColor: 'grey.50' }, children: _jsx(Box, { children: (item.employee.role === 'Packers' || item.employee.role === 'Packer') ? (_jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["Packer entries are tracked separately. Total bags packed: ", item.totalBags.toLocaleString()] })) : item.sales.length > 0 ? (_jsxs(_Fragment, { children: [_jsxs(Typography, { variant: "subtitle2", gutterBottom: true, fontWeight: "bold", children: ["Sales Details (", item.sales.length, " sale", item.sales.length !== 1 ? 's' : '', ")"] }), _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Date" }), _jsx(TableCell, { align: "right", children: "Bags" }), _jsx(TableCell, { align: "right", children: "Price/Bag" }), _jsx(TableCell, { align: "right", children: "Total Amount" }), _jsx(TableCell, { align: "right", children: "Commission" })] }) }), _jsx(TableBody, { children: item.sales
                                                                            .sort((a, b) => {
                                                                            const dateA = a.date instanceof Date ? a.date : new Date(a.date);
                                                                            const dateB = b.date instanceof Date ? b.date : new Date(b.date);
                                                                            return dateB.getTime() - dateA.getTime();
                                                                        })
                                                                            .map((sale) => {
                                                                            const saleDate = sale.date instanceof Date ? sale.date : new Date(sale.date);
                                                                            const saleCommission = sale.bagsSold * (item.employee.commissionRate || 0);
                                                                            return (_jsxs(TableRow, { children: [_jsx(TableCell, { children: format(saleDate, 'MMM d, yyyy') }), _jsx(TableCell, { align: "right", children: sale.bagsSold.toLocaleString() }), _jsxs(TableCell, { align: "right", children: ["\u20A6", sale.pricePerBag.toLocaleString()] }), _jsx(TableCell, { align: "right", children: formatCurrency(sale.totalAmount) }), _jsx(TableCell, { align: "right", children: _jsx(Typography, { variant: "body2", color: "success.main", children: formatCurrency(saleCommission) }) })] }, sale.id));
                                                                        }) })] })] })) : (_jsx(Typography, { variant: "body2", color: "text.secondary", children: "No sales or entries found for this employee in the selected period." })) }) }) }))] }, item.employee.id || `employee-${item.employee.email}`));
                            }) })] }) }))] }));
}
