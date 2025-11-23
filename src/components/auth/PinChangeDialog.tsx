import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  InputAdornment,
} from '@mui/material';
import { Lock } from '@mui/icons-material';
import { authService } from '../../services/authService';
import { apiService } from '../../services/apiService';

interface PinChangeDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PinChangeDialog({ open, onClose, onSuccess }: PinChangeDialogProps) {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!newPin || newPin.length < 4 || newPin.length > 6) {
      setError('PIN must be 4-6 digits');
      return;
    }

    if (!/^\d+$/.test(newPin)) {
      setError('PIN must contain only numbers');
      return;
    }

    if (newPin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setLoading(true);

    try {
      const session = authService.getCurrentSession();
      if (!session) {
        setError('Session expired. Please log in again.');
        setLoading(false);
        return;
      }

      console.log('🔐 Updating PIN for user:', session.userId, 'New PIN:', newPin);
      
      // Update user PIN via backend API
      const response = await apiService.changePin(session.userId, newPin);

      console.log('✅ PIN change API response:', response);

      if (!response || !response.success) {
        throw new Error(response?.message || 'Failed to change PIN - no success response');
      }

      console.log('✅ PIN updated successfully via backend API');

      // Update session to clear the flag
      const updatedSession = { ...session, pinResetRequired: false };
      authService.updateSession(updatedSession);

      console.log('✅ Session updated, calling onSuccess()');

      setLoading(false);
      onSuccess();
    } catch (err: any) {
      console.error('❌ Failed to update PIN:', err);
      setError(err.message || 'Failed to update PIN. Please try again.');
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setNewPin('');
      setConfirmPin('');
      setError('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth disableEscapeKeyDown={true}>
      <form onSubmit={handleSubmit}>
        <DialogTitle>PIN Reset Required</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            You are using a temporary PIN. Please set a new PIN to continue.
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="New PIN"
            type="password"
            value={newPin}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, ''); // Only numbers
              if (value.length <= 6) {
                setNewPin(value);
              }
            }}
            margin="normal"
            required
            inputProps={{ maxLength: 6, pattern: '[0-9]*' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock />
                </InputAdornment>
              ),
            }}
            helperText="Enter 4-6 digits"
          />

          <TextField
            fullWidth
            label="Confirm New PIN"
            type="password"
            value={confirmPin}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, ''); // Only numbers
              if (value.length <= 6) {
                setConfirmPin(value);
              }
            }}
            margin="normal"
            required
            inputProps={{ maxLength: 6, pattern: '[0-9]*' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock />
                </InputAdornment>
              ),
            }}
            helperText="Re-enter your new PIN"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Updating...' : 'Set New PIN'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

