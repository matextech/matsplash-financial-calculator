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
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { MaterialPurchase, MATERIAL_COSTS } from '../types';
import { dbService } from '../services/database';
import { format } from 'date-fns';

export default function Materials() {
  const [purchases, setPurchases] = useState<MaterialPurchase[]>([]);
  const [open, setOpen] = useState(false);
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

  const handleOpen = () => {
    setFormData({
      type: 'sachet_roll',
      quantity: '1',
      cost: '',
      date: new Date(),
      notes: '',
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
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
      await dbService.addMaterialPurchase(purchaseData);
      handleClose();
      loadPurchases();
    } catch (error) {
      console.error('Error saving material purchase:', error);
      alert('Error saving material purchase. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalCost = purchases.reduce((sum, p) => sum + p.cost, 0);
  const sachetRolls = purchases.filter(p => p.type === 'sachet_roll').reduce((sum, p) => sum + p.quantity, 0);
  const packingNylon = purchases.filter(p => p.type === 'packing_nylon').reduce((sum, p) => sum + p.quantity, 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Material Purchases</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpen}
        >
          Add Purchase
        </Button>
      </Box>

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
              <TableCell>Cost</TableCell>
              <TableCell>Cost per Bag</TableCell>
              <TableCell>Notes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {purchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">No purchases found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              purchases.map((purchase) => {
                const costPerBag = purchase.type === 'sachet_roll'
                  ? purchase.cost / (purchase.quantity * MATERIAL_COSTS.sachet_roll.bagsPerRoll)
                  : purchase.cost / (purchase.quantity * MATERIAL_COSTS.packing_nylon.bagsPerPackage);
                
                return (
                  <TableRow key={purchase.id}>
                    <TableCell>{format(new Date(purchase.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Chip
                        label={purchase.type.replace('_', ' ')}
                        size="small"
                        color={purchase.type === 'sachet_roll' ? 'primary' : 'secondary'}
                      />
                    </TableCell>
                    <TableCell>{purchase.quantity}</TableCell>
                    <TableCell>{formatCurrency(purchase.cost)}</TableCell>
                    <TableCell>{formatCurrency(costPerBag)}</TableCell>
                    <TableCell>{purchase.notes || 'N/A'}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add Material Purchase</DialogTitle>
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
            />
            <TextField
              label="Cost (₦)"
              fullWidth
              type="number"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              required
              helperText={
                formData.type === 'sachet_roll'
                  ? `Standard: ₦31,000 per roll (${MATERIAL_COSTS.sachet_roll.bagsPerRoll} bags)`
                  : `Standard: ₦100,000 per package (${MATERIAL_COSTS.packing_nylon.bagsPerPackage} bags)`
              }
            />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Purchase Date"
                value={formData.date}
                onChange={(newValue) => newValue && setFormData({ ...formData, date: newValue })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
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
            Add Purchase
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

