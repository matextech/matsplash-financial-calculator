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
  Divider,
  Chip,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Inventory as BagsIcon,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import { PackerEntry, Employee } from '../types';
import { apiService } from '../services/apiService';
import { format, startOfDay, endOfDay, isSameDay, isToday, addDays, subDays } from 'date-fns';

export default function Packers() {
  const [entries, setEntries] = useState<PackerEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'range'>('day');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(),
    end: new Date(),
  });
  const [filterPacker, setFilterPacker] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PackerEntry | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [formData, setFormData] = useState({
    packerName: '',
    packerEmail: '',
    date: new Date(),
    bagsPacked: '',
    notes: '',
  });

  useEffect(() => {
    loadEntries();
    loadEmployees();
  }, []);

  const loadEntries = async () => {
    try {
      const data = await apiService.getPackerEntries();
      // Handle both array and object with data property
      const entriesList = Array.isArray(data) ? data : (data.data || []);
      console.log('Packer entries loaded:', entriesList.length, 'entries');
      setEntries(entriesList);
    } catch (error) {
      console.error('Error loading packer entries:', error);
      setEntries([]);
    }
  };

  const loadEmployees = async () => {
    try {
      const data = await apiService.getEmployees();
      // Handle both array and object with data property
      const employeesList = Array.isArray(data) ? data : (data.data || []);
      // Filter to only show packers
      const packers = employeesList.filter(emp => emp.role === 'Packers');
      setEmployees(packers);
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployees([]);
    }
  };

  const getEntriesForDate = (date: Date): PackerEntry[] => {
    return entries.filter(entry => {
      const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
      return isSameDay(entryDate, date);
    });
  };

  const getEntriesForRange = (start: Date, end: Date): PackerEntry[] => {
    const startDay = startOfDay(start);
    const endDay = endOfDay(end);
    return entries.filter(entry => {
      const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
      return entryDate >= startDay && entryDate <= endDay;
    });
  };

  const currentEntries = viewMode === 'day' 
    ? getEntriesForDate(selectedDate)
    : getEntriesForRange(dateRange.start, dateRange.end);

  // Filter by packer name
  let filteredEntries = currentEntries;
  if (filterPacker !== 'all') {
    filteredEntries = filteredEntries.filter(entry => 
      entry.packerName.toLowerCase().includes(filterPacker.toLowerCase())
    );
  }

  // Search filter
  if (searchTerm) {
    filteredEntries = filteredEntries.filter(entry => 
      entry.packerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.notes && entry.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }

  const totalBags = filteredEntries.reduce((sum, entry) => sum + (entry.bagsPacked || 0), 0);

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

  const handleOpen = (entry?: PackerEntry, date?: Date) => {
    if (entry) {
      setEditingEntry(entry);
      const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
      setFormData({
        packerName: entry.packerName,
        packerEmail: entry.packerEmail || '',
        date: entryDate,
        bagsPacked: entry.bagsPacked.toString(),
        notes: entry.notes || '',
      });
    } else {
      setEditingEntry(null);
      setFormData({
        packerName: '',
        packerEmail: '',
        date: date || selectedDate,
        bagsPacked: '',
        notes: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingEntry(null);
    setFormData({
      packerName: '',
      packerEmail: '',
      date: new Date(),
      bagsPacked: '',
      notes: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.packerName.trim()) {
      alert('Please select or enter a packer name.');
      return;
    }

    const bagsPacked = parseInt(formData.bagsPacked);
    if (isNaN(bagsPacked) || bagsPacked <= 0) {
      alert('Please enter a valid number of bags packed.');
      return;
    }

    // Find matching employee by name
    let matchingEmployee: Employee | undefined;
    if (formData.packerName.trim()) {
      matchingEmployee = employees.find(
        emp => emp.name.toLowerCase().trim() === formData.packerName.toLowerCase().trim()
      );
    }

    const entryData: Omit<PackerEntry, 'id'> = {
      packerName: formData.packerName.trim(),
      packerEmail: formData.packerEmail?.trim() || undefined,
      employeeId: matchingEmployee?.id,
      bagsPacked: bagsPacked,
      date: formData.date,
      notes: formData.notes?.trim() || undefined,
    };

    try {
      if (editingEntry?.id) {
        await apiService.updatePackerEntry(editingEntry.id, entryData);
        console.log('Packer entry updated successfully');
      } else {
        await apiService.createPackerEntry(entryData);
        console.log('Packer entry added successfully');
      }
      handleClose();
      setTimeout(() => {
        loadEntries();
      }, 100);
    } catch (error: any) {
      console.error('Error saving packer entry:', error);
      const errorMessage = error?.message || 'Error saving packer entry. Please try again.';
      alert(errorMessage);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this packer entry?')) {
      return;
    }

    try {
      await apiService.deletePackerEntry(id);
      console.log('Packer entry deleted successfully');
      loadEntries();
    } catch (error: any) {
      console.error('Error deleting packer entry:', error);
      const errorMessage = error?.message || 'Error deleting packer entry. Please try again.';
      alert(errorMessage);
    }
  };

  // Get unique packer names for filter
  const uniquePackers = Array.from(new Set(entries.map(e => e.packerName))).sort();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BagsIcon />
          Packers - Bags Packed
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Entry
        </Button>
      </Box>

      {/* View Mode Toggle */}
      <Box sx={{ mb: 3 }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, newMode) => {
            if (newMode !== null) setViewMode(newMode);
          }}
          aria-label="view mode"
        >
          <ToggleButton value="day">Day View</ToggleButton>
          <ToggleButton value="range">Date Range</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Date Selection */}
      {viewMode === 'day' ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <IconButton onClick={() => handleDateChange('prev')}>
            <ChevronLeft />
          </IconButton>
          <Button
            variant={isToday(selectedDate) ? 'contained' : 'outlined'}
            startIcon={<CalendarIcon />}
            onClick={() => handleDateChange('today')}
          >
            {isToday(selectedDate) ? 'Today' : format(selectedDate, 'MMM d, yyyy')}
          </Button>
          <IconButton onClick={() => handleDateChange('next')}>
            <ChevronRight />
          </IconButton>
          {!isToday(selectedDate) && (
            <TextField
              type="date"
              size="small"
              value={formatDateForInput(selectedDate)}
              onChange={(e) => setSelectedDate(parseDateFromInput(e.target.value))}
              InputLabelProps={{ shrink: true }}
            />
          )}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            label="Start Date"
            type="date"
            size="small"
            value={formatDateForInput(dateRange.start)}
            onChange={(e) => setDateRange({ ...dateRange, start: parseDateFromInput(e.target.value) })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Date"
            type="date"
            size="small"
            value={formatDateForInput(dateRange.end)}
            onChange={(e) => setDateRange({ ...dateRange, end: parseDateFromInput(e.target.value) })}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      )}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          label="Filter by Packer"
          select
          size="small"
          value={filterPacker}
          onChange={(e) => setFilterPacker(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="all">All Packers</MenuItem>
          {uniquePackers.map((name) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Search"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name or notes..."
          sx={{ flexGrow: 1, maxWidth: 400 }}
        />
      </Box>

      {/* Summary Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography color="text.secondary" variant="body2">
                Total Entries
              </Typography>
              <Typography variant="h5">
                {filteredEntries.length}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography color="text.secondary" variant="body2">
                Total Bags Packed
              </Typography>
              <Typography variant="h5" color="primary.main">
                {totalBags.toLocaleString()}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No packer entries found for the selected period
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
            sx={{ mt: 2 }}
          >
            Add First Entry
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filteredEntries.map((entry) => (
            <Grid item xs={12} sm={6} md={4} key={entry.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon color="primary" />
                        {entry.packerName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {format(new Date(entry.date), 'MMM d, yyyy')}
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleOpen(entry)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(entry.id!)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Bags Packed
                    </Typography>
                    <Chip
                      label={`${entry.bagsPacked.toLocaleString()} bags`}
                      color="primary"
                      icon={<BagsIcon />}
                    />
                  </Box>
                  {entry.notes && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Notes:
                      </Typography>
                      <Typography variant="body2">
                        {entry.notes}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog 
        open={open} 
        onClose={handleClose}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingEntry ? 'Edit Packer Entry' : 'Add Packer Entry'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Packer Name"
              fullWidth
              required
              select
              value={formData.packerName}
              onChange={(e) => {
                const selectedName = e.target.value;
                setFormData({ ...formData, packerName: selectedName });
                // Auto-fill email if employee found
                const employee = employees.find(emp => emp.name === selectedName);
                if (employee && employee.email) {
                  setFormData(prev => ({ ...prev, packerEmail: employee.email }));
                }
              }}
            >
              {employees.map((employee) => (
                <MenuItem key={employee.id} value={employee.name}>
                  {employee.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Packer Email (Optional)"
              fullWidth
              value={formData.packerEmail}
              onChange={(e) => setFormData({ ...formData, packerEmail: e.target.value })}
              type="email"
              placeholder="packer@example.com"
            />
            <TextField
              label="Date"
              type="date"
              fullWidth
              required
              value={formatDateForInput(formData.date)}
              onChange={(e) => setFormData({ ...formData, date: parseDateFromInput(e.target.value) })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Number of Bags Packed"
              fullWidth
              required
              type="number"
              value={formData.bagsPacked}
              onChange={(e) => setFormData({ ...formData, bagsPacked: e.target.value })}
              inputProps={{ min: 0, step: 1 }}
              placeholder="Enter number of bags"
              helperText={formData.bagsPacked ? `${formData.bagsPacked} bags will be recorded for ${formData.packerName || 'this packer'}` : 'Enter the number of bags packed'}
            />
            <TextField
              label="Notes (Optional)"
              fullWidth
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingEntry ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

