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
import { Employee } from '../types';
import { dbService } from '../services/database';

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'General' as 'Driver' | 'Packers' | 'Manager' | 'General',
    salaryType: 'fixed' as 'fixed' | 'commission' | 'both',
    fixedSalary: '',
    commissionRate: '',
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterSalaryType, setFilterSalaryType] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [employees, searchTerm, filterRole, filterSalaryType]);

  const loadEmployees = async () => {
    const data = await dbService.getEmployees();
    setEmployees(data);
    setFilteredEmployees(data);
  };

  const applyFilters = () => {
    let filtered = [...employees];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(e => 
        e.name.toLowerCase().includes(search) ||
        e.email.toLowerCase().includes(search) ||
        (e.phone && e.phone.toLowerCase().includes(search))
      );
    }

    // Role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(e => e.role === filterRole);
    }

    // Salary type filter
    if (filterSalaryType !== 'all') {
      filtered = filtered.filter(e => e.salaryType === filterSalaryType);
    }

    setFilteredEmployees(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterRole('all');
    setFilterSalaryType('all');
  };

  const handleOpen = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        name: employee.name,
        email: employee.email,
        phone: employee.phone || '',
        role: employee.role || 'General',
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
        role: 'General',
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
      role: formData.role || 'General',
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">Employees</Typography>
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
            Add Employee
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      {showFilters && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              placeholder="Search employees..."
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
              label="Role"
              size="small"
              select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="all">All Roles</MenuItem>
              <MenuItem value="General">General</MenuItem>
              <MenuItem value="Driver">Driver</MenuItem>
              <MenuItem value="Packers">Packers</MenuItem>
              <MenuItem value="Manager">Manager</MenuItem>
            </TextField>
            <TextField
              label="Salary Type"
              size="small"
              select
              value={filterSalaryType}
              onChange={(e) => setFilterSalaryType(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="fixed">Fixed Salary</MenuItem>
              <MenuItem value="commission">Commission Only</MenuItem>
              <MenuItem value="both">Fixed + Commission</MenuItem>
            </TextField>
            {(searchTerm || filterRole !== 'all' || filterSalaryType !== 'all') && (
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

      <Paper sx={{ p: 2, mb: 3, backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
        <Typography variant="h6">
          Total Employees: {filteredEmployees.length} ({employees.length} total)
        </Typography>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Salary Type</TableCell>
              <TableCell>Fixed Salary</TableCell>
              <TableCell>Commission Rate (₦ per bag)</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary">
                    {employees.length === 0 ? 'No employees found' : 'No employees match your filters'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((employee) => (
                <TableRow key={employee.id} hover>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.phone || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip
                      label={employee.role || 'General'}
                      size="small"
                      color={
                        employee.role === 'Manager'
                          ? 'primary'
                          : employee.role === 'Driver'
                          ? 'secondary'
                          : employee.role === 'Packers'
                          ? 'primary'
                          : 'default'
                      }
                    />
                  </TableCell>
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
                    {employee.commissionRate ? `₦${employee.commissionRate.toFixed(2)}/bag` : 'N/A'}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleOpen(employee)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => employee.id && handleDelete(employee.id)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
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
              label="Role"
              fullWidth
              select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
            >
              <MenuItem value="General">General</MenuItem>
              <MenuItem value="Driver">Driver</MenuItem>
              <MenuItem value="Packers">Packers</MenuItem>
              <MenuItem value="Manager">Manager</MenuItem>
            </TextField>
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
                label="Commission Rate (₦ per bag)"
                fullWidth
                type="number"
                value={formData.commissionRate}
                onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                helperText="Fixed amount per bag (e.g., ₦15 for drivers, ₦4 for packers)"
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

