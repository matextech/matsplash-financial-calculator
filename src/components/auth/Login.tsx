import { useState, useEffect, useRef } from 'react';
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
import { apiService } from '../../services/apiService';
import { useNavigate, useParams } from 'react-router-dom';
import PinChangeDialog from './PinChangeDialog';
// Password/PIN recovery disabled - 2FA sufficient

export default function Login() {
  const navigate = useNavigate();
  const { secretPath } = useParams<{ secretPath?: string }>();
  
  // Check if secret path is correct (environment variable or hardcoded for production)
  const validSecretPath = (import.meta.env?.VITE_LOGIN_SECRET_PATH as string) || 'matsplash-fin-2024-secure';
  
  useEffect(() => {
    // If no secret path or wrong secret path, redirect to 404
    if (!secretPath || secretPath !== validSecretPath) {
      navigate('/404', { replace: true });
    }
  }, [secretPath, validSecretPath, navigate]);
  const [identifier, setIdentifier] = useState('');
  const [passwordOrPin, setPasswordOrPin] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [showPinChangeDialog, setShowPinChangeDialog] = useState(false);
  // Password/PIN recovery disabled - 2FA sufficient
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [isDirector, setIsDirector] = useState(false);
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if identifier belongs to a director (debounced) - for showing password recovery
  // Also check if it's a non-director for showing PIN recovery
  useEffect(() => {
    // Clear previous timeout
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    // Reset director status when identifier changes
    setIsDirector(false);

    // Only check if identifier looks valid (has @ for email or has digits for phone)
    if (!identifier || (identifier.length < 3)) {
      return;
    }

    // Debounce the check - wait 500ms after user stops typing
    checkTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await apiService.checkIfDirector(identifier);
        if (response.success && response.isDirector) {
          setIsDirector(true);
        } else {
          setIsDirector(false);
        }
      } catch (error) {
        // Silently fail - don't reveal anything
        setIsDirector(false);
      }
    }, 500);

    // Cleanup
    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [identifier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Starting login process...');
      let session;
      try {
        session = await authService.login(identifier, passwordOrPin, needs2FA ? twoFactorCode : undefined);
      } catch (err: any) {
        // Check if 2FA is required
        if (err.requires2FA || err.message === '2FA code required') {
          setNeeds2FA(true);
          setError('Please enter your 2FA code from your authenticator app');
          setLoading(false);
          return;
        }
        throw err;
      }
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
        // Show user-friendly error messages
        let errorMessage = err.message || 'Invalid credentials';
        if (errorMessage.includes('Too many login attempts')) {
          errorMessage = err.message; // Show the exact lockout message
        }
        setError(errorMessage);
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

          {/* Show password recovery for directors, PIN recovery for others */}
          {isDirector && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button
                variant="text"
                size="small"
                onClick={() => setShowPasswordRecoveryDialog(true)}
                sx={{ textTransform: 'none' }}
              >
                Forgot Password?
              </Button>
            </Box>
          )}
          {!isDirector && identifier.length >= 3 && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button
                variant="text"
                size="small"
                onClick={() => setShowPinRecoveryDialog(true)}
                sx={{ textTransform: 'none' }}
              >
                Forgot PIN?
              </Button>
            </Box>
          )}
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

      <PinRecoveryDialog
        open={showPinRecoveryDialog}
        onClose={() => setShowPinRecoveryDialog(false)}
        onSuccess={() => {
          setShowPinRecoveryDialog(false);
          // Optionally navigate to login or show success message
        }}
      />

      <PasswordRecoveryDialog
        open={showPasswordRecoveryDialog}
        onClose={() => setShowPasswordRecoveryDialog(false)}
        onSuccess={() => {
          setShowPasswordRecoveryDialog(false);
          // Optionally navigate to login or show success message
        }}
      />
    </Box>
  );
}

