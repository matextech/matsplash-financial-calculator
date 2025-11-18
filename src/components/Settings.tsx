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
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Save as SaveIcon,
  Inventory as MaterialsIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { Settings as SettingsType, DEFAULT_SETTINGS } from '../types';
import { dbService } from '../services/database';

export default function Settings() {
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await dbService.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      setSnackbar({ open: true, message: 'Error loading settings', severity: 'error' });
    } finally {
      setLoading(false);
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
      if (settings.salesPrice1 <= 0 || settings.salesPrice2 <= 0) {
        setSnackbar({ open: true, message: 'Sales prices must be greater than 0', severity: 'error' });
        return;
      }

      await dbService.updateSettings(settings);
      setSnackbar({ open: true, message: 'Settings saved successfully!', severity: 'success' });
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

        {/* Sales Prices Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <MoneyIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h5" component="h2">
                  Sales Prices
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Sales Price 1"
                    type="number"
                    value={settings.salesPrice1}
                    onChange={(e) => handleChange('salesPrice1', e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                    }}
                    helperText="Default price per bag (e.g., ₦250)"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Sales Price 2"
                    type="number"
                    value={settings.salesPrice2}
                    onChange={(e) => handleChange('salesPrice2', e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                    }}
                    helperText="Alternative price per bag (e.g., ₦270)"
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

