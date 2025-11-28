import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Box, Grid, Paper, Typography, Card, CardContent, Button, SpeedDial, SpeedDialAction, SpeedDialIcon, Alert } from '@mui/material';
import { TrendingUp, TrendingDown, AccountBalance, ShoppingCart, AttachMoney as MoneyIcon, Inventory as MaterialsIcon, AccountBalance as SalariesIcon, Warning as WarningIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { FinancialCalculator } from '../services/financialCalculator';
import { InventoryService } from '../services/inventoryService';
import { apiService } from '../services/apiService';
export default function Dashboard() {
    const navigate = useNavigate();
    const [todayReport, setTodayReport] = useState(null);
    const [yesterdayReport, setYesterdayReport] = useState(null);
    const [inventoryStatus, setInventoryStatus] = useState(null);
    const [commissionSummary, setCommissionSummary] = useState([]);
    const [salarySummary, setSalarySummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [speedDialOpen, setSpeedDialOpen] = useState(false);
    useEffect(() => {
        loadDashboardData();
        // Reload inventory when component mounts or when navigating back
        const interval = setInterval(() => {
            loadInventoryStatus();
        }, 30000); // Refresh every 30 seconds
        // Refresh when window gains focus (user returns to tab)
        const handleFocus = () => {
            loadInventoryStatus();
            loadDashboardData(); // Also refresh expense data
        };
        window.addEventListener('focus', handleFocus);
        // Listen for expense updates
        const handleExpensesUpdated = () => {
            // Expenses updated, refreshing dashboard
            loadDashboardData();
        };
        window.addEventListener('expensesUpdated', handleExpensesUpdated);
        // Listen for salary payment updates
        const handleSalaryPaymentUpdated = () => {
            // Salary payment updated, refreshing dashboard
            loadDashboardData();
        };
        window.addEventListener('salaryPaymentUpdated', handleSalaryPaymentUpdated);
        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('expensesUpdated', handleExpensesUpdated);
            window.removeEventListener('salaryPaymentUpdated', handleSalaryPaymentUpdated);
        };
    }, []);
    // Add error boundary for dashboard loading
    useEffect(() => {
        const handleError = (event) => {
            console.error('Dashboard error:', event.error);
        };
        window.addEventListener('error', handleError);
        return () => window.removeEventListener('error', handleError);
    }, []);
    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const today = new Date();
            const yesterday = subDays(today, 1);
            const todayStart = startOfDay(today);
            const todayEnd = endOfDay(today);
            const yesterdayStart = startOfDay(yesterday);
            const yesterdayEnd = endOfDay(yesterday);
            const [todayData, yesterdayData] = await Promise.all([
                FinancialCalculator.generateReport('daily', todayStart, todayEnd),
                FinancialCalculator.generateReport('daily', yesterdayStart, yesterdayEnd)
            ]);
            // Dashboard data loaded
            setTodayReport(todayData);
            setYesterdayReport(yesterdayData);
            await Promise.all([
                loadInventoryStatus(),
                loadCommissionSummary(),
                loadSalarySummary()
            ]);
            // Dashboard data loaded successfully
        }
        catch (error) {
            console.error('❌ Error loading dashboard data:', error);
            // Set empty report so UI can still render
            setTodayReport({
                period: 'daily',
                startDate: startOfDay(new Date()),
                endDate: endOfDay(new Date()),
                totalRevenue: 0,
                totalExpenses: 0,
                totalSalaries: 0,
                materialCosts: 0,
                fuelCosts: 0,
                driverPayments: 0,
                profit: 0,
                profitMargin: 0
            });
        }
        finally {
            setLoading(false);
        }
    };
    const loadInventoryStatus = async () => {
        try {
            // Get threshold from settings, default to 4000
            let threshold = 4000; // Default threshold
            try {
                const settings = await apiService.getSettings();
                threshold = settings?.inventoryLowThreshold || 4000;
                // Inventory threshold loaded
            }
            catch (settingsError) {
                console.warn('⚠️ Could not load settings, using default threshold (4000):', settingsError);
                // Continue with default threshold
            }
            const status = await InventoryService.getInventoryStatus(threshold);
            setInventoryStatus(status);
            // Inventory status loaded
        }
        catch (error) {
            console.error('❌ Error loading inventory status:', error);
            // Don't set inventory status on error, so it just won't show
            // This allows the dashboard to still display other data
        }
    };
    const loadCommissionSummary = async () => {
        try {
            const employees = await apiService.getEmployees();
            const employeesList = Array.isArray(employees) ? employees : (employees.data || []);
            // Normalize employee data - handle both snake_case and camelCase
            // The backend should transform, but handle both formats as fallback
            const normalizedEmployees = employeesList.map(emp => {
                const normalized = {
                    id: emp.id,
                    name: emp.name,
                    email: emp.email,
                    phone: emp.phone,
                    role: emp.role,
                    salaryType: emp.salaryType || emp.salary_type || 'commission',
                    commissionRate: emp.commissionRate !== undefined && emp.commissionRate !== null
                        ? emp.commissionRate
                        : (emp.commission_rate !== undefined && emp.commission_rate !== null ? emp.commission_rate : null),
                    fixedSalary: emp.fixedSalary !== undefined && emp.fixedSalary !== null
                        ? emp.fixedSalary
                        : (emp.fixed_salary !== undefined && emp.fixed_salary !== null ? emp.fixed_salary : undefined),
                    createdAt: emp.createdAt || emp.created_at,
                    updatedAt: emp.updatedAt || emp.updated_at,
                };
                return normalized;
            });
            // Processing commission summary
            const commissionPromises = normalizedEmployees
                .filter(emp => (emp.salaryType === 'commission' || emp.salaryType === 'both') && emp.commissionRate && emp.id)
                .map(async (emp) => {
                try {
                    let commissionInfo;
                    if (emp.role === 'Packers' || emp.role === 'Packer') {
                        commissionInfo = await FinancialCalculator.calculateCommissionFromPackerEntries(emp.id);
                    }
                    else {
                        commissionInfo = await FinancialCalculator.calculateCommissionFromSales(emp.id);
                    }
                    return {
                        employeeId: emp.id,
                        employeeName: emp.name,
                        role: emp.role || 'General',
                        totalBags: commissionInfo.totalBags || 0,
                        commission: commissionInfo.commission || 0,
                    };
                }
                catch (error) {
                    console.error(`Error loading commission for ${emp.name}:`, error);
                    return null;
                }
            });
            const results = await Promise.all(commissionPromises);
            const validResults = results.filter((r) => r !== null);
            // Sort by commission descending and show all (up to 10), including those with 0 commission
            validResults.sort((a, b) => b.commission - a.commission);
            // Show all employees with commission rates, not just top 5
            setCommissionSummary(validResults.slice(0, 10));
        }
        catch (error) {
            console.error('❌ Error loading commission summary:', error);
            setCommissionSummary([]);
        }
    };
    const loadSalarySummary = async () => {
        try {
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            const [allPayments, employees] = await Promise.all([
                apiService.getSalaryPayments(),
                apiService.getEmployees()
            ]);
            const paymentsList = Array.isArray(allPayments) ? allPayments : [];
            const employeesList = Array.isArray(employees) ? employees : (employees.data || []);
            // Get payments for current month
            const thisMonthPayments = paymentsList.filter(p => {
                if (!p.paidDate)
                    return false;
                const paidDate = p.paidDate instanceof Date
                    ? p.paidDate
                    : new Date(typeof p.paidDate === 'string' ? p.paidDate : p.paidDate);
                // Check if date is valid
                if (isNaN(paidDate.getTime()))
                    return false;
                return paidDate >= startOfMonth && paidDate <= endOfMonth;
            });
            // Processing salary summary
            // Normalize employee data - handle both snake_case and camelCase
            const normalizedEmployees = employeesList.map(emp => {
                const normalized = {
                    id: emp.id,
                    name: emp.name,
                    email: emp.email,
                    phone: emp.phone,
                    role: emp.role,
                    salaryType: emp.salaryType || emp.salary_type || 'commission',
                    commissionRate: emp.commissionRate !== undefined && emp.commissionRate !== null
                        ? emp.commissionRate
                        : (emp.commission_rate !== undefined && emp.commission_rate !== null ? emp.commission_rate : null),
                    fixedSalary: emp.fixedSalary !== undefined && emp.fixedSalary !== null
                        ? emp.fixedSalary
                        : (emp.fixed_salary !== undefined && emp.fixed_salary !== null ? emp.fixed_salary : undefined),
                };
                return normalized;
            });
            // Calculate pending payments (employees with fixed/commission salaries but no payment this month)
            const employeesWithSalaries = normalizedEmployees.filter(emp => (emp.salaryType === 'fixed' || emp.salaryType === 'commission' || emp.salaryType === 'both') && emp.id);
            // Normalize employee IDs for comparison (handle both number and string)
            const paidEmployeeIds = new Set(thisMonthPayments.map(p => {
                const empId = p.employeeId;
                return typeof empId === 'string' ? parseInt(empId) : empId;
            }));
            const pendingCount = employeesWithSalaries.filter(emp => {
                const empId = typeof emp.id === 'string' ? parseInt(emp.id) : emp.id;
                return !paidEmployeeIds.has(empId);
            }).length;
            // For pending amount, we'd need to calculate expected salaries, but for now show count
            const summary = {
                pendingPayments: pendingCount,
                totalPendingAmount: 0, // Would need to calculate expected salaries
                paidThisMonth: thisMonthPayments.length,
                totalPaidAmount: thisMonthPayments.reduce((sum, p) => sum + (p.totalAmount || 0), 0),
            };
            setSalarySummary(summary);
        }
        catch (error) {
            console.error('❌ Error loading salary summary:', error);
            setSalarySummary(null);
        }
    };
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(amount);
    };
    if (loading) {
        return (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }, children: _jsx(Typography, { variant: "h6", children: "Loading dashboard data..." }) }));
    }
    // Show error state if data failed to load
    if (!todayReport && !loading) {
        return (_jsxs(Box, { children: [_jsx(Typography, { variant: "h4", gutterBottom: true, children: "Dashboard" }), _jsxs(Alert, { severity: "error", sx: { mt: 2 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Failed to load dashboard data" }), _jsx(Typography, { variant: "body2", children: "Please refresh the page or check your connection. If the problem persists, check the browser console for errors." }), _jsx(Button, { variant: "contained", onClick: loadDashboardData, sx: { mt: 2 }, children: "Retry" })] })] }));
    }
    const profitChange = todayReport && yesterdayReport
        ? todayReport.profit - yesterdayReport.profit
        : 0;
    const revenueChange = todayReport && yesterdayReport
        ? todayReport.totalRevenue - yesterdayReport.totalRevenue
        : 0;
    const stats = [
        {
            title: 'Today\'s Revenue',
            value: formatCurrency(todayReport?.totalRevenue || 0),
            change: revenueChange,
            icon: _jsx(ShoppingCart, { sx: { fontSize: 40 } }),
            color: '#1976d2',
            showChange: true
        },
        {
            title: 'Today\'s Profit',
            value: formatCurrency(todayReport?.profit || 0),
            change: profitChange,
            icon: _jsx(TrendingUp, { sx: { fontSize: 40 } }),
            color: (todayReport?.profit || 0) >= 0 ? '#2e7d32' : '#d32f2f',
            showChange: true
        },
        {
            title: 'Today\'s Expenses',
            value: formatCurrency(todayReport?.totalExpenses || 0),
            icon: _jsx(AccountBalance, { sx: { fontSize: 40 } }),
            color: '#ed6c02',
            showChange: false
        },
        {
            title: 'Profit Margin',
            value: `${(todayReport?.profitMargin || 0).toFixed(1)}%`,
            icon: _jsx(TrendingDown, { sx: { fontSize: 40 } }),
            color: (todayReport?.profitMargin || 0) >= 0 ? '#2e7d32' : '#d32f2f',
            showChange: false
        }
    ];
    return (_jsxs(Box, { children: [_jsx(Typography, { variant: "h4", gutterBottom: true, children: "Dashboard" }), _jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: format(new Date(), 'EEEE, MMMM d, yyyy') }), _jsx(Grid, { container: true, spacing: 3, sx: { mt: 2 }, children: stats.map((stat, index) => (_jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsx(CardContent, { children: _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs(Box, { children: [_jsx(Typography, { color: "text.secondary", gutterBottom: true, variant: "body2", children: stat.title }), _jsx(Typography, { variant: "h5", component: "div", children: stat.value }), stat.showChange && stat.change !== undefined && yesterdayReport && (_jsxs(Typography, { variant: "body2", sx: { color: stat.change >= 0 ? 'success.main' : 'error.main', mt: 1 }, children: [stat.change >= 0 ? '+' : '', formatCurrency(stat.change), " from yesterday"] })), !todayReport || (todayReport.totalRevenue === 0 && todayReport.totalExpenses === 0) ? (_jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mt: 1, fontStyle: 'italic' }, children: "No data for today yet" })) : null] }), _jsx(Box, { sx: { color: stat.color }, children: stat.icon })] }) }) }) }, index))) }), inventoryStatus && (_jsx(Grid, { container: true, spacing: 3, sx: { mt: 2 }, children: _jsx(Grid, { item: true, xs: 12, children: _jsx(Alert, { severity: inventoryStatus.needsRestock ? 'warning' : 'success', icon: inventoryStatus.needsRestock ? _jsx(WarningIcon, {}) : _jsx(CheckCircleIcon, {}), sx: { mb: 2 }, children: _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Material Inventory Status" }), _jsx(Typography, { variant: "body2", children: inventoryStatus.needsRestock
                                                ? `⚠️ Low inventory! Only ${inventoryStatus.totalRemainingBags.toLocaleString()} bags remaining. Restock needed.`
                                                : `✓ Inventory healthy: ${inventoryStatus.totalRemainingBags.toLocaleString()} bags available for production.` })] }), _jsx(Button, { variant: "contained", startIcon: _jsx(MaterialsIcon, {}), onClick: () => navigate('/materials'), children: "View Materials" })] }) }) }) })), inventoryStatus && (_jsxs(Grid, { container: true, spacing: 3, sx: { mt: 2 }, children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 2 }, children: [_jsx(MaterialsIcon, { sx: { mr: 1, color: 'primary.main' } }), _jsx(Typography, { variant: "h6", children: "Material Inventory" })] }), _jsxs(Box, { sx: { mb: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 1 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "Sachet Rolls" }), _jsxs(Typography, { variant: "body2", fontWeight: "bold", children: [inventoryStatus.sachetRolls.totalRolls, " rolls (", inventoryStatus.sachetRolls.totalBagsCapacity.toLocaleString(), " bags)"] })] }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 1 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "Remaining Capacity" }), _jsxs(Typography, { variant: "body2", fontWeight: "bold", color: "success.main", children: [inventoryStatus.sachetRolls.remainingBags.toLocaleString(), " bags"] })] }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 1 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "Packing Nylon" }), _jsxs(Typography, { variant: "body2", fontWeight: "bold", children: [inventoryStatus.packingNylon.totalPackages, " packages (", inventoryStatus.packingNylon.totalBagsCapacity.toLocaleString(), " bags)"] })] }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 1 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "Remaining Capacity" }), _jsxs(Typography, { variant: "body2", fontWeight: "bold", color: "success.main", children: [inventoryStatus.packingNylon.remainingBags.toLocaleString(), " bags"] })] }), _jsxs(Box, { sx: { mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 1 }, children: [_jsx(Typography, { variant: "body1", fontWeight: "bold", children: "Total Remaining" }), _jsxs(Typography, { variant: "h6", color: "primary.main", fontWeight: "bold", children: [inventoryStatus.totalRemainingBags.toLocaleString(), " bags"] })] }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "Total Used" }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: [inventoryStatus.totalUsedBags.toLocaleString(), " bags"] })] })] })] })] }) }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(Paper, { sx: { p: 3 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Quick Actions" }), _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }, children: [_jsx(Button, { variant: "outlined", startIcon: _jsx(ShoppingCart, {}), onClick: () => navigate('/sales'), fullWidth: true, sx: { justifyContent: 'flex-start' }, children: "Record Sale" }), _jsx(Button, { variant: "outlined", startIcon: _jsx(MoneyIcon, {}), onClick: () => navigate('/expenses'), fullWidth: true, sx: { justifyContent: 'flex-start' }, children: "Add Expense" }), _jsx(Button, { variant: "outlined", startIcon: _jsx(MaterialsIcon, {}), onClick: () => navigate('/materials'), fullWidth: true, sx: { justifyContent: 'flex-start' }, children: "Record Material Purchase" }), _jsx(Button, { variant: "outlined", startIcon: _jsx(SalariesIcon, {}), onClick: () => navigate('/salaries'), fullWidth: true, sx: { justifyContent: 'flex-start' }, children: "Record Salary Payment" })] })] }) })] })), _jsxs(Grid, { container: true, spacing: 3, sx: { mt: 2 }, children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(Paper, { sx: { p: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }, children: [_jsx(Typography, { variant: "h6", children: "Commissions" }), _jsx(Button, { variant: "outlined", size: "small", onClick: () => navigate('/commissions'), children: "View All" })] }), commissionSummary.length === 0 ? (_jsx(Alert, { severity: "info", sx: { mt: 2 }, children: _jsx(Typography, { variant: "body2", children: "No employees with commission rates found. Add employees with commission-based salaries to see commission data here." }) })) : (_jsxs(Box, { sx: { mt: 2 }, children: [_jsxs(Box, { sx: { mb: 2 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "Employees with Commissions (All Time)" }), commissionSummary.map((item, idx) => (_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 1, pb: 1, borderBottom: idx < commissionSummary.length - 1 ? 1 : 0, borderColor: 'divider' }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "body2", fontWeight: "medium", children: item.employeeName }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: [item.role, " \u2022 ", item.totalBags.toLocaleString(), " bags"] })] }), _jsx(Typography, { variant: "body2", fontWeight: "bold", color: item.commission > 0 ? "success.main" : "text.secondary", children: formatCurrency(item.commission) })] }, item.employeeId)))] }), _jsx(Box, { sx: { mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }, children: _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx(Typography, { variant: "body1", fontWeight: "bold", children: "Total Commissions" }), _jsx(Typography, { variant: "h6", color: "primary.main", fontWeight: "bold", children: formatCurrency(commissionSummary.reduce((sum, item) => sum + item.commission, 0)) })] }) })] }))] }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(Paper, { sx: { p: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }, children: [_jsx(Typography, { variant: "h6", children: "Salaries" }), _jsx(Button, { variant: "outlined", size: "small", onClick: () => navigate('/salaries'), children: "View All" })] }), !salarySummary ? (_jsx(Alert, { severity: "info", sx: { mt: 2 }, children: _jsx(Typography, { variant: "body2", children: "Loading salary information..." }) })) : (_jsxs(Box, { sx: { mt: 2 }, children: [_jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 6, children: _jsxs(Box, { sx: { textAlign: 'center', p: 2, backgroundColor: 'warning.light', borderRadius: 1 }, children: [_jsx(Typography, { variant: "h4", color: "warning.contrastText", fontWeight: "bold", children: salarySummary.pendingPayments }), _jsx(Typography, { variant: "body2", color: "warning.contrastText", children: "Pending Payments" })] }) }), _jsx(Grid, { item: true, xs: 6, children: _jsxs(Box, { sx: { textAlign: 'center', p: 2, backgroundColor: 'success.light', borderRadius: 1 }, children: [_jsx(Typography, { variant: "h4", color: "success.contrastText", fontWeight: "bold", children: salarySummary.paidThisMonth }), _jsx(Typography, { variant: "body2", color: "success.contrastText", children: "Paid This Month" })] }) })] }), _jsxs(Box, { sx: { mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 1 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "Total Paid This Month" }), _jsx(Typography, { variant: "body1", fontWeight: "bold", color: "success.main", children: formatCurrency(salarySummary.totalPaidAmount) })] }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "Today's Salaries" }), _jsx(Typography, { variant: "body1", fontWeight: "bold", children: formatCurrency(todayReport?.totalSalaries || 0) })] })] })] }))] }) })] }), todayReport && (_jsxs(Grid, { container: true, spacing: 3, sx: { mt: 2 }, children: [_jsx(Grid, { item: true, xs: 12, md: inventoryStatus ? 12 : 6, children: _jsxs(Paper, { sx: { p: 3 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Expense Breakdown" }), todayReport.totalExpenses === 0 ? (_jsx(Alert, { severity: "info", sx: { mt: 2 }, children: _jsx(Typography, { variant: "body2", children: "No expenses recorded for today. Add expenses to see the breakdown here." }) })) : (_jsxs(Box, { sx: { mt: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 1 }, children: [_jsx(Typography, { children: "Fuel" }), _jsx(Typography, { fontWeight: "bold", children: formatCurrency(todayReport.fuelCosts || 0) })] }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 1 }, children: [_jsx(Typography, { children: "Drivers Fuel" }), _jsx(Typography, { fontWeight: "bold", children: formatCurrency(todayReport.driverPayments || 0) })] }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 1 }, children: [_jsx(Typography, { children: "Materials" }), _jsx(Typography, { fontWeight: "bold", children: formatCurrency(todayReport.materialCosts || 0) })] }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx(Typography, { children: "Salaries" }), _jsx(Typography, { fontWeight: "bold", children: formatCurrency(todayReport.totalSalaries || 0) })] })] }))] }) }), !inventoryStatus && (_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(Paper, { sx: { p: 3 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Quick Actions" }), _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }, children: [_jsx(Button, { variant: "outlined", startIcon: _jsx(ShoppingCart, {}), onClick: () => navigate('/sales'), fullWidth: true, sx: { justifyContent: 'flex-start' }, children: "Record Sale" }), _jsx(Button, { variant: "outlined", startIcon: _jsx(MoneyIcon, {}), onClick: () => navigate('/expenses'), fullWidth: true, sx: { justifyContent: 'flex-start' }, children: "Add Expense" }), _jsx(Button, { variant: "outlined", startIcon: _jsx(MaterialsIcon, {}), onClick: () => navigate('/materials'), fullWidth: true, sx: { justifyContent: 'flex-start' }, children: "Record Material Purchase" }), _jsx(Button, { variant: "outlined", startIcon: _jsx(SalariesIcon, {}), onClick: () => navigate('/salaries'), fullWidth: true, sx: { justifyContent: 'flex-start' }, children: "Record Salary Payment" })] })] }) }))] })), _jsxs(SpeedDial, { ariaLabel: "Quick Actions", sx: { position: 'fixed', bottom: 16, right: 16 }, icon: _jsx(SpeedDialIcon, {}), open: speedDialOpen, onClose: () => setSpeedDialOpen(false), onOpen: () => setSpeedDialOpen(true), children: [_jsx(SpeedDialAction, { icon: _jsx(ShoppingCart, {}), tooltipTitle: "Record Sale", onClick: () => {
                            setSpeedDialOpen(false);
                            navigate('/sales');
                        } }), _jsx(SpeedDialAction, { icon: _jsx(MoneyIcon, {}), tooltipTitle: "Add Expense", onClick: () => {
                            setSpeedDialOpen(false);
                            navigate('/expenses');
                        } }), _jsx(SpeedDialAction, { icon: _jsx(MaterialsIcon, {}), tooltipTitle: "Add Material", onClick: () => {
                            setSpeedDialOpen(false);
                            navigate('/materials');
                        } }), _jsx(SpeedDialAction, { icon: _jsx(SalariesIcon, {}), tooltipTitle: "Record Salary", onClick: () => {
                            setSpeedDialOpen(false);
                            navigate('/salaries');
                        } })] })] }));
}
