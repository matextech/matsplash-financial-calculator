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
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { ReceptionistSale, Notification } from '../../types/sales-log';
import { Employee } from '../../types';
import { Settings, DEFAULT_SETTINGS } from '../../types';
import { dbService } from '../../services/database';
import { apiService } from '../../services/apiService';
import { authService } from '../../services/authService';
import { AuditService } from '../../services/auditService';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfDay, endOfDay, isSameDay } from 'date-fns';

export default function ReceptionistDashboard() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<ReceptionistSale[]>([]);
  const [drivers, setDrivers] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSale, setPendingSale] = useState<Omit<ReceptionistSale, 'id' | 'submittedAt' | 'submittedBy' | 'isSubmitted' | 'createdAt' | 'updatedAt'> | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'driver' | 'general' | 'mini_store'>('all');
  
  const [formData, setFormData] = useState({
    date: new Date(),
    saleType: 'driver' as 'driver' | 'general' | 'mini_store',
    driverId: '',
    bagsAtPrice1: '',
    bagsAtPrice2: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
    loadNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const session = authService.getCurrentSession();
      if (session) {
        const notifs = await dbService.getNotifications(session.userId, false);
        setNotifications(notifs);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadData = async () => {
    try {
      const [salesData, employeesData, settingsData] = await Promise.all([
        dbService.getReceptionistSales(),
        apiService.getEmployees(),
        dbService.getSettings(),
      ]);

      // Filter to last 2 days only
      const twoDaysAgo = subDays(new Date(), 2);
      const filteredSales = salesData.filter(sale => {
        const saleDate = sale.date instanceof Date ? sale.date : new Date(sale.date);
        return saleDate >= startOfDay(twoDaysAgo);
      });

      setSales(filteredSales);
      setDrivers(employeesData.filter(e => e.role === 'Driver'));
      setSettings(settingsData || DEFAULT_SETTINGS);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleOpen = () => {
    setFormData({
      date: new Date(),
      saleType: 'driver',
      driverId: '',
      bagsAtPrice1: '',
      bagsAtPrice2: '',
      notes: '',
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setPendingSale(null);
  };

  const handleSubmit = () => {
    const bags1 = parseInt(formData.bagsAtPrice1) || 0;
    const bags2 = parseInt(formData.bagsAtPrice2) || 0;
    const totalBags = bags1 + bags2;

    if (totalBags === 0) {
      alert('Please enter at least one bag count');
      return;
    }

    if (formData.saleType === 'driver' && !formData.driverId) {
      alert('Please select a driver');
      return;
    }

    const session = authService.getCurrentSession();
    if (!session) {
      alert('Session expired. Please login again.');
      navigate('/login');
      return;
    }

    const selectedDriver = formData.driverId ? drivers.find(d => d.id?.toString() === formData.driverId) : null;

    const sale: Omit<ReceptionistSale, 'id' | 'submittedAt' | 'submittedBy' | 'isSubmitted' | 'createdAt' | 'updatedAt'> = {
      date: formData.date,
      saleType: formData.saleType,
      driverId: formData.saleType === 'driver' ? parseInt(formData.driverId) : undefined,
      driverName: formData.saleType === 'driver' && selectedDriver ? selectedDriver.name : undefined,
      bagsAtPrice1: bags1,
      bagsAtPrice2: bags2,
      totalBags: totalBags,
      notes: formData.notes || undefined,
    };

    setPendingSale(sale);
    setOpen(false);
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!pendingSale) return;

    try {
      const session = authService.getCurrentSession();
      if (!session) {
        alert('Session expired. Please login again.');
        navigate('/login');
        return;
      }

      const saleId = await dbService.addReceptionistSale({
        ...pendingSale,
        submittedAt: new Date(),
        submittedBy: session.userId,
        isSubmitted: true,
      });

      // Log the submission
      await AuditService.logSubmit('receptionist_sale', saleId);

      setConfirmOpen(false);
      setPendingSale(null);
      await loadData();
      alert('Sale submitted successfully!');
    } catch (error) {
      console.error('Error submitting sale:', error);
      alert('Error submitting sale. Please try again.');
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
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

  // Filter sales to last 2 days
  const twoDaysAgo = subDays(new Date(), 2);
  const visibleSales = sales.filter(sale => {
    const saleDate = sale.date instanceof Date ? sale.date : new Date(sale.date);
    return saleDate >= startOfDay(twoDaysAgo);
  });

  // Apply filter type
  const filteredSales = filterType === 'all' 
    ? visibleSales 
    : visibleSales.filter(sale => sale.saleType === filterType);

  // Group sales by type
  const groupedSales = {
    driver: filteredSales.filter(s => s.saleType === 'driver'),
    general: filteredSales.filter(s => s.saleType === 'general'),
    mini_store: filteredSales.filter(s => s.saleType === 'mini_store'),
  };

  const todaySales = visibleSales.filter(sale => {
    const saleDate = sale.date instanceof Date ? sale.date : new Date(sale.date);
    return isSameDay(saleDate, new Date());
  });

  const getSaleTypeLabel = (type: string) => {
    switch (type) {
      case 'driver':
        return 'Driver Sales';
      case 'general':
        return 'General Sales';
      case 'mini_store':
        return 'Mini Store Dispatch';
      default:
        return type;
    }
  };

  const renderSaleCard = (sale: ReceptionistSale) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
          <Box>
            <Typography variant="h6">
              {sale.saleType === 'driver' ? sale.driverName : 
               sale.saleType === 'general' ? 'General Sales' : 'Mini Store Dispatch'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {format(new Date(sale.date), 'MMM d, yyyy')}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h5" color="primary">
              {sale.totalBags.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              bags
            </Typography>
          </Box>
        </Box>
        
        {(sale.bagsAtPrice1 > 0 || sale.bagsAtPrice2 > 0) && (
          <Box sx={{ mb: 1 }}>
            {sale.bagsAtPrice1 > 0 && (
              <Typography variant="body2">
                @ ₦{settings.salesPrice1}/bag: {sale.bagsAtPrice1.toLocaleString()} bags
              </Typography>
            )}
            {sale.bagsAtPrice2 > 0 && (
              <Typography variant="body2">
                @ ₦{settings.salesPrice2}/bag: {sale.bagsAtPrice2.toLocaleString()} bags
              </Typography>
            )}
          </Box>
        )}

        {sale.notes && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Note: {sale.notes}
          </Typography>
        )}

        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          {sale.isSubmitted ? (
            <>
              <CheckCircleIcon color="success" fontSize="small" />
              <Typography variant="caption" color="success.main">
                Submitted {sale.submittedAt ? format(new Date(sale.submittedAt), 'MMM d, h:mm a') : ''}
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
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Receptionist Dashboard</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {notifications.length > 0 && (
            <Chip
              icon={<NotificationsIcon />}
              label={notifications.length}
              color="error"
              size="small"
              onClick={() => {
                // Mark all as read
                notifications.forEach(n => {
                  if (n.id) dbService.markNotificationAsRead(n.id);
                });
                loadNotifications();
              }}
            />
          )}
          <Button
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Box>
      </Box>

      {/* Notifications */}
      {notifications.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Notifications ({notifications.length})
          </Typography>
          {notifications.map((notif) => (
            <Typography key={notif.id} variant="body2">
              {notif.message}
            </Typography>
          ))}
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 3 }}>
        You can only view sales from the last 2 days. Once submitted, sales cannot be modified.
      </Alert>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Today's Sales
              </Typography>
              <Typography variant="h4">
                {todaySales.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                entries
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Bags Today
              </Typography>
              <Typography variant="h4">
                {todaySales.reduce((sum, s) => sum + s.totalBags, 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                bags
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Last 2 Days
              </Typography>
              <Typography variant="h4">
                {visibleSales.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                total entries
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add Sale Button and Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={handleOpen}
        >
          Record Sale
        </Button>
        
        {/* Filter Buttons */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            label="All" 
            onClick={() => setFilterType('all')}
            color={filterType === 'all' ? 'primary' : 'default'}
            variant={filterType === 'all' ? 'filled' : 'outlined'}
          />
          <Chip 
            label="Driver Sales" 
            onClick={() => setFilterType('driver')}
            color={filterType === 'driver' ? 'primary' : 'default'}
            variant={filterType === 'driver' ? 'filled' : 'outlined'}
          />
          <Chip 
            label="General Sales" 
            onClick={() => setFilterType('general')}
            color={filterType === 'general' ? 'primary' : 'default'}
            variant={filterType === 'general' ? 'filled' : 'outlined'}
          />
          <Chip 
            label="Mini Store" 
            onClick={() => setFilterType('mini_store')}
            color={filterType === 'mini_store' ? 'primary' : 'default'}
            variant={filterType === 'mini_store' ? 'filled' : 'outlined'}
          />
        </Box>
      </Box>

      {/* Sales List - Grouped by Type */}
      {filteredSales.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            {filterType === 'all' 
              ? 'No sales recorded in the last 2 days' 
              : `No ${getSaleTypeLabel(filterType)} in the last 2 days`}
          </Typography>
        </Paper>
      ) : filterType === 'all' ? (
        // Show grouped view when "All" is selected
        <Box>
          {groupedSales.driver.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                Driver Sales
                <Chip label={groupedSales.driver.length} size="small" color="primary" />
              </Typography>
              <Grid container spacing={2}>
                {groupedSales.driver.map((sale) => (
                  <Grid item xs={12} md={6} key={sale.id}>
                    {renderSaleCard(sale)}
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {groupedSales.general.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                General Sales
                <Chip label={groupedSales.general.length} size="small" color="success" />
              </Typography>
              <Grid container spacing={2}>
                {groupedSales.general.map((sale) => (
                  <Grid item xs={12} md={6} key={sale.id}>
                    {renderSaleCard(sale)}
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {groupedSales.mini_store.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                Mini Store Dispatch
                <Chip label={groupedSales.mini_store.length} size="small" color="warning" />
              </Typography>
              <Grid container spacing={2}>
                {groupedSales.mini_store.map((sale) => (
                  <Grid item xs={12} md={6} key={sale.id}>
                    {renderSaleCard(sale)}
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Box>
      ) : (
        // Show filtered view
        <Grid container spacing={2}>
          {filteredSales.map((sale) => (
            <Grid item xs={12} md={6} key={sale.id}>
              {renderSaleCard(sale)}
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Record Sale</DialogTitle>
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
              label="Sale Type"
              fullWidth
              select
              value={formData.saleType}
              onChange={(e) => setFormData({ ...formData, saleType: e.target.value as any, driverId: '' })}
              required
            >
              <MenuItem value="driver">Driver Sale</MenuItem>
              <MenuItem value="general">General Sales</MenuItem>
              <MenuItem value="mini_store">Mini Store Dispatch</MenuItem>
            </TextField>

            {formData.saleType === 'driver' && (
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

            <TextField
              label={`Bags at ₦${settings.salesPrice1}`}
              fullWidth
              type="number"
              value={formData.bagsAtPrice1}
              onChange={(e) => setFormData({ ...formData, bagsAtPrice1: e.target.value })}
              inputProps={{ min: 0, step: 1 }}
            />

            <TextField
              label={`Bags at ₦${settings.salesPrice2}`}
              fullWidth
              type="number"
              value={formData.bagsAtPrice2}
              onChange={(e) => setFormData({ ...formData, bagsAtPrice2: e.target.value })}
              inputProps={{ min: 0, step: 1 }}
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
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Submission</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Once submitted, this sale cannot be modified. Are you sure you want to proceed?
          </Alert>
          {pendingSale && (
            <Box>
              <Typography variant="body2" gutterBottom>
                <strong>Date:</strong> {format(new Date(pendingSale.date), 'MMM d, yyyy')}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Type:</strong> {pendingSale.saleType === 'driver' ? pendingSale.driverName : 
                                        pendingSale.saleType === 'general' ? 'General Sales' : 'Mini Store Dispatch'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Bags at ₦{settings.salesPrice1}:</strong> {pendingSale.bagsAtPrice1.toLocaleString()}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Bags at ₦{settings.salesPrice2}:</strong> {pendingSale.bagsAtPrice2.toLocaleString()}
              </Typography>
              <Typography variant="h6" sx={{ mt: 2 }}>
                <strong>Total Bags:</strong> {pendingSale.totalBags.toLocaleString()}
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
    </Box>
  );
}

