import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, Phone, Email, Lock } from '@mui/icons-material';
import { authService } from '../../services/authService';
import { useNavigate } from 'react-router-dom';
import PinChangeDialog from './PinChangeDialog';

export default function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [passwordOrPin, setPasswordOrPin] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [showPinChangeDialog, setShowPinChangeDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Starting login process...');
      const session = await authService.login(identifier, passwordOrPin, needs2FA ? twoFactorCode : undefined);
      console.log('Login successful, checking PIN reset requirement...', session);
      
      // Check if PIN reset is required
      if (session.pinResetRequired) {
        console.log('PIN reset required, showing dialog');
        // Determine where to navigate after PIN change
        let targetRoute = '/dashboard';
        switch (session.role) {
          case 'director':
            targetRoute = '/dashboard';
            break;
          case 'manager':
            targetRoute = '/manager';
            break;
          case 'receptionist':
            targetRoute = '/receptionist';
            break;
          case 'storekeeper':
            targetRoute = '/storekeeper';
            break;
        }
        setPendingNavigation(targetRoute);
        setShowPinChangeDialog(true);
        setLoading(false);
        return;
      }
      
      // Navigate based on role if PIN reset not required
      console.log('Navigating to dashboard...');
      switch (session.role) {
        case 'director':
          console.log('Navigating to financial dashboard');
          navigate('/dashboard');
          break;
        case 'manager':
          console.log('Navigating to manager dashboard');
          navigate('/manager');
          break;
        case 'receptionist':
          console.log('Navigating to receptionist dashboard');
          navigate('/receptionist');
          break;
        case 'storekeeper':
          console.log('Navigating to storekeeper dashboard');
          navigate('/storekeeper');
          break;
        default:
          console.log('Navigating to default dashboard');
          navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      if (err.message === '2FA code required') {
        setNeeds2FA(true);
        setError('Please enter your 2FA code');
      } else {
        setError(err.message || 'Invalid credentials');
      }
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'grey.100',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom align="center">
            Matsplash Login
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Enter your credentials to continue
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Phone Number or Email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {identifier.includes('@') ? <Email /> : <Phone />}
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label={identifier.includes('@') ? 'Password' : 'PIN'}
              type={showPassword ? 'text' : 'password'}
              value={passwordOrPin}
              onChange={(e) => setPasswordOrPin(e.target.value)}
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {needs2FA && (
              <TextField
                fullWidth
                label="2FA Code"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                margin="normal"
                required
                inputProps={{ maxLength: 6, pattern: '[0-9]*' }}
                helperText="Enter 6-digit code from your authenticator app"
              />
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <PinChangeDialog
        open={showPinChangeDialog}
        onClose={() => {
          setShowPinChangeDialog(false);
          setPendingNavigation(null);
          // Logout user if they cancel PIN change
          authService.logout();
        }}
        onSuccess={() => {
          setShowPinChangeDialog(false);
          if (pendingNavigation) {
            navigate(pendingNavigation);
          } else {
            navigate('/dashboard');
          }
        }}
      />
    </Box>
  );
}

