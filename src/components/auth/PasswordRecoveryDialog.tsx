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
  IconButton,
} from '@mui/material';
import { Security as SecurityIcon, Lock as LockIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import { apiService } from '../../services/apiService';

interface PasswordRecoveryDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PasswordRecoveryDialog({ open, onClose, onSuccess }: PasswordRecoveryDialogProps) {
  const [step, setStep] = useState(0);
  const [identifier, setIdentifier] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const steps = ['Verify Identity', 'Enter Token', 'Set New Password'];

  const handleRequestRecovery = async () => {
    if (!identifier) {
      setError('Please enter your email or phone number');
      return;
    }

    if (!twoFactorCode) {
      setError('Please enter your 2FA code from your authenticator app');
      return;
    }

    if (!/^\d{6}$/.test(twoFactorCode)) {
      setError('2FA code must be 6 digits');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await apiService.requestPasswordRecovery(identifier, twoFactorCode);
      
      if (response.success) {
        // Show the token - email/SMS is not configured yet
        if (response.recoveryToken) {
          setRecoveryToken(response.recoveryToken);
          setStep(1);
          alert(`⚠️ Email/SMS is not configured yet.\n\nRecovery Token: ${response.recoveryToken}\n\nPlease copy this token and use it in the next step. The token expires in 1 hour.\n\nTo enable email/SMS delivery, configure email service in the backend.`);
        } else {
          alert('⚠️ Email/SMS is not configured. Please contact administrator for recovery token.');
          setError('Email/SMS service is not configured. Please contact administrator.');
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

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await apiService.verifyPasswordRecovery(recoveryToken, newPassword);
      
      if (response.success) {
        alert('Password reset successfully! You can now login with your new password.');
        handleClose();
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(0);
    setIdentifier('');
    setTwoFactorCode('');
    setRecoveryToken('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setShowPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon color="primary" />
          <Typography variant="h6">Password Recovery</Typography>
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
              Enter your email or phone number and 2FA code from your authenticator app. A recovery token will be generated and expire in 1 hour.
            </Typography>
            <TextField
              fullWidth
              label="Email or Phone Number"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              margin="normal"
              required
              disabled={loading}
              placeholder="Enter your email or phone"
            />
            <TextField
              fullWidth
              label="2FA Code"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              margin="normal"
              required
              disabled={loading}
              inputProps={{ maxLength: 6, pattern: '[0-9]*' }}
              helperText="Enter 6-digit code from your authenticator app"
            />
          </Box>
        )}

        {step === 1 && (
          <Box>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Email/SMS service is not configured. The recovery token is shown in the alert above. Please copy it and paste it here.
            </Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter the recovery token you received. Once email/SMS is configured, tokens will be sent automatically.
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
              Enter your new password (minimum 6 characters). Make sure to remember it!
            </Typography>
            <TextField
              fullWidth
              label="New Password"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              margin="normal"
              required
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      edge="end"
                      size="small"
                    >
                      {showNewPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              margin="normal"
              required
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                      size="small"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
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
          <Button onClick={handleRequestRecovery} variant="contained" disabled={loading || !identifier || !twoFactorCode}>
            {loading ? 'Requesting...' : 'Request Recovery Token'}
          </Button>
        )}
        {step === 1 && (
          <Button onClick={handleVerifyToken} variant="contained" disabled={loading || !recoveryToken}>
            Verify Token
          </Button>
        )}
        {step === 2 && (
          <Button onClick={handleResetPassword} variant="contained" disabled={loading || !newPassword || !confirmPassword}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

