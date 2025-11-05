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
  IconButton,
  MenuItem,
  Chip,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Employee } from '../types';
import { dbService } from '../services/database';

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    salaryType: 'fixed' as 'fixed' | 'commission' | 'both',
    fixedSalary: '',
    commissionRate: '',
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    const data = await dbService.getEmployees();
    setEmployees(data);
  };

  const handleOpen = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        name: employee.name,
        email: employee.email,
        phone: employee.phone || '',
        salaryType: employee.salaryType,
        fixedSalary: employee.fixedSalary?.toString() || '',
        commissionRate: employee.commissionRate?.toString() || '',
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        salaryType: 'fixed',
        fixedSalary: '',
        commissionRate: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingEmployee(null);
  };

  const handleSubmit = async () => {
    const employeeData: Omit<Employee, 'id'> = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      salaryType: formData.salaryType,
      fixedSalary: formData.fixedSalary ? parseFloat(formData.fixedSalary) : undefined,
      commissionRate: formData.commissionRate ? parseFloat(formData.commissionRate) : undefined,
    };

    try {
      if (editingEmployee?.id) {
        await dbService.updateEmployee(editingEmployee.id, employeeData);
      } else {
        await dbService.addEmployee(employeeData);
      }
      handleClose();
      loadEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Error saving employee. Please try again.');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await dbService.deleteEmployee(id);
        loadEmployees();
      } catch (error) {
        console.error('Error deleting employee:', error);
        alert('Error deleting employee. Please try again.');
      }
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Employees</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
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
              <TableCell>Salary Type</TableCell>
              <TableCell>Fixed Salary</TableCell>
              <TableCell>Commission Rate</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary">No employees found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.phone || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip
                      label={employee.salaryType}
                      size="small"
                      color={
                        employee.salaryType === 'fixed'
                          ? 'primary'
                          : employee.salaryType === 'commission'
                          ? 'secondary'
                          : 'success'
                      }
                    />
                  </TableCell>
                  <TableCell>{formatCurrency(employee.fixedSalary)}</TableCell>
                  <TableCell>
                    {employee.commissionRate ? `${employee.commissionRate}%` : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleOpen(employee)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => employee.id && handleDelete(employee.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingEmployee ? 'Edit Employee' : 'Add Employee'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              label="Email"
              fullWidth
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <TextField
              label="Phone"
              fullWidth
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <TextField
              label="Salary Type"
              fullWidth
              select
              value={formData.salaryType}
              onChange={(e) => setFormData({ ...formData, salaryType: e.target.value as any })}
            >
              <MenuItem value="fixed">Fixed Salary</MenuItem>
              <MenuItem value="commission">Commission Only</MenuItem>
              <MenuItem value="both">Fixed + Commission</MenuItem>
            </TextField>
            {(formData.salaryType === 'fixed' || formData.salaryType === 'both') && (
              <TextField
                label="Fixed Salary (Monthly)"
                fullWidth
                type="number"
                value={formData.fixedSalary}
                onChange={(e) => setFormData({ ...formData, fixedSalary: e.target.value })}
              />
            )}
            {(formData.salaryType === 'commission' || formData.salaryType === 'both') && (
              <TextField
                label="Commission Rate (%)"
                fullWidth
                type="number"
                value={formData.commissionRate}
                onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                helperText="Percentage commission per bag sold"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingEmployee ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

