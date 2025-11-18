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
  IconButton,
  Chip,
  InputAdornment,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  MenuItem,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Inventory as InventoryIcon,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import { MaterialPurchase, MATERIAL_COSTS } from '../types';
import { dbService } from '../services/database';
import { format, startOfDay, endOfDay, isSameDay, isToday, addDays, subDays } from 'date-fns';

export default function Materials() {
  const [purchases, setPurchases] = useState<MaterialPurchase[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'range'>('day');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(),
    end: new Date(),
  });
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<MaterialPurchase | null>(null);
  
  const [formData, setFormData] = useState({
    type: 'sachet_roll' as 'sachet_roll' | 'packing_nylon',
    quantity: '1',
    cost: '',
    date: new Date(),
    notes: '',
  });

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    const data = await dbService.getMaterialPurchases();
    setPurchases(data);
  };

  const getPurchasesForDate = (date: Date): MaterialPurchase[] => {
    let filtered = purchases.filter(purchase => {
      const purchaseDate = purchase.date instanceof Date ? purchase.date : new Date(purchase.date);
      return isSameDay(purchaseDate, date);
    });

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(p => p.type === filterType);
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.type.toLowerCase().includes(search) ||
        p.cost.toString().includes(search) ||
        (p.notes && p.notes.toLowerCase().includes(search))
      );
    }

    return filtered;
  };

  const getPurchasesForRange = (start: Date, end: Date): MaterialPurchase[] => {
    const startDay = startOfDay(start);
    const endDay = endOfDay(end);
    let filtered = purchases.filter(purchase => {
      const purchaseDate = purchase.date instanceof Date ? purchase.date : new Date(purchase.date);
      return purchaseDate >= startDay && purchaseDate <= endDay;
    });

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(p => p.type === filterType);
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.type.toLowerCase().includes(search) ||
        p.cost.toString().includes(search) ||
        (p.notes && p.notes.toLowerCase().includes(search))
      );
    }

    return filtered;
  };

  const currentPurchases = viewMode === 'day' 
    ? getPurchasesForDate(selectedDate)
    : getPurchasesForRange(dateRange.start, dateRange.end);

  const groupedPurchases = {
    sachet_roll: currentPurchases.filter(p => p.type === 'sachet_roll'),
    packing_nylon: currentPurchases.filter(p => p.type === 'packing_nylon'),
  };

  const totalByType = {
    sachet_roll: groupedPurchases.sachet_roll.reduce((sum, p) => sum + p.cost, 0),
    packing_nylon: groupedPurchases.packing_nylon.reduce((sum, p) => sum + p.cost, 0),
  };

  const totalCost = totalByType.sachet_roll + totalByType.packing_nylon;
  const totalBags = groupedPurchases.sachet_roll.reduce((sum, p) => sum + (p.quantity * MATERIAL_COSTS.sachet_roll.bagsPerRoll), 0) +
                    groupedPurchases.packing_nylon.reduce((sum, p) => sum + (p.quantity * MATERIAL_COSTS.packing_nylon.bagsPerPackage), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateForInput = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseDateFromInput = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const handleDateChange = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setSelectedDate(new Date());
    } else if (direction === 'prev') {
      setSelectedDate(prev => subDays(prev, 1));
    } else {
      setSelectedDate(prev => addDays(prev, 1));
    }
  };

  const handleOpen = (purchase?: MaterialPurchase, date?: Date) => {
    if (purchase) {
      setEditingPurchase(purchase);
      const purchaseDate = purchase.date instanceof Date ? purchase.date : new Date(purchase.date);
      setFormData({
        type: purchase.type,
        quantity: purchase.quantity.toString(),
        cost: purchase.cost.toString(),
        date: purchaseDate,
        notes: purchase.notes || '',
      });
      console.log('Opening purchase for editing:', purchase);
    } else {
      setEditingPurchase(null);
      setFormData({
        type: 'sachet_roll',
        quantity: '1',
        cost: MATERIAL_COSTS.sachet_roll.cost.toString(),
        date: date || selectedDate,
        notes: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingPurchase(null);
  };

  const handleTypeChange = (type: 'sachet_roll' | 'packing_nylon') => {
    const standardCost = type === 'sachet_roll' 
      ? MATERIAL_COSTS.sachet_roll.cost
      : MATERIAL_COSTS.packing_nylon.cost;
    
    const quantity = parseInt(formData.quantity) || 1;
    const newCost = (standardCost * quantity).toString();
    
    setFormData({
      ...formData,
      type,
      cost: newCost,
    });
  };

  const handleQuantityChange = (quantity: string) => {
    const qty = parseInt(quantity) || 0;
    const standardCost = formData.type === 'sachet_roll' 
      ? MATERIAL_COSTS.sachet_roll.cost
      : MATERIAL_COSTS.packing_nylon.cost;
    
    const newCost = (standardCost * qty).toString();
    
    setFormData({
      ...formData,
      quantity: quantity,
      cost: newCost,
    });
  };

  const handleSubmit = async () => {
    try {
      const quantity = parseInt(formData.quantity);
      const cost = parseFloat(formData.cost);

      if (isNaN(quantity) || quantity <= 0) {
        alert('Please enter a valid quantity.');
        return;
      }

      if (isNaN(cost) || cost <= 0) {
        alert('Please enter a valid cost.');
        return;
      }

      const purchaseData: Omit<MaterialPurchase, 'id'> = {
        type: formData.type,
        quantity,
        cost,
        date: formData.date,
        notes: formData.notes?.trim() || undefined,
      };

      console.log('Saving purchase:', purchaseData);

      if (editingPurchase?.id) {
        try {
          await dbService.updateMaterialPurchase(editingPurchase.id, purchaseData);
          console.log('Purchase updated successfully');
          handleClose();
          setTimeout(() => {
            loadPurchases();
          }, 100);
        } catch (error) {
          console.error('Error updating purchase:', error);
          alert(`Error updating purchase: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        try {
          await dbService.addMaterialPurchase(purchaseData);
          console.log('Purchase added successfully');
          handleClose();
          setTimeout(() => {
            loadPurchases();
          }, 100);
        } catch (error) {
          console.error('Error adding purchase:', error);
          alert(`Error adding purchase: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error saving purchase:', error);
      alert(`Error saving purchase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this purchase?')) {
      try {
        await dbService.deleteMaterialPurchase(id);
        loadPurchases();
      } catch (error) {
        console.error('Error deleting purchase:', error);
        alert('Error deleting purchase. Please try again.');
      }
    }
  };

  const PurchaseCard = ({ title, purchases, total, color }: {
    title: string;
    purchases: MaterialPurchase[];
    total: number;
    color: string;
  }) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <InventoryIcon sx={{ color, mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          <Chip label={formatCurrency(total)} color="primary" size="small" />
        </Box>
        {purchases.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No {title.toLowerCase()} purchases
          </Typography>
        ) : (
          <Stack spacing={1}>
            {purchases.map((purchase) => {
              const bagsCapacity = purchase.type === 'sachet_roll' 
                ? purchase.quantity * MATERIAL_COSTS.sachet_roll.bagsPerRoll
                : purchase.quantity * MATERIAL_COSTS.packing_nylon.bagsPerPackage;
              return (
                <Paper key={purchase.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {purchase.quantity} {purchase.type === 'sachet_roll' ? 'roll(s)' : 'package(s)'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Capacity: {bagsCapacity.toLocaleString()} bags
                      </Typography>
                      {purchase.notes && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {purchase.notes}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="body2" fontWeight="bold" sx={{ mr: 1 }}>
                      {formatCurrency(purchase.cost)}
                    </Typography>
                    <Box>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleOpen(purchase)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => purchase.id && handleDelete(purchase.id)} color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">Material Purchases</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          size="large"
        >
          Add Purchase
        </Button>
      </Box>

      {/* Date Navigation - Day View */}
      {viewMode === 'day' && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={() => handleDateChange('prev')}>
                <ChevronLeft />
              </IconButton>
              <TextField
                type="date"
                value={formatDateForInput(selectedDate)}
                onChange={(e) => setSelectedDate(parseDateFromInput(e.target.value))}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 200 }}
              />
              <IconButton onClick={() => handleDateChange('next')}>
                <ChevronRight />
              </IconButton>
              {!isToday(selectedDate) && (
                <Button variant="outlined" size="small" onClick={() => handleDateChange('today')}>
                  Today
                </Button>
              )}
            </Box>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newMode) => newMode && setViewMode(newMode)}
              size="small"
            >
              <ToggleButton value="day">Day View</ToggleButton>
              <ToggleButton value="range">Range View</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Paper>
      )}

      {/* Date Range Selection */}
      {viewMode === 'range' && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Start Date"
              type="date"
              value={formatDateForInput(dateRange.start)}
              onChange={(e) => setDateRange({ ...dateRange, start: parseDateFromInput(e.target.value) })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date"
              type="date"
              value={formatDateForInput(dateRange.end)}
              onChange={(e) => setDateRange({ ...dateRange, end: parseDateFromInput(e.target.value) })}
              InputLabelProps={{ shrink: true }}
            />
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newMode) => newMode && setViewMode(newMode)}
              size="small"
            >
              <ToggleButton value="day">Day View</ToggleButton>
              <ToggleButton value="range">Range View</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Paper>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Search Purchases"
              fullWidth
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Type, cost, notes..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <InventoryIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Filter by Type"
              fullWidth
              select
              size="small"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="sachet_roll">Sachet Roll</MenuItem>
              <MenuItem value="packing_nylon">Packing Nylon</MenuItem>
            </TextField>
          </Grid>
          {(searchTerm || filterType !== 'all') && (
            <Grid item xs={12} sm={12} md={4}>
              <Button
                variant="outlined"
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                }}
                fullWidth
              >
                Clear Filters
              </Button>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Cost
              </Typography>
              <Typography variant="h4">
                {formatCurrency(totalCost)}
              </Typography>
              <Typography variant="body2">
                {currentPurchases.length} purchase{currentPurchases.length !== 1 ? 's' : ''}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ backgroundColor: 'success.light', color: 'success.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Bag Capacity
              </Typography>
              <Typography variant="h4">
                {totalBags.toLocaleString()}
              </Typography>
              <Typography variant="body2">
                bags available
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ backgroundColor: 'info.light', color: 'info.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sachet Rolls
              </Typography>
              <Typography variant="h4">
                {formatCurrency(totalByType.sachet_roll)}
              </Typography>
              <Typography variant="body2">
                {groupedPurchases.sachet_roll.length} purchase{groupedPurchases.sachet_roll.length !== 1 ? 's' : ''}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Purchase Lists */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <PurchaseCard
            title="Sachet Rolls"
            purchases={groupedPurchases.sachet_roll}
            total={totalByType.sachet_roll}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <PurchaseCard
            title="Packing Nylon"
            purchases={groupedPurchases.packing_nylon}
            total={totalByType.packing_nylon}
            color="success.main"
          />
        </Grid>
      </Grid>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingPurchase ? 'Edit Material Purchase' : 'Add Material Purchase'}
        </DialogTitle>
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
              label="Material Type"
              fullWidth
              select
              value={formData.type}
              onChange={(e) => handleTypeChange(e.target.value as 'sachet_roll' | 'packing_nylon')}
              required
            >
              <MenuItem value="sachet_roll">
                Sachet Roll - ₦{MATERIAL_COSTS.sachet_roll.cost.toLocaleString()} per roll ({MATERIAL_COSTS.sachet_roll.bagsPerRoll} bags)
              </MenuItem>
              <MenuItem value="packing_nylon">
                Packing Nylon - ₦{MATERIAL_COSTS.packing_nylon.cost.toLocaleString()} per package ({MATERIAL_COSTS.packing_nylon.bagsPerPackage.toLocaleString()} bags)
              </MenuItem>
            </TextField>

            <TextField
              label="Quantity"
              fullWidth
              type="number"
              value={formData.quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              required
              inputProps={{ min: 1 }}
              helperText={`Standard: ${formData.type === 'sachet_roll' ? `₦${MATERIAL_COSTS.sachet_roll.cost.toLocaleString()}` : `₦${MATERIAL_COSTS.packing_nylon.cost.toLocaleString()}`} per ${formData.type === 'sachet_roll' ? 'roll' : 'package'}`}
            />

            <TextField
              label="Total Cost (₦)"
              fullWidth
              type="number"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">₦</InputAdornment>,
              }}
              helperText={`Auto-calculated: ${formData.quantity} × ${formData.type === 'sachet_roll' ? `₦${MATERIAL_COSTS.sachet_roll.cost.toLocaleString()}` : `₦${MATERIAL_COSTS.packing_nylon.cost.toLocaleString()}`} = ${formatCurrency(parseFloat(formData.cost || '0'))}`}
            />

            <TextField
              label="Notes (Optional)"
              fullWidth
              multiline
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this purchase"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" size="large">
            {editingPurchase ? 'Update' : 'Add'} Purchase
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
