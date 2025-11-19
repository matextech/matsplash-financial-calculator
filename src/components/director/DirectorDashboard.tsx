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
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Logout as LogoutIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { User } from '../../types/auth';
import { ReceptionistSale, StorekeeperEntry, Settlement, AuditLog } from '../../types/sales-log';
import { Employee } from '../../types';
import { dbService } from '../../services/database';
import { authService } from '../../services/authService';
import { useNavigate } from 'react-router-dom';
import { format, startOfYear, endOfYear, subYears } from 'date-fns';

export default function DirectorDashboard() {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [subTabValue, setSubTabValue] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sales, setSales] = useState<ReceptionistSale[]>([]);
  const [entries, setEntries] = useState<StorekeeperEntry[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  // User management dialogs
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    phone: '',
    email: '',
    password: '',
    pin: '',
    role: 'manager' as 'director' | 'manager' | 'receptionist' | 'storekeeper',
    name: '',
    twoFactorEnabled: false,
    isActive: true,
  });

  // Employee management dialogs
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeFormData, setEmployeeFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Driver' as 'Driver' | 'Packers',
  });

  useEffect(() => {
    loadData();
  }, [selectedYear, tabValue, subTabValue]);

  const loadData = async () => {
    try {
      const yearStart = new Date(selectedYear, 0, 1);
      const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59);

      if (tabValue === 0) {
        // Main dashboard view
        const [salesData, entriesData, settlementsData] = await Promise.all([
          dbService.getReceptionistSales(yearStart, yearEnd),
          dbService.getStorekeeperEntries(yearStart, yearEnd),
          dbService.getSettlements(yearStart, yearEnd),
        ]);
        setSales(salesData);
        setEntries(entriesData);
        setSettlements(settlementsData);
      } else if (tabValue === 1) {
        // User management
        const usersData = await dbService.getUsers();
        setUsers(usersData);
      } else if (tabValue === 2) {
        // Employee management
        const employeesData = await dbService.getEmployees();
        setEmployees(employeesData.filter(e => e.role === 'Driver' || e.role === 'Packers'));
      } else if (tabValue === 3) {
        // Audit logs
        const logsData = await dbService.getAuditLogs(undefined, undefined, yearStart, yearEnd);
        setAuditLogs(logsData);
      }
      
      // Load users for audit log display
      if (tabValue === 1 || tabValue === 3) {
        const usersData = await dbService.getUsers();
        setAllUsers(usersData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleOpenUserDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserFormData({
        phone: user.phone,
        email: user.email || '',
        password: '',
        pin: user.pin || '',
        role: user.role,
        name: user.name,
        twoFactorEnabled: user.twoFactorEnabled,
        isActive: user.isActive,
      });
    } else {
      setEditingUser(null);
      setUserFormData({
        phone: '',
        email: '',
        password: '',
        pin: '',
        role: 'manager',
        name: '',
        twoFactorEnabled: false,
        isActive: true,
      });
    }
    setUserDialogOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        await dbService.updateUser(editingUser.id!, userFormData);
      } else {
        await dbService.addUser(userFormData);
      }
      setUserDialogOpen(false);
      await loadData();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error saving user. Please try again.');
    }
  };

  const handleResetPin = async (userId: number) => {
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    await dbService.updateUser(userId, { pin: newPin });
    alert(`New PIN: ${newPin}`);
    await loadData();
  };

  const handleOpenEmployeeDialog = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setEmployeeFormData({
        name: employee.name,
        email: employee.email,
        phone: employee.phone || '',
        role: employee.role || 'Driver',
      });
    } else {
      setEditingEmployee(null);
      setEmployeeFormData({
        name: '',
        email: '',
        phone: '',
        role: 'Driver',
      });
    }
    setEmployeeDialogOpen(true);
  };

  const handleSaveEmployee = async () => {
    try {
      if (editingEmployee) {
        await dbService.updateEmployee(editingEmployee.id!, {
          name: employeeFormData.name,
          email: employeeFormData.email,
          phone: employeeFormData.phone,
          role: employeeFormData.role,
        });
      } else {
        await dbService.addEmployee({
          name: employeeFormData.name,
          email: employeeFormData.email,
          phone: employeeFormData.phone,
          role: employeeFormData.role,
          salaryType: 'commission',
          commissionRate: employeeFormData.role === 'Driver' ? 15 : 4,
        });
      }
      setEmployeeDialogOpen(false);
      await loadData();
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Error saving employee. Please try again.');
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

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Director Dashboard</Typography>
        <Button
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
        >
          Logout
        </Button>
      </Box>

      {/* Year Selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button onClick={() => setSelectedYear(selectedYear - 1)}>
            Previous Year
          </Button>
          <TextField
            type="number"
            label="Year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 120 }}
          />
          <Button onClick={() => setSelectedYear(new Date().getFullYear())}>
            Current Year
          </Button>
        </Box>
      </Paper>

      {/* Main Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Overview" />
          <Tab label="User Management" />
          <Tab label="Employee Management" />
          <Tab label="Audit Logs" />
        </Tabs>
      </Paper>

      {/* Overview Tab */}
      {tabValue === 0 && (
        <Box>
          <Paper sx={{ mb: 3 }}>
            <Tabs value={subTabValue} onChange={(_, newValue) => setSubTabValue(newValue)}>
              <Tab label="Manager View" />
              <Tab label="Receptionist View" />
              <Tab label="Storekeeper View" />
            </Tabs>
          </Paper>

          {subTabValue === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Manager View - {selectedYear}
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6">Total Sales</Typography>
                      <Typography variant="h4">{sales.length}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6">Total Settlements</Typography>
                      <Typography variant="h4">{settlements.length}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6">Settled Amount</Typography>
                      <Typography variant="h4">
                        {formatCurrency(settlements.reduce((sum, s) => sum + s.settledAmount, 0))}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {subTabValue === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Receptionist Sales - {selectedYear}
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Driver</TableCell>
                      <TableCell>Total Bags</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>{format(new Date(sale.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{sale.saleType}</TableCell>
                        <TableCell>{sale.driverName || 'N/A'}</TableCell>
                        <TableCell>{sale.totalBags.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {subTabValue === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Storekeeper Entries - {selectedYear}
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Driver/Packer</TableCell>
                      <TableCell>Bags</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{format(new Date(entry.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{entry.entryType}</TableCell>
                        <TableCell>{entry.driverName || entry.packerName || 'N/A'}</TableCell>
                        <TableCell>{entry.bagsCount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      )}

      {/* User Management Tab */}
      {tabValue === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">User Accounts</Typography>
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => handleOpenUserDialog()}
            >
              Add User
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Phone/Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>2FA</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.phone || user.email}</TableCell>
                    <TableCell>
                      <Chip label={user.role} size="small" />
                    </TableCell>
                    <TableCell>
                      {user.twoFactorEnabled ? (
                        <Chip label="Enabled" color="success" size="small" />
                      ) : (
                        <Chip label="Disabled" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <Chip label="Active" color="success" size="small" />
                      ) : (
                        <Chip label="Inactive" color="error" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleOpenUserDialog(user)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {user.role !== 'director' && (
                        <Tooltip title="Reset PIN">
                          <IconButton size="small" onClick={() => handleResetPin(user.id!)}>
                            <SecurityIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Employee Management Tab */}
      {tabValue === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Drivers & Packers</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenEmployeeDialog()}
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
                  <TableCell>Role</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>{emp.name}</TableCell>
                    <TableCell>{emp.email}</TableCell>
                    <TableCell>{emp.phone || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip label={emp.role} size="small" />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleOpenEmployeeDialog(emp)}>
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

      {/* Audit Logs Tab */}
      {tabValue === 3 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Audit Logs - {selectedYear}
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Entity</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Field</TableCell>
                  <TableCell>Old Value</TableCell>
                  <TableCell>New Value</TableCell>
                  <TableCell>Changed By</TableCell>
                  <TableCell>Reason</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{format(new Date(log.changedAt), 'MMM d, yyyy HH:mm')}</TableCell>
                    <TableCell>{log.entityType}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.field || 'N/A'}</TableCell>
                    <TableCell>{log.oldValue || 'N/A'}</TableCell>
                    <TableCell>{log.newValue || 'N/A'}</TableCell>
                    <TableCell>
                      {allUsers.find(u => u.id === log.changedBy)?.name || `User ${log.changedBy}`}
                    </TableCell>
                    <TableCell>{log.reason || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* User Dialog */}
      <Dialog open={userDialogOpen} onClose={() => setUserDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              fullWidth
              value={userFormData.name}
              onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
              required
            />
            <TextField
              label="Phone Number"
              fullWidth
              value={userFormData.phone}
              onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
              required={userFormData.role !== 'director'}
            />
            <TextField
              label="Email"
              fullWidth
              type="email"
              value={userFormData.email}
              onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              required={userFormData.role === 'director'}
            />
            <TextField
              label="Role"
              fullWidth
              select
              value={userFormData.role}
              onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as any })}
              required
            >
              <MenuItem value="director">Director</MenuItem>
              <MenuItem value="manager">Manager</MenuItem>
              <MenuItem value="receptionist">Receptionist</MenuItem>
              <MenuItem value="storekeeper">Storekeeper</MenuItem>
            </TextField>
            {!editingUser && (
              <>
                {userFormData.role === 'director' ? (
                  <TextField
                    label="Password"
                    fullWidth
                    type="password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    required
                  />
                ) : (
                  <TextField
                    label="PIN (4 digits)"
                    fullWidth
                    type="text"
                    value={userFormData.pin}
                    onChange={(e) => setUserFormData({ ...userFormData, pin: e.target.value })}
                    inputProps={{ maxLength: 4, pattern: '[0-9]*' }}
                    required
                  />
                )}
              </>
            )}
            {userFormData.role === 'director' && (
              <FormControlLabel
                control={
                  <Switch
                    checked={userFormData.twoFactorEnabled}
                    onChange={(e) => setUserFormData({ ...userFormData, twoFactorEnabled: e.target.checked })}
                  />
                }
                label="Enable 2FA"
              />
            )}
            <FormControlLabel
              control={
                <Switch
                  checked={userFormData.isActive}
                  onChange={(e) => setUserFormData({ ...userFormData, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveUser} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Employee Dialog */}
      <Dialog open={employeeDialogOpen} onClose={() => setEmployeeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              fullWidth
              value={employeeFormData.name}
              onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })}
              required
            />
            <TextField
              label="Email"
              fullWidth
              type="email"
              value={employeeFormData.email}
              onChange={(e) => setEmployeeFormData({ ...employeeFormData, email: e.target.value })}
              required
            />
            <TextField
              label="Phone"
              fullWidth
              value={employeeFormData.phone}
              onChange={(e) => setEmployeeFormData({ ...employeeFormData, phone: e.target.value })}
            />
            <TextField
              label="Role"
              fullWidth
              select
              value={employeeFormData.role}
              onChange={(e) => setEmployeeFormData({ ...employeeFormData, role: e.target.value as any })}
              required
            >
              <MenuItem value="Driver">Driver</MenuItem>
              <MenuItem value="Packers">Packer</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmployeeDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEmployee} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

