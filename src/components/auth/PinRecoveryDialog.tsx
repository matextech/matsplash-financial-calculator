import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
  Box,
  Stepper,
  Step,
  StepLabel,
  InputAdornment,
} from '@mui/material';
import { Security as SecurityIcon, Lock as LockIcon } from '@mui/icons-material';
import { apiService } from '../../services/apiService';

interface PinRecoveryDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PinRecoveryDialog({ open, onClose, onSuccess }: PinRecoveryDialogProps) {
  const [step, setStep] = useState(0);
  const [directorIdentifier, setDirectorIdentifier] = useState('');
  const [targetUserIdentifier, setTargetUserIdentifier] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenReceived, setTokenReceived] = useState(false);

  const steps = ['Request Recovery', 'Enter Token', 'Set New PIN'];

  const handleRequestRecovery = async () => {
    if (!directorIdentifier) {
      setError('Please enter your email or phone number');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await apiService.requestPinRecovery(
        directorIdentifier, 
        targetUserIdentifier || undefined
      );
      
      if (response.success) {
        setTokenReceived(true);
        // In development, show the token. In production, it would be sent via email/SMS
        if (response.recoveryToken) {
          setRecoveryToken(response.recoveryToken);
          setStep(1);
          alert(`Recovery token generated!\n\nToken: ${response.recoveryToken}\n\n(In production, this would be sent to your email/phone)`);
        } else {
          alert('Recovery token has been sent. Please check your email/phone.');
          setStep(1);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request recovery token');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = () => {
    if (!recoveryToken) {
      setError('Please enter the recovery token');
      return;
    }

    setError('');
    setStep(2);
  };

  const handleResetPin = async () => {
    if (!newPin || !confirmPin) {
      setError('Please enter and confirm your new PIN');
      return;
    }

    if (newPin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    if (!/^\d{4,6}$/.test(newPin)) {
      setError('PIN must be 4-6 digits');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await apiService.verifyPinRecovery(recoveryToken, newPin);
      
      if (response.success) {
        alert('PIN reset successfully! You can now login with your new PIN.');
        handleClose();
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(0);
    setDirectorIdentifier('');
    setTargetUserIdentifier('');
    setRecoveryToken('');
    setNewPin('');
    setConfirmPin('');
    setError('');
    setTokenReceived(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon color="primary" />
          <Typography variant="h6">PIN Recovery</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stepper activeStep={step} sx={{ mt: 2, mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {step === 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter your email or phone number to receive a recovery token. This token will expire in 1 hour.
            </Typography>
            <TextField
              fullWidth
              label="Email or Phone Number"
              value={directorIdentifier}
              onChange={(e) => setDirectorIdentifier(e.target.value)}
              margin="normal"
              required
              disabled={loading}
              placeholder="Enter your email or phone"
            />
            <TextField
              fullWidth
              label="Target User Email or Phone (Optional)"
              value={targetUserIdentifier}
              onChange={(e) => setTargetUserIdentifier(e.target.value)}
              margin="normal"
              disabled={loading}
              placeholder="Enter target user email or phone (optional)"
              helperText="Leave blank to reset your own PIN, or enter another user's email/phone to reset their PIN"
            />
          </Box>
        )}

        {step === 1 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter the recovery token you received. In production, this would be sent to your email/phone.
            </Typography>
            <TextField
              fullWidth
              label="Recovery Token"
              value={recoveryToken}
              onChange={(e) => setRecoveryToken(e.target.value)}
              margin="normal"
              required
              disabled={loading}
              placeholder="Paste your recovery token here"
            />
          </Box>
        )}

        {step === 2 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter your new PIN (4-6 digits). Make sure to remember it!
            </Typography>
            <TextField
              fullWidth
              label="New PIN"
              type="password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              margin="normal"
              required
              disabled={loading}
              inputProps={{ maxLength: 6, pattern: '[0-9]*' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Confirm New PIN"
              type="password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              margin="normal"
              required
              disabled={loading}
              inputProps={{ maxLength: 6, pattern: '[0-9]*' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        {step === 0 && (
          <Button onClick={handleRequestRecovery} variant="contained" disabled={loading}>
            {loading ? 'Requesting...' : 'Request Recovery Token'}
          </Button>
        )}
        {step === 1 && (
          <Button onClick={handleVerifyToken} variant="contained" disabled={loading || !recoveryToken}>
            Verify Token
          </Button>
        )}
        {step === 2 && (
          <Button onClick={handleResetPin} variant="contained" disabled={loading || !newPin || !confirmPin}>
            {loading ? 'Resetting...' : 'Reset PIN'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

