import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Alert,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
} from '@mui/material';
import {
  Logout as LogoutIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
  Security as SecurityIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  ChevronLeft,
  ChevronRight,
  Visibility as VisibilityIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { User } from '../../types/auth';
import { ReceptionistSale, StorekeeperEntry, Settlement, AuditLog } from '../../types/sales-log';
import { Employee, Settings, DEFAULT_SETTINGS, BagPrice } from '../../types';
import { dbService } from '../../services/database';
import { authService } from '../../services/authService';
import { apiService } from '../../services/apiService';
import { useNavigate } from 'react-router-dom';
import { format, startOfYear, endOfYear, subYears, startOfMonth, endOfMonth, startOfDay, endOfDay, addDays, subDays, isSameDay } from 'date-fns';

interface DirectorDashboardProps {
  hideHeader?: boolean;
}

export default function DirectorDashboard({ hideHeader = false }: DirectorDashboardProps) {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [subTabValue, setSubTabValue] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sales, setSales] = useState<ReceptionistSale[]>([]);
  const [entries, setEntries] = useState<StorekeeperEntry[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [settlementPayments, setSettlementPayments] = useState<{ [settlementId: number]: any[] }>({});
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [settlementDetailsOpen, setSettlementDetailsOpen] = useState(false);
  
  // Load settlement payments when dialog opens
  useEffect(() => {
    if (settlementDetailsOpen && selectedSettlement?.id && !settlementPayments[selectedSettlement.id]) {
      apiService.getSettlementPayments(selectedSettlement.id)
        .then(data => {
          setSettlementPayments(prev => ({
            ...prev,
            [selectedSettlement.id!]: data || []
          }));
        })
        .catch(error => {
          console.error('Error loading payments:', error);
          setSettlementPayments(prev => ({
            ...prev,
            [selectedSettlement.id!]: []
          }));
        });
    }
  }, [settlementDetailsOpen, selectedSettlement?.id]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [bagPrices, setBagPrices] = useState<BagPrice[]>([]);
  const [materialPrices, setMaterialPrices] = useState<any[]>([]);
  const [editingMaterialPrice, setEditingMaterialPrice] = useState<any | null>(null);
  const [materialPriceDialogOpen, setMaterialPriceDialogOpen] = useState(false);
  const [materialPriceFormData, setMaterialPriceFormData] = useState({
    type: 'sachet_roll' as 'sachet_roll' | 'packing_nylon',
    cost: 0,
    bagsPerUnit: 0,
    label: '',
    sortOrder: 0,
    isActive: true,
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'year' | 'month' | 'day' | 'range'>('year');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(),
    end: new Date(),
  });
  
  // Filters
  const [filterDriver, setFilterDriver] = useState<string>('all');
  const [filterSaleType, setFilterSaleType] = useState<string>('all');
  const [filterEntryType, setFilterEntryType] = useState<string>('all');
  const [filterEntityType, setFilterEntityType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  // User management dialogs
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    phone: '',
    email: '',
    password: '',
    pin: '',
    role: 'manager' as 'director' | 'manager' | 'receptionist' | 'storekeeper',
    name: '',
    twoFactorEnabled: false,
    isActive: true,
  });

  // Employee management dialogs
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeFormData, setEmployeeFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Driver' as 'Driver' | 'Packers',
  });

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth, selectedDate, dateRange, viewMode, tabValue, subTabValue]);

  const loadData = async () => {
    try {
      let startDate: Date;
      let endDate: Date;

      if (viewMode === 'year') {
        startDate = new Date(selectedYear, 0, 1);
        endDate = new Date(selectedYear, 11, 31, 23, 59, 59);
      } else if (viewMode === 'month') {
        startDate = startOfMonth(selectedMonth);
        endDate = endOfMonth(selectedMonth);
      } else if (viewMode === 'day') {
        startDate = startOfDay(selectedDate);
        endDate = endOfDay(selectedDate);
      } else {
        startDate = startOfDay(dateRange.start);
        endDate = endOfDay(dateRange.end);
      }

      if (tabValue === 0) {
        // Main dashboard view
        const [salesData, entriesData, settlementsData] = await Promise.all([
          apiService.getReceptionistSales(startDate, endDate),
          apiService.getStorekeeperEntries(startDate, endDate),
          apiService.getSettlements(startDate, endDate),
        ]);
        setSales(salesData);
        setEntries(entriesData);
        setSettlements(settlementsData);
      } else if (tabValue === 1) {
        // User management
        const usersData = await apiService.getUsers();
        setUsers(usersData);
      } else if (tabValue === 2) {
        // Employee management
        const employeesData = await apiService.getEmployees();
        setEmployees(employeesData.filter(e => e.role === 'Driver' || e.role === 'Packers'));
      } else if (tabValue === 3) {
        // Audit logs
        const logsData = await apiService.getAuditLogs(undefined, undefined, startDate, endDate);
        setAuditLogs(logsData);
      } else if (tabValue === 4) {
        // Settings
        const [settingsData, bagPricesData, materialPricesData] = await Promise.all([
          apiService.getSettings(),
          apiService.getBagPrices(true), // Include inactive for management
          apiService.getMaterialPrices(undefined, true) // Include inactive for management
        ]);
        setSettings(settingsData || DEFAULT_SETTINGS);
        // API service already extracts data.data || data, so these should be arrays
        if (Array.isArray(bagPricesData)) {
          setBagPrices(bagPricesData);
          console.log('Loaded bag prices:', bagPricesData.length, 'prices');
        } else {
          console.error('Bag prices data is not an array:', bagPricesData);
          setBagPrices([]);
        }
        if (Array.isArray(materialPricesData)) {
          setMaterialPrices(materialPricesData);
          console.log('Loaded material prices:', materialPricesData.length, 'prices');
        } else {
          console.error('Material prices data is not an array:', materialPricesData);
          setMaterialPrices([]);
        }
      }
      
      // Load users for audit log display
      if (tabValue === 1 || tabValue === 3) {
        const usersData = await apiService.getUsers();
        setAllUsers(usersData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleOpenUserDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserFormData({
        phone: user.phone || '',
        email: user.email || '',
        password: '',
        pin: user.pin || '',
        role: user.role,
        name: user.name || '',
        twoFactorEnabled: user.twoFactorEnabled ?? false,
        isActive: user.isActive ?? true,
      });
    } else {
      setEditingUser(null);
      setUserFormData({
        phone: '',
        email: '',
        password: '',
        pin: '',
        role: 'manager',
        name: '',
        twoFactorEnabled: false,
        isActive: true,
      });
    }
    setUserDialogOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        await apiService.updateUser(editingUser.id!, userFormData);
      } else {
        await apiService.createUser(userFormData);
      }
      setUserDialogOpen(false);
      await loadData();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error saving user. Please try again.');
    }
  };

  const handleResetPin = async (userId: number) => {
    try {
      console.log('🔐 Resetting PIN for user:', userId);
      
      // Prompt director to enter new PIN
      const newPin = window.prompt(
        '🔐 Enter new PIN for user (4-6 digits):\n\n' +
        'The user will be required to change this PIN on their next login.',
        '1234'
      );
      
      if (!newPin) {
        console.log('PIN reset cancelled');
        return;
      }
      
      // Validate PIN
      if (!/^\d{4,6}$/.test(newPin)) {
        alert('❌ Invalid PIN. Must be 4-6 digits.');
        return;
      }
      
      // Get user info
      const user = users.find(u => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Update user via backend API
      await apiService.updateUser(userId, {
        pin: newPin,
        pinResetRequired: true
      });
      
      console.log('✅ PIN reset successful. New PIN:', newPin);
      
      alert(
        `✅ PIN reset successful!\n\n` +
        `User: ${user.name}\n` +
        `New temporary PIN: ${newPin}\n\n` +
        `The user will be required to change this PIN on their next login.`
      );
      
      await loadData();
    } catch (error) {
      console.error('❌ Error resetting PIN:', error);
      alert(`Error resetting PIN: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleOpenEmployeeDialog = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setEmployeeFormData({
        name: employee.name,
        email: employee.email,
        phone: employee.phone || '',
        role: (employee.role === 'Driver' || employee.role === 'Packers') ? employee.role : 'Driver',
      });
    } else {
      setEditingEmployee(null);
      setEmployeeFormData({
        name: '',
        email: '',
        phone: '',
        role: 'Driver',
      });
    }
    setEmployeeDialogOpen(true);
  };

  const handleSaveEmployee = async () => {
    try {
      if (editingEmployee) {
        await apiService.updateEmployee(editingEmployee.id!, {
          name: employeeFormData.name,
          email: employeeFormData.email,
          phone: employeeFormData.phone,
          role: employeeFormData.role,
        });
      } else {
        await apiService.createEmployee({
          name: employeeFormData.name,
          email: employeeFormData.email,
          phone: employeeFormData.phone,
          role: employeeFormData.role,
          salaryType: 'commission',
          commissionRate: employeeFormData.role === 'Driver' ? 15 : 4,
        });
      }
      setEmployeeDialogOpen(false);
      await loadData();
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Error saving employee. Please try again.');
    }
  };

  const handleAddPrice = async () => {
    try {
      const newPrice = await apiService.createBagPrice({
        amount: 250, // Default to 250, user can edit
        label: 'New Price',
        sortOrder: bagPrices.length + 1,
        isActive: true,
      });
      
      // Reload bag prices to get the updated list
      const updatedBagPrices = await apiService.getBagPrices(true); // Include inactive
      setBagPrices(updatedBagPrices || []);
      
      alert('New price added! Please update the amount and label.');
    } catch (error) {
      console.error('Error adding price:', error);
      alert('Error adding price. Please try again.');
    }
  };

  const handleUpdatePrice = async (priceId: number, updates: Partial<BagPrice>) => {
    try {
      await apiService.updateBagPrice(priceId, updates);
      // Update local state for immediate feedback
      setBagPrices(bagPrices.map(p => p.id === priceId ? { ...p, ...updates } : p));
    } catch (error) {
      console.error('Error updating price:', error);
      alert('Error updating price. Please try again.');
    }
  };

  const handleDeletePrice = async (priceId: number) => {
    if (!confirm('Are you sure you want to delete this price? This cannot be undone.')) {
      return;
    }
    try {
      await apiService.deleteBagPrice(priceId);
      // Reload bag prices to get the updated list
      const updatedBagPrices = await apiService.getBagPrices(true); // Include inactive
      setBagPrices(updatedBagPrices || []);
      alert('Price deleted successfully');
    } catch (error) {
      console.error('Error deleting price:', error);
      alert('Error deleting price. Please try again.');
    }
  };

  const handleSavePrices = async () => {
    try {
      // All prices are auto-saved on change, so just show confirmation
      alert('All bag prices saved successfully!');
    } catch (error) {
      console.error('Error saving prices:', error);
      alert('Error saving prices. Please try again.');
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Apply filters to sales
  const filteredSales = sales.filter(sale => {
    if (filterDriver !== 'all' && sale.driverName !== filterDriver) {
      return false;
    }
    if (filterSaleType !== 'all' && sale.saleType !== filterSaleType) {
      return false;
    }
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        (sale.driverName && sale.driverName.toLowerCase().includes(search)) ||
        sale.saleType.toLowerCase().includes(search) ||
        sale.totalBags.toString().includes(search) ||
        (sale.notes && sale.notes.toLowerCase().includes(search))
      );
    }
    return true;
  });

  // Apply filters to entries
  const filteredEntries = entries.filter(entry => {
    if (filterEntryType !== 'all' && entry.entryType !== filterEntryType) {
      return false;
    }
    if (filterDriver !== 'all') {
      if (entry.entryType === 'driver_pickup' && entry.driverName !== filterDriver) {
        return false;
      }
      if (entry.entryType === 'packer_production' && entry.packerName !== filterDriver) {
        return false;
      }
    }
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        (entry.driverName && entry.driverName.toLowerCase().includes(search)) ||
        (entry.packerName && entry.packerName.toLowerCase().includes(search)) ||
        entry.entryType.toLowerCase().includes(search) ||
        entry.bagsCount.toString().includes(search) ||
        (entry.notes && entry.notes.toLowerCase().includes(search))
      );
    }
    return true;
  });

  // Apply filters to audit logs
  const filteredAuditLogs = auditLogs.filter(log => {
    if (filterEntityType !== 'all' && log.entityType !== filterEntityType) {
      return false;
    }
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        log.entityType.toLowerCase().includes(search) ||
        log.action.toLowerCase().includes(search) ||
        (log.field && log.field.toLowerCase().includes(search)) ||
        (log.oldValue && log.oldValue.toString().toLowerCase().includes(search)) ||
        (log.newValue && log.newValue.toString().toLowerCase().includes(search)) ||
        (log.reason && log.reason.toLowerCase().includes(search))
      );
    }
    return true;
  });

  return (
    <Box>
      {/* Header */}
      {!hideHeader && (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' }, 
          mb: { xs: 2, sm: 3 },
          gap: { xs: 2, sm: 0 }
        }}>
          <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            Director Dashboard
          </Typography>
          <Button
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            size={window.innerWidth < 600 ? 'small' : 'medium'}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Logout</Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Out</Box>
          </Button>
        </Box>
      )}

      {/* View Mode and Date Selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newMode) => {
                if (newMode) setViewMode(newMode);
              }}
              size="small"
            >
              <ToggleButton value="year">Year</ToggleButton>
              <ToggleButton value="month">Month</ToggleButton>
              <ToggleButton value="day">Day</ToggleButton>
              <ToggleButton value="range">Range</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {viewMode === 'year' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button onClick={() => setSelectedYear(selectedYear - 1)}>
                Previous Year
              </Button>
              <TextField
                type="number"
                label="Year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 120 }}
              />
              <Button onClick={() => setSelectedYear(new Date().getFullYear())}>
                Current Year
              </Button>
            </Box>
          )}

          {viewMode === 'month' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))}>
                Previous Month
              </Button>
              <TextField
                type="month"
                value={format(selectedMonth, 'yyyy-MM')}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-').map(Number);
                  setSelectedMonth(new Date(year, month - 1, 1));
                }}
                InputLabelProps={{ shrink: true }}
              />
              <Button onClick={() => setSelectedMonth(new Date())}>
                Current Month
              </Button>
            </Box>
          )}

          {viewMode === 'day' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
                <ChevronLeft />
              </IconButton>
              <TextField
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  setSelectedDate(date);
                }}
                InputLabelProps={{ shrink: true }}
              />
              <IconButton onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
                <ChevronRight />
              </IconButton>
              <Button onClick={() => setSelectedDate(new Date())}>
                Today
              </Button>
            </Box>
          )}

          {viewMode === 'range' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TextField
                label="Start Date"
                type="date"
                value={format(dateRange.start, 'yyyy-MM-dd')}
                onChange={(e) => {
                  setDateRange({ ...dateRange, start: new Date(e.target.value) });
                }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End Date"
                type="date"
                value={format(dateRange.end, 'yyyy-MM-dd')}
                onChange={(e) => {
                  setDateRange({ ...dateRange, end: new Date(e.target.value) });
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Filters */}
      {(tabValue === 0 || tabValue === 3) && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterIcon />
              <Typography variant="h6">Filters</Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  placeholder="Search..."
                />
              </Grid>

              {tabValue === 0 && subTabValue === 1 && (
                <>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Driver"
                      select
                      value={filterDriver}
                      onChange={(e) => setFilterDriver(e.target.value)}
                    >
                      <MenuItem value="all">All Drivers</MenuItem>
                      {employees.filter(e => e.role === 'Driver').map((emp) => (
                        <MenuItem key={emp.id} value={emp.name}>
                          {emp.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Sale Type"
                      select
                      value={filterSaleType}
                      onChange={(e) => setFilterSaleType(e.target.value)}
                    >
                      <MenuItem value="all">All Types</MenuItem>
                      <MenuItem value="driver">Driver Sale</MenuItem>
                      <MenuItem value="general">General Sales</MenuItem>
                      <MenuItem value="mini_store">Mini Store</MenuItem>
                    </TextField>
                  </Grid>
                </>
              )}

              {tabValue === 0 && subTabValue === 2 && (
                <>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Entry Type"
                      select
                      value={filterEntryType}
                      onChange={(e) => setFilterEntryType(e.target.value)}
                    >
                      <MenuItem value="all">All Types</MenuItem>
                      <MenuItem value="driver_pickup">Driver Pickup</MenuItem>
                      <MenuItem value="general_sales">General Sales</MenuItem>
                      <MenuItem value="ministore_pickup">Mini Store Pickup</MenuItem>
                      <MenuItem value="packer_production">Packer Production</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Driver/Packer"
                      select
                      value={filterDriver}
                      onChange={(e) => setFilterDriver(e.target.value)}
                    >
                      <MenuItem value="all">All</MenuItem>
                      {employees.map((emp) => (
                        <MenuItem key={emp.id} value={emp.name}>
                          {emp.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </>
              )}

              {tabValue === 3 && (
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Entity Type"
                    select
                    value={filterEntityType}
                    onChange={(e) => setFilterEntityType(e.target.value)}
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    <MenuItem value="receptionist_sale">Receptionist Sale</MenuItem>
                    <MenuItem value="storekeeper_entry">Storekeeper Entry</MenuItem>
                    <MenuItem value="settlement">Settlement</MenuItem>
                    <MenuItem value="user">User</MenuItem>
                  </TextField>
                </Grid>
              )}
            </Grid>
          </Stack>
        </Paper>
      )}

      {/* Main Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Overview" />
          <Tab label="User Management" />
          <Tab label="Employee Management" />
          <Tab label="Audit Logs" />
          <Tab label="Settings" />
        </Tabs>
      </Paper>

      {/* Overview Tab */}
      {tabValue === 0 && (
        <Box>
          <Paper sx={{ mb: 3 }}>
            <Tabs value={subTabValue} onChange={(_, newValue) => setSubTabValue(newValue)}>
              <Tab label="Manager View" />
              <Tab label="Receptionist View" />
              <Tab label="Storekeeper View" />
            </Tabs>
          </Paper>

          {subTabValue === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Manager View - {viewMode === 'year' ? selectedYear : 
                                viewMode === 'month' ? format(selectedMonth, 'MMMM yyyy') : 
                                viewMode === 'day' ? format(selectedDate, 'MMM d, yyyy') : 
                                `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`}
              </Typography>
              
              {/* Summary Cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Total Sales
                      </Typography>
                      <Typography variant="h4">{filteredSales.length}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Total Settlements
                      </Typography>
                      <Typography variant="h4">{settlements.length}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Total Settled
                      </Typography>
                      <Typography variant="h4">
                        {formatCurrency(settlements.reduce((sum, s) => sum + s.settledAmount, 0))}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Pending Balance
                      </Typography>
                      <Typography variant="h4" color="warning.main">
                        {formatCurrency(settlements.reduce((sum, s) => sum + s.remainingBalance, 0))}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Fully Settled
                      </Typography>
                      <Typography variant="h4" color="success.main">
                        {settlements.filter(s => s.isSettled).length}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Partially Settled
                      </Typography>
                      <Typography variant="h4" color="warning.main">
                        {settlements.filter(s => !s.isSettled && s.settledAmount > 0).length}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Unsettled
                      </Typography>
                      <Typography variant="h4" color="error.main">
                        {settlements.filter(s => s.settledAmount === 0).length}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Total Expected
                      </Typography>
                      <Typography variant="h4">
                        {formatCurrency(settlements.reduce((sum, s) => sum + s.expectedAmount, 0))}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Sales with Settlement Status Table */}
              <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
                Sales & Settlement Status
              </Typography>
              <TableContainer 
                component={Paper} 
                sx={{ 
                  mb: 4,
                  overflowX: 'auto',
                  '& .MuiTableCell-root': {
                    whiteSpace: { xs: 'nowrap', md: 'normal' },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }
                }}
              >
                <Table sx={{ minWidth: 800 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Driver</TableCell>
                      <TableCell>Price Breakdown</TableCell>
                      <TableCell>Total Bags</TableCell>
                      <TableCell>Expected Amount</TableCell>
                      <TableCell>Settlement Status</TableCell>
                      <TableCell>Settled Amount</TableCell>
                      <TableCell>Balance</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredSales.map((sale) => {
                      const settlement = settlements.find(s => s.receptionistSaleId === sale.id);
                      const expectedAmount = sale.expectedAmount || 0;
                      return (
                        <TableRow key={sale.id}>
                          <TableCell>{format(new Date(sale.date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            {sale.saleType === 'driver' ? 'Driver Sale' :
                             sale.saleType === 'general' ? 'General Sales' :
                             sale.saleType === 'mini_store' ? 'Mini Store' : sale.saleType}
                          </TableCell>
                          <TableCell>{sale.driverName || 'N/A'}</TableCell>
                          <TableCell>
                            {sale.priceBreakdown && sale.priceBreakdown.length > 0 ? (
                              <Box>
                                {sale.priceBreakdown.map((item, idx) => (
                                  <Typography key={idx} variant="body2">
                                    {item.bags.toLocaleString()} @ ₦{item.amount.toLocaleString()}
                                    {item.label ? ` (${item.label})` : ''}
                                  </Typography>
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                {sale.bagsAtPrice1 > 0 && `${sale.bagsAtPrice1} @ ₦250`}
                                {sale.bagsAtPrice1 > 0 && sale.bagsAtPrice2 > 0 && ', '}
                                {sale.bagsAtPrice2 > 0 && `${sale.bagsAtPrice2} @ ₦270`}
                                {!sale.bagsAtPrice1 && !sale.bagsAtPrice2 && 'N/A'}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{sale.totalBags.toLocaleString()}</TableCell>
                          <TableCell>{formatCurrency(expectedAmount)}</TableCell>
                          <TableCell>
                            {settlement ? (
                              <Chip 
                                label={settlement.isSettled ? 'Fully Settled' : 'Partially Settled'} 
                                color={settlement.isSettled ? 'success' : 'warning'}
                                size="small"
                              />
                            ) : (
                              <Chip label="Not Settled" color="error" size="small" />
                            )}
                          </TableCell>
                          <TableCell>
                            {settlement ? formatCurrency(settlement.settledAmount) : '₦0'}
                          </TableCell>
                          <TableCell>
                            {settlement ? (
                              <Typography 
                                variant="body2" 
                                color={settlement.remainingBalance > 0 ? 'warning.main' : 'success.main'}
                                fontWeight="bold"
                              >
                                {formatCurrency(settlement.remainingBalance)}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="error.main" fontWeight="bold">
                                {formatCurrency(expectedAmount)}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {settlement && (
                              <IconButton 
                                size="small" 
                                onClick={() => {
                                  setSelectedSettlement(settlement);
                                  setSettlementDetailsOpen(true);
                                }}
                                color="primary"
                              >
                                <VisibilityIcon />
                              </IconButton>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Settlements Table */}
              <Typography variant="h6" sx={{ mb: 2 }}>
                All Settlements
              </Typography>
              <TableContainer 
                component={Paper}
                sx={{
                  overflowX: 'auto',
                  '& .MuiTableCell-root': {
                    whiteSpace: { xs: 'nowrap', md: 'normal' },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }
                }}
              >
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Sale Date</TableCell>
                      <TableCell>Sale Type</TableCell>
                      <TableCell>Driver</TableCell>
                      <TableCell>Expected Amount</TableCell>
                      <TableCell>Settled Amount</TableCell>
                      <TableCell>Remaining Balance</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Payments</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {settlements.map((settlement) => {
                      const sale = sales.find(s => s.id === settlement.receptionistSaleId);
                      const payments = settlementPayments[settlement.id!] || [];
                      return (
                        <TableRow key={settlement.id}>
                          <TableCell>{format(new Date(settlement.date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            {sale ? format(new Date(sale.date), 'MMM d, yyyy') : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {sale ? (
                              sale.saleType === 'driver' ? 'Driver Sale' :
                              sale.saleType === 'general' ? 'General Sales' :
                              sale.saleType === 'mini_store' ? 'Mini Store' : sale.saleType
                            ) : 'N/A'}
                          </TableCell>
                          <TableCell>{sale?.driverName || 'N/A'}</TableCell>
                          <TableCell>{formatCurrency(settlement.expectedAmount)}</TableCell>
                          <TableCell>{formatCurrency(settlement.settledAmount)}</TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              color={settlement.remainingBalance > 0 ? 'warning.main' : 'success.main'}
                              fontWeight="bold"
                            >
                              {formatCurrency(settlement.remainingBalance)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={settlement.isSettled ? 'Fully Settled' : 'Pending'} 
                              color={settlement.isSettled ? 'success' : 'warning'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {settlementPayments[settlement.id!]?.length || 0} payment{(settlementPayments[settlement.id!]?.length || 0) !== 1 ? 's' : ''}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <IconButton 
                              size="small" 
                              onClick={() => {
                                setSelectedSettlement(settlement);
                                setSettlementDetailsOpen(true);
                              }}
                              color="primary"
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {subTabValue === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Receptionist Sales - {selectedYear}
              </Typography>
              <TableContainer 
                component={Paper}
                sx={{
                  overflowX: 'auto',
                  '& .MuiTableCell-root': {
                    whiteSpace: { xs: 'nowrap', md: 'normal' },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }
                }}
              >
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Driver</TableCell>
                      <TableCell>Price Breakdown</TableCell>
                      <TableCell>Total Bags</TableCell>
                      <TableCell>Expected Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredSales.map((sale) => {
                      const expectedAmount = sale.expectedAmount || 0;
                      return (
                        <TableRow key={sale.id}>
                          <TableCell>{format(new Date(sale.date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{sale.saleType}</TableCell>
                          <TableCell>{sale.driverName || 'N/A'}</TableCell>
                          <TableCell>
                            {sale.priceBreakdown && sale.priceBreakdown.length > 0 ? (
                              <Box>
                                {sale.priceBreakdown.map((item, idx) => (
                                  <Typography key={idx} variant="body2">
                                    {item.bags.toLocaleString()} @ ₦{item.amount.toLocaleString()}
                                    {item.label ? ` (${item.label})` : ''}
                                  </Typography>
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                {sale.bagsAtPrice1 > 0 && `${sale.bagsAtPrice1} @ ₦250`}
                                {sale.bagsAtPrice1 > 0 && sale.bagsAtPrice2 > 0 && ', '}
                                {sale.bagsAtPrice2 > 0 && `${sale.bagsAtPrice2} @ ₦270`}
                                {!sale.bagsAtPrice1 && !sale.bagsAtPrice2 && 'N/A'}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{sale.totalBags.toLocaleString()}</TableCell>
                          <TableCell>{formatCurrency(expectedAmount)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {subTabValue === 2 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Storekeeper Entries - {viewMode === 'year' ? selectedYear : 
                                          viewMode === 'month' ? format(selectedMonth, 'MMMM yyyy') : 
                                          viewMode === 'day' ? format(selectedDate, 'MMM d, yyyy') : 
                                          `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`}
                </Typography>
                <Chip 
                  label={`${filteredEntries.length} ${filteredEntries.length === 1 ? 'entry' : 'entries'}`} 
                  color="primary" 
                  variant="outlined"
                />
              </Box>
              {filteredEntries.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="h6" color="text.secondary">
                    No entries found matching the filters
                  </Typography>
                </Paper>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Driver/Packer</TableCell>
                        <TableCell>Bags</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{format(new Date(entry.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          {entry.entryType === 'driver_pickup' ? 'Driver Pickup' :
                           entry.entryType === 'general_sales' ? 'General Sales' :
                           entry.entryType === 'ministore_pickup' ? 'Mini Store Pickup' : 'Packer Production'}
                        </TableCell>
                        <TableCell>
                          {entry.entryType === 'ministore_pickup' ? 'Mini Store' : 
                           entry.driverName || entry.packerName || 'N/A'}
                        </TableCell>
                        <TableCell>{entry.bagsCount.toLocaleString()}</TableCell>
                      </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* User Management Tab */}
      {tabValue === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">User Accounts</Typography>
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => handleOpenUserDialog()}
            >
              Add User
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Phone/Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>2FA</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.phone || user.email}</TableCell>
                    <TableCell>
                      <Chip label={user.role} size="small" />
                    </TableCell>
                    <TableCell>
                      {user.twoFactorEnabled ? (
                        <Chip label="Enabled" color="success" size="small" />
                      ) : (
                        <Chip label="Disabled" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <Chip label="Active" color="success" size="small" />
                      ) : (
                        <Chip label="Inactive" color="error" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleOpenUserDialog(user)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {user.role !== 'director' && (
                        <Tooltip title="Reset PIN">
                          <IconButton size="small" onClick={() => handleResetPin(user.id!)}>
                            <SecurityIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Employee Management Tab */}
      {tabValue === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Drivers & Packers</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenEmployeeDialog()}
            >
              Add Employee
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>{emp.name}</TableCell>
                    <TableCell>{emp.email}</TableCell>
                    <TableCell>{emp.phone || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip label={emp.role} size="small" />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleOpenEmployeeDialog(emp)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Audit Logs Tab */}
      {tabValue === 3 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Audit Logs - {viewMode === 'year' ? selectedYear : 
                            viewMode === 'month' ? format(selectedMonth, 'MMMM yyyy') : 
                            viewMode === 'day' ? format(selectedDate, 'MMM d, yyyy') : 
                            `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`}
            </Typography>
            <Chip 
              label={`${filteredAuditLogs.length} ${filteredAuditLogs.length === 1 ? 'log' : 'logs'}`} 
              color="primary" 
              variant="outlined"
            />
          </Box>
          {filteredAuditLogs.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                No audit logs found matching the filters
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Entity</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Field</TableCell>
                    <TableCell>Old Value</TableCell>
                    <TableCell>New Value</TableCell>
                    <TableCell>Changed By</TableCell>
                    <TableCell>Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAuditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{format(new Date(log.changedAt), 'MMM d, yyyy HH:mm')}</TableCell>
                      <TableCell>{log.entityType}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.field || 'N/A'}</TableCell>
                      <TableCell>{log.oldValue || 'N/A'}</TableCell>
                      <TableCell>{log.newValue || 'N/A'}</TableCell>
                      <TableCell>
                        {allUsers.find(u => u.id === log.changedBy)?.name || `User ${log.changedBy}`}
                      </TableCell>
                      <TableCell>{log.reason || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* Settings Tab */}
      {tabValue === 4 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 3 }}>System Settings</Typography>
          
          <Grid container spacing={3}>
            {/* Bag Prices */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Bag Sales Prices
                  </Typography>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Configure the selling prices for bags. These prices are used for calculating expected settlement amounts.
                  </Alert>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Price 1 (₦)"
                        type="number"
                        value={settings.salesPrice1}
                        onChange={(e) => setSettings({ ...settings, salesPrice1: parseFloat(e.target.value) || 0 })}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                        }}
                        helperText="Default: ₦250 per bag"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Price 2 (₦)"
                        type="number"
                        value={settings.salesPrice2}
                        onChange={(e) => setSettings({ ...settings, salesPrice2: parseFloat(e.target.value) || 0 })}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                        }}
                        helperText="Default: ₦270 per bag"
                      />
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 3 }}>
                    <Button 
                      variant="contained" 
                      onClick={async () => {
                        try {
                          await apiService.updateSettings(settings);
                          alert('Prices updated successfully!');
                        } catch (error) {
                          console.error('Error updating settings:', error);
                          alert('Error updating settings. Please try again.');
                        }
                      }}
                    >
                      Save Prices
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Material Prices Management */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Material Prices
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        setEditingMaterialPrice(null);
                        setMaterialPriceFormData({
                          type: 'sachet_roll',
                          cost: 31000,
                          bagsPerUnit: 450,
                          label: '',
                          sortOrder: 0,
                          isActive: true,
                        });
                        setMaterialPriceDialogOpen(true);
                      }}
                    >
                      Add Material Price
                    </Button>
                  </Box>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Configure multiple price models for sachet rolls and packing nylon. These prices can be selected when entering sales.
                  </Alert>

                  {/* Sachet Roll Prices */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      Sachet Roll Prices
                    </Typography>
                    {materialPrices.filter(p => p.type === 'sachet_roll').length === 0 && (
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => {
                          setEditingMaterialPrice(null);
                          setMaterialPriceFormData({
                            type: 'sachet_roll',
                            cost: 31000,
                            bagsPerUnit: 450,
                            label: '',
                            sortOrder: 0,
                            isActive: true,
                          });
                          setMaterialPriceDialogOpen(true);
                        }}
                        size="small"
                      >
                        Add Sachet Roll Price
                      </Button>
                    )}
                  </Box>
                  {materialPrices.filter(p => p.type === 'sachet_roll').length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center', mb: 3 }}>
                      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                        No sachet roll prices configured yet.
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => {
                          setEditingMaterialPrice(null);
                          setMaterialPriceFormData({
                            type: 'sachet_roll',
                            cost: 31000,
                            bagsPerUnit: 450,
                            label: '',
                            sortOrder: 0,
                            isActive: true,
                          });
                          setMaterialPriceDialogOpen(true);
                        }}
                      >
                        Add Your First Sachet Roll Price
                      </Button>
                    </Paper>
                  ) : (
                    <TableContainer component={Paper} sx={{ mb: 3 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Label</TableCell>
                            <TableCell>Cost (₦)</TableCell>
                            <TableCell>Bags/Roll</TableCell>
                            <TableCell>Cost/Bag</TableCell>
                            <TableCell>Sort Order</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {materialPrices
                            .filter(p => p.type === 'sachet_roll')
                            .sort((a, b) => a.sortOrder - b.sortOrder)
                            .map((price) => (
                              <TableRow key={price.id}>
                                <TableCell>{price.label || 'Unnamed'}</TableCell>
                                <TableCell>{price.cost.toLocaleString()}</TableCell>
                                <TableCell>{price.bagsPerUnit.toLocaleString()}</TableCell>
                                <TableCell>₦{(price.cost / price.bagsPerUnit).toFixed(2)}</TableCell>
                                <TableCell>{price.sortOrder}</TableCell>
                                <TableCell>
                                  <Chip 
                                    label={price.isActive ? 'Active' : 'Inactive'} 
                                    color={price.isActive ? 'success' : 'default'} 
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>
                                  <IconButton size="small" onClick={() => {
                                    setEditingMaterialPrice(price);
                                    setMaterialPriceFormData({
                                      type: price.type,
                                      cost: price.cost,
                                      bagsPerUnit: price.bagsPerUnit,
                                      label: price.label || '',
                                      sortOrder: price.sortOrder,
                                      isActive: price.isActive,
                                    });
                                    setMaterialPriceDialogOpen(true);
                                  }}>
                                    <EditIcon />
                                  </IconButton>
                                  <IconButton size="small" onClick={async () => {
                                    if (window.confirm('Are you sure you want to delete this material price?')) {
                                      try {
                                        await apiService.deleteMaterialPrice(price.id!);
                                        await loadData();
                                      } catch (error) {
                                        console.error('Error deleting material price:', error);
                                        alert('Error deleting material price. Please try again.');
                                      }
                                    }
                                  }}>
                                    <DeleteIcon />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}

                  {/* Packing Nylon Prices */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      Packing Nylon Prices
                    </Typography>
                    {materialPrices.filter(p => p.type === 'packing_nylon').length === 0 && (
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => {
                          setEditingMaterialPrice(null);
                          setMaterialPriceFormData({
                            type: 'packing_nylon',
                            cost: 100000,
                            bagsPerUnit: 10000,
                            label: '',
                            sortOrder: 0,
                            isActive: true,
                          });
                          setMaterialPriceDialogOpen(true);
                        }}
                        size="small"
                      >
                        Add Packing Nylon Price
                      </Button>
                    )}
                  </Box>
                  {materialPrices.filter(p => p.type === 'packing_nylon').length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                        No packing nylon prices configured yet.
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => {
                          setEditingMaterialPrice(null);
                          setMaterialPriceFormData({
                            type: 'packing_nylon',
                            cost: 100000,
                            bagsPerUnit: 10000,
                            label: '',
                            sortOrder: 0,
                            isActive: true,
                          });
                          setMaterialPriceDialogOpen(true);
                        }}
                      >
                        Add Your First Packing Nylon Price
                      </Button>
                    </Paper>
                  ) : (
                    <TableContainer component={Paper}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Label</TableCell>
                            <TableCell>Cost (₦)</TableCell>
                            <TableCell>Bags/Package</TableCell>
                            <TableCell>Cost/Bag</TableCell>
                            <TableCell>Sort Order</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {materialPrices
                            .filter(p => p.type === 'packing_nylon')
                            .sort((a, b) => a.sortOrder - b.sortOrder)
                            .map((price) => (
                              <TableRow key={price.id}>
                                <TableCell>{price.label || 'Unnamed'}</TableCell>
                                <TableCell>{price.cost.toLocaleString()}</TableCell>
                                <TableCell>{price.bagsPerUnit.toLocaleString()}</TableCell>
                                <TableCell>₦{(price.cost / price.bagsPerUnit).toFixed(2)}</TableCell>
                                <TableCell>{price.sortOrder}</TableCell>
                                <TableCell>
                                  <Chip 
                                    label={price.isActive ? 'Active' : 'Inactive'} 
                                    color={price.isActive ? 'success' : 'default'} 
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>
                                  <IconButton size="small" onClick={() => {
                                    setEditingMaterialPrice(price);
                                    setMaterialPriceFormData({
                                      type: price.type,
                                      cost: price.cost,
                                      bagsPerUnit: price.bagsPerUnit,
                                      label: price.label || '',
                                      sortOrder: price.sortOrder,
                                      isActive: price.isActive,
                                    });
                                    setMaterialPriceDialogOpen(true);
                                  }}>
                                    <EditIcon />
                                  </IconButton>
                                  <IconButton size="small" onClick={async () => {
                                    if (window.confirm('Are you sure you want to delete this material price?')) {
                                      try {
                                        await apiService.deleteMaterialPrice(price.id!);
                                        await loadData();
                                      } catch (error) {
                                        console.error('Error deleting material price:', error);
                                        alert('Error deleting material price. Please try again.');
                                      }
                                    }
                                  }}>
                                    <DeleteIcon />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Bag Prices Management */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Bag Sales Prices
                  </Typography>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Add and manage unlimited bag prices. Receptionist will see all active prices when recording sales.
                  </Alert>
                  
                  {bagPrices.length === 0 ? (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      No bag prices found. Click "Add New Price" to create your first price tier.
                    </Alert>
                  ) : (
                    <Box sx={{ mb: 3 }}>
                      {bagPrices
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((price) => (
                        <Box 
                          key={price.id} 
                          sx={{ 
                            display: 'flex', 
                            gap: 2, 
                            mb: 2, 
                            alignItems: 'center',
                            p: 2,
                            bgcolor: price.isActive ? 'background.paper' : 'action.disabledBackground',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                          }}
                        >
                          <TextField
                            label="Price Amount (₦)"
                            type="number"
                            value={price.amount}
                            onChange={(e) => handleUpdatePrice(price.id!, { amount: parseFloat(e.target.value) || 0 })}
                            size="small"
                            sx={{ width: '150px' }}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                            }}
                          />
                          <TextField
                            label="Label"
                            value={price.label}
                            onChange={(e) => handleUpdatePrice(price.id!, { label: e.target.value })}
                            size="small"
                            sx={{ flexGrow: 1 }}
                            placeholder="e.g., Standard, Premium, Deluxe"
                          />
                          <TextField
                            label="Order"
                            type="number"
                            value={price.sortOrder}
                            onChange={(e) => handleUpdatePrice(price.id!, { sortOrder: parseInt(e.target.value) || 0 })}
                            size="small"
                            sx={{ width: '80px' }}
                            helperText="Display order"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={price.isActive}
                                onChange={(e) => handleUpdatePrice(price.id!, { isActive: e.target.checked })}
                                size="small"
                              />
                            }
                            label="Active"
                            labelPlacement="top"
                          />
                          <IconButton 
                            color="error" 
                            onClick={() => handleDeletePrice(price.id!)} 
                            size="small"
                            sx={{ ml: 1 }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button 
                      startIcon={<AddIcon />} 
                      onClick={handleAddPrice} 
                      variant="outlined"
                    >
                      Add New Price
                    </Button>
                    <Button 
                      variant="contained" 
                      onClick={handleSavePrices}
                    >
                      All Changes Saved ✓
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* User Dialog */}
      <Dialog 
        open={userDialogOpen} 
        onClose={() => setUserDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={window.innerWidth < 600}
        PaperProps={{
          sx: {
            m: { xs: 0, sm: 2 },
            height: { xs: '100%', sm: 'auto' }
          }
        }}
      >
        <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              fullWidth
              value={userFormData.name}
              onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
              required
            />
            <TextField
              label="Phone Number"
              fullWidth
              value={userFormData.phone}
              onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
              required={userFormData.role !== 'director'}
            />
            <TextField
              label="Email"
              fullWidth
              type="email"
              value={userFormData.email}
              onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              required={userFormData.role === 'director'}
            />
            <TextField
              label="Role"
              fullWidth
              select
              value={userFormData.role}
              onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as any })}
              required
            >
              <MenuItem value="director">Director</MenuItem>
              <MenuItem value="manager">Manager</MenuItem>
              <MenuItem value="receptionist">Receptionist</MenuItem>
              <MenuItem value="storekeeper">Storekeeper</MenuItem>
            </TextField>
            {!editingUser && (
              <>
                {userFormData.role === 'director' ? (
                  <TextField
                    label="Password"
                    fullWidth
                    type="password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    required
                  />
                ) : (
                  <TextField
                    label="PIN (4 digits)"
                    fullWidth
                    type="text"
                    value={userFormData.pin}
                    onChange={(e) => setUserFormData({ ...userFormData, pin: e.target.value })}
                    inputProps={{ maxLength: 4, pattern: '[0-9]*' }}
                    required
                  />
                )}
              </>
            )}
            {userFormData.role === 'director' && (
              <FormControlLabel
                control={
                  <Switch
                    checked={userFormData.twoFactorEnabled}
                    onChange={(e) => setUserFormData({ ...userFormData, twoFactorEnabled: e.target.checked })}
                  />
                }
                label="Enable 2FA"
              />
            )}
            <FormControlLabel
              control={
                <Switch
                  checked={userFormData.isActive}
                  onChange={(e) => setUserFormData({ ...userFormData, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveUser} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Employee Dialog */}
      <Dialog open={employeeDialogOpen} onClose={() => setEmployeeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              fullWidth
              value={employeeFormData.name}
              onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })}
              required
            />
            <TextField
              label="Email"
              fullWidth
              type="email"
              value={employeeFormData.email}
              onChange={(e) => setEmployeeFormData({ ...employeeFormData, email: e.target.value })}
              required
            />
            <TextField
              label="Phone"
              fullWidth
              value={employeeFormData.phone}
              onChange={(e) => setEmployeeFormData({ ...employeeFormData, phone: e.target.value })}
            />
            <TextField
              label="Role"
              fullWidth
              select
              value={employeeFormData.role}
              onChange={(e) => setEmployeeFormData({ ...employeeFormData, role: e.target.value as any })}
              required
            >
              <MenuItem value="Driver">Driver</MenuItem>
              <MenuItem value="Packers">Packer</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmployeeDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEmployee} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settlement Details Dialog */}
      <Dialog 
        open={settlementDetailsOpen} 
        onClose={() => setSettlementDetailsOpen(false)} 
        maxWidth="md" 
        fullWidth
        fullScreen={window.innerWidth < 960}
        PaperProps={{
          sx: {
            m: { xs: 0, sm: 2 },
            height: { xs: '100%', sm: 'auto' }
          }
        }}
      >
        <DialogTitle>Settlement Details</DialogTitle>
        <DialogContent>
          {selectedSettlement && (() => {
            const sale = sales.find(s => s.id === selectedSettlement.receptionistSaleId);
            const paymentsList = settlementPayments[selectedSettlement.id!] || [];
            return (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <Alert severity={selectedSettlement.isSettled ? 'success' : 'info'}>
                  This settlement is {selectedSettlement.isSettled ? 'fully settled' : 'partially settled'}.
                </Alert>

                <Typography variant="h6">Sale Information</Typography>
                <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Sale Date:</strong> {sale ? format(new Date(sale.date), 'MMM d, yyyy') : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Transaction Type:</strong> {
                          sale ? (
                            sale.saleType === 'driver' ? 'Driver Sale' :
                            sale.saleType === 'general' ? 'General Sales' :
                            sale.saleType === 'mini_store' ? 'Mini Store Dispatch' : sale.saleType
                          ) : 'N/A'
                        }
                      </Typography>
                    </Grid>
                    {sale?.driverName && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Driver:</strong> {sale.driverName}
                        </Typography>
                      </Grid>
                    )}
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Total Bags:</strong> {sale?.totalBags.toLocaleString() || 'N/A'}
                      </Typography>
                    </Grid>
                    {sale?.priceBreakdown && sale.priceBreakdown.length > 0 && (
                      <Grid item xs={12}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                          Price Breakdown:
                        </Typography>
                        {sale.priceBreakdown.map((item, idx) => (
                          <Typography key={idx} variant="body2" sx={{ ml: 2, mb: 0.5 }}>
                            • {item.bags.toLocaleString()} bags @ ₦{item.amount.toLocaleString()}
                            {item.label ? ` (${item.label})` : ''}
                            <span style={{ marginLeft: '8px', color: '#666' }}>
                              = ₦{(item.bags * item.amount).toLocaleString()}
                            </span>
                          </Typography>
                        ))}
                      </Grid>
                    )}
                  </Grid>
                </Box>

                <Typography variant="h6">Settlement Summary</Typography>
                <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body1" color="primary" sx={{ mb: 1 }}>
                        <strong>Expected Amount:</strong> {formatCurrency(selectedSettlement.expectedAmount)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body1" color="success.main" sx={{ mb: 1 }}>
                        <strong>Settled Amount:</strong> {formatCurrency(selectedSettlement.settledAmount)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body1" color={selectedSettlement.remainingBalance > 0 ? 'warning.main' : 'success.main'}>
                        <strong>Remaining Balance:</strong> {formatCurrency(selectedSettlement.remainingBalance)}
                      </Typography>
                    </Grid>
                  </Grid>
                  {selectedSettlement.isSettled && selectedSettlement.settledAt && (
                    <Typography variant="body2" color="success.main" sx={{ mt: 2 }}>
                      ✓ Fully Settled on {format(new Date(selectedSettlement.settledAt), 'MMM d, yyyy h:mm a')}
                    </Typography>
                  )}
                </Box>

                {paymentsList.length > 0 && (
                  <>
                    <Typography variant="h6">Payment History</Typography>
                    <TableContainer component={Paper}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>Paid By</TableCell>
                            <TableCell>Notes</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {paymentsList.map((payment) => {
                            const paidByUser = allUsers.find(u => u.id === payment.paidBy);
                            return (
                              <TableRow key={payment.id}>
                                <TableCell>
                                  {format(new Date(payment.paidAt), 'MMM d, yyyy h:mm a')}
                                </TableCell>
                                <TableCell>{formatCurrency(payment.amount)}</TableCell>
                                <TableCell>{paidByUser?.name || `User #${payment.paidBy}`}</TableCell>
                                <TableCell>{payment.notes || '-'}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettlementDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Material Price Dialog */}
      <Dialog 
        open={materialPriceDialogOpen} 
        onClose={() => setMaterialPriceDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={window.innerWidth < 600}
        PaperProps={{
          sx: {
            m: { xs: 0, sm: 2 },
            height: { xs: '100%', sm: 'auto' }
          }
        }}
      >
        <DialogTitle>
          {editingMaterialPrice ? 'Edit Material Price' : 'Add Material Price'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Type"
              fullWidth
              select
              value={materialPriceFormData.type}
              onChange={(e) => setMaterialPriceFormData({ ...materialPriceFormData, type: e.target.value as 'sachet_roll' | 'packing_nylon' })}
              required
            >
              <MenuItem value="sachet_roll">Sachet Roll</MenuItem>
              <MenuItem value="packing_nylon">Packing Nylon</MenuItem>
            </TextField>

            <TextField
              label="Label (Optional)"
              fullWidth
              value={materialPriceFormData.label}
              onChange={(e) => setMaterialPriceFormData({ ...materialPriceFormData, label: e.target.value })}
              placeholder="e.g., Supplier A, Premium Quality"
            />

            <TextField
              label={materialPriceFormData.type === 'sachet_roll' ? 'Cost per Roll (₦)' : 'Cost per Package (₦)'}
              fullWidth
              type="number"
              value={materialPriceFormData.cost}
              onChange={(e) => setMaterialPriceFormData({ ...materialPriceFormData, cost: parseFloat(e.target.value) || 0 })}
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">₦</InputAdornment>,
              }}
            />

            <TextField
              label={materialPriceFormData.type === 'sachet_roll' ? 'Bags per Roll' : 'Bags per Package'}
              fullWidth
              type="number"
              value={materialPriceFormData.bagsPerUnit}
              onChange={(e) => setMaterialPriceFormData({ ...materialPriceFormData, bagsPerUnit: parseInt(e.target.value) || 0 })}
              required
              inputProps={{ min: 1 }}
            />

            {materialPriceFormData.cost > 0 && materialPriceFormData.bagsPerUnit > 0 && (
              <Alert severity="info">
                Cost per bag: ₦{(materialPriceFormData.cost / materialPriceFormData.bagsPerUnit).toFixed(2)}
              </Alert>
            )}

            <TextField
              label="Sort Order"
              fullWidth
              type="number"
              value={materialPriceFormData.sortOrder}
              onChange={(e) => setMaterialPriceFormData({ ...materialPriceFormData, sortOrder: parseInt(e.target.value) || 0 })}
              helperText="Lower numbers appear first"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={materialPriceFormData.isActive}
                  onChange={(e) => setMaterialPriceFormData({ ...materialPriceFormData, isActive: e.target.checked })}
                />
              }
              label="Active (visible in sales entry)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMaterialPriceDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              try {
                if (!materialPriceFormData.cost || materialPriceFormData.cost <= 0) {
                  alert('Please enter a valid cost');
                  return;
                }
                if (!materialPriceFormData.bagsPerUnit || materialPriceFormData.bagsPerUnit <= 0) {
                  alert('Please enter a valid bags per unit');
                  return;
                }

                if (editingMaterialPrice) {
                  await apiService.updateMaterialPrice(editingMaterialPrice.id!, materialPriceFormData);
                  alert('Material price updated successfully!');
                } else {
                  await apiService.createMaterialPrice(materialPriceFormData);
                  alert('Material price created successfully!');
                }
                setMaterialPriceDialogOpen(false);
                await loadData();
              } catch (error) {
                console.error('Error saving material price:', error);
                alert('Error saving material price. Please try again.');
              }
            }}
          >
            {editingMaterialPrice ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

