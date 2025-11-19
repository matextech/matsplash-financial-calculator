import { useState } from 'react';
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

export default function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [passwordOrPin, setPasswordOrPin] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const session = await authService.login(identifier, passwordOrPin, needs2FA ? twoFactorCode : undefined);
      
      // Navigate based on role
      switch (session.role) {
        case 'director':
          navigate('/director');
          break;
        case 'manager':
          navigate('/manager');
          break;
        case 'receptionist':
          navigate('/receptionist');
          break;
        case 'storekeeper':
          navigate('/storekeeper');
          break;
        default:
          navigate('/dashboard');
      }
    } catch (err: any) {
      if (err.message === '2FA code required') {
        setNeeds2FA(true);
        setError('Please enter your 2FA code');
      } else {
        setError(err.message || 'Invalid credentials');
      }
    } finally {
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
    </Box>
  );
}

