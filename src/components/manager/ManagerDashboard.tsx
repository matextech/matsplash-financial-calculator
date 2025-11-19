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
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Logout as LogoutIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { ReceptionistSale, StorekeeperEntry, Settlement, Notification } from '../../types/sales-log';
import { Settings, DEFAULT_SETTINGS } from '../../types';
import { dbService } from '../../services/database';
import { authService } from '../../services/authService';
import { AuditService } from '../../services/auditService';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths } from 'date-fns';

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [sales, setSales] = useState<ReceptionistSale[]>([]);
  const [entries, setEntries] = useState<StorekeeperEntry[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [settlementDialogOpen, setSettlementDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<ReceptionistSale | null>(null);
  const [settlementAmount, setSettlementAmount] = useState('');
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateType, setUpdateType] = useState<'sale' | 'entry'>('sale');
  const [updateItem, setUpdateItem] = useState<ReceptionistSale | StorekeeperEntry | null>(null);
  const [updateField, setUpdateField] = useState('');
  const [updateValue, setUpdateValue] = useState('');
  const [updateReason, setUpdateReason] = useState('');

  useEffect(() => {
    loadData();
    loadNotifications();
  }, [selectedMonth]);

  const loadData = async () => {
    try {
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);
      
      const [salesData, entriesData, settlementsData, settingsData] = await Promise.all([
        dbService.getReceptionistSales(monthStart, monthEnd),
        dbService.getStorekeeperEntries(monthStart, monthEnd),
        dbService.getSettlements(monthStart, monthEnd),
        dbService.getSettings(),
      ]);

      setSales(salesData);
      setEntries(entriesData);
      setSettlements(settlementsData);
      setSettings(settingsData || DEFAULT_SETTINGS);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

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

  const handleOpenSettlement = (sale: ReceptionistSale) => {
    const existingSettlement = settlements.find(s => s.receptionistSaleId === sale.id);
    if (existingSettlement) {
      setSettlementAmount(existingSettlement.settledAmount.toString());
    } else {
      const expectedAmount = (sale.bagsAtPrice1 * settings.salesPrice1) + 
                            (sale.bagsAtPrice2 * settings.salesPrice2);
      setSettlementAmount(expectedAmount.toString());
    }
    setSelectedSale(sale);
    setSettlementDialogOpen(true);
  };

  const handleSaveSettlement = async () => {
    if (!selectedSale) return;

    const session = authService.getCurrentSession();
    if (!session) {
      alert('Session expired. Please login again.');
      navigate('/login');
      return;
    }

    const settledAmt = parseFloat(settlementAmount) || 0;
    const expectedAmount = (selectedSale.bagsAtPrice1 * settings.salesPrice1) + 
                          (selectedSale.bagsAtPrice2 * settings.salesPrice2);
    const remainingBalance = expectedAmount - settledAmt;
    const isSettled = remainingBalance <= 0;

    try {
      const existingSettlement = settlements.find(s => s.receptionistSaleId === selectedSale.id);
      
      if (existingSettlement) {
        await dbService.updateSettlement(existingSettlement.id!, {
          settledAmount: settledAmt,
          remainingBalance: remainingBalance,
          isSettled: isSettled,
          settledAt: isSettled ? new Date() : undefined,
        });
      } else {
        await dbService.addSettlement({
          date: selectedSale.date,
          receptionistSaleId: selectedSale.id!,
          expectedAmount: expectedAmount,
          settledAmount: settledAmt,
          remainingBalance: remainingBalance,
          isSettled: isSettled,
          settledBy: session.userId,
          settledAt: isSettled ? new Date() : undefined,
        });
      }

      // Create notification for receptionist
      if (isSettled && selectedSale.submittedBy) {
        await dbService.addNotification({
          userId: selectedSale.submittedBy,
          type: 'settlement_complete',
          title: 'Settlement Complete',
          message: `Settlement for ${format(new Date(selectedSale.date), 'MMM d, yyyy')} has been completed.`,
          isRead: false,
          relatedEntityType: 'settlement',
          relatedEntityId: existingSettlement?.id,
        });
      }

      setSettlementDialogOpen(false);
      setSelectedSale(null);
      await loadData();
      await loadNotifications();
    } catch (error) {
      console.error('Error saving settlement:', error);
      alert('Error saving settlement. Please try again.');
    }
  };

  const handleOpenUpdate = (item: ReceptionistSale | StorekeeperEntry, type: 'sale' | 'entry') => {
    setUpdateItem(item);
    setUpdateType(type);
    setUpdateField('');
    setUpdateValue('');
    setUpdateReason('');
    setUpdateDialogOpen(true);
  };

  const handleSaveUpdate = async () => {
    if (!updateItem || !updateField || !updateValue || !updateReason) {
      alert('Please fill all fields');
      return;
    }

    const session = authService.getCurrentSession();
    if (!session) {
      alert('Session expired. Please login again.');
      navigate('/login');
      return;
    }

    try {
      const oldValue = (updateItem as any)[updateField];
      const newValue = updateField.includes('bags') || updateField === 'bagsCount' 
        ? parseInt(updateValue) 
        : updateValue;

      // Create audit log
      await AuditService.logUpdate(
        updateType === 'sale' ? 'receptionist_sale' : 'storekeeper_entry',
        updateItem.id!,
        updateField,
        oldValue,
        newValue,
        updateReason
      );

      // Update the item
      if (updateType === 'sale') {
        const sale = updateItem as ReceptionistSale;
        const updatedSale: any = { ...sale, [updateField]: newValue };
        if (updateField === 'bagsAtPrice1' || updateField === 'bagsAtPrice2') {
          updatedSale.totalBags = (updatedSale.bagsAtPrice1 || 0) + (updatedSale.bagsAtPrice2 || 0);
        }
        await dbService.updateReceptionistSale(sale.id!, updatedSale);
      } else {
        await dbService.updateStorekeeperEntry(updateItem.id!, { [updateField]: newValue });
      }

      setUpdateDialogOpen(false);
      await loadData();
      alert('Update saved successfully');
    } catch (error) {
      console.error('Error updating:', error);
      alert('Error updating. Please try again.');
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

  // Group sales by driver for daily view
  const salesByDriver = sales.reduce((acc, sale) => {
    const key = sale.driverName || sale.saleType;
    if (!acc[key]) {
      acc[key] = { sales: [], totalBags: 0 };
    }
    acc[key].sales.push(sale);
    acc[key].totalBags += sale.totalBags;
    return acc;
  }, {} as Record<string, { sales: ReceptionistSale[]; totalBags: number }>);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Manager Dashboard</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {notifications.length > 0 && (
            <Chip
              icon={<NotificationsIcon />}
              label={notifications.length}
              color="error"
              size="small"
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

      {/* Month Selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}>
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
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Receptionist Sales" />
          <Tab label="Storekeeper Entries" />
          <Tab label="Settlements" />
        </Tabs>
      </Paper>

      {/* Receptionist Sales Tab */}
      {tabValue === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Sales by Driver - {format(selectedMonth, 'MMMM yyyy')}
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Driver/Type</TableCell>
                  <TableCell>Bags @ ₦{settings.salesPrice1}</TableCell>
                  <TableCell>Bags @ ₦{settings.salesPrice2}</TableCell>
                  <TableCell>Total Bags</TableCell>
                  <TableCell>Expected Amount</TableCell>
                  <TableCell>Settlement Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sales.map((sale) => {
                  const expectedAmount = (sale.bagsAtPrice1 * settings.salesPrice1) + 
                                       (sale.bagsAtPrice2 * settings.salesPrice2);
                  const settlement = settlements.find(s => s.receptionistSaleId === sale.id);
                  return (
                    <TableRow key={sale.id}>
                      <TableCell>{format(new Date(sale.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        {sale.saleType === 'driver' ? sale.driverName : 
                         sale.saleType === 'general' ? 'General Sales' : 'Mini Store'}
                      </TableCell>
                      <TableCell>{sale.bagsAtPrice1.toLocaleString()}</TableCell>
                      <TableCell>{sale.bagsAtPrice2.toLocaleString()}</TableCell>
                      <TableCell>{sale.totalBags.toLocaleString()}</TableCell>
                      <TableCell>{formatCurrency(expectedAmount)}</TableCell>
                      <TableCell>
                        {settlement ? (
                          settlement.isSettled ? (
                            <Chip label="Settled" color="success" size="small" />
                          ) : (
                            <Chip 
                              label={`Balance: ${formatCurrency(settlement.remainingBalance)}`} 
                              color="warning" 
                              size="small" 
                            />
                          )
                        ) : (
                          <Chip label="Pending" color="default" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Enter Settlement">
                          <IconButton size="small" onClick={() => handleOpenSettlement(sale)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Update Entry">
                          <IconButton size="small" onClick={() => handleOpenUpdate(sale, 'sale')}>
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Storekeeper Entries Tab */}
      {tabValue === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Storekeeper Entries - {format(selectedMonth, 'MMMM yyyy')}
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Driver/Packer</TableCell>
                  <TableCell>Bags</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{format(new Date(entry.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      {entry.entryType === 'driver_pickup' ? 'Driver Pickup' :
                       entry.entryType === 'general_sales' ? 'General Sales' : 'Packer Production'}
                    </TableCell>
                    <TableCell>{entry.driverName || entry.packerName || 'N/A'}</TableCell>
                    <TableCell>{entry.bagsCount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Tooltip title="Update Entry">
                        <IconButton size="small" onClick={() => handleOpenUpdate(entry, 'entry')}>
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

      {/* Settlements Tab */}
      {tabValue === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Settlements - {format(selectedMonth, 'MMMM yyyy')}
          </Typography>
          <Grid container spacing={2}>
            {settlements.map((settlement) => {
              const sale = sales.find(s => s.id === settlement.receptionistSaleId);
              return (
                <Grid item xs={12} md={6} key={settlement.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6">
                          {sale ? format(new Date(sale.date), 'MMM d, yyyy') : 'Unknown Date'}
                        </Typography>
                        {settlement.isSettled ? (
                          <Chip label="Settled" color="success" size="small" />
                        ) : (
                          <Chip label="Pending" color="warning" size="small" />
                        )}
                      </Box>
                      <Typography variant="body2">
                        Expected: {formatCurrency(settlement.expectedAmount)}
                      </Typography>
                      <Typography variant="body2">
                        Settled: {formatCurrency(settlement.settledAmount)}
                      </Typography>
                      <Typography variant="body2" color={settlement.remainingBalance > 0 ? 'error.main' : 'success.main'}>
                        Balance: {formatCurrency(settlement.remainingBalance)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Settlement Dialog */}
      <Dialog open={settlementDialogOpen} onClose={() => setSettlementDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Enter Settlement</DialogTitle>
        <DialogContent>
          {selectedSale && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Typography variant="body2">
                Date: {format(new Date(selectedSale.date), 'MMM d, yyyy')}
              </Typography>
              <Typography variant="body2">
                Total Bags: {selectedSale.totalBags.toLocaleString()}
              </Typography>
              <Typography variant="body2">
                Expected Amount: {formatCurrency((selectedSale.bagsAtPrice1 * settings.salesPrice1) + 
                                                 (selectedSale.bagsAtPrice2 * settings.salesPrice2))}
              </Typography>
              <TextField
                label="Settled Amount (₦)"
                fullWidth
                type="number"
                value={settlementAmount}
                onChange={(e) => setSettlementAmount(e.target.value)}
                required
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>₦</Typography>,
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettlementDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveSettlement} variant="contained">
            Save Settlement
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Dialog */}
      <Dialog open={updateDialogOpen} onClose={() => setUpdateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Entry</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Field to Update"
              fullWidth
              select
              value={updateField}
              onChange={(e) => setUpdateField(e.target.value)}
              required
            >
              {updateType === 'sale' ? (
                <>
                  <MenuItem value="bagsAtPrice1">Bags at Price 1</MenuItem>
                  <MenuItem value="bagsAtPrice2">Bags at Price 2</MenuItem>
                  <MenuItem value="notes">Notes</MenuItem>
                </>
              ) : (
                <>
                  <MenuItem value="bagsCount">Bags Count</MenuItem>
                  <MenuItem value="notes">Notes</MenuItem>
                </>
              )}
            </TextField>
            <TextField
              label="New Value"
              fullWidth
              type={updateField.includes('bags') || updateField === 'bagsCount' ? 'number' : 'text'}
              value={updateValue}
              onChange={(e) => setUpdateValue(e.target.value)}
              required
            />
            <TextField
              label="Reason for Update"
              fullWidth
              multiline
              rows={3}
              value={updateReason}
              onChange={(e) => setUpdateReason(e.target.value)}
              required
              helperText="This will be recorded in the audit log"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveUpdate} variant="contained">
            Save Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

