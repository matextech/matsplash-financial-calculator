import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Grid,
  TextField,
  Typography,
  Paper,
  Alert,
  Snackbar,
  InputAdornment,
  IconButton,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Save as SaveIcon,
  Inventory as MaterialsIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { Settings as SettingsType, DEFAULT_SETTINGS, BagPrice } from '../types';
import { apiService } from '../services/apiService';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

export default function Settings() {
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS);
  const [bagPrices, setBagPrices] = useState<BagPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    loadSettings();
    loadBagPrices();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await apiService.getSettings();
      // apiService returns { success: true, data: {...} } or direct object
      const settingsData = data.data || data;
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading settings:', error);
      setSnackbar({ open: true, message: 'Error loading settings', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadBagPrices = async () => {
    try {
      const prices = await apiService.getBagPrices(true); // Include inactive
      const pricesArray = Array.isArray(prices) ? prices : (prices?.data || []);
      setBagPrices(pricesArray);
    } catch (error) {
      console.error('Error loading bag prices:', error);
      setBagPrices([]);
    }
  };

  const handleAddBagPrice = async () => {
    try {
      await apiService.createBagPrice({
        amount: 250,
        label: 'New Price',
        sortOrder: bagPrices.length + 1,
        isActive: true,
      });
      await loadBagPrices();
      setSnackbar({ open: true, message: 'Bag price added successfully', severity: 'success' });
    } catch (error) {
      console.error('Error adding bag price:', error);
      setSnackbar({ open: true, message: 'Error adding bag price', severity: 'error' });
    }
  };

  const handleUpdateBagPrice = async (priceId: number, updates: Partial<BagPrice>) => {
    try {
      await apiService.updateBagPrice(priceId, updates);
      await loadBagPrices();
    } catch (error) {
      console.error('Error updating bag price:', error);
      setSnackbar({ open: true, message: 'Error updating bag price', severity: 'error' });
    }
  };

  const handleDeleteBagPrice = async (priceId: number) => {
    if (!window.confirm('Are you sure you want to delete this bag price?')) {
      return;
    }
    try {
      await apiService.deleteBagPrice(priceId);
      await loadBagPrices();
      setSnackbar({ open: true, message: 'Bag price deleted successfully', severity: 'success' });
    } catch (error) {
      console.error('Error deleting bag price:', error);
      setSnackbar({ open: true, message: 'Error deleting bag price', severity: 'error' });
    }
  };

  const handleChange = (field: keyof SettingsType, value: string) => {
    const numValue = parseFloat(value) || 0;
    setSettings(prev => ({
      ...prev,
      [field]: numValue,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validate settings
      if (settings.sachetRollCost <= 0 || settings.sachetRollBagsPerRoll <= 0) {
        setSnackbar({ open: true, message: 'Sachet roll cost and bags per roll must be greater than 0', severity: 'error' });
        return;
      }
      if (settings.packingNylonCost <= 0 || settings.packingNylonBagsPerPackage <= 0) {
        setSnackbar({ open: true, message: 'Packing nylon cost and bags per package must be greater than 0', severity: 'error' });
        return;
      }
      // Note: Bag prices are now managed separately, so we don't validate salesPrice1/salesPrice2 here

      await apiService.updateSettings(settings);
      setSnackbar({ open: true, message: 'Settings saved successfully!', severity: 'success' });
      // Dispatch event to notify other components that settings have been updated
      window.dispatchEvent(new Event('settingsUpdated'));
    } catch (error) {
      console.error('Error saving settings:', error);
      setSnackbar({ open: true, message: 'Error saving settings', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculateCostPerBag = (cost: number, bags: number) => {
    return bags > 0 ? cost / bags : 0;
  };

  if (loading) {
    return (
      <Container>
        <Typography>Loading settings...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SettingsIcon sx={{ mr: 2, fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            Settings & Management
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Configure material costs, sales prices, and other system settings
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Material Costs Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <MaterialsIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h5" component="h2">
                  Material Costs
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                {/* Sachet Roll */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, backgroundColor: 'grey.50' }}>
                    <Typography variant="h6" gutterBottom>
                      Sachet Roll
                    </Typography>
                    <TextField
                      fullWidth
                      label="Cost per Roll"
                      type="number"
                      value={settings.sachetRollCost}
                      onChange={(e) => handleChange('sachetRollCost', e.target.value)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                      }}
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Bags per Roll"
                      type="number"
                      value={settings.sachetRollBagsPerRoll}
                      onChange={(e) => handleChange('sachetRollBagsPerRoll', e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    <Box sx={{ p: 2, backgroundColor: 'primary.light', borderRadius: 1 }}>
                      <Typography variant="body2" color="primary.contrastText">
                        <strong>Cost per Bag:</strong> {formatCurrency(calculateCostPerBag(settings.sachetRollCost, settings.sachetRollBagsPerRoll))}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>

                {/* Packing Nylon */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, backgroundColor: 'grey.50' }}>
                    <Typography variant="h6" gutterBottom>
                      Packing Nylon
                    </Typography>
                    <TextField
                      fullWidth
                      label="Cost per Package"
                      type="number"
                      value={settings.packingNylonCost}
                      onChange={(e) => handleChange('packingNylonCost', e.target.value)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                      }}
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Bags per Package"
                      type="number"
                      value={settings.packingNylonBagsPerPackage}
                      onChange={(e) => handleChange('packingNylonBagsPerPackage', e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    <Box sx={{ p: 2, backgroundColor: 'primary.light', borderRadius: 1 }}>
                      <Typography variant="body2" color="primary.contrastText">
                        <strong>Cost per Bag:</strong> {formatCurrency(calculateCostPerBag(settings.packingNylonCost, settings.packingNylonBagsPerPackage))}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Sales Prices Section - Dynamic Bag Prices */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <MoneyIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h5" component="h2">
                    Bag Sales Prices
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddBagPrice}
                  size="small"
                >
                  Add Price
                </Button>
              </Box>
              <Divider sx={{ mb: 3 }} />
              <Alert severity="info" sx={{ mb: 3 }}>
                Manage bag prices for sales entries. These prices will be available when entering sales.
              </Alert>

              {bagPrices.length === 0 ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  No bag prices configured. Click "Add Price" to create your first price tier.
                </Alert>
              ) : (
                <Box sx={{ mb: 3 }}>
                  {bagPrices
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((price) => (
                      <Box
                        key={price.id}
                        sx={{
                          display: 'flex',
                          gap: 2,
                          mb: 2,
                          alignItems: 'center',
                          p: 2,
                          bgcolor: price.isActive ? 'background.paper' : 'action.disabledBackground',
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                        }}
                      >
                        <TextField
                          label="Price Amount (₦)"
                          type="number"
                          value={price.amount}
                          onChange={(e) => handleUpdateBagPrice(price.id!, { amount: parseFloat(e.target.value) || 0 })}
                          size="small"
                          sx={{ width: '150px' }}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                          }}
                        />
                        <TextField
                          label="Label"
                          value={price.label}
                          onChange={(e) => handleUpdateBagPrice(price.id!, { label: e.target.value })}
                          size="small"
                          sx={{ flexGrow: 1 }}
                          placeholder="e.g., Standard, Premium, Deluxe"
                        />
                        <TextField
                          label="Order"
                          type="number"
                          value={price.sortOrder}
                          onChange={(e) => handleUpdateBagPrice(price.id!, { sortOrder: parseInt(e.target.value) || 0 })}
                          size="small"
                          sx={{ width: '80px' }}
                          helperText="Display order"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={price.isActive}
                              onChange={(e) => handleUpdateBagPrice(price.id!, { isActive: e.target.checked })}
                              size="small"
                            />
                          }
                          label="Active"
                          labelPlacement="top"
                        />
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteBagPrice(price.id!)}
                          size="small"
                        >
                          Delete
                        </Button>
                      </Box>
                    ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Inventory Settings Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <MaterialsIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h5" component="h2">
                  Inventory Settings
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Low Inventory Threshold (Bags)"
                    type="number"
                    value={settings.inventoryLowThreshold || 4000}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setSettings(prev => ({
                        ...prev,
                        inventoryLowThreshold: value,
                      }));
                    }}
                    helperText="Alert when inventory falls below this number of bags"
                    sx={{ mb: 2 }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Summary Card */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Current Configuration Summary
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Sachet Roll
                  </Typography>
                  <Typography variant="body1">
                    {formatCurrency(settings.sachetRollCost)} per roll ({settings.sachetRollBagsPerRoll} bags)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatCurrency(calculateCostPerBag(settings.sachetRollCost, settings.sachetRollBagsPerRoll))} per bag
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Packing Nylon
                  </Typography>
                  <Typography variant="body1">
                    {formatCurrency(settings.packingNylonCost)} per package ({settings.packingNylonBagsPerPackage} bags)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatCurrency(calculateCostPerBag(settings.packingNylonCost, settings.packingNylonBagsPerPackage))} per bag
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Sales Price 1
                  </Typography>
                  <Typography variant="body1">
                    {formatCurrency(settings.salesPrice1)} per bag
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Sales Price 2
                  </Typography>
                  <Typography variant="body1">
                    {formatCurrency(settings.salesPrice2)} per bag
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Low Inventory Threshold
                  </Typography>
                  <Typography variant="body1">
                    {settings.inventoryLowThreshold || 4000} bags
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Save Button */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </Box>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

