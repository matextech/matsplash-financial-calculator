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
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Logout as LogoutIcon,
  Security as SecurityIcon,
  VerifiedUser as VerifiedUserIcon,
} from '@mui/icons-material';
import { StorekeeperEntry } from '../../types/sales-log';
import { Employee } from '../../types';
import { apiService } from '../../services/apiService';
import { authService } from '../../services/authService';
import { AuditService } from '../../services/auditService';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfDay, endOfDay, isSameDay } from 'date-fns';
import TwoFactorSetup from '../auth/TwoFactorSetup';
import { Tooltip } from '@mui/material';

export default function StorekeeperDashboard() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<StorekeeperEntry[]>([]);
  const [drivers, setDrivers] = useState<Employee[]>([]);
  const [packers, setPackers] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingEntry, setPendingEntry] = useState<Omit<StorekeeperEntry, 'id' | 'submittedAt' | 'submittedBy' | 'isSubmitted' | 'createdAt' | 'updatedAt'> | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'driver_pickup' | 'general_sales' | 'packer_production' | 'ministore_pickup'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | '2days' | 'custom'>('2days');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [twoFactorSetupOpen, setTwoFactorSetupOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    date: new Date(),
    entryType: 'driver_pickup' as 'driver_pickup' | 'general_sales' | 'packer_production' | 'ministore_pickup',
    driverId: '',
    packerId: '',
    bagsCount: '',
    notes: '',
  });

  // Initialize date from backend default report date
  useEffect(() => {
    const initDate = async () => {
      try {
        const result = await apiService.getDefaultReportDate();
        const dateStr = result?.date;
        if (dateStr) {
          const [year, month, day] = dateStr.split('-').map(Number);
          const ref = new Date(year, (month ?? 1) - 1, day ?? 1);
          setSelectedDate(ref);
          setFormData(prev => ({ ...prev, date: ref }));
        } else {
          const today = new Date();
          setSelectedDate(today);
        }
      } catch {
        // Fallback to local date if API fails
        const today = new Date();
        setSelectedDate(today);
      }
    };
    initDate();
  }, []);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    loadData();
  }, [selectedDate, dateFilter]);

  const loadCurrentUser = async () => {
    try {
      const session = authService.getCurrentSession();
      if (session) {
        const user = await apiService.getUser(session.userId);
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadData = async () => {
    try {
      if (!selectedDate) return;
      
      // Calculate date range based on dateFilter and selectedDate
      let startDate: Date;
      let endDate: Date;
      
      if (dateFilter === 'today') {
        startDate = startOfDay(selectedDate);
        endDate = endOfDay(selectedDate);
      } else if (dateFilter === 'yesterday') {
        const yesterday = subDays(selectedDate, 1);
        startDate = startOfDay(yesterday);
        endDate = endOfDay(yesterday);
      } else if (dateFilter === '2days') {
        const twoDaysAgo = subDays(selectedDate, 2);
        startDate = startOfDay(twoDaysAgo);
        endDate = endOfDay(selectedDate);
      } else {
        // custom - use selectedDate as reference
        startDate = startOfDay(selectedDate);
        endDate = endOfDay(selectedDate);
      }

      const [entriesData, employeesData] = await Promise.all([
        apiService.getStorekeeperEntries(startDate, endDate),
        apiService.getEmployees(),
      ]);

      setEntries(entriesData);
      setDrivers(employeesData.filter(e => e.role === 'Driver'));
      setPackers(employeesData.filter(e => e.role === 'Packers'));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleOpen = () => {
    setFormData({
      date: new Date(),
      entryType: 'driver_pickup',
      driverId: '',
      packerId: '',
      bagsCount: '',
      notes: '',
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setPendingEntry(null);
  };

  const handleSubmit = () => {
    const bagsCount = parseInt(formData.bagsCount) || 0;

    if (bagsCount === 0) {
      alert('Please enter the number of bags');
      return;
    }

    if (formData.entryType === 'driver_pickup' && !formData.driverId) {
      alert('Please select a driver');
      return;
    }

    if (formData.entryType === 'packer_production' && !formData.packerId) {
      alert('Please select a packer');
      return;
    }

    // Ministore pickup doesn't require driver or packer selection

    const session = authService.getCurrentSession();
    if (!session) {
      alert('Session expired. Please login again.');
      const secretPath = import.meta.env?.VITE_LOGIN_SECRET_PATH || 'matsplash-fin-2jg1wCHqcMOEhlBr';
      navigate(`/login/${secretPath}`);
      return;
    }

    const selectedDriver = formData.driverId ? drivers.find(d => d.id?.toString() === formData.driverId) : null;
    const selectedPacker = formData.packerId ? packers.find(p => p.id?.toString() === formData.packerId) : null;

    const entry: Omit<StorekeeperEntry, 'id' | 'submittedAt' | 'submittedBy' | 'isSubmitted' | 'createdAt' | 'updatedAt'> = {
      date: formData.date,
      entryType: formData.entryType,
      driverId: formData.entryType === 'driver_pickup' ? parseInt(formData.driverId) : undefined,
      driverName: formData.entryType === 'driver_pickup' && selectedDriver ? selectedDriver.name : undefined,
      packerId: formData.entryType === 'packer_production' ? parseInt(formData.packerId) : undefined,
      packerName: formData.entryType === 'packer_production' && selectedPacker ? selectedPacker.name : undefined,
      bagsCount: bagsCount,
      notes: formData.notes || undefined,
    };

    setPendingEntry(entry);
    setOpen(false);
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!pendingEntry) return;

    try {
      const session = authService.getCurrentSession();
      if (!session) {
        alert('Session expired. Please login again.');
        const secretPath = import.meta.env?.VITE_LOGIN_SECRET_PATH || 'matsplash-fin-2jg1wCHqcMOEhlBr';
      navigate(`/login/${secretPath}`);
        return;
      }

      const result = await apiService.createStorekeeperEntry({
        ...pendingEntry,
        submittedAt: new Date(),
        submittedBy: session.userId,
        isSubmitted: true,
      });

      // Log the submission
      if (result && result.id) {
        await AuditService.logSubmit('storekeeper_entry', result.id);
      }

      setConfirmOpen(false);
      setPendingEntry(null);
      await loadData();
      alert('Entry submitted successfully!');
    } catch (error) {
      console.error('Error submitting entry:', error);
      alert('Error submitting entry. Please try again.');
    }
  };

  const handleLogout = () => {
    authService.logout();
    const secretPath = import.meta.env?.VITE_LOGIN_SECRET_PATH || 'matsplash-fin-2jg1wCHqcMOEhlBr';
    navigate(`/login/${secretPath}`);
  };

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseDateFromInput = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Since backend already filters by date, just apply type filter
  // (The entries array already contains the date-filtered data from the API)
  const filteredEntries = filterType === 'all' 
    ? entries 
    : entries.filter(entry => entry.entryType === filterType);
  
  const visibleEntries = entries; // For backward compatibility with stats display

  // Group entries by type
  const groupedEntries = {
    driver_pickup: filteredEntries.filter(e => e.entryType === 'driver_pickup'),
    general_sales: filteredEntries.filter(e => e.entryType === 'general_sales'),
    packer_production: filteredEntries.filter(e => e.entryType === 'packer_production'),
    ministore_pickup: filteredEntries.filter(e => e.entryType === 'ministore_pickup'),
  };

  const todayEntries = visibleEntries.filter(entry => {
    const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
    return selectedDate ? isSameDay(entryDate, selectedDate) : false;
  });

  const getEntryTypeLabel = (type: string) => {
    switch (type) {
      case 'driver_pickup':
        return 'Driver Pickup';
      case 'general_sales':
        return 'General Sales';
      case 'packer_production':
        return 'Packer Production';
      case 'ministore_pickup':
        return 'Mini Store Pickup';
      default:
        return type;
    }
  };

  const renderEntryCard = (entry: StorekeeperEntry) => (
    <Card elevation={2} sx={{ 
      borderRadius: 2,
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: 4
      },
      height: '100%'
    }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
          <Box>
            <Typography variant="h6">
              {getEntryTypeLabel(entry.entryType)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {entry.entryType === 'ministore_pickup' ? 'Mini Store' : 
               entry.driverName || entry.packerName || 'N/A'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {format(new Date(entry.date), 'MMM d, yyyy')}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h5" color="primary">
              {entry.bagsCount.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              bags
            </Typography>
          </Box>
        </Box>
        {entry.notes && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Note: {entry.notes}
          </Typography>
        )}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          {entry.isSubmitted ? (
            <>
              <CheckCircleIcon color="success" fontSize="small" />
              <Typography variant="caption" color="success.main">
                Submitted {entry.submittedAt ? format(new Date(entry.submittedAt), 'MMM d, h:mm a') : ''}
              </Typography>
            </>
          ) : (
            <>
              <WarningIcon color="warning" fontSize="small" />
              <Typography variant="caption" color="warning.main">
                Pending submission
              </Typography>
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ 
      p: { xs: 1, sm: 2, md: 3 },
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <Paper elevation={3} sx={{ 
        p: { xs: 2, sm: 3 },
        mb: 3,
        background: 'linear-gradient(135deg, #3f7a6a 0%, #2d5a4f 100%)',
        color: 'white',
        borderRadius: 3
      }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' }, 
          gap: { xs: 2, sm: 0 }
        }}>
          <Typography variant="h4" sx={{ 
            fontSize: { xs: '1.5rem', sm: '2rem' },
            fontWeight: 700,
            textShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}>
            Storekeeper Dashboard
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {currentUser && !currentUser.twoFactorEnabled && (
              <Tooltip title="Enable 2FA">
                <IconButton
                  onClick={() => {
                    setTwoFactorSetupOpen(true);
                  }}
                  sx={{
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.2)',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.3)',
                    }
                  }}
                >
                  <SecurityIcon />
                </IconButton>
              </Tooltip>
            )}
            {currentUser && currentUser.twoFactorEnabled && (
              <Tooltip title="2FA Enabled">
                <span>
                  <IconButton
                    disabled
                    sx={{
                      color: 'white',
                      bgcolor: 'rgba(76, 175, 80, 0.3)',
                      cursor: 'not-allowed'
                    }}
                  >
                    <VerifiedUserIcon />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            <Button
              variant="contained"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'white',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.3)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              Logout
            </Button>
          </Box>
        </Box>
      </Paper>

      <Alert severity="info" sx={{ mb: 3 }}>
        You can only view entries from the last 2 days. Once submitted, entries cannot be modified.
      </Alert>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card elevation={3} sx={{ 
            borderRadius: 2,
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 6
            },
            background: 'linear-gradient(135deg, #3f7a6a 0%, #2d5a4f 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ opacity: 0.9, mb: 1 }} gutterBottom>
                Today's Entries
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {todayEntries.length}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                entries
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card elevation={3} sx={{ 
            borderRadius: 2,
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 6
            },
            background: 'linear-gradient(135deg, #5a9a8a 0%, #3f7a6a 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ opacity: 0.9, mb: 1 }} gutterBottom>
                Total Bags Today
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {todayEntries.reduce((sum, e) => sum + e.bagsCount, 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                bags
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card elevation={3} sx={{ 
            borderRadius: 2,
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 6
            },
            background: 'linear-gradient(135deg, #3f7a6a 0%, #5a9a8a 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ opacity: 0.9, mb: 1 }} gutterBottom>
                Last 2 Days
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {visibleEntries.length}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                total entries
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add Entry Button and Filters */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={handleOpen}
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1.5,
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: 3,
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 6
              },
              transition: 'all 0.3s ease'
            }}
          >
            Record Entry
          </Button>
          
          {/* Date Filter */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Date:</Typography>
            <ToggleButtonGroup
              value={dateFilter}
              exclusive
              onChange={(_, newValue) => newValue && setDateFilter(newValue)}
              size="small"
            >
              <ToggleButton value="today">Today</ToggleButton>
              <ToggleButton value="yesterday">Yesterday</ToggleButton>
              <ToggleButton value="2days">Last 2 Days</ToggleButton>
              <ToggleButton value="custom">Custom</ToggleButton>
            </ToggleButtonGroup>
            {dateFilter === 'custom' && (
              <TextField
                type="date"
                size="small"
                value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                sx={{ width: 150 }}
              />
            )}
          </Box>
        </Box>
        
        {/* Type Filter Chips */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Type:</Typography>
          <Chip 
            label="All" 
            onClick={() => setFilterType('all')}
            color={filterType === 'all' ? 'primary' : 'default'}
            variant={filterType === 'all' ? 'filled' : 'outlined'}
          />
          <Chip 
            label="Driver Pickup" 
            onClick={() => setFilterType('driver_pickup')}
            color={filterType === 'driver_pickup' ? 'primary' : 'default'}
            variant={filterType === 'driver_pickup' ? 'filled' : 'outlined'}
          />
          <Chip 
            label="General Sales" 
            onClick={() => setFilterType('general_sales')}
            color={filterType === 'general_sales' ? 'primary' : 'default'}
            variant={filterType === 'general_sales' ? 'filled' : 'outlined'}
          />
          <Chip 
            label="Packer Production" 
            onClick={() => setFilterType('packer_production')}
            color={filterType === 'packer_production' ? 'primary' : 'default'}
            variant={filterType === 'packer_production' ? 'filled' : 'outlined'}
          />
          <Chip 
            label="Mini Store" 
            onClick={() => setFilterType('ministore_pickup')}
            color={filterType === 'ministore_pickup' ? 'primary' : 'default'}
            variant={filterType === 'ministore_pickup' ? 'filled' : 'outlined'}
          />
        </Box>
      </Box>

      {/* Entries List - Grouped by Type */}
      {filteredEntries.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            {filterType === 'all' 
              ? 'No entries recorded in the last 2 days' 
              : `No ${getEntryTypeLabel(filterType)} entries in the last 2 days`}
          </Typography>
        </Paper>
      ) : filterType === 'all' ? (
        // Show grouped view when "All" is selected
        <Box>
          {groupedEntries.driver_pickup.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                Driver Pickup
                <Chip label={groupedEntries.driver_pickup.length} size="small" color="primary" />
              </Typography>
              <Grid container spacing={2}>
                {groupedEntries.driver_pickup.map((entry) => (
                  <Grid item xs={12} md={6} key={entry.id}>
                    {renderEntryCard(entry)}
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {groupedEntries.general_sales.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                General Sales
                <Chip label={groupedEntries.general_sales.length} size="small" color="success" />
              </Typography>
              <Grid container spacing={2}>
                {groupedEntries.general_sales.map((entry) => (
                  <Grid item xs={12} md={6} key={entry.id}>
                    {renderEntryCard(entry)}
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {groupedEntries.packer_production.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                Packer Production
                <Chip label={groupedEntries.packer_production.length} size="small" color="info" />
              </Typography>
              <Grid container spacing={2}>
                {groupedEntries.packer_production.map((entry) => (
                  <Grid item xs={12} md={6} key={entry.id}>
                    {renderEntryCard(entry)}
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {groupedEntries.ministore_pickup.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                Mini Store Pickup
                <Chip label={groupedEntries.ministore_pickup.length} size="small" color="warning" />
              </Typography>
              <Grid container spacing={2}>
                {groupedEntries.ministore_pickup.map((entry) => (
                  <Grid item xs={12} md={6} key={entry.id}>
                    {renderEntryCard(entry)}
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Box>
      ) : (
        // Show filtered view
        <Grid container spacing={2}>
          {filteredEntries.map((entry) => (
            <Grid item xs={12} md={6} key={entry.id}>
              {renderEntryCard(entry)}
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog 
        open={open} 
        onClose={handleClose} 
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
        <DialogTitle>Record Entry</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Date"
              type="date"
              fullWidth
              value={formatDateForInput(formData.date)}
              onChange={(e) => setFormData({ ...formData, date: parseDateFromInput(e.target.value) })}
              InputLabelProps={{ shrink: true }}
              required
            />

            <TextField
              label="Entry Type"
              fullWidth
              select
              value={formData.entryType}
              onChange={(e) => setFormData({ 
                ...formData, 
                entryType: e.target.value as any,
                driverId: '',
                packerId: ''
              })}
              required
            >
              <MenuItem value="driver_pickup">Driver Pickup</MenuItem>
              <MenuItem value="general_sales">General Sales</MenuItem>
              <MenuItem value="ministore_pickup">Mini Store Pickup</MenuItem>
              <MenuItem value="packer_production">Packer Production</MenuItem>
            </TextField>

            {formData.entryType === 'driver_pickup' && (
              <TextField
                label="Select Driver"
                fullWidth
                select
                value={formData.driverId}
                onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                required
              >
                <MenuItem value="">Select Driver</MenuItem>
                {drivers.map((driver) => (
                  <MenuItem key={driver.id} value={driver.id?.toString()}>
                    {driver.name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {formData.entryType === 'packer_production' && (
              <TextField
                label="Select Packer"
                fullWidth
                select
                value={formData.packerId}
                onChange={(e) => setFormData({ ...formData, packerId: e.target.value })}
                required
              >
                <MenuItem value="">Select Packer</MenuItem>
                {packers.map((packer) => (
                  <MenuItem key={packer.id} value={packer.id?.toString()}>
                    {packer.name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              label="Number of Bags"
              fullWidth
              type="number"
              value={formData.bagsCount}
              onChange={(e) => setFormData({ ...formData, bagsCount: e.target.value })}
              inputProps={{ min: 1, step: 1 }}
              required
            />

            <TextField
              label="Notes (Optional)"
              fullWidth
              multiline
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Review & Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog 
        open={confirmOpen} 
        onClose={() => setConfirmOpen(false)}
        fullScreen={window.innerWidth < 600}
        PaperProps={{
          sx: {
            m: { xs: 0, sm: 2 },
            maxWidth: { xs: '100%', sm: '500px' }
          }
        }}
      >
        <DialogTitle>Confirm Submission</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Once submitted, this entry cannot be modified. Are you sure you want to proceed?
          </Alert>
          {pendingEntry && (
            <Box>
              <Typography variant="body2" gutterBottom>
                <strong>Date:</strong> {format(new Date(pendingEntry.date), 'MMM d, yyyy')}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Type:</strong> {getEntryTypeLabel(pendingEntry.entryType)}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Person:</strong> {pendingEntry.entryType === 'ministore_pickup' ? 'Mini Store' : 
                                         pendingEntry.driverName || pendingEntry.packerName || 'N/A'}
              </Typography>
              <Typography variant="h6" sx={{ mt: 2 }}>
                <strong>Bags:</strong> {pendingEntry.bagsCount.toLocaleString()}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmSubmit} variant="contained" color="primary">
            Confirm & Submit
          </Button>
        </DialogActions>
      </Dialog>
      {/* 2FA Setup Dialog */}
      {currentUser && (
        <TwoFactorSetup
          open={twoFactorSetupOpen}
          onClose={() => setTwoFactorSetupOpen(false)}
          onSuccess={async () => {
            setTwoFactorSetupOpen(false);
            await loadCurrentUser();
            // Reload to refresh 2FA status
            window.location.reload();
          }}
          userId={currentUser.id}
          userEmail={currentUser.email}
          userName={currentUser.name}
        />
      )}
    </Box>
  );
}

