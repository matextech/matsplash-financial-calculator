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
} from '@mui/icons-material';
import { StorekeeperEntry } from '../../types/sales-log';
import { Employee } from '../../types';
import { dbService } from '../../services/database';
import { authService } from '../../services/authService';
import { AuditService } from '../../services/auditService';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfDay, endOfDay, isSameDay } from 'date-fns';

export default function StorekeeperDashboard() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<StorekeeperEntry[]>([]);
  const [drivers, setDrivers] = useState<Employee[]>([]);
  const [packers, setPackers] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingEntry, setPendingEntry] = useState<Omit<StorekeeperEntry, 'id' | 'submittedAt' | 'submittedBy' | 'isSubmitted' | 'createdAt' | 'updatedAt'> | null>(null);
  
  const [formData, setFormData] = useState({
    date: new Date(),
    entryType: 'driver_pickup' as 'driver_pickup' | 'general_sales' | 'packer_production',
    driverId: '',
    packerId: '',
    bagsCount: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [entriesData, employeesData] = await Promise.all([
        dbService.getStorekeeperEntries(),
        dbService.getEmployees(),
      ]);

      // Filter to last 2 days only
      const twoDaysAgo = subDays(new Date(), 2);
      const filteredEntries = entriesData.filter(entry => {
        const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
        return entryDate >= startOfDay(twoDaysAgo);
      });

      setEntries(filteredEntries);
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

    const session = authService.getCurrentSession();
    if (!session) {
      alert('Session expired. Please login again.');
      navigate('/login');
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
      submittedBy: session.userId,
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
        navigate('/login');
        return;
      }

      const entryId = await dbService.addStorekeeperEntry({
        ...pendingEntry,
        submittedAt: new Date(),
        submittedBy: session.userId,
        isSubmitted: true,
      });

      // Log the submission
      await AuditService.logSubmit('storekeeper_entry', entryId);

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

  // Filter entries to last 2 days
  const twoDaysAgo = subDays(new Date(), 2);
  const visibleEntries = entries.filter(entry => {
    const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
    return entryDate >= startOfDay(twoDaysAgo);
  });

  const todayEntries = visibleEntries.filter(entry => {
    const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
    return isSameDay(entryDate, new Date());
  });

  const getEntryTypeLabel = (type: string) => {
    switch (type) {
      case 'driver_pickup':
        return 'Driver Pickup';
      case 'general_sales':
        return 'General Sales';
      case 'packer_production':
        return 'Packer Production';
      default:
        return type;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Storekeeper Dashboard</Typography>
        <Button
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
        >
          Logout
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        You can only view entries from the last 2 days. Once submitted, entries cannot be modified.
      </Alert>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Today's Entries
              </Typography>
              <Typography variant="h4">
                {todayEntries.length}
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
                {todayEntries.reduce((sum, e) => sum + e.bagsCount, 0).toLocaleString()}
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
                {visibleEntries.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                total entries
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add Entry Button */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={handleOpen}
        >
          Record Entry
        </Button>
      </Box>

      {/* Entries List */}
      {visibleEntries.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No entries recorded in the last 2 days
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {visibleEntries.map((entry) => (
            <Grid item xs={12} md={6} key={entry.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6">
                        {getEntryTypeLabel(entry.entryType)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {entry.driverName || entry.packerName || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {format(new Date(entry.date), 'MMM d, yyyy')}
                      </Typography>
                    </Box>
                    {entry.isSubmitted ? (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Submitted"
                        color="success"
                        size="small"
                      />
                    ) : (
                      <Chip
                        icon={<WarningIcon />}
                        label="Draft"
                        color="warning"
                        size="small"
                      />
                    )}
                  </Box>
                  
                  <Typography variant="h6">
                    {entry.bagsCount.toLocaleString()} bags
                  </Typography>

                  {entry.notes && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Notes: {entry.notes}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
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
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
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
                <strong>Person:</strong> {pendingEntry.driverName || pendingEntry.packerName || 'N/A'}
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
    </Box>
  );
}

