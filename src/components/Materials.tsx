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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  Chip,
  IconButton,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { MaterialPurchase, MATERIAL_COSTS } from '../types';
import { dbService } from '../services/database';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';

export default function Materials() {
  const [purchases, setPurchases] = useState<MaterialPurchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<MaterialPurchase[]>([]);
  const [open, setOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<MaterialPurchase | null>(null);
  const [formData, setFormData] = useState({
    type: 'sachet_roll' as 'sachet_roll' | 'packing_nylon',
    quantity: '1',
    cost: '',
    date: new Date(),
    notes: '',
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadPurchases();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [purchases, searchTerm, filterType, dateFilter]);

  const loadPurchases = async () => {
    const data = await dbService.getMaterialPurchases();
    setPurchases(data);
    setFilteredPurchases(data);
  };

  const applyFilters = () => {
    let filtered = [...purchases];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.type.toLowerCase().includes(search) ||
        p.cost.toString().includes(search) ||
        (p.notes && p.notes.toLowerCase().includes(search))
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(p => p.type === filterType);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const today = new Date();
      let startDate: Date;
      let endDate: Date = endOfDay(today);

      switch (dateFilter) {
        case 'today':
          startDate = startOfDay(today);
          break;
        case 'week':
          startDate = startOfDay(subDays(today, 7));
          break;
        case 'month':
          startDate = startOfDay(subDays(today, 30));
          break;
        default:
          startDate = startOfDay(subDays(today, 365));
      }

      filtered = filtered.filter(p => {
        const purchaseDate = new Date(p.date);
        return purchaseDate >= startDate && purchaseDate <= endDate;
      });
    }

    setFilteredPurchases(filtered);
  };

  // Helper function to format date for input (YYYY-MM-DD) without timezone issues
  const formatDateForInput = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to parse date from input (YYYY-MM-DD) without timezone issues
  const parseDateFromInput = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const handleOpen = (purchase?: MaterialPurchase) => {
    if (purchase) {
      setEditingPurchase(purchase);
      // Ensure date is properly parsed from database
      const purchaseDate = purchase.date instanceof Date ? purchase.date : new Date(purchase.date);
      setFormData({
        type: purchase.type,
        quantity: purchase.quantity.toString(),
        cost: purchase.cost.toString(),
        date: purchaseDate,
        notes: purchase.notes || '',
      });
    } else {
      setEditingPurchase(null);
      setFormData({
        type: 'sachet_roll',
        quantity: '1',
        cost: '',
        date: new Date(),
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
    const cost = type === 'sachet_roll' 
      ? MATERIAL_COSTS.sachet_roll.cost.toString()
      : MATERIAL_COSTS.packing_nylon.cost.toString();
    
    setFormData({
      ...formData,
      type,
      cost,
    });
  };

  const handleSubmit = async () => {
    const purchaseData: Omit<MaterialPurchase, 'id'> = {
      type: formData.type,
      quantity: parseInt(formData.quantity),
      cost: parseFloat(formData.cost),
      date: formData.date,
      notes: formData.notes || undefined,
    };

    try {
      if (editingPurchase?.id) {
        await dbService.updateMaterialPurchase(editingPurchase.id, purchaseData);
      } else {
        await dbService.addMaterialPurchase(purchaseData);
      }
      handleClose();
      loadPurchases();
    } catch (error) {
      console.error('Error saving material purchase:', error);
      alert('Error saving material purchase. Please try again.');
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalCost = filteredPurchases.reduce((sum, p) => sum + p.cost, 0);
  const sachetRolls = filteredPurchases.filter(p => p.type === 'sachet_roll').reduce((sum, p) => sum + p.quantity, 0);
  const packingNylon = filteredPurchases.filter(p => p.type === 'packing_nylon').reduce((sum, p) => sum + p.quantity, 0);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setDateFilter('all');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">Material Purchases</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
          >
            Add Purchase
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      {showFilters && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              placeholder="Search purchases..."
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 250 }}
            />
            <TextField
              label="Material Type"
              size="small"
              select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="sachet_roll">Sachet Roll</MenuItem>
              <MenuItem value="packing_nylon">Packing Nylon</MenuItem>
            </TextField>
            <TextField
              label="Date Range"
              size="small"
              select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="week">Last 7 Days</MenuItem>
              <MenuItem value="month">Last 30 Days</MenuItem>
              <MenuItem value="year">Last Year</MenuItem>
            </TextField>
            {(searchTerm || filterType !== 'all' || dateFilter !== 'all') && (
              <Button
                size="small"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
              >
                Clear
              </Button>
            )}
          </Box>
        </Paper>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="body2" color="text.secondary">Total Cost</Typography>
          <Typography variant="h5">{formatCurrency(totalCost)}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="body2" color="text.secondary">Sachet Rolls</Typography>
          <Typography variant="h5">{sachetRolls} rolls</Typography>
          <Typography variant="body2" color="text.secondary">
            ({sachetRolls * MATERIAL_COSTS.sachet_roll.bagsPerRoll} bags capacity)
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="body2" color="text.secondary">Packing Nylon</Typography>
          <Typography variant="h5">{packingNylon} packages</Typography>
          <Typography variant="body2" color="text.secondary">
            ({packingNylon * MATERIAL_COSTS.packing_nylon.bagsPerPackage} bags capacity)
          </Typography>
        </Paper>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell align="right">Cost</TableCell>
              <TableCell align="right">Cost per Bag</TableCell>
              <TableCell>Notes</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPurchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary">
                    {purchases.length === 0 ? 'No purchases found' : 'No purchases match your filters'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredPurchases.map((purchase) => {
                const costPerBag = purchase.type === 'sachet_roll'
                  ? purchase.cost / (purchase.quantity * MATERIAL_COSTS.sachet_roll.bagsPerRoll)
                  : purchase.cost / (purchase.quantity * MATERIAL_COSTS.packing_nylon.bagsPerPackage);
                
                return (
                  <TableRow key={purchase.id} hover>
                    <TableCell>{format(new Date(purchase.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Chip
                        label={purchase.type.replace('_', ' ')}
                        size="small"
                        color={purchase.type === 'sachet_roll' ? 'primary' : 'secondary'}
                      />
                    </TableCell>
                    <TableCell>{purchase.quantity}</TableCell>
                    <TableCell align="right">{formatCurrency(purchase.cost)}</TableCell>
                    <TableCell align="right">{formatCurrency(costPerBag)}</TableCell>
                    <TableCell>{purchase.notes || 'N/A'}</TableCell>
                    <TableCell align="center">
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
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingPurchase ? 'Edit Material Purchase' : 'Add Material Purchase'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Material Type"
              fullWidth
              select
              value={formData.type}
              onChange={(e) => handleTypeChange(e.target.value as any)}
            >
              <MenuItem value="sachet_roll">
                Sachet Roll (₦31,000 per roll - 450 bags)
              </MenuItem>
              <MenuItem value="packing_nylon">
                Packing Nylon (₦100,000 per package - 5000 bags)
              </MenuItem>
            </TextField>
            <TextField
              label="Quantity"
              fullWidth
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
              inputProps={{ min: 1 }}
            />
            <TextField
              label="Cost (₦)"
              fullWidth
              type="number"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">₦</InputAdornment>,
              }}
              helperText={
                formData.type === 'sachet_roll'
                  ? `Standard: ₦31,000 per roll (${MATERIAL_COSTS.sachet_roll.bagsPerRoll} bags)`
                  : `Standard: ₦100,000 per package (${MATERIAL_COSTS.packing_nylon.bagsPerPackage} bags)`
              }
            />
            <TextField
              label="Purchase Date"
              type="date"
              fullWidth
              value={formatDateForInput(formData.date)}
              onChange={(e) => setFormData({ ...formData, date: parseDateFromInput(e.target.value) })}
              InputLabelProps={{
                shrink: true,
              }}
              required
            />
            <TextField
              label="Notes"
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
            {editingPurchase ? 'Update' : 'Add'} Purchase
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
