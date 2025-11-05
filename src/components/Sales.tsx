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
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Sale } from '../types';
import { dbService } from '../services/database';
import { format } from 'date-fns';

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    driverName: '',
    driverEmail: '',
    bagsSold: '',
    pricePerBag: '50',
    date: new Date(),
    notes: '',
  });

  useEffect(() => {
    loadSales();
    loadEmployees();
  }, []);

  const loadSales = async () => {
    const data = await dbService.getSales();
    setSales(data);
  };

  const loadEmployees = async () => {
    const data = await dbService.getEmployees();
    setEmployees(data);
  };

  const handleOpen = () => {
    setFormData({
      driverName: '',
      driverEmail: '',
      bagsSold: '',
      pricePerBag: '50',
      date: new Date(),
      notes: '',
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSubmit = async () => {
    const bagsSold = parseInt(formData.bagsSold);
    const pricePerBag = parseFloat(formData.pricePerBag);
    const totalAmount = bagsSold * pricePerBag;

    const saleData: Omit<Sale, 'id'> = {
      driverName: formData.driverName,
      driverEmail: formData.driverEmail || undefined,
      bagsSold,
      pricePerBag,
      totalAmount,
      date: formData.date,
      notes: formData.notes || undefined,
    };

    try {
      await dbService.addSale(saleData);
      handleClose();
      loadSales();
    } catch (error) {
      console.error('Error saving sale:', error);
      alert('Error saving sale. Please try again.');
    }
  };

  const handleDriverChange = (email: string) => {
    const employee = employees.find(e => e.email === email);
    if (employee) {
      setFormData({
        ...formData,
        driverEmail: email,
        driverName: employee.name,
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalBags = sales.reduce((sum, s) => sum + s.bagsSold, 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Sales</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpen}
        >
          Record Sale
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Paper sx={{ p: 2, flex: 1, backgroundColor: 'success.light', color: 'success.contrastText' }}>
          <Typography variant="h6">Total Revenue</Typography>
          <Typography variant="h4">{formatCurrency(totalSales)}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, backgroundColor: 'info.light', color: 'info.contrastText' }}>
          <Typography variant="h6">Total Bags Sold</Typography>
          <Typography variant="h4">{totalBags}</Typography>
        </Paper>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Driver</TableCell>
              <TableCell>Bags Sold</TableCell>
              <TableCell>Price per Bag</TableCell>
              <TableCell>Total Amount</TableCell>
              <TableCell>Notes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">No sales found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{format(new Date(sale.date), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{sale.driverName}</TableCell>
                  <TableCell>{sale.bagsSold}</TableCell>
                  <TableCell>{formatCurrency(sale.pricePerBag)}</TableCell>
                  <TableCell>{formatCurrency(sale.totalAmount)}</TableCell>
                  <TableCell>{sale.notes || 'N/A'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Record Sale</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {employees.length > 0 && (
              <TextField
                label="Driver (Select from employees)"
                fullWidth
                select
                value={formData.driverEmail}
                onChange={(e) => handleDriverChange(e.target.value)}
              >
                {employees.map((emp) => (
                  <MenuItem key={emp.id} value={emp.email}>
                    {emp.name} ({emp.email})
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              label="Driver Name"
              fullWidth
              value={formData.driverName}
              onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
              required
            />
            <TextField
              label="Bags Sold"
              fullWidth
              type="number"
              value={formData.bagsSold}
              onChange={(e) => setFormData({ ...formData, bagsSold: e.target.value })}
              required
              helperText="Typically 300-800 bags per day"
            />
            <TextField
              label="Price per Bag (₦)"
              fullWidth
              type="number"
              value={formData.pricePerBag}
              onChange={(e) => setFormData({ ...formData, pricePerBag: e.target.value })}
              required
            />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Sale Date"
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
            {formData.bagsSold && formData.pricePerBag && (
              <Typography variant="body2" color="primary">
                Total Amount: {formatCurrency(parseInt(formData.bagsSold) * parseFloat(formData.pricePerBag))}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Record Sale
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

