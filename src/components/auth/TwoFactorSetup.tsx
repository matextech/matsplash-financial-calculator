import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Divider,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { twoFactorService, TwoFactorSetup as TwoFactorSetupData } from '../../services/twoFactorService';
import { apiService } from '../../services/apiService';
import { authService } from '../../services/authService';

interface TwoFactorSetupProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: number;
  userEmail?: string;
  userName: string;
}

export default function TwoFactorSetup({
  open,
  onClose,
  onSuccess,
  userId,
  userEmail,
  userName,
}: TwoFactorSetupProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [setup, setSetup] = useState<TwoFactorSetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && activeStep === 0) {
      generateSetup();
    }
  }, [open, activeStep]);

  const generateSetup = async () => {
    try {
      setLoading(true);
      setError('');
      const twoFactorSetup = await twoFactorService.generateSecret(
        userId,
        userEmail || userName,
        'MatSplash'
      );
      setSetup(twoFactorSetup);
    } catch (err: any) {
      console.error('Error generating 2FA setup:', err);
      setError('Failed to generate 2FA setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = async () => {
    if (setup) {
      try {
        await navigator.clipboard.writeText(setup.manualEntryKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleVerify = async () => {
    if (!setup || !verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    if (verificationCode.length !== 6) {
      setError('Verification code must be 6 digits');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Verify the code locally first
      const isValid = twoFactorService.verifyCode(setup.secret, verificationCode);
      if (!isValid) {
        setError('Invalid verification code. Please try again.');
        setLoading(false);
        return;
      }

      // If valid, save to backend
      const result = await apiService.enable2FA(userId, setup.secret);
      if (result.success) {
        setActiveStep(2);
        // Update local session if current user
        const session = authService.getCurrentSession();
        if (session && session.userId === userId) {
          // Session will be updated on next login
        }
      } else {
        setError(result.message || 'Failed to enable 2FA');
      }
    } catch (err: any) {
      console.error('Error verifying 2FA:', err);
      setError(err.message || 'Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setVerificationCode('');
    setError('');
    setSetup(null);
    setCopied(false);
    onClose();
  };

  const steps = ['Scan QR Code', 'Verify Code', 'Complete'];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon color="primary" />
          <Typography variant="h6">Enable Two-Factor Authentication</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mt: 2, mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {activeStep === 0 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              Scan the QR code below with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)
            </Alert>

            {loading ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography>Generating QR code...</Typography>
              </Box>
            ) : setup ? (
              <Box sx={{ textAlign: 'center' }}>
                <Paper
                  elevation={3}
                  sx={{
                    p: 2,
                    display: 'inline-block',
                    bgcolor: 'white',
                    borderRadius: 2,
                    mb: 2,
                  }}
                >
                  <img
                    src={setup.qrCodeDataUrl}
                    alt="2FA QR Code"
                    style={{ width: '250px', height: '250px' }}
                  />
                </Paper>

                <Divider sx={{ my: 2 }}>OR</Divider>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Can't scan? Enter this code manually:
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    mt: 1,
                    mb: 2,
                  }}
                >
                  <Paper
                    elevation={1}
                    sx={{
                      p: 1.5,
                      fontFamily: 'monospace',
                      fontSize: '1.1rem',
                      letterSpacing: '0.1em',
                      bgcolor: 'grey.100',
                    }}
                  >
                    {twoFactorService.formatSecretForDisplay(setup.manualEntryKey)}
                  </Paper>
                  <IconButton
                    onClick={handleCopySecret}
                    color={copied ? 'success' : 'default'}
                    size="small"
                  >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                  </IconButton>
                </Box>

                <Button
                  variant="contained"
                  onClick={() => setActiveStep(1)}
                  sx={{ mt: 2 }}
                >
                  I've Scanned the Code
                </Button>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="error">Failed to generate setup</Typography>
                <Button onClick={generateSetup} sx={{ mt: 2 }}>
                  Retry
                </Button>
              </Box>
            )}
          </Box>
        )}

        {activeStep === 1 && (
          <Box>
            <Alert severity="warning" sx={{ mb: 3 }}>
              Enter the 6-digit code from your authenticator app to verify and enable 2FA.
            </Alert>

            <TextField
              fullWidth
              label="Verification Code"
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setVerificationCode(value);
                setError('');
              }}
              inputProps={{
                maxLength: 6,
                pattern: '[0-9]*',
                inputMode: 'numeric',
              }}
              placeholder="000000"
              helperText="Enter the 6-digit code from your authenticator app"
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button onClick={() => setActiveStep(0)}>Back</Button>
              <Button
                variant="contained"
                onClick={handleVerify}
                disabled={loading || verificationCode.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </Button>
            </Box>
          </Box>
        )}

        {activeStep === 2 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              2FA Successfully Enabled!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Two-factor authentication is now active for your account. You'll need to enter a code from your authenticator app each time you log in.
            </Typography>
            <Button variant="contained" onClick={onSuccess}>
              Done
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {activeStep < 2 && (
          <Button onClick={handleClose}>Cancel</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

