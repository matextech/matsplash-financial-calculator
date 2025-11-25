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
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  VerifiedUser as VerifiedUserIcon,
} from '@mui/icons-material';
import { ReceptionistSale, Notification } from '../../types/sales-log';
import { Employee } from '../../types';
import { Settings, DEFAULT_SETTINGS, BagPrice } from '../../types';
import { apiService } from '../../services/apiService';
import { authService } from '../../services/authService';
import { AuditService } from '../../services/auditService';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfDay, endOfDay, isSameDay } from 'date-fns';
import TwoFactorSetup from '../auth/TwoFactorSetup';
import { Tooltip } from '@mui/material';

export default function ReceptionistDashboard() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<ReceptionistSale[]>([]);
  const [drivers, setDrivers] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [bagPrices, setBagPrices] = useState<BagPrice[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSale, setPendingSale] = useState<Omit<ReceptionistSale, 'id' | 'submittedAt' | 'submittedBy' | 'isSubmitted' | 'createdAt' | 'updatedAt'> | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'driver' | 'general' | 'mini_store'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | '2days' | 'custom'>('2days');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [twoFactorSetupOpen, setTwoFactorSetupOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    date: new Date(),
    saleType: 'driver' as 'driver' | 'general' | 'mini_store',
    driverId: '',
    bagsAtPrice1: '',
    bagsAtPrice2: '',
    notes: '',
  });

  // Dynamic price breakdown state (for new dynamic pricing system)
  const [priceBreakdown, setPriceBreakdown] = useState<{ [priceId: number]: string }>({});

  useEffect(() => {
    loadData();
    loadNotifications();
    loadCurrentUser();
    // Refresh notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const loadNotifications = async () => {
    try {
      const session = authService.getCurrentSession();
      if (session) {
        const notifs = await apiService.getNotifications(session.userId, false);
        setNotifications(notifs);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadData = async () => {
    try {
      // Calculate date range (default to last 2 days)
      const twoDaysAgo = startOfDay(subDays(new Date(), 2));
      const today = endOfDay(new Date());

      const [salesData, employeesData, settingsData, bagPricesData] = await Promise.all([
        apiService.getReceptionistSales(twoDaysAgo, today),
        apiService.getEmployees(),
        apiService.getSettings(),
        apiService.getBagPrices(),
      ]);

      setSales(salesData);
      setDrivers(employeesData.filter(e => e.role === 'Driver'));
      setSettings(settingsData || DEFAULT_SETTINGS);
      
      // Filter and sort active bag prices
      const activePrices = bagPricesData.filter(p => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
      setBagPrices(activePrices);
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
    // Initialize dynamic price breakdown
    const initialBreakdown: { [priceId: number]: string } = {};
    bagPrices.forEach(price => {
      initialBreakdown[price.id!] = '';
    });
    setPriceBreakdown(initialBreakdown);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setPendingSale(null);
  };

  const handleSubmit = () => {
    // Calculate total bags from dynamic price breakdown
    const breakdown = bagPrices.map(price => {
      const bags = parseInt(priceBreakdown[price.id!]) || 0;
      return {
        priceId: price.id!,
        amount: price.amount,
        bags,
        label: price.label,
      };
    }).filter(item => item.bags > 0);

    // Calculate total bags (sum of all bags)
    const totalBags = breakdown.reduce((sum, item) => sum + item.bags, 0);

    // Calculate expected amount (bags × price for each tier, then sum)
    const expectedAmount = breakdown.reduce((sum, item) => sum + (item.bags * item.amount), 0);

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

    // For backward compatibility, still populate bagsAtPrice1 and bagsAtPrice2
    const bags1 = breakdown.length > 0 ? breakdown[0].bags : 0;
    const bags2 = breakdown.length > 1 ? breakdown[1].bags : 0;

    const sale: Omit<ReceptionistSale, 'id' | 'submittedAt' | 'submittedBy' | 'isSubmitted' | 'createdAt' | 'updatedAt'> = {
      date: formData.date,
      saleType: formData.saleType,
      driverId: formData.saleType === 'driver' ? parseInt(formData.driverId) : undefined,
      driverName: formData.saleType === 'driver' && selectedDriver ? selectedDriver.name : undefined,
      bagsAtPrice1: bags1,
      bagsAtPrice2: bags2,
      totalBags: totalBags,
      expectedAmount: expectedAmount, // Calculate and send expected amount
      priceBreakdown: breakdown,
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

      const result = await apiService.createReceptionistSale({
        ...pendingSale,
        submittedAt: new Date(),
        submittedBy: session.userId,
        isSubmitted: true,
      });

      // Log the submission
      if (result && result.id) {
        await AuditService.logSubmit('receptionist_sale', result.id);
      }

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

  // Since backend already filters by date, just apply type filter
  // (The sales array already contains the date-filtered data from the API)
  const filteredSales = filterType === 'all' 
    ? sales 
    : sales.filter(sale => sale.saleType === filterType);
  
  const visibleSales = sales; // For backward compatibility with stats display

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
        
        {/* Display Dynamic Price Breakdown or Fallback to Legacy */}
        {sale.priceBreakdown && sale.priceBreakdown.length > 0 ? (
          <Box sx={{ mb: 1 }}>
            {sale.priceBreakdown.map((item, idx) => (
              <Typography key={idx} variant="body2">
                @ ₦{item.amount.toLocaleString()}/bag {item.label ? `(${item.label})` : ''}: {item.bags.toLocaleString()} bags
                <span style={{ marginLeft: '8px', color: '#666' }}>
                  = ₦{(item.bags * item.amount).toLocaleString()}
                </span>
              </Typography>
            ))}
          </Box>
        ) : (sale.bagsAtPrice1 > 0 || sale.bagsAtPrice2 > 0) && (
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
            Receptionist Dashboard
          </Typography>
          <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, alignItems: 'center', width: { xs: '100%', sm: 'auto' } }}>
          {notifications.length > 0 && (
            <Chip
              icon={<NotificationsIcon />}
              label={notifications.length}
              color="error"
              size="small"
              onClick={async () => {
                // Mark all as read
                for (const n of notifications) {
                  if (n.id) await apiService.markNotificationAsRead(n.id);
                }
                loadNotifications();
              }}
            />
          )}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {currentUser && (
              <Tooltip title={currentUser.twoFactorEnabled ? '2FA Enabled' : 'Enable 2FA'}>
                <IconButton
                  onClick={() => {
                    if (currentUser.twoFactorEnabled) {
                      if (window.confirm('Are you sure you want to disable 2FA? This will reduce your account security.')) {
                        apiService.disable2FA(currentUser.id)
                          .then(() => {
                            alert('2FA disabled successfully');
                            loadCurrentUser().then(() => {
                              window.location.reload();
                            });
                          })
                          .catch((error) => {
                            console.error('Error disabling 2FA:', error);
                            alert('Error disabling 2FA. Please try again.');
                          });
                      }
                    } else {
                      setTwoFactorSetupOpen(true);
                    }
                  }}
                  sx={{
                    color: 'white',
                    bgcolor: currentUser.twoFactorEnabled ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255,255,255,0.2)',
                    '&:hover': {
                      bgcolor: currentUser.twoFactorEnabled ? 'rgba(76, 175, 80, 0.4)' : 'rgba(255,255,255,0.3)',
                    }
                  }}
                >
                  {currentUser.twoFactorEnabled ? <VerifiedUserIcon /> : <SecurityIcon />}
                </IconButton>
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
        </Box>
      </Paper>

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
                Today's Sales
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {todaySales.length}
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
                {todaySales.reduce((sum, s) => sum + s.totalBags, 0).toLocaleString()}
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
                {visibleSales.length}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                total entries
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add Sale Button and Filters */}
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
            Record Sale
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
                value={format(selectedDate, 'yyyy-MM-dd')}
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
              onChange={(e) => {
                const newSaleType = e.target.value as 'driver' | 'general' | 'mini_store';
                setFormData({ ...formData, saleType: newSaleType, driverId: '' });
                
                // For mini_store, auto-select ₦250 price (or closest to 250)
                if (newSaleType === 'mini_store') {
                  const miniStorePrice = bagPrices.find(p => p.amount === 250) || bagPrices[0];
                  if (miniStorePrice) {
                    const newBreakdown: { [priceId: number]: string } = {};
                    bagPrices.forEach(price => {
                      newBreakdown[price.id!] = price.id === miniStorePrice.id ? '0' : '';
                    });
                    setPriceBreakdown(newBreakdown);
                  }
                } else {
                  // Clear price breakdown for other sale types
                  const newBreakdown: { [priceId: number]: string } = {};
                  bagPrices.forEach(price => {
                    newBreakdown[price.id!] = '';
                  });
                  setPriceBreakdown(newBreakdown);
                }
              }}
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

            {/* Dynamic Bag Price Inputs */}
            {formData.saleType === 'mini_store' ? (
              // For mini store, show only ₦250 price (or closest to 250)
              (() => {
                const miniStorePrice = bagPrices.find(p => p.amount === 250) || bagPrices[0];
                return miniStorePrice ? (
                  <TextField
                    key={miniStorePrice.id}
                    label={`Bags at ₦${miniStorePrice.amount.toLocaleString()} ${miniStorePrice.label ? `(${miniStorePrice.label})` : ''} - Mini Store Price`}
                    fullWidth
                    type="number"
                    value={priceBreakdown[miniStorePrice.id!] || ''}
                    onChange={(e) => setPriceBreakdown({ ...priceBreakdown, [miniStorePrice.id!]: e.target.value })}
                    inputProps={{ min: 0, step: 1 }}
                    required
                  />
                ) : null;
              })()
            ) : (
              // For driver and general sales, show all prices
              bagPrices.map((price) => (
                <TextField
                  key={price.id}
                  label={`Bags at ₦${price.amount.toLocaleString()} ${price.label ? `(${price.label})` : ''}`}
                  fullWidth
                  type="number"
                  value={priceBreakdown[price.id!] || ''}
                  onChange={(e) => setPriceBreakdown({ ...priceBreakdown, [price.id!]: e.target.value })}
                  inputProps={{ min: 0, step: 1 }}
                />
              ))
            )}

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
              {/* Dynamic Price Breakdown Display */}
              {pendingSale.priceBreakdown && pendingSale.priceBreakdown.length > 0 ? (
                pendingSale.priceBreakdown.map((item, idx) => (
                  <Typography key={idx} variant="body2" gutterBottom>
                    <strong>Bags at ₦{item.amount.toLocaleString()} {item.label ? `(${item.label})` : ''}:</strong> {item.bags.toLocaleString()}
                    <span style={{ marginLeft: '8px', color: '#666' }}>
                      = ₦{(item.bags * item.amount).toLocaleString()}
                    </span>
                  </Typography>
                ))
              ) : (
                <>
                  <Typography variant="body2" gutterBottom>
                    <strong>Bags at ₦{settings.salesPrice1}:</strong> {pendingSale.bagsAtPrice1.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Bags at ₦{settings.salesPrice2}:</strong> {pendingSale.bagsAtPrice2.toLocaleString()}
                  </Typography>
                </>
              )}
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

