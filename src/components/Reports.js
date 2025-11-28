import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Box, Typography, Paper, Grid, MenuItem, TextField, Button, Card, CardContent, } from '@mui/material';
// Using HTML5 date input to fix bundling issue
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, } from 'recharts';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subDays, subWeeks, subMonths, subQuarters, subYears, format, } from 'date-fns';
import { FinancialCalculator } from '../services/financialCalculator';
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
export default function Reports() {
    const [period, setPeriod] = useState('daily');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [historicalData, setHistoricalData] = useState([]);
    useEffect(() => {
        loadReport();
    }, [period, startDate, endDate]);
    const loadReport = async () => {
        try {
            setLoading(true);
            const start = startOfDay(startDate);
            const end = endOfDay(endDate);
            const reportData = await FinancialCalculator.generateReport(period, start, end);
            setReport(reportData);
            // Load historical data for charts
            await loadHistoricalData(period, start, end);
        }
        catch (error) {
            console.error('Error loading report:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const loadHistoricalData = async (periodType, currentStart, currentEnd) => {
        const dataPoints = [];
        const periods = 7; // Show last 7 periods
        for (let i = periods - 1; i >= 0; i--) {
            let periodStart;
            let periodEnd;
            switch (periodType) {
                case 'daily':
                    periodStart = startOfDay(subDays(currentStart, i));
                    periodEnd = endOfDay(subDays(currentStart, i));
                    break;
                case 'weekly':
                    periodStart = startOfWeek(subWeeks(currentStart, i));
                    periodEnd = endOfWeek(subWeeks(currentStart, i));
                    break;
                case 'monthly':
                    periodStart = startOfMonth(subMonths(currentStart, i));
                    periodEnd = endOfMonth(subMonths(currentStart, i));
                    break;
                case 'quarterly':
                    periodStart = startOfQuarter(subQuarters(currentStart, i));
                    periodEnd = endOfQuarter(subQuarters(currentStart, i));
                    break;
                case 'yearly':
                    periodStart = startOfYear(subYears(currentStart, i));
                    periodEnd = endOfYear(subYears(currentStart, i));
                    break;
                default:
                    periodStart = startOfDay(subDays(currentStart, i));
                    periodEnd = endOfDay(subDays(currentStart, i));
            }
            try {
                const periodReport = await FinancialCalculator.generateReport(periodType, periodStart, periodEnd);
                dataPoints.push({
                    period: format(periodStart, periodType === 'daily' ? 'MMM d' : periodType === 'yearly' ? 'yyyy' : 'MMM yyyy'),
                    revenue: periodReport.totalRevenue,
                    expenses: periodReport.totalExpenses,
                    profit: periodReport.profit,
                });
            }
            catch (error) {
                console.error('Error loading historical data:', error);
            }
        }
        setHistoricalData(dataPoints);
    };
    const handlePeriodChange = (newPeriod) => {
        setPeriod(newPeriod);
        const today = new Date();
        switch (newPeriod) {
            case 'daily':
                setStartDate(today);
                setEndDate(today);
                break;
            case 'weekly':
                setStartDate(startOfWeek(today));
                setEndDate(endOfWeek(today));
                break;
            case 'monthly':
                setStartDate(startOfMonth(today));
                setEndDate(endOfMonth(today));
                break;
            case 'quarterly':
                setStartDate(startOfQuarter(today));
                setEndDate(endOfQuarter(today));
                break;
            case 'yearly':
                setStartDate(startOfYear(today));
                setEndDate(endOfYear(today));
                break;
        }
    };
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(amount);
    };
    const expenseData = report ? [
        { name: 'Generator Fuel', value: report.fuelCosts },
        { name: 'Drivers Fuel', value: report.driverPayments },
        { name: 'Materials', value: report.materialCosts },
        { name: 'Salaries', value: report.totalSalaries },
    ] : [];
    if (loading) {
        return _jsx(Typography, { children: "Loading report..." });
    }
    return (_jsxs(Box, { children: [_jsx(Typography, { variant: "h4", gutterBottom: true, children: "Financial Reports" }), _jsxs(Box, { sx: { display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }, children: [_jsxs(TextField, { label: "Period", select: true, value: period, onChange: (e) => handlePeriodChange(e.target.value), sx: { minWidth: 150 }, children: [_jsx(MenuItem, { value: "daily", children: "Daily" }), _jsx(MenuItem, { value: "weekly", children: "Weekly" }), _jsx(MenuItem, { value: "monthly", children: "Monthly" }), _jsx(MenuItem, { value: "quarterly", children: "Quarterly" }), _jsx(MenuItem, { value: "yearly", children: "Yearly" })] }), _jsx(TextField, { label: "Start Date", type: "date", size: "small", value: startDate.toISOString().split('T')[0], onChange: (e) => setStartDate(new Date(e.target.value)), InputLabelProps: { shrink: true }, sx: { mr: 1 } }), _jsx(TextField, { label: "End Date", type: "date", size: "small", value: endDate.toISOString().split('T')[0], onChange: (e) => setEndDate(new Date(e.target.value)), InputLabelProps: { shrink: true }, sx: { mr: 1 } }), _jsx(Button, { variant: "contained", onClick: loadReport, children: "Refresh" })] }), report && (_jsxs(_Fragment, { children: [_jsxs(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { color: "text.secondary", gutterBottom: true, variant: "body2", children: "Total Revenue" }), _jsx(Typography, { variant: "h5", color: "success.main", children: formatCurrency(report.totalRevenue) })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { color: "text.secondary", gutterBottom: true, variant: "body2", children: "Total Expenses" }), _jsx(Typography, { variant: "h5", color: "error.main", children: formatCurrency(report.totalExpenses) })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { color: "text.secondary", gutterBottom: true, variant: "body2", children: "Profit" }), _jsx(Typography, { variant: "h5", color: report.profit >= 0 ? 'success.main' : 'error.main', children: formatCurrency(report.profit) })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { color: "text.secondary", gutterBottom: true, variant: "body2", children: "Profit Margin" }), _jsxs(Typography, { variant: "h5", color: report.profitMargin >= 0 ? 'success.main' : 'error.main', children: [report.profitMargin.toFixed(1), "%"] })] }) }) })] }), _jsxs(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(Paper, { sx: { p: 3 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Expense Breakdown" }), _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(PieChart, { children: [_jsx(Pie, { data: expenseData, cx: "50%", cy: "50%", labelLine: false, label: ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`, outerRadius: 80, fill: "#8884d8", dataKey: "value", children: expenseData.map((entry, index) => (_jsx(Cell, { fill: COLORS[index % COLORS.length] }, `cell-${index}`))) }), _jsx(Tooltip, { formatter: (value) => formatCurrency(value) })] }) })] }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(Paper, { sx: { p: 3 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Expense Details" }), _jsxs(Box, { sx: { mt: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 2 }, children: [_jsx(Typography, { children: "Generator Fuel" }), _jsx(Typography, { fontWeight: "bold", children: formatCurrency(report.fuelCosts) })] }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 2 }, children: [_jsx(Typography, { children: "Drivers Fuel" }), _jsx(Typography, { fontWeight: "bold", children: formatCurrency(report.driverPayments) })] }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 2 }, children: [_jsx(Typography, { children: "Material Costs" }), _jsx(Typography, { fontWeight: "bold", children: formatCurrency(report.materialCosts) })] }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx(Typography, { children: "Salaries" }), _jsx(Typography, { fontWeight: "bold", children: formatCurrency(report.totalSalaries) })] })] })] }) })] }), _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, children: _jsxs(Paper, { sx: { p: 3 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Revenue & Expenses Trend" }), _jsx(ResponsiveContainer, { width: "100%", height: 400, children: _jsxs(LineChart, { data: historicalData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "period" }), _jsx(YAxis, {}), _jsx(Tooltip, { formatter: (value) => formatCurrency(value) }), _jsx(Legend, {}), _jsx(Line, { type: "monotone", dataKey: "revenue", stroke: "#8884d8", name: "Revenue" }), _jsx(Line, { type: "monotone", dataKey: "expenses", stroke: "#82ca9d", name: "Expenses" }), _jsx(Line, { type: "monotone", dataKey: "profit", stroke: "#ffc658", name: "Profit" })] }) })] }) }), _jsx(Grid, { item: true, xs: 12, children: _jsxs(Paper, { sx: { p: 3 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Revenue vs Expenses Comparison" }), _jsx(ResponsiveContainer, { width: "100%", height: 400, children: _jsxs(BarChart, { data: historicalData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "period" }), _jsx(YAxis, {}), _jsx(Tooltip, { formatter: (value) => formatCurrency(value) }), _jsx(Legend, {}), _jsx(Bar, { dataKey: "revenue", fill: "#8884d8", name: "Revenue" }), _jsx(Bar, { dataKey: "expenses", fill: "#82ca9d", name: "Expenses" })] }) })] }) })] })] }))] }));
}
